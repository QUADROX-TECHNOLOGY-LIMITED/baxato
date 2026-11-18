import crypto from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { createSuccessResponse, UserRole, KycStatus, AuthenticationError } from '@baxato/common';
import { env } from '@baxato/config';
import { db, users, eq } from '@baxato/database';

function verifySvixWebhook(
  payloadString: string,
  svixId: string | undefined,
  svixTimestamp: string | undefined,
  svixSignature: string | undefined,
  secret: string,
): boolean {
  if (!svixId || !svixTimestamp || !svixSignature || !secret) {
    return false;
  }

  const ts = Number.parseInt(svixTimestamp, 10);
  if (Number.isNaN(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) {
    return false;
  }

  const cleanSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(cleanSecret, 'base64');
    if (secretBytes.length === 0) return false;
  } catch {
    return false;
  }

  const signedContent = `${svixId}.${svixTimestamp}.${payloadString}`;
  const expectedBase64 = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64');

  const signatures = svixSignature.split(' ').map((s) => s.trim());
  for (const sig of signatures) {
    const [, sigVal] = sig.split(',');
    if (!sigVal) continue;
    try {
      const a = Buffer.from(sigVal, 'base64');
      const b = Buffer.from(expectedBase64, 'base64');
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return true;
      }
    } catch {
      // continue
    }
  }
  return false;
}

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /webhooks/clerk
   * Inbound webhook listener for Clerk user sync — strictly requires verified Svix HMAC signature.
   */
  fastify.post('/clerk', async (request, reply) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || env.WEBHOOK_SIGNING_SECRET || '';
    const svixId = request.headers['svix-id'] as string | undefined;
    const svixTimestamp = request.headers['svix-timestamp'] as string | undefined;
    const svixSignature = request.headers['svix-signature'] as string | undefined;

    const rawBody = JSON.stringify(request.body ?? {});
    if (!webhookSecret || !verifySvixWebhook(rawBody, svixId, svixTimestamp, svixSignature, webhookSecret)) {
      throw new AuthenticationError('Invalid or missing Clerk webhook signature.');
    }

    const event = request.body as {
      type: string;
      data: {
        id: string;
        email_addresses?: Array<{ email_address: string; verification?: { status: string } }>;
        first_name?: string;
        last_name?: string;
        phone_numbers?: Array<{ phone_number: string }>;
        image_url?: string;
      };
    };

    if (!event || !event.type || !event.data) {
      return reply.status(400).send({ success: false, message: 'Invalid Clerk webhook payload' });
    }

    const { type, data } = event;
    const clerkId = data.id;
    const email = data.email_addresses?.[0]?.email_address?.toLowerCase().trim();
    const isEmailVerified = data.email_addresses?.[0]?.verification?.status === 'verified';
    const firstName = data.first_name || 'Merchant';
    const lastName = data.last_name || 'User';
    const phoneNumber = data.phone_numbers?.[0]?.phone_number;
    const avatarUrl = data.image_url;

    if (type === 'user.created' && email) {
      // Never allow external SSO webhooks to bind or overwrite @baxato.com staff/admin accounts
      if (email.endsWith('@baxato.com')) {
        return reply.status(200).send(createSuccessResponse({ received: true, skipped: true }, request.id));
      }

      const [existing] = await db
        .select({ id: users.id, role: users.role, clerkId: users.clerkId })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing) {
        const isPlatformAccount =
          existing.role === UserRole.SUPER_ADMIN ||
          existing.role === UserRole.STAFF ||
          existing.role === UserRole.SUPPORT;
        if (!isPlatformAccount && (!existing.clerkId || existing.clerkId === clerkId)) {
          await db
            .update(users)
            .set({
              clerkId,
              isEmailVerified: isEmailVerified || undefined,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existing.id));
        }
      } else {
        await db.insert(users).values({
          clerkId,
          email,
          firstName,
          lastName,
          phoneNumber,
          avatarUrl,
          isEmailVerified,
          isPhoneVerified: false,
          role: UserRole.BUSINESS_OWNER,
          status: 'ACTIVE',
          kycStatus: KycStatus.UNVERIFIED,
        });
      }
    } else if (type === 'user.updated' && clerkId) {
      await db
        .update(users)
        .set({
          firstName,
          lastName,
          avatarUrl,
          isEmailVerified,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, clerkId));
    }

    return reply.status(200).send(createSuccessResponse({ received: true, type }, request.id));
  });
};

import type { FastifyPluginAsync } from 'fastify';
import { createSuccessResponse, UserRole, KycStatus } from '@baxato/common';
import { db, users, eq } from '@baxato/database';

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /webhooks/clerk
   * Inbound webhook listener for Clerk user sync.
   */
  fastify.post('/clerk', async (request, reply) => {
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
    const email = data.email_addresses?.[0]?.email_address;
    const isEmailVerified = data.email_addresses?.[0]?.verification?.status === 'verified';
    const firstName = data.first_name || 'Merchant';
    const lastName = data.last_name || 'User';
    const phoneNumber = data.phone_numbers?.[0]?.phone_number;
    const avatarUrl = data.image_url;

    if (type === 'user.created' && email) {
      // Upsert user record
      await db
        .insert(users)
        .values({
          clerkId,
          email: email.toLowerCase().trim(),
          firstName,
          lastName,
          phoneNumber,
          avatarUrl,
          isEmailVerified,
          isPhoneVerified: false,
          role: UserRole.BUSINESS_OWNER,
          status: 'ACTIVE',
          kycStatus: KycStatus.UNVERIFIED,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            clerkId,
            firstName,
            lastName,
            avatarUrl,
            isEmailVerified,
            updatedAt: new Date(),
          },
        });
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

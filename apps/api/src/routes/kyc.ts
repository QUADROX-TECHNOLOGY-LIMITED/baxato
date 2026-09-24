import type { FastifyPluginAsync } from 'fastify';
import {
  verifyNinSchema,
  createSuccessResponse,
  ValidationError,
  ConflictError,
  KycStatus,
} from '@baxato/common';
import { db, users, kycVerifications, eq } from '@baxato/database';
import { kycService } from '../services/kyc.service';
import { authenticate } from '../plugins/auth.plugin';

export const kycRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply authentication hook to all KYC routes
  fastify.addHook('preHandler', authenticate);

  /**
   * POST /kyc/verify-nin
   * Verifies NIN + DOB against the national identity database, extracts photo, and reconciles official name.
   */
  fastify.post('/verify-nin', async (request, reply) => {
    const userId = request.user?.id;
    if (!userId) {
      throw new ValidationError('Authenticated user session required');
    }

    const parseResult = verifyNinSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      );
    }

    const { nin, dob } = parseResult.data;

    // Fetch existing user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new ValidationError('User record not found.');
    }

    if (user.kycStatus === KycStatus.VERIFIED) {
      throw new ConflictError('This account is already KYC verified.');
    }

    // Call NIMC identity verification service
    const verification = await kycService.verifyNin(nin, dob, user.firstName, user.lastName);

    if (!verification.success || !verification.officialData) {
      // Record failed verification attempt
      await db.insert(kycVerifications).values({
        userId: user.id,
        nin,
        dob,
        providerName: 'MONNIFY',
        status: KycStatus.REJECTED,
        matchScore: verification.matchScore,
        photoExtracted: false,
        failureReason: verification.failureReason || 'Data mismatch',
        rawResponse: verification.rawResponse || {},
      });

      throw new ValidationError(
        verification.failureReason || 'NIN and Date of Birth verification failed. Please check your details.',
      );
    }

    const official = verification.officialData;
    const verifiedAvatarUrl = verification.avatarUrl || user.avatarUrl;

    // Update User Record with Verified KYC, NIMC Photo, and Reconciled Official Names
    const [updatedUser] = await db
      .update(users)
      .set({
        kycStatus: KycStatus.VERIFIED,
        avatarUrl: verifiedAvatarUrl,
        firstName: official.firstName || user.firstName,
        lastName: official.lastName || user.lastName,
        middleName: official.middleName || user.middleName,
        nin: `***-***-${nin.slice(-4)}`, // Masked NIN for privacy
        dob: official.dob,
        ninData: verification.rawResponse || {},
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    // Record successful verification audit log
    await db.insert(kycVerifications).values({
      userId: user.id,
      nin: `***-***-${nin.slice(-4)}`,
      dob,
      providerName: 'MONNIFY',
      status: KycStatus.VERIFIED,
      matchScore: verification.matchScore,
      photoExtracted: verification.photoExtracted,
      rawResponse: verification.rawResponse || {},
      verifiedAt: new Date(),
    });

    return reply.status(200).send(
      createSuccessResponse(
        {
          kycStatus: updatedUser?.kycStatus,
          verified: true,
          photoExtracted: verification.photoExtracted,
          avatarUrl: updatedUser?.avatarUrl,
          user: {
            id: updatedUser?.id,
            firstName: updatedUser?.firstName,
            lastName: updatedUser?.lastName,
            middleName: updatedUser?.middleName,
            kycStatus: updatedUser?.kycStatus,
          },
          message: 'Identity verified successfully with NIMC national registry. Profile photo updated.',
        },
        request.id,
      ),
    );
  });

  /**
   * GET /kyc/status
   */
  fastify.get('/status', async (request, reply) => {
    const userId = request.user?.id;
    if (!userId) {
      throw new ValidationError('User ID required');
    }

    const [user] = await db
      .select({
        id: users.id,
        kycStatus: users.kycStatus,
        avatarUrl: users.avatarUrl,
        isPhoneVerified: users.isPhoneVerified,
        isEmailVerified: users.isEmailVerified,
        nin: users.nin,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return reply.status(200).send(
      createSuccessResponse(
        {
          kycStatus: user?.kycStatus || KycStatus.UNVERIFIED,
          isPhoneVerified: user?.isPhoneVerified,
          isEmailVerified: user?.isEmailVerified,
          avatarUrl: user?.avatarUrl,
          hasNinOnFile: !!user?.nin,
        },
        request.id,
      ),
    );
  });
};

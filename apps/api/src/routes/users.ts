import type { FastifyPluginAsync } from 'fastify';
import {
  updateUserProfileSchema,
  createSuccessResponse,
  ValidationError,
  NotFoundError,
  formatNairaFromKobo,
  koboToNaira,
} from '@baxato/common';
import { db, users, businesses, wallets, eq } from '@baxato/database';
import { authenticate } from '../plugins/auth.plugin';

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply authentication hook to all user routes
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /users/me
   * Returns authenticated user profile, owned businesses, and wallet balances.
   */
  fastify.get('/me', async (request, reply) => {
    const userId = request.user?.id;
    if (!userId) {
      throw new ValidationError('User ID required');
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        middleName: users.middleName,
        phoneNumber: users.phoneNumber,
        avatarUrl: users.avatarUrl,
        isEmailVerified: users.isEmailVerified,
        isPhoneVerified: users.isPhoneVerified,
        kycStatus: users.kycStatus,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundError('User profile');
    }

    // Fetch user's businesses
    const userBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, user.id));

    // Fetch wallets for all user businesses
    const businessList = await Promise.all(
      userBusinesses.map(async (biz) => {
        const bizWallets = await db
          .select()
          .from(wallets)
          .where(eq(wallets.businessId, biz.id));

        const mainWallet = bizWallets.find((w) => w.type === 'MAIN');
        const commissionWallet = bizWallets.find((w) => w.type === 'COMMISSION');

        return {
          id: biz.id,
          name: biz.name,
          slug: biz.slug,
          websiteUrl: biz.websiteUrl,
          country: biz.country,
          state: biz.state,
          lga: biz.lga,
          status: biz.status,
          wallets: {
            main: mainWallet
              ? {
                  id: mainWallet.id,
                  balanceKobo: mainWallet.balance.toString(),
                  balanceNaira: koboToNaira(mainWallet.balance),
                  formatted: formatNairaFromKobo(mainWallet.balance),
                }
              : null,
            commission: commissionWallet
              ? {
                  id: commissionWallet.id,
                  balanceKobo: commissionWallet.balance.toString(),
                  balanceNaira: koboToNaira(commissionWallet.balance),
                  formatted: formatNairaFromKobo(commissionWallet.balance),
                }
              : null,
          },
        };
      }),
    );

    return reply.status(200).send(
      createSuccessResponse(
        {
          user,
          businesses: businessList,
          businessCount: businessList.length,
          maxAllowedBusinesses: 3,
        },
        request.id,
      ),
    );
  });

  /**
   * PATCH /users/me
   */
  fastify.patch('/me', async (request, reply) => {
    const userId = request.user?.id;
    if (!userId) {
      throw new ValidationError('User ID required');
    }

    const parseResult = updateUserProfileSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      );
    }

    const data = parseResult.data;

    const [updatedUser] = await db
      .update(users)
      .set({
        ...(data.firstName ? { firstName: data.firstName.trim() } : {}),
        ...(data.lastName ? { lastName: data.lastName.trim() } : {}),
        ...(data.middleName !== undefined ? { middleName: data.middleName ? data.middleName.trim() : null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return reply.status(200).send(
      createSuccessResponse(
        {
          user: updatedUser,
          message: 'Profile updated successfully.',
        },
        request.id,
      ),
    );
  });
};

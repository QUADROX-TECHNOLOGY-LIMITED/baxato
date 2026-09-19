import {
  MAX_BUSINESSES_PER_USER,
  BusinessCapExceededError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  WalletType,
  UserRole,
  generateEntityId,
  formatNairaFromKobo,
  koboToNaira,
  type CreateBusinessInput,
  type UpdateBusinessInput,
} from '@baxato/common';
import {
  db,
  businesses,
  businessMembers,
  wallets,
  users,
  eq,
  and,
} from '@baxato/database';
import crypto from 'crypto';

export class BusinessService {
  /**
   * Generates a secure HMAC webhook secret.
   */
  public generateWebhookSecret(): string {
    return `whsec_${crypto.randomBytes(24).toString('hex')}`;
  }

  /**
   * Creates a new business for an authenticated merchant, enforcing the 3-business cap.
   */
  public async createBusiness(ownerId: string, input: CreateBusinessInput) {
    // 1. Enforce strict 3-business maximum cap per user account
    const existingBusinesses = await db
      .select({ id: businesses.id, status: businesses.status })
      .from(businesses)
      .where(and(eq(businesses.ownerId, ownerId), eq(businesses.status, 'ACTIVE')));

    if (existingBusinesses.length >= MAX_BUSINESSES_PER_USER) {
      throw new BusinessCapExceededError(
        `Maximum limit of ${MAX_BUSINESSES_PER_USER} active businesses reached for this account.`,
      );
    }

    // 2. Generate unique slug and webhook secret
    const baseSlug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const webhookSecret = this.generateWebhookSecret();

    // 3. Insert Business
    const [newBusiness] = await db
      .insert(businesses)
      .values({
        ownerId,
        name: input.name.trim(),
        slug,
        websiteUrl: input.websiteUrl || null,
        country: input.country.toUpperCase(),
        state: input.state.trim(),
        lga: input.lga.trim(),
        status: 'ACTIVE',
        webhookSecret,
      })
      .returning();

    if (!newBusiness) {
      throw new Error('Failed to create business record.');
    }

    // 4. Provision MAIN & COMMISSION Wallets in integer Kobo
    const [mainWallet, commissionWallet] = await db
      .insert(wallets)
      .values([
        {
          businessId: newBusiness.id,
          type: WalletType.MAIN,
          balance: 0n,
        },
        {
          businessId: newBusiness.id,
          type: WalletType.COMMISSION,
          balance: 0n,
        },
      ])
      .returning();

    // 5. Add Owner to Business Members
    await db.insert(businessMembers).values({
      businessId: newBusiness.id,
      userId: ownerId,
      role: UserRole.BUSINESS_OWNER,
    });

    return {
      business: newBusiness,
      wallets: {
        main: mainWallet
          ? {
              id: mainWallet.id,
              type: mainWallet.type,
              balanceKobo: mainWallet.balance.toString(),
              balanceNaira: koboToNaira(mainWallet.balance),
              formatted: formatNairaFromKobo(mainWallet.balance),
            }
          : null,
        commission: commissionWallet
          ? {
              id: commissionWallet.id,
              type: commissionWallet.type,
              balanceKobo: commissionWallet.balance.toString(),
              balanceNaira: koboToNaira(commissionWallet.balance),
              formatted: formatNairaFromKobo(commissionWallet.balance),
            }
          : null,
      },
    };
  }

  /**
   * Retrieves all businesses owned or accessible by a user.
   */
  public async getBusinessesForUser(userId: string) {
    // 1. Fetch owned businesses
    const owned = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, userId));

    // 2. Fetch memberships
    const memberships = await db
      .select({
        businessId: businessMembers.businessId,
        memberRole: businessMembers.role,
      })
      .from(businessMembers)
      .where(eq(businessMembers.userId, userId));

    const memberBizIds = memberships.map((m) => m.businessId).filter((id) => !owned.some((b) => b.id === id));

    let memberBusinesses: typeof owned = [];
    if (memberBizIds.length > 0) {
      memberBusinesses = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, memberBizIds[0]!));
    }

    const allBusinesses = [...owned, ...memberBusinesses];

    // Fetch wallets for each business
    return Promise.all(
      allBusinesses.map(async (biz) => {
        const bizWallets = await db
          .select()
          .from(wallets)
          .where(eq(wallets.businessId, biz.id));

        const main = bizWallets.find((w) => w.type === 'MAIN');
        const comm = bizWallets.find((w) => w.type === 'COMMISSION');

        const isOwner = biz.ownerId === userId;
        const membership = memberships.find((m) => m.businessId === biz.id);

        return {
          id: biz.id,
          name: biz.name,
          slug: biz.slug,
          websiteUrl: biz.websiteUrl,
          country: biz.country,
          state: biz.state,
          lga: biz.lga,
          status: biz.status,
          role: isOwner ? UserRole.BUSINESS_OWNER : membership?.memberRole || UserRole.DEVELOPER,
          isOwner,
          wallets: {
            main: main
              ? {
                  id: main.id,
                  balanceKobo: main.balance.toString(),
                  balanceNaira: koboToNaira(main.balance),
                  formatted: formatNairaFromKobo(main.balance),
                }
              : null,
            commission: comm
              ? {
                  id: comm.id,
                  balanceKobo: comm.balance.toString(),
                  balanceNaira: koboToNaira(comm.balance),
                  formatted: formatNairaFromKobo(comm.balance),
                }
              : null,
          },
          createdAt: biz.createdAt,
        };
      }),
    );
  }

  /**
   * Retrieves single business details with ownership/membership authorization.
   */
  public async getBusinessById(businessId: string, userId: string) {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz) {
      throw new NotFoundError('Business');
    }

    const isOwner = biz.ownerId === userId;
    let memberRole: UserRole | undefined;

    if (!isOwner) {
      const [membership] = await db
        .select()
        .from(businessMembers)
        .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, userId)))
        .limit(1);

      if (!membership) {
        throw new ForbiddenError('You do not have access to this business.');
      }
      memberRole = membership.role as UserRole;
    }

    const bizWallets = await db
      .select()
      .from(wallets)
      .where(eq(wallets.businessId, biz.id));

    const main = bizWallets.find((w) => w.type === 'MAIN');
    const comm = bizWallets.find((w) => w.type === 'COMMISSION');

    return {
      id: biz.id,
      name: biz.name,
      slug: biz.slug,
      websiteUrl: biz.websiteUrl,
      country: biz.country,
      state: biz.state,
      lga: biz.lga,
      status: biz.status,
      webhookUrl: biz.webhookUrl,
      webhookSecretMasked: biz.webhookSecret ? `${biz.webhookSecret.slice(0, 10)}...` : null,
      role: isOwner ? UserRole.BUSINESS_OWNER : memberRole,
      isOwner,
      wallets: {
        main: main
          ? {
              id: main.id,
              balanceKobo: main.balance.toString(),
              balanceNaira: koboToNaira(main.balance),
              formatted: formatNairaFromKobo(main.balance),
            }
          : null,
        commission: comm
          ? {
              id: comm.id,
              balanceKobo: comm.balance.toString(),
              balanceNaira: koboToNaira(comm.balance),
              formatted: formatNairaFromKobo(comm.balance),
            }
          : null,
      },
      createdAt: biz.createdAt,
    };
  }

  /**
   * Updates business settings (name, websiteUrl, webhookUrl).
   */
  public async updateBusiness(businessId: string, userId: string, input: UpdateBusinessInput) {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz) {
      throw new NotFoundError('Business');
    }

    // Must be Owner or Business Admin
    if (biz.ownerId !== userId) {
      const [membership] = await db
        .select()
        .from(businessMembers)
        .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, userId)))
        .limit(1);

      if (!membership || membership.role !== UserRole.BUSINESS_ADMIN) {
        throw new ForbiddenError('Only the business owner or admin can update settings.');
      }
    }

    const [updated] = await db
      .update(businesses)
      .set({
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.websiteUrl !== undefined ? { websiteUrl: input.websiteUrl || null } : {}),
        ...(input.webhookUrl !== undefined ? { webhookUrl: input.webhookUrl || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, businessId))
      .returning();

    return updated;
  }

  /**
   * Regenerates outbound webhook HMAC signing secret.
   */
  public async regenerateWebhookSecret(businessId: string, userId: string) {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz) {
      throw new NotFoundError('Business');
    }

    if (biz.ownerId !== userId) {
      throw new ForbiddenError('Only the business owner can regenerate the webhook signing secret.');
    }

    const newSecret = this.generateWebhookSecret();

    await db
      .update(businesses)
      .set({ webhookSecret: newSecret, updatedAt: new Date() })
      .where(eq(businesses.id, businessId));

    return { webhookSecret: newSecret };
  }

  /**
   * Invites / Adds a team member to a business by email.
   */
  public async inviteMember(
    businessId: string,
    callerId: string,
    email: string,
    role: UserRole.BUSINESS_ADMIN | UserRole.DEVELOPER,
  ) {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz) {
      throw new NotFoundError('Business');
    }

    if (biz.ownerId !== callerId) {
      const [membership] = await db
        .select()
        .from(businessMembers)
        .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, callerId)))
        .limit(1);

      if (!membership || membership.role !== UserRole.BUSINESS_ADMIN) {
        throw new ForbiddenError('Only the business owner or admin can invite members.');
      }
    }

    // Find invited user by email
    const [targetUser] = await db
      .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!targetUser) {
      throw new NotFoundError(`User with email ${email}`);
    }

    // Check if already a member
    const [existingMember] = await db
      .select()
      .from(businessMembers)
      .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, targetUser.id)))
      .limit(1);

    if (existingMember) {
      throw new ConflictError(`User ${email} is already a member of this business.`);
    }

    const [newMember] = await db
      .insert(businessMembers)
      .values({
        businessId,
        userId: targetUser.id,
        role,
      })
      .returning();

    return {
      memberId: newMember?.id,
      user: targetUser,
      role,
    };
  }

  /**
   * Removes a team member from a business.
   */
  public async removeMember(businessId: string, callerId: string, memberId: string) {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz) {
      throw new NotFoundError('Business');
    }

    if (biz.ownerId !== callerId) {
      const [callerMembership] = await db
        .select()
        .from(businessMembers)
        .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, callerId)))
        .limit(1);

      if (!callerMembership || callerMembership.role !== UserRole.BUSINESS_ADMIN) {
        throw new ForbiddenError('Only the business owner or admin can remove members.');
      }
    }

    const [targetMember] = await db
      .select()
      .from(businessMembers)
      .where(and(eq(businessMembers.id, memberId), eq(businessMembers.businessId, businessId)))
      .limit(1);

    if (!targetMember) {
      throw new NotFoundError('Team member');
    }

    // Cannot remove the business owner
    if (targetMember.userId === biz.ownerId) {
      throw new ForbiddenError('Cannot remove the business owner from their own business.');
    }

    await db
      .delete(businessMembers)
      .where(eq(businessMembers.id, memberId));

    return { removed: true };
  }

  /**
   * Lists all members of a business.
   */
  public async listMembers(businessId: string, userId: string) {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz) {
      throw new NotFoundError('Business');
    }

    const isOwner = biz.ownerId === userId;
    if (!isOwner) {
      const [membership] = await db
        .select()
        .from(businessMembers)
        .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, userId)))
        .limit(1);

      if (!membership) {
        throw new ForbiddenError('You do not have access to view team members of this business.');
      }
    }

    const members = await db
      .select({
        id: businessMembers.id,
        role: businessMembers.role,
        createdAt: businessMembers.createdAt,
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
      })
      .from(businessMembers)
      .leftJoin(users, eq(businessMembers.userId, users.id))
      .where(eq(businessMembers.businessId, businessId));

    return members;
  }
}

export const businessService = new BusinessService();

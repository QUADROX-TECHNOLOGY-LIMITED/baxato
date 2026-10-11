import type { FastifyPluginAsync } from 'fastify';
import {
  createSuccessResponse,
  ValidationError,
  NotFoundError,
  ServiceType,
  TransactionStatus,
  ProviderName,
  koboToNaira,
  formatNairaFromKobo,
  type ApiPagination,
  UserRole,
} from '@baxato/common';
import {
  db,
  users,
  businesses,
  wallets,
  serviceTransactions,
  kycVerifications,
  eq,
  and,
  or,
  desc,
  gte,
  ilike,
  sql,
  inArray,
} from '@baxato/database';
import { requirePlatformStaff } from '../plugins/auth.plugin.js';
import {
  providerRouterService,
  ProviderRoutingStrategy,
} from '../services/providers/index.js';
import { auditService } from '../services/audit.service.js';

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // All admin routes strictly require Platform Staff or Super Admin authentication
  fastify.addHook('preHandler', requirePlatformStaff);

  /**
   * GET /admin/overview
   * Returns high-level operational telemetry: transaction throughput, success rates,
   * merchant onboarding count, and live provider health.
   */
  fastify.get('/overview', async (request, reply) => {
    // 1. Transaction telemetry (today's window)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [txStats] = await db
      .select({
        totalCount: sql<number>`count(*)`,
        totalVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}), 0)`,
        successCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'SUCCESSFUL')`,
        successVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = 'SUCCESSFUL'), 0)`,
        failedCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'FAILED')`,
        pendingCount: sql<number>`count(*) filter (where ${serviceTransactions.status} in ('PENDING', 'PROCESSING'))`,
      })
      .from(serviceTransactions)
      .where(gte(serviceTransactions.createdAt, todayStart));

    // 2. Merchant & KYC counts
    const [bizCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(businesses);

    const [verifiedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.kycStatus, 'VERIFIED'));

    // 3. Provider health & routing table
    const providerHealth = await providerRouterService.getAllProviderHealth().catch(() => []);
    const routingConfig = providerRouterService.getRoutingConfig();

    const totalTx = Number(txStats?.totalCount || 0);
    const successTx = Number(txStats?.successCount || 0);
    const successRate = totalTx > 0 ? Number(((successTx / totalTx) * 100).toFixed(2)) : 0;

    return reply.status(200).send(
      createSuccessResponse(
        {
          today: {
            totalTransactions: totalTx,
            totalVolumeKobo: String(txStats?.totalVolume || '0'),
            totalVolumeNaira: koboToNaira(BigInt(txStats?.totalVolume || 0)),
            successTransactions: successTx,
            successVolumeKobo: String(txStats?.successVolume || '0'),
            successVolumeNaira: koboToNaira(BigInt(txStats?.successVolume || 0)),
            failedTransactions: Number(txStats?.failedCount || 0),
            pendingTransactions: Number(txStats?.pendingCount || 0),
            successRatePercent: successRate,
          },
          merchants: {
            totalBusinesses: Number(bizCount?.count || 0),
            verifiedUsers: Number(verifiedCount?.count || 0),
          },
          providers: {
            health: providerHealth,
            routing: routingConfig,
          },
        },
        request.id,
      ),
    );
  });

  /**
   * GET /admin/transactions
   * Global search and inspection across all merchant transactions.
   */
  fastify.get('/transactions', async (request, reply) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      serviceType?: string;
      status?: string;
      businessId?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (query.businessId) {
      conditions.push(eq(serviceTransactions.businessId, query.businessId));
    }

    if (query.serviceType && query.serviceType !== 'ALL') {
      conditions.push(eq(serviceTransactions.serviceType, query.serviceType as ServiceType));
    }

    if (query.status && query.status !== 'ALL') {
      conditions.push(eq(serviceTransactions.status, query.status as TransactionStatus));
    }

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(serviceTransactions.clientReference, term),
          ilike(serviceTransactions.requestReference, term),
          ilike(serviceTransactions.providerReference, term),
          ilike(serviceTransactions.recipient, term),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(serviceTransactions)
        .where(whereClause)
        .orderBy(desc(serviceTransactions.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(serviceTransactions)
        .where(whereClause),
    ]);

    const totalCount = Number(countResult[0]?.count || rows.length);

    // Batch resolve businesses & users for the returned rows
    const enrichedRows = await Promise.all(
      rows.map(async (r) => {
        let businessName = 'Unknown Business';
        let userEmail = '';
        let userName = '';

        if (r.businessId) {
          const [biz] = await db
            .select({ name: businesses.name })
            .from(businesses)
            .where(eq(businesses.id, r.businessId))
            .limit(1);
          if (biz) businessName = biz.name;
        }

        if (r.userId) {
          const [user] = await db
            .select({
              email: users.email,
              firstName: users.firstName,
              lastName: users.lastName,
            })
            .from(users)
            .where(eq(users.id, r.userId))
            .limit(1);
          if (user) {
            userEmail = user.email;
            userName = `${user.firstName} ${user.lastName}`.trim();
          }
        }

        return {
          id: r.id,
          businessId: r.businessId,
          businessName,
          userId: r.userId,
          userEmail,
          userName,
          serviceType: r.serviceType,
          amountKobo: r.amount.toString(),
          amountNaira: koboToNaira(r.amount),
          formattedAmount: formatNairaFromKobo(r.amount),
          feeKobo: r.fee ? r.fee.toString() : '0',
          feeNaira: r.fee ? koboToNaira(r.fee) : 0,
          discountKobo: r.discount ? r.discount.toString() : '0',
          discountNaira: r.discount ? koboToNaira(r.discount) : 0,
          totalAmountKobo: r.totalAmount ? r.totalAmount.toString() : r.amount.toString(),
          totalAmountNaira: r.totalAmount ? koboToNaira(r.totalAmount) : koboToNaira(r.amount),
          status: r.status,
          recipient: r.recipient,
          providerName: r.providerName,
          providerReference: r.providerReference,
          clientReference: r.clientReference,
          requestReference: r.requestReference,
          errorMessage: r.errorMessage,
          metadata: r.metadata,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      }),
    );

    const pagination: ApiPagination = {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      hasNextPage: page * limit < totalCount,
      hasPrevPage: page > 1,
    };

    return reply.status(200).send(
      createSuccessResponse(enrichedRows, request.id, pagination),
    );
  });

  /**
   * GET /admin/transactions/:id
   * Deep payload inspector for a specific transaction.
   */
  fastify.get('/transactions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [tx] = await db
      .select()
      .from(serviceTransactions)
      .where(eq(serviceTransactions.id, id))
      .limit(1);

    if (!tx) {
      throw new NotFoundError(`Transaction '${id}'`);
    }

    let businessName = '';
    let businessSlug = '';
    if (tx.businessId) {
      const [biz] = await db
        .select({ name: businesses.name, slug: businesses.slug })
        .from(businesses)
        .where(eq(businesses.id, tx.businessId))
        .limit(1);
      if (biz) {
        businessName = biz.name;
        businessSlug = biz.slug;
      }
    }

    let userEmail = '';
    let userName = '';
    if (tx.userId) {
      const [user] = await db
        .select({
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(eq(users.id, tx.userId))
        .limit(1);
      if (user) {
        userEmail = user.email;
        userName = `${user.firstName} ${user.lastName}`.trim();
      }
    }

    return reply.status(200).send(
      createSuccessResponse(
        {
          id: tx.id,
          businessId: tx.businessId,
          businessName,
          businessSlug,
          userId: tx.userId,
          userEmail,
          userName,
          serviceType: tx.serviceType,
          amountKobo: tx.amount.toString(),
          amountNaira: koboToNaira(tx.amount),
          formattedAmount: formatNairaFromKobo(tx.amount),
          feeKobo: tx.fee ? tx.fee.toString() : '0',
          feeNaira: tx.fee ? koboToNaira(tx.fee) : 0,
          discountKobo: tx.discount ? tx.discount.toString() : '0',
          discountNaira: tx.discount ? koboToNaira(tx.discount) : 0,
          totalAmountKobo: tx.totalAmount ? tx.totalAmount.toString() : tx.amount.toString(),
          totalAmountNaira: tx.totalAmount ? koboToNaira(tx.totalAmount) : koboToNaira(tx.amount),
          status: tx.status,
          recipient: tx.recipient,
          providerName: tx.providerName,
          providerReference: tx.providerReference,
          clientReference: tx.clientReference,
          requestReference: tx.requestReference,
          metadata: tx.metadata,
          errorMessage: tx.errorMessage,
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt,
        },
        request.id,
      ),
    );
  });

  /**
   * POST /admin/transactions/:id/requery
   * Re-queries live status from Interswitch or Monnify to sync settlement status.
   */
  fastify.post('/transactions/:id/requery', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [tx] = await db
      .select()
      .from(serviceTransactions)
      .where(eq(serviceTransactions.id, id))
      .limit(1);

    if (!tx) {
      throw new NotFoundError(`Transaction '${id}'`);
    }

    const body =
      (request.body as { customReference?: string; providerReference?: string } | undefined) ||
      {};
    const refToQuery = body.customReference || tx.requestReference || tx.clientReference || tx.id;
    const providerRef = body.providerReference || tx.providerReference || undefined;
    const provider = tx.providerName as ProviderName;

    const requeryResult = await providerRouterService.requeryTransaction(
      provider,
      refToQuery,
      providerRef,
    );

    let updatedStatus = tx.status;
    let syncMessage = '';

    if (tx.status === TransactionStatus.SUCCESSFUL) {
      if (requeryResult.status === TransactionStatus.SUCCESSFUL) {
        syncMessage = 'Confirmed: Upstream gateway verifies transaction is SUCCESSFUL.';
      } else {
        syncMessage = `Preserved: Local state is SUCCESSFUL. Upstream returned: ${requeryResult.responseMessage || 'Inconclusive'}.`;
      }
      if (requeryResult.providerReference && !tx.providerReference) {
        await db
          .update(serviceTransactions)
          .set({
            providerReference: requeryResult.providerReference,
            updatedAt: new Date(),
          })
          .where(eq(serviceTransactions.id, id));
      }
    } else {
      if (requeryResult.status === TransactionStatus.SUCCESSFUL) {
        updatedStatus = TransactionStatus.SUCCESSFUL;
        syncMessage = 'Updated: Upstream gateway confirmed transaction is SUCCESSFUL.';
      } else if (
        requeryResult.status === TransactionStatus.FAILED &&
        requeryResult.responseCode !== 'UNKNOWN' &&
        requeryResult.responseCode !== '20010' &&
        requeryResult.responseCode !== '99'
      ) {
        updatedStatus = TransactionStatus.FAILED;
        syncMessage = `Updated: Upstream gateway confirmed transaction is FAILED (${requeryResult.responseMessage}).`;
      } else if (requeryResult.status === TransactionStatus.PENDING || requeryResult.responseCode === '99') {
        syncMessage = `Inconclusive: Upstream returned response code ${requeryResult.responseCode} (${requeryResult.responseMessage}). Transaction remains ${tx.status}.`;
      } else {
        syncMessage = `Unchanged: Upstream response code ${requeryResult.responseCode} (${requeryResult.responseMessage}). Status remains ${tx.status}.`;
      }

      if (updatedStatus !== tx.status || requeryResult.providerReference) {
        await db
          .update(serviceTransactions)
          .set({
            status: updatedStatus,
            providerReference: requeryResult.providerReference || tx.providerReference,
            errorMessage: requeryResult.status === TransactionStatus.FAILED ? requeryResult.responseMessage : tx.errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(serviceTransactions.id, id));

        await auditService.log({
          userId: request.user?.id,
          businessId: tx.businessId,
          action: 'STAFF_TRANSACTION_REQUERY_SYNC',
          resourceType: 'TRANSACTION',
          resourceId: id,
          changes: {
            previousStatus: tx.status,
            newStatus: updatedStatus,
            providerResponseCode: requeryResult.responseCode,
            providerMessage: requeryResult.responseMessage,
          },
        });
      }
    }

    return reply.status(200).send(
      createSuccessResponse(
        {
          transactionId: id,
          currentStatus: updatedStatus,
          message: syncMessage,
          syncMessage,
          queriedReference: refToQuery,
          providerReference: requeryResult.providerReference || tx.providerReference,
          providerResponseCode: requeryResult.responseCode,
          providerMessage: requeryResult.responseMessage,
          providerResult: {
            ...requeryResult,
            amountKobo: requeryResult.amountKobo ? requeryResult.amountKobo.toString() : undefined,
          },
        },
        request.id,
      ),
    );
  });

  /**
   * GET /admin/merchants
   * Paginated directory of registered merchants with wallet balances and NIN KYC status.
   */
  fastify.get('/merchants', async (request, reply) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      search?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    // Filter merchants: users who have role BUSINESS_OWNER or who own businesses
    const baseMerchantCondition = or(
      eq(users.role, UserRole.BUSINESS_OWNER),
      sql`${users.id} IN (SELECT DISTINCT owner_id FROM businesses)`
    );

    const conditions: any[] = [baseMerchantCondition];

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      // Find businesses matching term by name or slug
      const matchedBiz = await db
        .select({ ownerId: businesses.ownerId })
        .from(businesses)
        .where(or(ilike(businesses.name, term), ilike(businesses.slug, term)));
      const bizOwnerIds = Array.from(new Set(matchedBiz.map((b) => b.ownerId).filter(Boolean)));

      const searchOrs: any[] = [
        ilike(users.email, term),
        ilike(users.phoneNumber, term),
        ilike(users.nin, term),
        ilike(users.firstName, term),
        ilike(users.lastName, term),
      ];
      if (bizOwnerIds.length > 0) {
        searchOrs.push(inArray(users.id, bizOwnerIds));
      }
      conditions.push(or(...searchOrs));
    }

    const whereClause = and(...conditions);

    const [userRows, countResult] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          middleName: users.middleName,
          phoneNumber: users.phoneNumber,
          role: users.role,
          status: users.status,
          isEmailVerified: users.isEmailVerified,
          isPhoneVerified: users.isPhoneVerified,
          kycStatus: users.kycStatus,
          nin: users.nin,
          dob: users.dob,
          ninData: users.ninData,
          avatarUrl: users.avatarUrl,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(whereClause),
    ]);

    const totalCount = Number(countResult[0]?.count || userRows.length);

    // Fetch all owned businesses, wallets, and KYC records for each unique merchant owner
    const merchantsWithWallets = await Promise.all(
      userRows.map(async (u) => {
        // Fetch all businesses owned by this merchant user
        const allUserBiz = await db
          .select()
          .from(businesses)
          .where(eq(businesses.ownerId, u.id))
          .orderBy(desc(businesses.createdAt));

        let totalMainKobo = 0n;
        let totalCommissionKobo = 0n;

        const ownerBusinesses = await Promise.all(
          allUserBiz.map(async (ub) => {
            const ubWallets = await db
              .select({
                id: wallets.id,
                type: wallets.type,
                balance: wallets.balance,
              })
              .from(wallets)
              .where(eq(wallets.businessId, ub.id));

            const ubMain = ubWallets.find((w) => w.type === 'MAIN');
            const ubComm = ubWallets.find((w) => w.type === 'COMMISSION');

            const mainKobo = ubMain ? BigInt(ubMain.balance.toString()) : 0n;
            const commKobo = ubComm ? BigInt(ubComm.balance.toString()) : 0n;

            totalMainKobo += mainKobo;
            totalCommissionKobo += commKobo;

            return {
              id: ub.id,
              name: ub.name,
              slug: ub.slug,
              status: ub.status,
              country: ub.country,
              state: ub.state,
              lga: ub.lga,
              createdAt: ub.createdAt,
              wallets: {
                mainBalanceKobo: mainKobo.toString(),
                mainBalanceNaira: koboToNaira(Number(mainKobo)),
                formattedMain: formatNairaFromKobo(Number(mainKobo)),
                commissionBalanceKobo: commKobo.toString(),
                commissionBalanceNaira: koboToNaira(Number(commKobo)),
                formattedCommission: formatNairaFromKobo(Number(commKobo)),
              },
            };
          }),
        );

        // Fetch latest KYC verification record
        const [kycRecord] = await db
          .select()
          .from(kycVerifications)
          .where(eq(kycVerifications.userId, u.id))
          .orderBy(desc(kycVerifications.createdAt))
          .limit(1);

        const primaryBiz = ownerBusinesses[0] || null;

        return {
          id: u.id,
          businessId: primaryBiz?.id || null,
          name: primaryBiz?.name || `${u.firstName} ${u.lastName}`.trim(),
          slug: primaryBiz?.slug || '',
          status: primaryBiz?.status || u.status || 'ACTIVE',
          country: primaryBiz?.country || 'NG',
          state: primaryBiz?.state || 'Lagos',
          lga: primaryBiz?.lga || '',
          createdAt: u.createdAt,
          ownerId: u.id,
          ownerEmail: u.email,
          ownerFirstName: u.firstName,
          ownerLastName: u.lastName,
          ownerMiddleName: u.middleName || '',
          ownerPhone: u.phoneNumber || '',
          ownerStatus: u.status || 'ACTIVE',
          ownerCreatedAt: u.createdAt,
          isEmailVerified: u.isEmailVerified,
          isPhoneVerified: u.isPhoneVerified,
          kycStatus: u.kycStatus || 'UNVERIFIED',
          nin: kycRecord?.nin || u.nin || '',
          dob: kycRecord?.dob || u.dob || '',
          ninData: u.ninData || {},
          avatarUrl: u.avatarUrl || null,
          kycRecord: kycRecord
            ? {
                nin: kycRecord.nin,
                dob: kycRecord.dob,
                providerName: kycRecord.providerName,
                status: kycRecord.status,
                matchScore: kycRecord.matchScore,
                photoExtracted: kycRecord.photoExtracted,
                verifiedAt: kycRecord.verifiedAt,
                failureReason: kycRecord.failureReason,
                rawResponse: kycRecord.rawResponse,
              }
            : null,
          primaryBusiness: primaryBiz,
          ownerBusinesses,
          wallets: {
            mainBalanceKobo: totalMainKobo.toString(),
            mainBalanceNaira: koboToNaira(Number(totalMainKobo)),
            formattedMain: formatNairaFromKobo(Number(totalMainKobo)),
            commissionBalanceKobo: totalCommissionKobo.toString(),
            commissionBalanceNaira: koboToNaira(Number(totalCommissionKobo)),
            formattedCommission: formatNairaFromKobo(Number(totalCommissionKobo)),
          },
        };
      }),
    );

    const pagination: ApiPagination = {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      hasNextPage: page * limit < totalCount,
      hasPrevPage: page > 1,
    };

    return reply.status(200).send(
      createSuccessResponse(merchantsWithWallets, request.id, pagination),
    );
  });

  /**
   * GET /admin/merchants/:id
   * Single merchant detailed view (supports user ID or business ID).
   */
  fastify.get('/merchants/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    let merchantUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
      .then((r) => r[0]);

    let bizRows: any[] = [];

    if (merchantUser) {
      bizRows = await db
        .select()
        .from(businesses)
        .where(eq(businesses.ownerId, merchantUser.id))
        .orderBy(desc(businesses.createdAt));
    } else {
      const [singleBiz] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, id))
        .limit(1);

      if (!singleBiz) {
        throw new NotFoundError(`Merchant '${id}'`);
      }

      if (singleBiz.ownerId) {
        merchantUser = await db
          .select()
          .from(users)
          .where(eq(users.id, singleBiz.ownerId))
          .limit(1)
          .then((r) => r[0]);

        bizRows = await db
          .select()
          .from(businesses)
          .where(eq(businesses.ownerId, singleBiz.ownerId))
          .orderBy(desc(businesses.createdAt));
      } else {
        bizRows = [singleBiz];
      }
    }

    if (!merchantUser && bizRows.length === 0) {
      throw new NotFoundError(`Merchant '${id}'`);
    }

    const primaryBiz = bizRows[0] || null;

    let totalMainKobo = 0n;
    let totalCommissionKobo = 0n;

    const ownerBusinesses = await Promise.all(
      bizRows.map(async (b) => {
        const bWallets = await db
          .select({
            id: wallets.id,
            type: wallets.type,
            balance: wallets.balance,
          })
          .from(wallets)
          .where(eq(wallets.businessId, b.id));

        const main = bWallets.find((w) => w.type === 'MAIN');
        const comm = bWallets.find((w) => w.type === 'COMMISSION');

        const mainKobo = main ? BigInt(main.balance.toString()) : 0n;
        const commKobo = comm ? BigInt(comm.balance.toString()) : 0n;

        totalMainKobo += mainKobo;
        totalCommissionKobo += commKobo;

        return {
          id: b.id,
          name: b.name,
          slug: b.slug,
          status: b.status,
          country: b.country,
          state: b.state,
          lga: b.lga,
          createdAt: b.createdAt,
          wallets: {
            mainBalanceKobo: mainKobo.toString(),
            mainBalanceNaira: koboToNaira(Number(mainKobo)),
            formattedMain: formatNairaFromKobo(Number(mainKobo)),
            commissionBalanceKobo: commKobo.toString(),
            commissionBalanceNaira: koboToNaira(Number(commKobo)),
            formattedCommission: formatNairaFromKobo(Number(commKobo)),
          },
        };
      }),
    );

    const [kycRecord] = merchantUser
      ? await db
          .select()
          .from(kycVerifications)
          .where(eq(kycVerifications.userId, merchantUser.id))
          .orderBy(desc(kycVerifications.createdAt))
          .limit(1)
      : [null];

    // Fetch recent 10 transactions across primary business if available
    let recentTx: any[] = [];
    if (primaryBiz) {
      recentTx = await db
        .select({
          id: serviceTransactions.id,
          serviceType: serviceTransactions.serviceType,
          amount: serviceTransactions.amount,
          status: serviceTransactions.status,
          recipient: serviceTransactions.recipient,
          clientReference: serviceTransactions.clientReference,
          createdAt: serviceTransactions.createdAt,
        })
        .from(serviceTransactions)
        .where(eq(serviceTransactions.businessId, primaryBiz.id))
        .orderBy(desc(serviceTransactions.createdAt))
        .limit(10);
    }

    return reply.status(200).send(
      createSuccessResponse(
        {
          id: merchantUser?.id || primaryBiz?.id,
          businessId: primaryBiz?.id || null,
          name: primaryBiz?.name || `${merchantUser?.firstName} ${merchantUser?.lastName}`.trim(),
          slug: primaryBiz?.slug || '',
          status: primaryBiz?.status || merchantUser?.status || 'ACTIVE',
          country: primaryBiz?.country || 'NG',
          state: primaryBiz?.state || 'Lagos',
          lga: primaryBiz?.lga || '',
          createdAt: merchantUser?.createdAt || primaryBiz?.createdAt,
          ownerId: merchantUser?.id || primaryBiz?.ownerId,
          ownerEmail: merchantUser?.email || '',
          ownerFirstName: merchantUser?.firstName || '',
          ownerLastName: merchantUser?.lastName || '',
          ownerMiddleName: merchantUser?.middleName || '',
          ownerPhone: merchantUser?.phoneNumber || '',
          ownerStatus: merchantUser?.status || 'ACTIVE',
          ownerCreatedAt: merchantUser?.createdAt,
          kycStatus: merchantUser?.kycStatus || 'UNVERIFIED',
          nin: kycRecord?.nin || merchantUser?.nin || '',
          dob: kycRecord?.dob || merchantUser?.dob || '',
          ninData: merchantUser?.ninData || {},
          avatarUrl: merchantUser?.avatarUrl || null,
          kycRecord: kycRecord
            ? {
                nin: kycRecord.nin,
                dob: kycRecord.dob,
                providerName: kycRecord.providerName,
                status: kycRecord.status,
                matchScore: kycRecord.matchScore,
                photoExtracted: kycRecord.photoExtracted,
                verifiedAt: kycRecord.verifiedAt,
                failureReason: kycRecord.failureReason,
                rawResponse: kycRecord.rawResponse,
              }
            : null,
          primaryBusiness: primaryBiz,
          ownerBusinesses,
          wallets: {
            mainBalanceKobo: totalMainKobo.toString(),
            mainBalanceNaira: koboToNaira(Number(totalMainKobo)),
            formattedMain: formatNairaFromKobo(Number(totalMainKobo)),
            commissionBalanceKobo: totalCommissionKobo.toString(),
            commissionBalanceNaira: koboToNaira(Number(totalCommissionKobo)),
            formattedCommission: formatNairaFromKobo(Number(totalCommissionKobo)),
          },
          recentTransactions: recentTx.map((tx) => ({
            ...tx,
            amountKobo: tx.amount.toString(),
            amountNaira: koboToNaira(tx.amount),
            formattedAmount: formatNairaFromKobo(tx.amount),
          })),
        },
        request.id,
      ),
    );
  });

  /**
   * GET /admin/kyc/records
   * Search and inspect verified merchant NIN identity records.
   */
  fastify.get('/kyc/records', async (request, reply) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (query.status && query.status !== 'ALL') {
      conditions.push(eq(kycVerifications.status, query.status as any));
    }

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(ilike(kycVerifications.nin, term));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [records, countResult] = await Promise.all([
      db
        .select()
        .from(kycVerifications)
        .where(whereClause)
        .orderBy(desc(kycVerifications.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(kycVerifications)
        .where(whereClause),
    ]);

    const totalCount = Number(countResult[0]?.count || records.length);

    // Enrich with user name & email
    const enrichedRecords = await Promise.all(
      records.map(async (k) => {
        let userEmail = '';
        let userName = '';
        let userPhone = '';

        if (k.userId) {
          const [u] = await db
            .select({
              email: users.email,
              firstName: users.firstName,
              lastName: users.lastName,
              phoneNumber: users.phoneNumber,
            })
            .from(users)
            .where(eq(users.id, k.userId))
            .limit(1);

          if (u) {
            userEmail = u.email;
            userName = `${u.firstName} ${u.lastName}`.trim();
            userPhone = u.phoneNumber || '';
          }
        }

        return {
          id: k.id,
          userId: k.userId,
          userEmail,
          userName,
          userPhone,
          nin: k.nin,
          dob: k.dob,
          status: k.status,
          matchScore: k.matchScore,
          photoExtracted: k.photoExtracted,
          failureReason: k.failureReason,
          verifiedAt: k.verifiedAt,
          createdAt: k.createdAt,
        };
      }),
    );

    const pagination: ApiPagination = {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      hasNextPage: page * limit < totalCount,
      hasPrevPage: page > 1,
    };

    return reply.status(200).send(
      createSuccessResponse(enrichedRecords, request.id, pagination),
    );
  });

  /**
   * GET /admin/providers/health
   * Live provider connectivity, circuit breaker metrics, and routing table.
   */
  fastify.get('/providers/health', async (request, reply) => {
    const providerStatuses = await providerRouterService.getAllProviderHealth();
    const routingTable = providerRouterService.getRoutingConfig();

    return reply.status(200).send(
      createSuccessResponse(
        {
          providers: providerStatuses,
          providerStatuses,
          routing: routingTable,
          routingTable,
          checkedAt: new Date(),
        },
        request.id,
      ),
    );
  });

  /**
   * PATCH /admin/providers/routing
   * Staff-authorized failover switch: update routing strategy or failover rules.
   */
  fastify.patch('/providers/routing', async (request, reply) => {
    const body = request.body as {
      serviceType?: ServiceType;
      strategy?: ProviderRoutingStrategy;
      allowFailover?: boolean;
    };

    if (!body.serviceType || !Object.values(ServiceType).includes(body.serviceType)) {
      throw new ValidationError(
        `Invalid serviceType. Supported: ${Object.values(ServiceType).join(', ')}`,
      );
    }

    if (
      !body.strategy ||
      !Object.values(ProviderRoutingStrategy).includes(body.strategy)
    ) {
      throw new ValidationError(
        `Invalid strategy. Supported: ${Object.values(ProviderRoutingStrategy).join(', ')}`,
      );
    }

    const previousConfigs = providerRouterService.getRoutingConfig(body.serviceType);
    const updated = providerRouterService.updateRoutingConfig(
      body.serviceType,
      body.strategy,
      body.allowFailover ?? true,
    );

    // Audit the routing update executed by Staff
    await auditService.log({
      userId: request.user?.id,
      action: 'ADMIN_PROVIDER_ROUTING_UPDATE',
      resourceType: 'PROVIDER_ROUTING',
      resourceId: body.serviceType,
      changes: {
        serviceType: body.serviceType,
        previousStrategy: previousConfigs[0]?.strategy,
        newStrategy: body.strategy,
        allowFailover: body.allowFailover ?? true,
      },
    });

    return reply.status(200).send(
      createSuccessResponse(
        {
          message: `Routing strategy for ${body.serviceType} updated successfully.`,
          config: updated,
        },
        request.id,
      ),
    );
  });
};

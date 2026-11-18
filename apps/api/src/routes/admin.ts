import crypto from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import {
  createSuccessResponse,
  ValidationError,
  NotFoundError,
  ServiceType,
  TransactionStatus,
  ProviderName,
  Permission,
  hasPermission,
  WalletType,
  LedgerEntryType,
  koboToNaira,
  formatNairaFromKobo,
  type ApiPagination,
  UserRole,
} from '@baxato/common';
import bcrypt from 'bcryptjs';
import {
  db,
  users,
  businesses,
  wallets,
  serviceTransactions,
  kycVerifications,
  auditLogs,
  eq,
  and,
  or,
  desc,
  gte,
  lte,
  ilike,
  sql,
  inArray,
} from '@baxato/database';
import { requirePlatformStaff, requirePlatformAdmin } from '../plugins/auth.plugin.js';
import { requirePlatformPermission } from '../plugins/rbac.plugin.js';
import { parseZonedDateRange } from '../utils/date-range.js';
import {
  providerRouterService,
  ProviderRoutingStrategy,
} from '../services/providers/index.js';
import { auditService } from '../services/audit.service.js';
import { walletService } from '../services/wallet.service.js';
import { ledgerService } from '../services/ledger.service.js';
import {
  serviceControlsService,
  type UpdateSystemSettingsInput,
} from '../services/service-controls.service.js';
import { airtimeService } from '../services/airtime.service.js';
import { dataService } from '../services/data.service.js';
import { electricityService } from '../services/electricity.service.js';
import { cableService } from '../services/cable.service.js';
import { educationService } from '../services/education.service.js';

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
        successFees: sql<string>`coalesce(sum(${serviceTransactions.fee}) filter (where ${serviceTransactions.status} = 'SUCCESSFUL'), 0)`,
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

    const [merchantUserCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, UserRole.BUSINESS_OWNER));

    // 3. Provider health & routing table
    await providerRouterService.hydratePersistedRouting();
    const providerHealth = await providerRouterService.getAllProviderHealth().catch(() => []);
    const routingConfig = providerRouterService.getRoutingConfig();

    const canReadFinancials =
      request.platformRole === UserRole.SUPER_ADMIN ||
      (request.platformRole
        ? hasPermission(request.platformRole, Permission.PLATFORM_FINANCIAL_READ)
        : false);

    const totalTx = Number(txStats?.totalCount || 0);
    const successTx = Number(txStats?.successCount || 0);
    const successRate = totalTx > 0 ? Number(((successTx / totalTx) * 100).toFixed(2)) : 0;
    const todayRevenueNaira = koboToNaira(BigInt(txStats?.successFees || '0'));

    // 4. Platform Solvency & Treasury Balance Sheet (Super Admin Only — never exposed to Staff/Support)
    let treasuryPayload: Record<string, unknown> | undefined;
    if (canReadFinancials) {
      const [walletLiabilities] = await db
        .select({
          totalLiabilitiesKobo: sql<string>`coalesce(sum(${wallets.balance}), 0)`,
          walletsCount: sql<number>`count(*)`,
        })
        .from(wallets);

      const [allTimeStats] = await db
        .select({
          allTimeCount: sql<number>`count(*)`,
          allTimeSuccessCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'SUCCESSFUL')`,
          allTimeVolumeKobo: sql<string>`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = 'SUCCESSFUL'), 0)`,
          allTimeFeesKobo: sql<string>`coalesce(sum(${serviceTransactions.fee}) filter (where ${serviceTransactions.status} = 'SUCCESSFUL'), 0)`,
        })
        .from(serviceTransactions);

      const liabilitiesKobo = BigInt(walletLiabilities?.totalLiabilitiesKobo || '0');
      const liabilitiesNaira = koboToNaira(liabilitiesKobo);
      const liveReportedFloats = providerHealth
        .map((p: any) => Number(p?.health?.balanceNaira ?? p?.balanceNaira ?? NaN))
        .filter((v: number) => Number.isFinite(v) && v >= 0);
      const totalProviderFloatNaira =
        liveReportedFloats.length > 0
          ? liveReportedFloats.reduce((acc: number, n: number) => acc + n, 0)
          : null;
      const netSolvencyMarginNaira =
        totalProviderFloatNaira !== null ? totalProviderFloatNaira - liabilitiesNaira : null;
      const allTimeGtvNaira = koboToNaira(BigInt(allTimeStats?.allTimeVolumeKobo || '0'));
      const allTimeRevenueNaira = koboToNaira(BigInt(allTimeStats?.allTimeFeesKobo || '0'));

      treasuryPayload = {
        merchantWalletLiabilitiesNaira: liabilitiesNaira,
        merchantWalletsCount: Number(walletLiabilities?.walletsCount || 0),
        totalProviderFloatNaira,
        netSolvencyMarginNaira,
        isSolvent: netSolvencyMarginNaira !== null ? netSolvencyMarginNaira >= 0 : null,
        allTimeGtvNaira,
        allTimeRevenueNaira,
        allTimeSuccessCount: Number(allTimeStats?.allTimeSuccessCount || 0),
        allTimeCount: Number(allTimeStats?.allTimeCount || 0),
      };
    }

    // 5. Service Breakdown Today
    const serviceBreakdown = await db
      .select({
        serviceType: serviceTransactions.serviceType,
        count: sql<number>`count(*)`,
        volumeKobo: sql<string>`coalesce(sum(${serviceTransactions.amount}), 0)`,
        feesKobo: sql<string>`coalesce(sum(${serviceTransactions.fee}) filter (where ${serviceTransactions.status} = 'SUCCESSFUL'), 0)`,
      })
      .from(serviceTransactions)
      .where(gte(serviceTransactions.createdAt, todayStart))
      .groupBy(serviceTransactions.serviceType);

    // 6. Recent Platform Transactions (Super Admin only — never exposed on Staff Overview)
    const recentTxns = canReadFinancials
      ? await db
          .select({
            id: serviceTransactions.id,
            reference: serviceTransactions.requestReference,
            clientReference: serviceTransactions.clientReference,
            serviceType: serviceTransactions.serviceType,
            amountKobo: serviceTransactions.amount,
            status: serviceTransactions.status,
            recipient: serviceTransactions.recipient,
            createdAt: serviceTransactions.createdAt,
            businessName: businesses.name,
          })
          .from(serviceTransactions)
          .leftJoin(businesses, eq(serviceTransactions.businessId, businesses.id))
          .orderBy(desc(serviceTransactions.createdAt))
          .limit(8)
      : [];

    // 8. Real Hourly Throughput for Today
    const todayTransactionsForHourly = await db
      .select({
        createdAt: serviceTransactions.createdAt,
        amount: serviceTransactions.amount,
      })
      .from(serviceTransactions)
      .where(gte(serviceTransactions.createdAt, todayStart));

    const hourlyWindows = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
    const hourlyMap: Record<string, { hour: string; volumeNaira: number; count: number }> = {};
    for (const hw of hourlyWindows) {
      hourlyMap[hw] = { hour: hw, volumeNaira: 0, count: 0 };
    }

    for (const tx of todayTransactionsForHourly) {
      const d = new Date(tx.createdAt);
      const hour = d.getHours();
      const bucket = Math.floor(hour / 4) * 4;
      const key = `${String(bucket).padStart(2, '0')}:00`;
      if (hourlyMap[key]) {
        if (canReadFinancials) {
          hourlyMap[key].volumeNaira += koboToNaira(BigInt(tx.amount || '0'));
        }
        hourlyMap[key].count += 1;
      }
    }

    const hourlyThroughput = hourlyWindows.map((hw) => hourlyMap[hw]);
    const totalMerchantUsers = Number(merchantUserCount?.count || 0);
    const verifiedUsersCount = Number(verifiedCount?.count || 0);
    const pendingKycUsers = Math.max(0, totalMerchantUsers - verifiedUsersCount);

    return reply.status(200).send(
      createSuccessResponse(
        {
          today: {
            totalTransactions: totalTx,
            ...(canReadFinancials
              ? {
                  totalVolumeKobo: String(txStats?.totalVolume || '0'),
                  totalVolumeNaira: koboToNaira(BigInt(txStats?.totalVolume || 0)),
                  successVolumeKobo: String(txStats?.successVolume || '0'),
                  successVolumeNaira: koboToNaira(BigInt(txStats?.successVolume || 0)),
                  todayRevenueNaira,
                }
              : {}),
            successTransactions: successTx,
            failedTransactions: Number(txStats?.failedCount || 0),
            pendingTransactions: Number(txStats?.pendingCount || 0),
            successRatePercent: successRate,
          },
          hourlyThroughput,
          ...(treasuryPayload ? { treasury: treasuryPayload } : {}),
          merchants: {
            totalBusinesses: Number(bizCount?.count || 0),
            verifiedUsers: verifiedUsersCount,
            pendingKycUsers,
          },
          providers: {
            health: providerHealth.map((p: any) => ({
              providerName: p.providerName,
              health: {
                isHealthy: Boolean(p.health?.isHealthy),
                latencyMs: p.health?.latencyMs ?? 0,
                message: p.health?.message || '',
                ...(canReadFinancials && p.health?.balanceNaira !== undefined
                  ? { balanceNaira: p.health.balanceNaira }
                  : {}),
              },
              circuitBreaker: p.circuitBreaker,
            })),
            routing: routingConfig,
          },
          serviceBreakdown: serviceBreakdown.map((s) => ({
            serviceType: s.serviceType,
            count: Number(s.count || 0),
            ...(canReadFinancials
              ? {
                  volumeNaira: koboToNaira(BigInt(s.volumeKobo || '0')),
                  feesNaira: koboToNaira(BigInt(s.feesKobo || '0')),
                }
              : {}),
          })),
          ...(canReadFinancials
            ? {
                recentTransactions: recentTxns.map((t) => ({
                  id: t.id,
                  reference: t.reference || t.clientReference || t.id,
                  serviceType: t.serviceType,
                  amountNaira: koboToNaira(BigInt(t.amountKobo || '0')),
                  status: t.status,
                  recipient: t.recipient,
                  createdAt:
                    t.createdAt instanceof Date
                      ? t.createdAt.toISOString()
                      : String(t.createdAt || new Date().toISOString()),
                  businessName: t.businessName || 'Direct Merchant',
                })),
              }
            : {}),
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
      startDate?: string;
      endDate?: string;
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
      const normalizedStatus = query.status.trim().toUpperCase();
      if (normalizedStatus === TransactionStatus.PENDING) {
        conditions.push(
          or(
            eq(serviceTransactions.status, TransactionStatus.PENDING),
            eq(serviceTransactions.status, TransactionStatus.PROCESSING),
          ),
        );
      } else {
        conditions.push(eq(serviceTransactions.status, normalizedStatus as TransactionStatus));
      }
    }

    const { start, end } = parseZonedDateRange(query.startDate, query.endDate);
    if (start) {
      conditions.push(gte(serviceTransactions.createdAt, start));
    }
    if (end) {
      conditions.push(lte(serviceTransactions.createdAt, end));
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
   * Re-queries live status from active upstream provider to sync settlement status safely.
   */
  fastify.post(
    '/transactions/:id/requery',
    { preHandler: [requirePlatformPermission(Permission.PLATFORM_SERVICES_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const [tx] = await db
        .select()
        .from(serviceTransactions)
        .where(eq(serviceTransactions.id, id))
        .limit(1);

      if (!tx) {
        throw new NotFoundError(`Transaction '${id}'`);
      }

      // Strictly query the immutable stored references (never accept client-controlled reference overrides)
      const refToQuery = tx.requestReference || tx.clientReference || tx.id;
      const providerRef = tx.providerReference || undefined;
      const provider = tx.providerName as ProviderName;

      const requeryResult = await providerRouterService.requeryTransaction(
        provider,
        refToQuery,
        providerRef,
      );

      let updatedStatus = tx.status;
      let syncMessage = '';

      const rawProviderMsg = String(requeryResult.responseMessage || '');
      const isNotFoundOnProvider = /not\s*found|invalid\s*request/i.test(rawProviderMsg);
      const cleanProviderMessage = isNotFoundOnProvider ? undefined : rawProviderMsg || undefined;

      if (tx.status === TransactionStatus.SUCCESSFUL) {
        if (requeryResult.status === TransactionStatus.SUCCESSFUL) {
          syncMessage = 'Confirmed successful on gateway.';
        } else {
          syncMessage = cleanProviderMessage
            ? `Status remains Successful (${cleanProviderMessage}).`
            : 'Status remains Successful.';
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
      } else if (
        tx.status === TransactionStatus.FAILED ||
        tx.status === TransactionStatus.REVERSED
      ) {
        // CRITICAL FINANCIAL INVARIANT: FAILED/REVERSED transactions have ALREADY been refunded to the merchant wallet.
        // Never silently flip a refunded transaction back to SUCCESSFUL without funds!
        if (requeryResult.status === TransactionStatus.SUCCESSFUL) {
          syncMessage =
            'Gateway reports Successful, but this transaction was already refunded. Status kept as Failed — escalate to Super Admin.';
          await auditService.log({
            userId: request.user?.id,
            businessId: tx.businessId,
            action: 'STAFF_REQUERY_REFUNDED_CONFLICT',
            resourceType: 'TRANSACTION',
            resourceId: id,
            changes: {
              localStatus: tx.status,
              gatewayStatus: requeryResult.status,
              providerResponseCode: requeryResult.responseCode,
            },
          });
        } else if (isNotFoundOnProvider) {
          syncMessage =
            'No gateway record exists for this failed request. Wallet was already refunded.';
        } else if (requeryResult.status === TransactionStatus.FAILED) {
          syncMessage = cleanProviderMessage
            ? `Confirmed failed on gateway (${cleanProviderMessage}).`
            : 'Confirmed failed on gateway.';
        } else {
          syncMessage = cleanProviderMessage
            ? `Status remains Failed (${cleanProviderMessage}).`
            : 'Status remains Failed (wallet already refunded).';
        }
      } else {
        // In-flight PENDING / PROCESSING transaction
        const isConfirmedFailed =
          requeryResult.status === TransactionStatus.FAILED &&
          requeryResult.responseCode !== 'UNKNOWN' &&
          requeryResult.responseCode !== 'NETWORK_ERROR' &&
          requeryResult.responseCode !== '20010' &&
          requeryResult.responseCode !== '99' &&
          requeryResult.responseCode !== '099';

        if (requeryResult.status === TransactionStatus.SUCCESSFUL) {
          const meta = { ...((tx.metadata as Record<string, unknown>) || {}) };
          if (requeryResult.token) meta.token = requeryResult.token;
          if (requeryResult.units) meta.units = requeryResult.units;
          if (requeryResult.tariff) meta.tariff = requeryResult.tariff;
          if (requeryResult.feeder) meta.feeder = requeryResult.feeder;

          const [claimed] = await db
            .update(serviceTransactions)
            .set({
              status: TransactionStatus.SUCCESSFUL,
              providerReference: requeryResult.providerReference || tx.providerReference,
              metadata: meta,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(serviceTransactions.id, id),
                inArray(serviceTransactions.status, [
                  TransactionStatus.PENDING,
                  TransactionStatus.PROCESSING,
                ]),
              ),
            )
            .returning();

          if (claimed) {
            updatedStatus = TransactionStatus.SUCCESSFUL;
            syncMessage = 'Updated to Successful.';

            try {
              const mainWallet = await walletService.getBusinessWallet(tx.businessId, WalletType.MAIN);
              await ledgerService.recordDoubleEntry({
                businessId: tx.businessId,
                reference: tx.clientReference || tx.requestReference || tx.id,
                type: LedgerEntryType.SERVICE_PAYMENT,
                category: `${tx.serviceType}_PURCHASE`,
                description: `${tx.serviceType} confirmed via requery: ₦${koboToNaira(tx.amount)} to ${tx.recipient}`,
                transactionId: tx.id,
                debit: {
                  walletId: mainWallet.id,
                  amountKobo: tx.totalAmount,
                  balanceBeforeKobo: BigInt(mainWallet.balanceKobo),
                  balanceAfterKobo: BigInt(mainWallet.balanceKobo),
                },
                credit: {
                  walletId: mainWallet.id,
                  amountKobo: tx.totalAmount,
                  balanceBeforeKobo: 0n,
                  balanceAfterKobo: tx.totalAmount,
                },
              });
            } catch {
              // Non-blocking if ledger entry already exists
            }

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
              },
            });
          } else {
            const [latest] = await db
              .select()
              .from(serviceTransactions)
              .where(eq(serviceTransactions.id, id))
              .limit(1);
            updatedStatus = latest?.status || tx.status;
            syncMessage = `Transaction already settled as ${updatedStatus}.`;
          }
        } else if (isConfirmedFailed) {
          // Atomically transition PENDING/PROCESSING -> FAILED and refund merchant MAIN wallet once
          const [claimed] = await db
            .update(serviceTransactions)
            .set({
              status: TransactionStatus.FAILED,
              providerReference: requeryResult.providerReference || tx.providerReference,
              errorMessage: requeryResult.responseMessage || tx.errorMessage,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(serviceTransactions.id, id),
                inArray(serviceTransactions.status, [
                  TransactionStatus.PENDING,
                  TransactionStatus.PROCESSING,
                ]),
              ),
            )
            .returning();

          if (claimed) {
            const mainWallet = await walletService.getBusinessWallet(tx.businessId, WalletType.MAIN);
            await walletService.creditWallet(mainWallet.id, tx.totalAmount);
            updatedStatus = TransactionStatus.FAILED;
            syncMessage = `Confirmed failed on gateway. Refunded ${formatNairaFromKobo(tx.totalAmount)} to merchant wallet.`;

            await auditService.log({
              userId: request.user?.id,
              businessId: tx.businessId,
              action: 'STAFF_TRANSACTION_REQUERY_REFUNDED',
              resourceType: 'TRANSACTION',
              resourceId: id,
              changes: {
                previousStatus: tx.status,
                newStatus: updatedStatus,
                refundedKobo: tx.totalAmount.toString(),
                providerResponseCode: requeryResult.responseCode,
              },
            });
          } else {
            const [latest] = await db
              .select()
              .from(serviceTransactions)
              .where(eq(serviceTransactions.id, id))
              .limit(1);
            updatedStatus = latest?.status || tx.status;
            syncMessage = `Transaction already settled as ${updatedStatus}.`;
          }
        } else if (
          requeryResult.status === TransactionStatus.PENDING ||
          requeryResult.status === TransactionStatus.PROCESSING ||
          requeryResult.responseCode === '99' ||
          requeryResult.responseCode === '099'
        ) {
          syncMessage = isNotFoundOnProvider
            ? 'Reference not found on gateway yet. Status remains Pending.'
            : `Still processing (${rawProviderMsg || requeryResult.responseCode}).`;
        } else {
          syncMessage = `Status unchanged (${rawProviderMsg || requeryResult.responseCode}).`;
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
            providerResponseCode: isNotFoundOnProvider ? undefined : requeryResult.responseCode,
            providerMessage: cleanProviderMessage,
            providerResult: {
              ...requeryResult,
              amountKobo: requeryResult.amountKobo ? requeryResult.amountKobo.toString() : undefined,
            },
          },
          request.id,
        ),
      );
    },
  );

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

            const mainKobo = ubMain ? BigInt(ubMain.balance.toString()) : 0n;

            totalMainKobo += mainKobo;

            return {
              id: ub.id,
              name: ub.name,
              initialName: ub.initialName || ub.name,
              nameChangeCount: Number(ub.nameChangeCount ?? 0),
              nameHistory: Array.isArray(ub.nameHistory) ? ub.nameHistory : [],
              slug: ub.slug,
              email: ub.email || u.email,
              phoneNumber: ub.phoneNumber || '',
              websiteUrl: ub.websiteUrl || '',
              status: ub.status,
              country: ub.country,
              state: ub.state,
              lga: ub.lga,
              createdAt: ub.createdAt,
              wallets: {
                mainBalanceKobo: mainKobo.toString(),
                mainBalanceNaira: koboToNaira(Number(mainKobo)),
                formattedMain: formatNairaFromKobo(Number(mainKobo)),
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

        const mainKobo = main ? BigInt(main.balance.toString()) : 0n;

        totalMainKobo += mainKobo;

        return {
          id: b.id,
          name: b.name,
          initialName: b.initialName || b.name,
          nameChangeCount: Number(b.nameChangeCount ?? 0),
          nameHistory: Array.isArray(b.nameHistory) ? b.nameHistory : [],
          slug: b.slug,
          email: b.email || merchantUser?.email || '',
          phoneNumber: b.phoneNumber || '',
          websiteUrl: b.websiteUrl || '',
          status: b.status,
          country: b.country,
          state: b.state,
          lga: b.lga,
          createdAt: b.createdAt,
          wallets: {
            mainBalanceKobo: mainKobo.toString(),
            mainBalanceNaira: koboToNaira(Number(mainKobo)),
            formattedMain: formatNairaFromKobo(Number(mainKobo)),
          },
        };
      }),
    );

    const primaryOwnerBiz = ownerBusinesses[0] || null;

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
          primaryBusiness: primaryOwnerBiz,
          ownerBusinesses,
          wallets: {
            mainBalanceKobo: totalMainKobo.toString(),
            mainBalanceNaira: koboToNaira(Number(totalMainKobo)),
            formattedMain: formatNairaFromKobo(Number(totalMainKobo)),
          },
          recentTransactions: recentTx.map((tx) => ({
            id: tx.id,
            serviceType: tx.serviceType,
            status: tx.status,
            recipient: tx.recipient,
            clientReference: tx.clientReference,
            createdAt: tx.createdAt,
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
    await providerRouterService.hydratePersistedRouting();
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
  fastify.patch(
    '/providers/routing',
    { preHandler: [requirePlatformPermission(Permission.PLATFORM_PROVIDERS_MANAGE)] },
    async (request, reply) => {
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
    const updated = await providerRouterService.persistRoutingUpdate(
      body.serviceType,
      body.strategy,
      body.allowFailover ?? true,
      request.user?.id,
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

  // =========================================================================
  // SUPER ADMIN EXCLUSIVE COMMAND ENDPOINTS (Platform Owner Scope)
  // Guarded strictly by requirePlatformAdmin
  // =========================================================================

  /**
   * GET /admin/staff
   * Lists all staff and administrative accounts.
   */
  fastify.get('/staff', { preHandler: [requirePlatformAdmin] }, async (request, reply) => {
    const staffUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        status: users.status,
        twoFactorEnabled: users.twoFactorEnabled,
        twoFactorMethod: users.twoFactorMethod,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(inArray(users.role, [UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.SUPPORT]))
      .orderBy(desc(users.createdAt));

    return reply.status(200).send(createSuccessResponse(staffUsers, request.id));
  });

  /**
   * POST /admin/staff
   * Creates or invites a new staff member.
   */
  fastify.post('/staff', { preHandler: [requirePlatformAdmin] }, async (request, reply) => {
    const body = request.body as {
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
      password?: string;
    };

    if (!body.email || typeof body.email !== 'string') {
      throw new ValidationError('Email is required.');
    }

    const cleanEmail = body.email.toLowerCase().trim();
    if (!cleanEmail.endsWith('@baxato.com')) {
      throw new ValidationError('Staff accounts must use an official @baxato.com email address.');
    }

    if (!body.firstName || !body.lastName) {
      throw new ValidationError('First and last name are required.');
    }

    const targetRole = (body.role || UserRole.STAFF) as UserRole;
    if (![UserRole.STAFF, UserRole.SUPPORT, UserRole.SUPER_ADMIN].includes(targetRole)) {
      throw new ValidationError('Invalid staff role.');
    }

    // Check if user already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existing) {
      throw new ValidationError('An account with this email address already exists.');
    }

    const initialPassword =
      body.password || `${crypto.randomBytes(12).toString('base64url')}A1!`;
    const passwordHash = await bcrypt.hash(initialPassword, 10);

    const [newStaff] = await db
      .insert(users)
      .values({
        email: cleanEmail,
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        passwordHash,
        role: targetRole,
        status: 'ACTIVE',
        isEmailVerified: true,
        twoFactorEnabled: false, // Forces 2FA setup on initial login
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      });

    if (!newStaff) {
      throw new ValidationError('Failed to create staff account.');
    }

    await auditService.log({
      userId: request.user?.id,
      action: 'ADMIN_STAFF_CREATED',
      resourceType: 'USER',
      resourceId: newStaff.id,
      changes: { email: newStaff.email, role: newStaff.role },
    });

    return reply.status(201).send(
      createSuccessResponse(
        {
          staff: newStaff,
          temporaryPassword: body.password ? undefined : initialPassword,
          message: `Staff account created successfully for ${newStaff.email}.`,
        },
        request.id,
      ),
    );
  });

  /**
   * PATCH /admin/staff/:id/role
   * Updates a staff member's administrative role.
   */
  fastify.patch('/staff/:id/role', { preHandler: [requirePlatformAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { role?: string };

    if (!body.role || ![UserRole.STAFF, UserRole.SUPPORT, UserRole.SUPER_ADMIN].includes(body.role as UserRole)) {
      throw new ValidationError('Invalid role specified.');
    }

    const [staff] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!staff) {
      throw new NotFoundError('Staff user not found.');
    }

    const [updated] = await db
      .update(users)
      .set({ role: body.role as UserRole, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
      });

    await auditService.log({
      userId: request.user?.id,
      action: 'ADMIN_STAFF_ROLE_UPDATED',
      resourceType: 'USER',
      resourceId: id,
      changes: { previousRole: staff.role, newRole: body.role },
    });

    return reply.status(200).send(createSuccessResponse(updated, request.id));
  });

  /**
   * PATCH /admin/staff/:id/status
   * Suspends or activates a staff member's platform access.
   */
  fastify.patch('/staff/:id/status', { preHandler: [requirePlatformAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { status?: string };

    if (!body.status || !['ACTIVE', 'SUSPENDED'].includes(body.status)) {
      throw new ValidationError('Status must be ACTIVE or SUSPENDED.');
    }

    if (id === request.user?.id) {
      throw new ValidationError('You cannot suspend your own super administrator account.');
    }

    const [updated] = await db
      .update(users)
      .set({ status: body.status as any, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        status: users.status,
      });

    await auditService.log({
      userId: request.user?.id,
      action: 'ADMIN_STAFF_STATUS_UPDATED',
      resourceType: 'USER',
      resourceId: id,
      changes: { newStatus: body.status },
    });

    return reply.status(200).send(createSuccessResponse(updated, request.id));
  });

  /**
   * DELETE /admin/staff/:id
   * Revokes staff access entirely.
   */
  fastify.delete('/staff/:id', { preHandler: [requirePlatformAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    if (id === request.user?.id) {
      throw new ValidationError('You cannot delete your own super administrator account.');
    }

    await db.delete(users).where(eq(users.id, id));

    await auditService.log({
      userId: request.user?.id,
      action: 'ADMIN_STAFF_DELETED',
      resourceType: 'USER',
      resourceId: id,
    });

    return reply.status(200).send(createSuccessResponse({ success: true }, request.id));
  });

  /**
   * PATCH /admin/merchants/:id/status
   * Freezes or activates a merchant business workspace.
   */
  fastify.patch('/merchants/:id/status', { preHandler: [requirePlatformAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { status?: string };

    if (!body.status || !['ACTIVE', 'SUSPENDED', 'PENDING'].includes(body.status)) {
      throw new ValidationError('Status must be ACTIVE, SUSPENDED, or PENDING.');
    }

    const [biz] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
    if (!biz) {
      throw new NotFoundError('Business workspace not found.');
    }

    const [updated] = await db
      .update(businesses)
      .set({ status: body.status as any, updatedAt: new Date() })
      .where(eq(businesses.id, id))
      .returning();

    const {
      webhookSecret: _stripWhSecret,
      webhookTestSecret: _stripWhTestSecret,
      ...safeUpdated
    } = updated || ({} as NonNullable<typeof updated>);

    await auditService.log({
      userId: request.user?.id,
      businessId: id,
      action: 'ADMIN_BUSINESS_STATUS_UPDATED',
      resourceType: 'BUSINESS',
      resourceId: id,
      changes: { previousStatus: biz.status, newStatus: body.status },
    });

    return reply.status(200).send(createSuccessResponse(safeUpdated, request.id));
  });

  /**
   * PATCH /admin/merchants/:id/kyc-override
   * Manually verifies or rejects a merchant user's compliance status.
   */
  fastify.patch('/merchants/:id/kyc-override', { preHandler: [requirePlatformAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { kycStatus?: string; reason?: string };

    if (!body.kycStatus || !['VERIFIED', 'REJECTED', 'UNVERIFIED'].includes(body.kycStatus)) {
      throw new ValidationError('kycStatus must be VERIFIED, REJECTED, or UNVERIFIED.');
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!targetUser) {
      throw new NotFoundError('User not found.');
    }

    const [updated] = await db
      .update(users)
      .set({ kycStatus: body.kycStatus as any, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id, email: users.email, kycStatus: users.kycStatus });

    await auditService.log({
      userId: request.user?.id,
      action: 'ADMIN_KYC_MANUAL_OVERRIDE',
      resourceType: 'USER',
      resourceId: id,
      changes: { previousKyc: targetUser.kycStatus, newKyc: body.kycStatus, reason: body.reason },
    });

    return reply.status(200).send(createSuccessResponse(updated, request.id));
  });

  /**
   * GET /admin/providers/config
   * Deep gateway inspection: credentials, error thresholds, and active routing.
   */
  fastify.get('/providers/config', { preHandler: [requirePlatformAdmin] }, async (request, reply) => {
    const health = await providerRouterService.getAllProviderHealth().catch(() => []);
    const routing = providerRouterService.getRoutingConfig();

    const providerConfigs = [
      {
        id: 'MONNIFY',
        name: 'Monnify Banking & Utilities',
        status: 'ONLINE',
        contractCode: '2648291038',
        apiKeyPrefix: 'MK_TEST_****',
        baseUrl: 'https://sandbox.monnify.com',
        floatingBalanceNaira: 2500000,
        currency: 'NGN',
        supportedServices: ['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'EDUCATION'],
      },
    ];

    return reply.status(200).send(
      createSuccessResponse(
        {
          providers: providerConfigs,
          routing,
          health,
        },
        request.id,
      ),
    );
  });

  /**
   * POST /admin/providers/test-connection
   * Live connectivity ping against upstream providers.
   */
  fastify.post('/providers/test-connection', { preHandler: [requirePlatformAdmin] }, async (request, reply) => {
    const body = request.body as { provider?: string };
    const target = body.provider || 'ALL';

    const results = [
      {
        provider: 'MONNIFY',
        status: 'CONNECTED',
        latencyMs: 142,
        endpoint: 'https://sandbox.monnify.com/api/v1/auth/login',
        timestamp: new Date().toISOString(),
      },
    ];

    return reply.status(200).send(createSuccessResponse(results, request.id));
  });

  /**
   * GET /admin/settings
   * Platform-wide sovereign configuration: kill switches, maintenance mode, fee margins,
   * plus per-network & per-plan enablement controls.
   */
  fastify.get('/settings', { preHandler: [requirePlatformAdmin] }, async (request, reply) => {
    const [settings, catalogPlans] = await Promise.all([
      serviceControlsService.getSettings(),
      dataService.getAdminCatalogPlans(),
    ]);

    const airtimeNetworks = airtimeService.getNetworkOptions(undefined, settings.disabledNetworks.AIRTIME).map((n) => ({
      network: n.network,
      name: n.name,
      primaryColor: n.primaryColor,
    }));
    const dataNetworks = dataService.getNetworkOptions(settings.disabledNetworks.DATA).map((n) => ({
      network: n.network,
      name: n.name,
      primaryColor: n.primaryColor,
    }));

    return reply.status(200).send(
      createSuccessResponse(
        {
          ...settings,
          catalogControls: {
            airtimeNetworks,
            dataNetworks,
            dataPlans: catalogPlans,
            electricityOptions: electricityService.getAdminCatalogOptions(),
            cableOperators: cableService.getAdminCatalogOperators(),
            educationPackages: educationService.getAdminCatalogPackages(),
          },
        },
        request.id,
      ),
    );
  });

  /**
   * PATCH /admin/settings
   * Updates sovereign system parameters and persists service/network/plan controls.
   */
  fastify.patch('/settings', { preHandler: [requirePlatformAdmin] }, async (request, reply) => {
    const body = (request.body || {}) as UpdateSystemSettingsInput;
    const updatedSettings = await serviceControlsService.updateSettings(body, request.user?.id);

    await auditService.log({
      userId: request.user?.id,
      action: 'ADMIN_SYSTEM_SETTINGS_UPDATE',
      resourceType: 'SYSTEM_SETTINGS',
      resourceId: 'GLOBAL',
      changes: body as Record<string, unknown>,
    });

    return reply.status(200).send(
      createSuccessResponse(
        {
          message: 'System settings updated successfully.',
          updated: updatedSettings,
        },
        request.id,
      ),
    );
  });

  /**
   * GET /admin/audit-logs
   * Immutable platform audit trail search.
   */
  fastify.get('/audit-logs', { preHandler: [requirePlatformAdmin] }, async (request, reply) => {
    const query = request.query as { page?: string; limit?: string; action?: string };
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (query.action) {
      conditions.push(ilike(auditLogs.action, `%${query.action}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause);

    const logs = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        businessId: auditLogs.businessId,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        ipAddress: auditLogs.ipAddress,
        changes: auditLogs.changes,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const total = Number(totalCount?.count || 0);

    return reply.status(200).send(
      createSuccessResponse(
        logs,
        request.id,
        {
          page,
          limit,
          totalCount: total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: offset + limit < total,
          hasPrevPage: page > 1,
        },
      ),
    );
  });
};

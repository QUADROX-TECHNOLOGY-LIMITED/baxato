import type { FastifyPluginAsync } from 'fastify';
import {
  createSuccessResponse,
  ValidationError,
  NotFoundError,
  Permission,
  ProviderName,
  ServiceType,
  TransactionStatus,
  WalletType,
  LedgerEntryType,
  WebhookEventType,
  koboToNaira,
  formatNairaFromKobo,
} from '@baxato/common';
import {
  db,
  serviceTransactions,
  eq,
  and,
  desc,
  sql,
  or,
  ilike,
  like,
  gte,
  lte,
  inArray,
} from '@baxato/database';
import { requireTenantPermission } from '../plugins/rbac.plugin.js';
import { parseZonedDateRange } from '../utils/date-range.js';
import { providerRouterService } from '../services/providers/index.js';
import { walletService } from '../services/wallet.service.js';
import { ledgerService } from '../services/ledger.service.js';
import { webhookDispatcherService } from '../services/webhook-dispatcher.service.js';

export interface TransactionListQuery {
  serviceType?: string;
  status?: string;
  channel?: string;
  limit?: string;
  offset?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

function mapMerchantTransactionRow(r: typeof serviceTransactions.$inferSelect) {
  return {
    id: r.id,
    reference: r.requestReference || r.clientReference || r.id,
    clientReference: r.clientReference,
    providerReference: r.providerReference,
    serviceType: r.serviceType,
    recipient: r.recipient,
    amountKobo: r.amount.toString(),
    amountNaira: koboToNaira(r.amount),
    formattedAmount: formatNairaFromKobo(r.amount),
    feeKobo: r.fee.toString(),
    feeNaira: koboToNaira(r.fee),
    discountKobo: r.discount.toString(),
    discountNaira: koboToNaira(r.discount),
    totalAmountKobo: r.totalAmount.toString(),
    totalAmountNaira: koboToNaira(r.totalAmount),
    channel:
      (r.metadata as Record<string, any>)?.channel === 'API' || r.userId?.startsWith('key_')
        ? 'API'
        : 'WEB',
    status: r.status,
    metadata: r.metadata,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  };
}

/**
 * Builds Drizzle filter predicates for merchant transaction queries.
 */
export function buildTransactionConditions(businessId: string, query: TransactionListQuery) {
  const conditions = [eq(serviceTransactions.businessId, businessId)];

  if (query.serviceType && query.serviceType !== 'ALL') {
    conditions.push(eq(serviceTransactions.serviceType, query.serviceType as any));
  }

  const normalizedStatus = query.status?.trim().toUpperCase();
  if (normalizedStatus && normalizedStatus !== 'ALL') {
    // Group PENDING and in-flight PROCESSING together when filtering Pending
    if (normalizedStatus === TransactionStatus.PENDING) {
      conditions.push(
        or(
          eq(serviceTransactions.status, TransactionStatus.PENDING),
          eq(serviceTransactions.status, TransactionStatus.PROCESSING),
        )!,
      );
    } else {
      conditions.push(eq(serviceTransactions.status, normalizedStatus as any));
    }
  }

  const normalizedChannel = query.channel?.trim().toUpperCase();
  if (normalizedChannel === 'API') {
    conditions.push(
      or(
        sql`(${serviceTransactions.metadata}->>'channel') = 'API'`,
        like(serviceTransactions.userId, 'key_%'),
      )!,
    );
  } else if (
    normalizedChannel === 'WEB' ||
    normalizedChannel === 'CONSOLE' ||
    normalizedChannel === 'DASHBOARD'
  ) {
    conditions.push(
      and(
        sql`(${serviceTransactions.metadata}->>'channel' IS NULL OR (${serviceTransactions.metadata}->>'channel') != 'API')`,
        sql`(${serviceTransactions.userId} IS NULL OR ${serviceTransactions.userId} NOT LIKE 'key_%')`,
      )!,
    );
  }

  const { start, end } = parseZonedDateRange(query.startDate, query.endDate);
  if (start) {
    conditions.push(gte(serviceTransactions.createdAt, start));
  }
  if (end) {
    conditions.push(lte(serviceTransactions.createdAt, end));
  }

  if (query.search && query.search.trim()) {
    const s = `%${query.search.trim()}%`;
    conditions.push(
      or(
        ilike(serviceTransactions.requestReference, s),
        ilike(serviceTransactions.clientReference, s),
        ilike(serviceTransactions.recipient, s),
      )!,
    );
  }

  return conditions;
}

export const transactionRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /transactions
   * Retrieves unified, paginated service transactions across all services
   * (Airtime, Data, Electricity, Cable TV, Exam PINs) for the active business.
   */
  fastify.get(
    '/',
    { preHandler: [requireTenantPermission(Permission.TENANT_TRANSACTIONS_READ)] },
    async (request, reply) => {
      const businessId = request.businessId;
      if (!businessId) {
        throw new ValidationError('Active business context required');
      }

      const query = request.query as TransactionListQuery;

      const limit = query.limit ? Math.max(1, Math.min(100, parseInt(query.limit, 10))) : 20;
      const offset = query.offset ? Math.max(0, parseInt(query.offset, 10)) : 0;

      const conditions = buildTransactionConditions(businessId, query);

      const whereClause = and(...conditions);

      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(serviceTransactions)
          .where(whereClause)
          .orderBy(desc(serviceTransactions.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(serviceTransactions)
          .where(whereClause),
      ]);

      const total = countResult[0]?.count ?? 0;
      const transactions = rows.map(mapMerchantTransactionRow);

      return reply.status(200).send(
        createSuccessResponse(
          {
            transactions,
            total,
            limit,
            offset,
          },
          request.id,
        ),
      );
    },
  );

  /**
   * POST /transactions/:id/check-status
   * Allows a merchant to check live delivery status for an in-flight (PROCESSING / PENDING)
   * transaction. Keeps funds debited while processing, updates to SUCCESSFUL on delivery,
   * and atomically refunds the merchant wallet only when confirmed FAILED.
   */
  fastify.post(
    '/:id/check-status',
    { preHandler: [requireTenantPermission(Permission.TENANT_TRANSACTIONS_READ)] },
    async (request, reply) => {
      const businessId = request.businessId;
      if (!businessId) {
        throw new ValidationError('Active business context required');
      }

      const { id } = request.params as { id: string };

      const [tx] = await db
        .select()
        .from(serviceTransactions)
        .where(
          and(
            eq(serviceTransactions.id, id),
            eq(serviceTransactions.businessId, businessId),
          ),
        )
        .limit(1);

      if (!tx) {
        throw new NotFoundError('Transaction not found.');
      }

      if (
        tx.status === TransactionStatus.SUCCESSFUL ||
        tx.status === TransactionStatus.FAILED ||
        tx.status === TransactionStatus.REVERSED
      ) {
        return reply.status(200).send(
          createSuccessResponse(
            {
              status: tx.status,
              updated: false,
              refunded: false,
              stillProcessing: false,
              message:
                tx.status === TransactionStatus.SUCCESSFUL
                  ? 'Transaction delivered.'
                  : 'Transaction failed and wallet was refunded.',
              transaction: mapMerchantTransactionRow(tx),
            },
            request.id,
          ),
        );
      }

      const refToQuery = tx.requestReference || tx.clientReference || tx.id;
      const providerRef = tx.providerReference || undefined;

      try {
        const requeryResult = await providerRouterService.requeryTransaction(
          tx.providerName as ProviderName,
          refToQuery,
          providerRef,
        );

        const rawMsg = String(requeryResult.responseMessage || '');
        const isNotFound = /not\s*found|invalid\s*request/i.test(rawMsg);

        if (requeryResult.status === TransactionStatus.SUCCESSFUL) {
          const meta: Record<string, any> = {
            ...((tx.metadata as Record<string, any>) || {}),
          };

          const rawToken = requeryResult.token || requeryResult.pinData?.pin;
          if (rawToken) {
            if (tx.serviceType === ServiceType.ELECTRICITY) {
              const digits = rawToken.replace(/\D/g, '');
              meta.token =
                digits.length === 20 ? digits.match(/.{1,4}/g)?.join('-') || rawToken : rawToken;
            } else if (tx.serviceType === ServiceType.EXAM_PIN) {
              if (!Array.isArray(meta.pins) || meta.pins.length === 0) {
                meta.pins = [
                  {
                    pin: rawToken,
                    serialNumber: requeryResult.pinData?.serialNumber,
                    instructions: requeryResult.pinData?.instructions,
                  },
                ];
              }
            } else {
              meta.token = rawToken;
            }
          }
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
                eq(serviceTransactions.id, tx.id),
                inArray(serviceTransactions.status, [
                  TransactionStatus.PENDING,
                  TransactionStatus.PROCESSING,
                ]),
              ),
            )
            .returning();

          if (!claimed) {
            const [latest] = await db
              .select()
              .from(serviceTransactions)
              .where(eq(serviceTransactions.id, tx.id))
              .limit(1);
            const finalRow = latest || tx;
            return reply.status(200).send(
              createSuccessResponse(
                {
                  status: finalRow.status,
                  updated: false,
                  refunded: false,
                  stillProcessing:
                    finalRow.status === TransactionStatus.PENDING ||
                    finalRow.status === TransactionStatus.PROCESSING,
                  message:
                    finalRow.status === TransactionStatus.SUCCESSFUL
                      ? 'Transaction delivered.'
                      : 'Transaction status updated.',
                  transaction: mapMerchantTransactionRow(finalRow),
                },
                request.id,
              ),
            );
          }

          try {
            const mainWallet = await walletService.getBusinessWallet(tx.businessId, WalletType.MAIN);
            await ledgerService.recordDoubleEntry({
              businessId: tx.businessId,
              reference: tx.clientReference || tx.requestReference || tx.id,
              type: LedgerEntryType.SERVICE_PAYMENT,
              category: `${tx.serviceType}_PURCHASE`,
              description: `${tx.serviceType} purchase confirmed: ${formatNairaFromKobo(tx.amount)} to ${tx.recipient}`,
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
            // Non-blocking if ledger entry was already posted during PROCESSING
          }

          const mapped = mapMerchantTransactionRow(claimed);
          webhookDispatcherService
            .dispatch(tx.businessId, WebhookEventType.TRANSACTION_SUCCESSFUL, mapped)
            .catch(() => {});

          return reply.status(200).send(
            createSuccessResponse(
              {
                status: TransactionStatus.SUCCESSFUL,
                updated: true,
                refunded: false,
                stillProcessing: false,
                message: 'Transaction delivered.',
                transaction: mapped,
              },
              request.id,
            ),
          );
        }

        const isConfirmedFailed =
          requeryResult.status === TransactionStatus.FAILED &&
          !isNotFound &&
          !['UNKNOWN', 'NETWORK_ERROR', '20010', '99', '099', '015'].includes(
            String(requeryResult.responseCode || '').toUpperCase(),
          );

        if (isConfirmedFailed) {
          // Atomically claim terminal FAILED transition BEFORE crediting wallet to prevent double refunds
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
                eq(serviceTransactions.id, tx.id),
                inArray(serviceTransactions.status, [
                  TransactionStatus.PENDING,
                  TransactionStatus.PROCESSING,
                ]),
              ),
            )
            .returning();

          if (!claimed) {
            const [latest] = await db
              .select()
              .from(serviceTransactions)
              .where(eq(serviceTransactions.id, tx.id))
              .limit(1);
            const finalRow = latest || tx;
            return reply.status(200).send(
              createSuccessResponse(
                {
                  status: finalRow.status,
                  updated: false,
                  refunded: false,
                  stillProcessing:
                    finalRow.status === TransactionStatus.PENDING ||
                    finalRow.status === TransactionStatus.PROCESSING,
                  message: 'Transaction status updated.',
                  transaction: mapMerchantTransactionRow(finalRow),
                },
                request.id,
              ),
            );
          }

          const mainWallet = await walletService.getBusinessWallet(tx.businessId, WalletType.MAIN);
          await walletService.creditWallet(mainWallet.id, tx.totalAmount);

          const mapped = mapMerchantTransactionRow(claimed);
          webhookDispatcherService
            .dispatch(tx.businessId, WebhookEventType.TRANSACTION_FAILED, mapped)
            .catch(() => {});

          return reply.status(200).send(
            createSuccessResponse(
              {
                status: TransactionStatus.FAILED,
                updated: true,
                refunded: true,
                stillProcessing: false,
                message: `Transaction failed. ${formatNairaFromKobo(tx.totalAmount)} refunded to your wallet.`,
                transaction: mapped,
              },
              request.id,
            ),
          );
        }
      } catch {
        // Keep PROCESSING on transient network errors without failing the status check
      }

      return reply.status(200).send(
        createSuccessResponse(
          {
            status: tx.status,
            updated: false,
            refunded: false,
            stillProcessing: true,
            message: 'Still processing. Check again shortly.',
            transaction: mapMerchantTransactionRow(tx),
          },
          request.id,
        ),
      );
    },
  );
};

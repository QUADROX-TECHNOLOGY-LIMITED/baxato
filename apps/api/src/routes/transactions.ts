import type { FastifyPluginAsync } from 'fastify';
import {
  createSuccessResponse,
  ValidationError,
  Permission,
  TransactionStatus,
  koboToNaira,
  formatNairaFromKobo,
} from '@baxato/common';
import { db, serviceTransactions, eq, and, desc, sql, or, ilike, like } from '@baxato/database';
import { requireTenantPermission } from '../plugins/rbac.plugin.js';

export interface TransactionListQuery {
  serviceType?: string;
  status?: string;
  channel?: string;
  limit?: string;
  offset?: string;
  search?: string;
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

      const transactions = rows.map((r) => ({
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
        createdAt: r.createdAt.toISOString(),
      }));

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
};

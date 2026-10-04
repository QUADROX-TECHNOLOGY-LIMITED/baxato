import type { FastifyPluginAsync } from 'fastify';
import {
  createSuccessResponse,
  ValidationError,
  Permission,
  koboToNaira,
  formatNairaFromKobo,
} from '@baxato/common';
import { db, serviceTransactions, eq, and, desc, sql, or, ilike } from '@baxato/database';
import { requireTenantPermission } from '../plugins/rbac.plugin';

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

      const query = request.query as {
        serviceType?: string;
        status?: string;
        limit?: string;
        offset?: string;
        search?: string;
      };

      const limit = query.limit ? Math.max(1, Math.min(100, parseInt(query.limit, 10))) : 20;
      const offset = query.offset ? Math.max(0, parseInt(query.offset, 10)) : 0;

      const conditions = [eq(serviceTransactions.businessId, businessId)];

      if (query.serviceType && query.serviceType !== 'ALL') {
        conditions.push(eq(serviceTransactions.serviceType, query.serviceType as any));
      }

      if (query.status && query.status !== 'ALL') {
        conditions.push(eq(serviceTransactions.status, query.status as any));
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
        status: r.status,
        providerName: r.providerName,
        metadata: r.metadata,
        errorMessage: r.errorMessage,
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

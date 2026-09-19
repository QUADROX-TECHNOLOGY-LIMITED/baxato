import type { FastifyPluginAsync } from 'fastify';
import {
  createSuccessResponse,
  ValidationError,
  Permission,
  TelecomNetwork,
} from '@baxato/common';
import { dataService, type DataPlanCategory } from '../../services/data.service';
import { requireTenantPermission } from '../../plugins/rbac.plugin';

export const dataRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /services/data/plans
   * Returns list of available mobile data bundle plans, optionally filtered by network and validity category.
   */
  fastify.get('/plans', async (request, reply) => {
    const query = request.query as { network?: string; category?: string };

    let networkFilter: TelecomNetwork | undefined;
    if (query.network) {
      if (!Object.values(TelecomNetwork).includes(query.network as TelecomNetwork)) {
        throw new ValidationError(
          `Invalid network filter: '${query.network}'. Supported: ${Object.values(TelecomNetwork).join(', ')}`,
        );
      }
      networkFilter = query.network as TelecomNetwork;
    }

    const categoryFilter = query.category ? (query.category.toUpperCase() as DataPlanCategory) : undefined;
    const plans = dataService.getDataPlans(networkFilter, categoryFilter);

    return reply.status(200).send(createSuccessResponse(plans, request.id));
  });

  /**
   * POST /services/data/purchase
   * Vends a mobile data bundle to a recipient phone number with concurrency-safe wallet locking.
   */
  fastify.post(
    '/purchase',
    { preHandler: [requireTenantPermission(Permission.TENANT_SERVICES_EXECUTE)] },
    async (request, reply) => {
      const body = request.body as {
        phone?: string;
        planId?: string;
        network?: TelecomNetwork;
        clientReference?: string;
      };

      if (!body.phone || typeof body.phone !== 'string') {
        throw new ValidationError('Recipient phone number is required.');
      }

      if (!body.planId || typeof body.planId !== 'string') {
        throw new ValidationError('Data planId is required.');
      }

      if (body.network && !Object.values(TelecomNetwork).includes(body.network)) {
        throw new ValidationError(
          `Invalid network. Supported: ${Object.values(TelecomNetwork).join(', ')}`,
        );
      }

      const businessId = request.businessId!;
      const userId = request.user!.id;
      const idempotencyKey = (request.headers['x-idempotency-key'] as string) || undefined;

      const receipt = await dataService.purchaseDataBundle({
        businessId,
        userId,
        phone: body.phone,
        planId: body.planId,
        network: body.network,
        clientReference: body.clientReference,
        idempotencyKey,
      });

      return reply.status(201).send(createSuccessResponse(receipt, request.id));
    },
  );

  /**
   * GET /services/data/history
   * Returns paginated data bundle transaction history for the tenant business.
   */
  fastify.get(
    '/history',
    { preHandler: [requireTenantPermission(Permission.TENANT_TRANSACTIONS_READ)] },
    async (request, reply) => {
      const query = request.query as { limit?: string; offset?: string };
      const limit = query.limit ? Math.max(1, Math.min(100, parseInt(query.limit, 10))) : 20;
      const offset = query.offset ? Math.max(0, parseInt(query.offset, 10)) : 0;

      const history = await dataService.getDataHistory(
        request.businessId!,
        limit,
        offset,
      );

      return reply.status(200).send(createSuccessResponse(history, request.id));
    },
  );
};

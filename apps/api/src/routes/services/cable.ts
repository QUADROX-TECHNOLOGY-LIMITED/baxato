import type { FastifyPluginAsync } from 'fastify';
import {
  createSuccessResponse,
  ValidationError,
  Permission,
  CableOperator,
} from '@baxato/common';
import { cableService } from '../../services/cable.service';
import { requireTenantPermission } from '../../plugins/rbac.plugin';

export const cableRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /services/cable/operators
   * Returns list of supported Cable TV operators (DSTV, GOTV, StarTimes) with metadata.
   */
  fastify.get('/operators', async (request, reply) => {
    const operators = cableService.getOperators();
    return reply.status(200).send(createSuccessResponse(operators, request.id));
  });

  /**
   * GET /services/cable/bouquets
   * Returns list of available Cable TV bouquets, optionally filtered by operator.
   */
  fastify.get('/bouquets', async (request, reply) => {
    const query = request.query as { operator?: string };

    let operatorFilter: CableOperator | undefined;
    if (query.operator) {
      const upperOp = query.operator.toUpperCase();
      if (!Object.values(CableOperator).includes(upperOp as CableOperator)) {
        throw new ValidationError(
          `Invalid operator filter: '${query.operator}'. Supported: ${Object.values(CableOperator).join(', ')}`,
        );
      }
      operatorFilter = upperOp as CableOperator;
    }

    const bouquets = cableService.getBouquets(operatorFilter);
    return reply.status(200).send(createSuccessResponse(bouquets, request.id));
  });

  /**
   * POST /services/cable/validate
   * Validates smartcard / IUC number and retrieves subscriber account name before debit.
   */
  fastify.post(
    '/validate',
    { preHandler: [requireTenantPermission(Permission.TENANT_SERVICES_EXECUTE)] },
    async (request, reply) => {
      const body = request.body as {
        operator?: string;
        smartcard?: string;
      };

      if (!body.operator || typeof body.operator !== 'string') {
        throw new ValidationError('Cable TV operator is required (DSTV, GOTV, or STARTIMES).');
      }

      const upperOp = body.operator.toUpperCase();
      if (!Object.values(CableOperator).includes(upperOp as CableOperator)) {
        throw new ValidationError(
          `Invalid operator: '${body.operator}'. Supported: ${Object.values(CableOperator).join(', ')}`,
        );
      }

      if (!body.smartcard || typeof body.smartcard !== 'string') {
        throw new ValidationError('Smartcard / IUC number is required.');
      }

      const result = await cableService.validateSmartcard(
        upperOp as CableOperator,
        body.smartcard,
      );

      return reply.status(200).send(createSuccessResponse(result, request.id));
    },
  );

  /**
   * POST /services/cable/purchase
   * Subscribes a Cable TV bouquet for a verified decoder with concurrency-safe wallet locking.
   */
  fastify.post(
    '/purchase',
    { preHandler: [requireTenantPermission(Permission.TENANT_SERVICES_EXECUTE)] },
    async (request, reply) => {
      const body = request.body as {
        operator?: string;
        smartcard?: string;
        bouquetId?: string;
        customerMobile?: string;
        customerName?: string;
        clientReference?: string;
      };

      if (!body.operator || typeof body.operator !== 'string') {
        throw new ValidationError('Cable TV operator is required.');
      }

      const upperOp = body.operator.toUpperCase();
      if (!Object.values(CableOperator).includes(upperOp as CableOperator)) {
        throw new ValidationError(
          `Invalid operator: '${body.operator}'. Supported: ${Object.values(CableOperator).join(', ')}`,
        );
      }

      if (!body.smartcard || typeof body.smartcard !== 'string') {
        throw new ValidationError('Smartcard / IUC number is required.');
      }

      if (!body.bouquetId || typeof body.bouquetId !== 'string') {
        throw new ValidationError('Cable bouquetId is required.');
      }

      const businessId = request.businessId!;
      const userId = request.user!.id;
      const idempotencyKey = (request.headers['x-idempotency-key'] as string) || undefined;

      const receipt = await cableService.purchaseBouquet({
        businessId,
        userId,
        operator: upperOp as CableOperator,
        smartcard: body.smartcard,
        bouquetId: body.bouquetId,
        customerMobile: body.customerMobile,
        customerName: body.customerName,
        clientReference: body.clientReference,
        idempotencyKey,
      });

      return reply.status(201).send(createSuccessResponse(receipt, request.id));
    },
  );

  /**
   * GET /services/cable/history
   * Returns paginated Cable TV transaction history for the tenant business.
   */
  fastify.get(
    '/history',
    { preHandler: [requireTenantPermission(Permission.TENANT_TRANSACTIONS_READ)] },
    async (request, reply) => {
      const query = request.query as { limit?: string; offset?: string };
      const limit = query.limit ? Math.max(1, Math.min(100, parseInt(query.limit, 10))) : 20;
      const offset = query.offset ? Math.max(0, parseInt(query.offset, 10)) : 0;

      const history = await cableService.getCableHistory(
        request.businessId!,
        limit,
        offset,
      );

      return reply.status(200).send(createSuccessResponse(history, request.id));
    },
  );
};

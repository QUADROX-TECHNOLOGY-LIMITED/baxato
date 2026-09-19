import type { FastifyPluginAsync } from 'fastify';
import {
  createSuccessResponse,
  ValidationError,
  Permission,
  TelecomNetwork,
} from '@baxato/common';
import { airtimeService } from '../../services/airtime.service';
import { requireTenantPermission } from '../../plugins/rbac.plugin';
import { authenticate } from '../../plugins/auth.plugin';

export const airtimeRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /services/airtime/networks
   * Returns list of supported mobile network operators, active discount margins, and prefix ranges.
   */
  fastify.get('/networks', async (request, reply) => {
    const networks = airtimeService.getNetworkOptions();
    return reply.status(200).send(createSuccessResponse(networks, request.id));
  });

  /**
   * POST /services/airtime/purchase
   * Vends airtime to a recipient phone number with automatic prefix detection and concurrency wallet locking.
   */
  fastify.post(
    '/purchase',
    { preHandler: [requireTenantPermission(Permission.TENANT_SERVICES_EXECUTE)] },
    async (request, reply) => {
      const body = request.body as {
        phone?: string;
        amountKobo?: string | number;
        network?: TelecomNetwork;
        clientReference?: string;
      };

      if (!body.phone || typeof body.phone !== 'string') {
        throw new ValidationError('Recipient phone number is required.');
      }

      if (!body.amountKobo) {
        throw new ValidationError('Purchase amountKobo is required.');
      }

      let amountKobo: bigint;
      try {
        amountKobo = BigInt(body.amountKobo);
        if (amountKobo <= 0n) {
          throw new Error();
        }
      } catch {
        throw new ValidationError('amountKobo must be a positive integer in Kobo.');
      }

      if (body.network && !Object.values(TelecomNetwork).includes(body.network)) {
        throw new ValidationError(
          `Invalid network. Supported: ${Object.values(TelecomNetwork).join(', ')}`,
        );
      }

      const businessId = request.businessId!;
      const userId = request.user!.id;
      const idempotencyKey = (request.headers['x-idempotency-key'] as string) || undefined;

      const receipt = await airtimeService.purchaseAirtime({
        businessId,
        userId,
        phone: body.phone,
        network: body.network,
        amountKobo,
        clientReference: body.clientReference,
        idempotencyKey,
      });

      return reply.status(201).send(createSuccessResponse(receipt, request.id));
    },
  );

  /**
   * GET /services/airtime/history
   * Returns paginated airtime purchase transaction history for the tenant business.
   */
  fastify.get(
    '/history',
    { preHandler: [requireTenantPermission(Permission.TENANT_TRANSACTIONS_READ)] },
    async (request, reply) => {
      const query = request.query as { limit?: string; offset?: string };
      const limit = query.limit ? Math.max(1, Math.min(100, parseInt(query.limit, 10))) : 20;
      const offset = query.offset ? Math.max(0, parseInt(query.offset, 10)) : 0;

      const history = await airtimeService.getAirtimeHistory(
        request.businessId!,
        limit,
        offset,
      );

      return reply.status(200).send(createSuccessResponse(history, request.id));
    },
  );
};

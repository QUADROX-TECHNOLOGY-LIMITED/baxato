import type { FastifyPluginAsync } from 'fastify';
import {
  createSuccessResponse,
  ValidationError,
  Permission,
  ServiceType,
} from '@baxato/common';
import {
  providerRouterService,
  ProviderRoutingStrategy,
} from '../services/providers';
import { requirePlatformPermission } from '../plugins/rbac.plugin';

export const providerRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /providers
   * Returns registered provider configurations and active routing table per service category.
   */
  fastify.get(
    '',
    { preHandler: [requirePlatformPermission(Permission.PLATFORM_PROVIDERS_MANAGE)] },
    async (request, reply) => {
      const routingTable = providerRouterService.getRoutingConfig();
      return reply.status(200).send(
        createSuccessResponse(
          {
            providers: ['INTERSWITCH', 'MONNIFY'],
            routingTable,
          },
          request.id,
        ),
      );
    },
  );

  /**
   * GET /providers/health
   * Runs live health and connectivity probes against all registered providers with circuit breaker telemetry.
   */
  fastify.get(
    '/health',
    { preHandler: [requirePlatformPermission(Permission.PLATFORM_PROVIDERS_MANAGE)] },
    async (request, reply) => {
      const providerStatuses = await providerRouterService.getAllProviderHealth();
      return reply.status(200).send(
        createSuccessResponse(
          {
            providerStatuses,
            checkedAt: new Date(),
          },
          request.id,
        ),
      );
    },
  );

  /**
   * PATCH /providers/routing
   * Updates routing strategy and failover controls for a specific service category.
   */
  fastify.patch(
    '/routing',
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

      const updated = providerRouterService.updateRoutingConfig(
        body.serviceType,
        body.strategy,
        body.allowFailover ?? true,
      );

      return reply.status(200).send(
        createSuccessResponse(
          {
            message: `Routing strategy for ${body.serviceType} updated successfully.`,
            config: updated,
          },
          request.id,
        ),
      );
    },
  );
};

import type { FastifyPluginAsync } from 'fastify';
import {
  Permission,
  createSuccessResponse,
  ValidationError,
  updateWebhookConfigSchema,
  testWebhookSchema,
  type UpdateWebhookConfigInput,
  type TestWebhookInput,
  type WebhookDeliveryStatus,
} from '@baxato/common';
import { requireTenantPermission } from '../../plugins/rbac.plugin';
import { webhookDispatcherService } from '../../services/webhook-dispatcher.service';

export const developerWebhookRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /developer/webhooks
   * Retrieves active webhook URL and masked secret for the authenticated business context.
   */
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Webhooks'],
        summary: 'Get Webhook Configuration',
        description: 'Retrieves the registered webhook URL and secret status for the active business.',
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      },
      preHandler: [requireTenantPermission(Permission.TENANT_WEBHOOKS_MANAGE)],
    },
    async (request, reply) => {
      const businessId = request.businessId!;
      const config = await webhookDispatcherService.getWebhookConfig(businessId);
      return reply.send(createSuccessResponse(config, request.id));
    },
  );

  /**
   * PUT /developer/webhooks
   * Updates webhook URL and optionally generates/regenerates the 256-bit signing secret.
   */
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Webhooks'],
        summary: 'Configure Webhook Endpoint & Secret',
        description:
          'Updates target endpoint URL and optionally issues a new HMAC-SHA256 signing secret. Plaintext secret is revealed strictly once.',
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      },
      preHandler: [requireTenantPermission(Permission.TENANT_WEBHOOKS_MANAGE)],
    },
    async (request, reply) => {
      const parseResult = updateWebhookConfigSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new ValidationError('Invalid webhook configuration payload', parseResult.error.format());
      }

      const businessId = request.businessId!;
      const result = await webhookDispatcherService.updateWebhookConfig(
        businessId,
        parseResult.data as UpdateWebhookConfigInput,
      );

      return reply.status(200).send(createSuccessResponse(result, request.id));
    },
  );

  /**
   * POST /developer/webhooks/test
   * Sends a synchronous test event to verify endpoint reachability and signature computation.
   */
  fastify.post(
    '/test',
    {
      schema: {
        tags: ['Webhooks'],
        summary: 'Test Webhook Connection',
        description:
          'Dispatches a synthetic ping event with real HMAC-SHA256 signature headers to verify endpoint reception.',
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      },
      preHandler: [requireTenantPermission(Permission.TENANT_WEBHOOKS_MANAGE)],
    },
    async (request, reply) => {
      const parseResult = testWebhookSchema.safeParse(request.body || {});
      if (!parseResult.success) {
        throw new ValidationError('Invalid test webhook payload', parseResult.error.format());
      }

      const businessId = request.businessId!;
      const { eventType } = parseResult.data as TestWebhookInput;

      const result = await webhookDispatcherService.testWebhook(businessId, eventType);
      return reply.send(createSuccessResponse(result, request.id));
    },
  );

  /**
   * GET /developer/webhooks/deliveries
   * Queries paginated webhook delivery logs with attempt counters and response codes.
   */
  fastify.get<{
    Querystring: {
      status?: WebhookDeliveryStatus;
      limit?: string;
      offset?: string;
    };
  }>(
    '/deliveries',
    {
      schema: {
        tags: ['Webhooks'],
        summary: 'List Webhook Deliveries',
        description: 'Retrieves audit logs of past outbound webhook deliveries and retry schedules.',
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      },
      preHandler: [requireTenantPermission(Permission.TENANT_WEBHOOKS_MANAGE)],
    },
    async (request, reply) => {
      const businessId = request.businessId!;
      const { status, limit, offset } = request.query;

      const result = await webhookDispatcherService.listDeliveries(businessId, {
        status,
        limit: limit ? Number.parseInt(limit, 10) : 20,
        offset: offset ? Number.parseInt(offset, 10) : 0,
      });

      return reply.send(createSuccessResponse(result, request.id));
    },
  );

  /**
   * POST /developer/webhooks/deliveries/:id/retry
   * Manually re-dispatches a delivery attempt.
   */
  fastify.post<{ Params: { id: string } }>(
    '/deliveries/:id/retry',
    {
      schema: {
        tags: ['Webhooks'],
        summary: 'Retry Webhook Delivery',
        description: 'Manually re-triggers an outbound HTTP POST dispatch for a specific delivery ID.',
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      },
      preHandler: [requireTenantPermission(Permission.TENANT_WEBHOOKS_MANAGE)],
    },
    async (request, reply) => {
      const businessId = request.businessId!;
      const deliveryId = request.params.id;

      const delivery = await webhookDispatcherService.retryDelivery(deliveryId, businessId);
      return reply.send(createSuccessResponse(delivery, request.id));
    },
  );
};

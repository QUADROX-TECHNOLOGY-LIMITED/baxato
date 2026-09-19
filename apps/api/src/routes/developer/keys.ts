import type { FastifyPluginAsync } from 'fastify';
import {
  Permission,
  createSuccessResponse,
  createApiKeySchema,
  ValidationError,
  type CreateApiKeyInput,
} from '@baxato/common';
import { requireTenantPermission } from '../../plugins/rbac.plugin';
import { apiKeyService } from '../../services/api-key.service';

export const apiKeyRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /developer/keys
   * Retrieves all API keys for the active business.
   */
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Developer Keys'],
        summary: 'List API Keys',
        description: 'Retrieves all API keys for the authenticated business context.',
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      },
      preHandler: [requireTenantPermission(Permission.TENANT_APIKEYS_MANAGE)],
    },
    async (request, reply) => {
      const businessId = request.businessId!;
      const keys = await apiKeyService.listApiKeys(businessId);
      return reply.send(createSuccessResponse(keys, request.id));
    },
  );

  /**
   * POST /developer/keys
   * Generates a new API key for the active business.
   */
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Developer Keys'],
        summary: 'Generate API Key',
        description:
          'Generates a new 256-bit API key (bx_live_... or bx_test_...). Plaintext key is returned strictly once.',
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      },
      preHandler: [requireTenantPermission(Permission.TENANT_APIKEYS_MANAGE)],
    },
    async (request, reply) => {
      const parseResult = createApiKeySchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new ValidationError('Validation failed for API key generation', parseResult.error.format());
      }

      const businessId = request.businessId!;
      const { name, environment, expiresAt } = parseResult.data as CreateApiKeyInput;

      const result = await apiKeyService.generateApiKey({
        businessId,
        name,
        environment,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      return reply.status(201).send(createSuccessResponse(result, request.id));
    },
  );

  /**
   * GET /developer/keys/:id
   * Retrieves metadata for a single API key by ID.
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        tags: ['Developer Keys'],
        summary: 'Get API Key by ID',
        description: 'Retrieves metadata for a specific API key without revealing the secret hash.',
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      },
      preHandler: [requireTenantPermission(Permission.TENANT_APIKEYS_MANAGE)],
    },
    async (request, reply) => {
      const businessId = request.businessId!;
      const keyId = request.params.id;

      const key = await apiKeyService.getApiKey(keyId, businessId);
      return reply.send(createSuccessResponse(key, request.id));
    },
  );

  /**
   * POST /developer/keys/:id/revoke
   * Revokes an existing API key immediately.
   */
  fastify.post<{ Params: { id: string } }>(
    '/:id/revoke',
    {
      schema: {
        tags: ['Developer Keys'],
        summary: 'Revoke API Key',
        description: 'Immediately deactivates and revokes an active API key.',
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      },
      preHandler: [requireTenantPermission(Permission.TENANT_APIKEYS_MANAGE)],
    },
    async (request, reply) => {
      const businessId = request.businessId!;
      const keyId = request.params.id;

      const key = await apiKeyService.revokeApiKey(keyId, businessId);
      return reply.send(createSuccessResponse(key, request.id));
    },
  );

  /**
   * POST /developer/keys/:id/rotate
   * Rotates an API key: revokes old key and returns a new active key with secret.
   */
  fastify.post<{ Params: { id: string } }>(
    '/:id/rotate',
    {
      schema: {
        tags: ['Developer Keys'],
        summary: 'Rotate API Key',
        description: 'Revokes the existing API key and issues a newly generated key with fresh secret.',
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      },
      preHandler: [requireTenantPermission(Permission.TENANT_APIKEYS_MANAGE)],
    },
    async (request, reply) => {
      const businessId = request.businessId!;
      const keyId = request.params.id;

      const result = await apiKeyService.rotateApiKey(keyId, businessId);
      return reply.send(createSuccessResponse(result, request.id));
    },
  );
};

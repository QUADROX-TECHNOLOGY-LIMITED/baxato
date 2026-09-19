import type { FastifyPluginAsync } from 'fastify';
import {
  createBusinessSchema,
  updateBusinessSchema,
  inviteBusinessMemberSchema,
  createSuccessResponse,
  ValidationError,
} from '@baxato/common';
import { businessService } from '../services/business.service';
import { authenticate } from '../plugins/auth.plugin';

export const businessRoutes: FastifyPluginAsync = async (fastify) => {
  // Require authentication for all business routes
  fastify.addHook('preHandler', authenticate);

  /**
   * POST /businesses
   * Creates a new business (strictly capped at 3 businesses per user account).
   */
  fastify.post('/', async (request, reply) => {
    const userId = request.user?.id;
    if (!userId) {
      throw new ValidationError('Authenticated user session required');
    }

    const parseResult = createBusinessSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      );
    }

    const result = await businessService.createBusiness(userId, parseResult.data);

    return reply.status(201).send(
      createSuccessResponse(
        {
          business: result.business,
          wallets: result.wallets,
          message: 'Business created successfully.',
        },
        request.id,
      ),
    );
  });

  /**
   * GET /businesses
   * Lists all businesses owned by or accessible to the caller.
   */
  fastify.get('/', async (request, reply) => {
    const userId = request.user?.id;
    if (!userId) {
      throw new ValidationError('User ID required');
    }

    const businesses = await businessService.getBusinessesForUser(userId);
    return reply.status(200).send(
      createSuccessResponse(
        {
          businesses,
          count: businesses.length,
          maxAllowed: 3,
        },
        request.id,
      ),
    );
  });

  /**
   * GET /businesses/:id
   */
  fastify.get('/:id', async (request, reply) => {
    const userId = request.user?.id;
    const { id } = request.params as { id: string };

    if (!userId || !id) {
      throw new ValidationError('Business ID required');
    }

    const business = await businessService.getBusinessById(id, userId);
    return reply.status(200).send(createSuccessResponse(business, request.id));
  });

  /**
   * PATCH /businesses/:id
   */
  fastify.patch('/:id', async (request, reply) => {
    const userId = request.user?.id;
    const { id } = request.params as { id: string };

    if (!userId || !id) {
      throw new ValidationError('Business ID required');
    }

    const parseResult = updateBusinessSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      );
    }

    const updated = await businessService.updateBusiness(id, userId, parseResult.data);
    return reply.status(200).send(
      createSuccessResponse(
        {
          business: updated,
          message: 'Business settings updated successfully.',
        },
        request.id,
      ),
    );
  });

  /**
   * POST /businesses/:id/webhook-secret/regenerate
   */
  fastify.post('/:id/webhook-secret/regenerate', async (request, reply) => {
    const userId = request.user?.id;
    const { id } = request.params as { id: string };

    if (!userId || !id) {
      throw new ValidationError('Business ID required');
    }

    const result = await businessService.regenerateWebhookSecret(id, userId);
    return reply.status(200).send(
      createSuccessResponse(
        {
          webhookSecret: result.webhookSecret,
          message: 'Webhook signing secret regenerated successfully.',
        },
        request.id,
      ),
    );
  });

  /**
   * GET /businesses/:id/members
   */
  fastify.get('/:id/members', async (request, reply) => {
    const userId = request.user?.id;
    const { id } = request.params as { id: string };

    if (!userId || !id) {
      throw new ValidationError('Business ID required');
    }

    const members = await businessService.listMembers(id, userId);
    return reply.status(200).send(createSuccessResponse({ members }, request.id));
  });

  /**
   * POST /businesses/:id/members
   */
  fastify.post('/:id/members', async (request, reply) => {
    const userId = request.user?.id;
    const { id } = request.params as { id: string };

    if (!userId || !id) {
      throw new ValidationError('Business ID required');
    }

    const parseResult = inviteBusinessMemberSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      );
    }

    const { email, role } = parseResult.data;
    const result = await businessService.inviteMember(id, userId, email, role);

    return reply.status(201).send(
      createSuccessResponse(
        {
          member: result,
          message: `User ${email} was added to the business with role ${role}.`,
        },
        request.id,
      ),
    );
  });

  /**
   * DELETE /businesses/:id/members/:memberId
   */
  fastify.delete('/:id/members/:memberId', async (request, reply) => {
    const userId = request.user?.id;
    const { id, memberId } = request.params as { id: string; memberId: string };

    if (!userId || !id || !memberId) {
      throw new ValidationError('Business ID and Member ID required');
    }

    const result = await businessService.removeMember(id, userId, memberId);
    return reply.status(200).send(
      createSuccessResponse(
        {
          removed: result.removed,
          message: 'Team member removed from business.',
        },
        request.id,
      ),
    );
  });
};

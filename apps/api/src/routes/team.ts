import type { FastifyPluginAsync } from 'fastify';
import {
  inviteBusinessMemberSchema,
  updateBusinessMemberSchema,
  acceptTeamInvitationSchema,
  createSuccessResponse,
  ValidationError,
  Permission,
} from '@baxato/common';
import { teamService } from '../services/team.service.js';
import { requireTenantPermission } from '../plugins/rbac.plugin.js';
import { authenticate } from '../plugins/auth.plugin.js';

export const teamRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /team/members
   * List all active team members in the active business.
   */
  fastify.get(
    '/members',
    { preHandler: [requireTenantPermission(Permission.TENANT_MEMBERS_READ)] },
    async (request, reply) => {
      const businessId = request.businessId!;
      const callerId = request.user!.id;
      const members = await teamService.listMembers(businessId, callerId);
      return reply.status(200).send(createSuccessResponse({ members }, request.id));
    },
  );

  /**
   * GET /team/invites
   * List all pending, non-expired invitations for the business.
   */
  fastify.get(
    '/invites',
    { preHandler: [requireTenantPermission(Permission.TENANT_MEMBERS_READ)] },
    async (request, reply) => {
      const businessId = request.businessId!;
      const callerId = request.user!.id;
      const invitations = await teamService.listInvitations(businessId, callerId);
      return reply.status(200).send(createSuccessResponse({ invitations }, request.id));
    },
  );

  /**
   * POST /team/invites
   * Sends a new invitation email with assigned role.
   */
  fastify.post(
    '/invites',
    { preHandler: [requireTenantPermission(Permission.TENANT_MEMBERS_MANAGE)] },
    async (request, reply) => {
      const businessId = request.businessId!;
      const callerId = request.user!.id;

      const parseResult = inviteBusinessMemberSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new ValidationError(
          parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        );
      }

      const clientIp = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || request.ip;
      const userAgent = request.headers['user-agent'] as string | undefined;

      const result = await teamService.inviteMember(
        businessId,
        callerId,
        parseResult.data.email,
        parseResult.data.role,
        clientIp,
        userAgent,
      );

      return reply.status(201).send(
        createSuccessResponse(
          {
            ...result,
            message: `Invitation successfully sent to ${parseResult.data.email}.`,
          },
          request.id,
        ),
      );
    },
  );

  /**
   * DELETE /team/invites/:id
   * Revoke an active pending invitation.
   */
  fastify.delete(
    '/invites/:id',
    { preHandler: [requireTenantPermission(Permission.TENANT_MEMBERS_MANAGE)] },
    async (request, reply) => {
      const businessId = request.businessId!;
      const callerId = request.user!.id;
      const { id } = request.params as { id: string };

      if (!id) {
        throw new ValidationError('Invitation ID required');
      }

      const clientIp = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || request.ip;
      const userAgent = request.headers['user-agent'] as string | undefined;

      const result = await teamService.revokeInvitation(businessId, callerId, id, clientIp, userAgent);
      return reply.status(200).send(createSuccessResponse(result, request.id));
    },
  );

  /**
   * POST /team/invites/:id/resend
   * Refreshes token and resends the invitation email.
   */
  fastify.post(
    '/invites/:id/resend',
    { preHandler: [requireTenantPermission(Permission.TENANT_MEMBERS_MANAGE)] },
    async (request, reply) => {
      const businessId = request.businessId!;
      const callerId = request.user!.id;
      const { id } = request.params as { id: string };

      if (!id) {
        throw new ValidationError('Invitation ID required');
      }

      const clientIp = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || request.ip;
      const userAgent = request.headers['user-agent'] as string | undefined;

      const result = await teamService.resendInvitation(businessId, callerId, id, clientIp, userAgent);
      return reply.status(200).send(createSuccessResponse(result, request.id));
    },
  );

  /**
   * PATCH /team/members/:id/role
   * Updates an existing member's role.
   */
  fastify.patch(
    '/members/:id/role',
    { preHandler: [requireTenantPermission(Permission.TENANT_MEMBERS_MANAGE)] },
    async (request, reply) => {
      const businessId = request.businessId!;
      const callerId = request.user!.id;
      const { id } = request.params as { id: string };

      const parseResult = updateBusinessMemberSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new ValidationError(
          parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        );
      }

      const clientIp = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || request.ip;
      const userAgent = request.headers['user-agent'] as string | undefined;

      const result = await teamService.updateMemberRole(
        businessId,
        callerId,
        id,
        parseResult.data.role,
        clientIp,
        userAgent,
      );

      return reply.status(200).send(createSuccessResponse(result, request.id));
    },
  );

  /**
   * DELETE /team/members/:id
   * Removes a member from the business.
   */
  fastify.delete(
    '/members/:id',
    { preHandler: [requireTenantPermission(Permission.TENANT_MEMBERS_MANAGE)] },
    async (request, reply) => {
      const businessId = request.businessId!;
      const callerId = request.user!.id;
      const { id } = request.params as { id: string };

      if (!id) {
        throw new ValidationError('Member ID required');
      }

      const clientIp = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || request.ip;
      const userAgent = request.headers['user-agent'] as string | undefined;

      const result = await teamService.removeMember(businessId, callerId, id, clientIp, userAgent);
      return reply.status(200).send(createSuccessResponse(result, request.id));
    },
  );
};

/**
 * Public Invitation Onboarding Routes
 */
export const inviteOnboardingRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /invites/validate?token=...
   * Validates invitation token before displaying the acceptance form.
   */
  fastify.get('/validate', async (request, reply) => {
    const { token } = request.query as { token?: string };
    if (!token) {
      throw new ValidationError('Invitation token required');
    }

    const result = await teamService.validateInvitationToken(token);
    return reply.status(200).send(createSuccessResponse(result, request.id));
  });

  /**
   * POST /invites/accept
   * Accepts invitation and provisions/links user account into the workspace.
   */
  fastify.post('/accept', async (request, reply) => {
    const parseResult = acceptTeamInvitationSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      );
    }

    // Attempt to authenticate if the user has an existing session
    try {
      await authenticate(request, reply);
    } catch {
      // Ignored: non-logged-in user accepting invite
    }

    const clientIp = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || request.ip;
    const userAgent = request.headers['user-agent'] as string | undefined;

    const result = await teamService.acceptInvitation({
      rawToken: parseResult.data.token,
      userId: request.user?.id,
      firstName: parseResult.data.firstName,
      lastName: parseResult.data.lastName,
      password: parseResult.data.password,
      phoneNumber: parseResult.data.phoneNumber,
      clientIp,
      userAgent,
    });

    return reply.status(200).send(createSuccessResponse(result, request.id));
  });
};

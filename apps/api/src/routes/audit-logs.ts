import type { FastifyPluginAsync } from 'fastify';
import {
  createSuccessResponse,
  Permission,
  ValidationError,
} from '@baxato/common';
import { auditService } from '../services/audit.service.js';
import { requireTenantPermission } from '../plugins/rbac.plugin.js';

export const auditLogRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /audit-logs/business
   * Returns paginated workspace audit logs for the active business.
   * Restricted to Workspace Owner and Workspace Admin (TENANT_AUDIT_READ).
   */
  fastify.get(
    '/business',
    { preHandler: [requireTenantPermission(Permission.TENANT_AUDIT_READ)] },
    async (request, reply) => {
      const businessId = request.businessId;
      if (!businessId) {
        throw new ValidationError('Active business context required');
      }

      const query = request.query as {
        category?: string;
        source?: string;
        search?: string;
        limit?: string;
        offset?: string;
      };

      const parsedLimit = query.limit ? Number(query.limit) : 25;
      const parsedOffset = query.offset ? Number(query.offset) : 0;

      const data = await auditService.getLogsForBusiness(businessId, {
        category: query.category,
        source: query.source,
        search: query.search,
        limit: Number.isFinite(parsedLimit) ? parsedLimit : 25,
        offset: Number.isFinite(parsedOffset) ? parsedOffset : 0,
      });

      return reply.status(200).send(createSuccessResponse(data, request.id));
    },
  );
};


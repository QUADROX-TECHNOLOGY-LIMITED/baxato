import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  Permission,
  hasPermission,
  ForbiddenError,
  UserRole,
  ValidationError,
} from '@baxato/common';
import { db, businesses, businessMembers, eq, and } from '@baxato/database';
import { authenticate } from './auth.plugin.js';

/**
 * Fastify pre-handler guard requiring a platform-level permission (Platform Owner / Staff).
 */
export function requirePlatformPermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);

    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    if (!hasPermission(request.user.role, permission)) {
      throw new ForbiddenError(
        `Action forbidden: Missing platform permission [${permission}].`,
      );
    }
  };
}

/**
 * Fastify pre-handler guard requiring a tenant-level permission within a business context.
 */
export function requireTenantPermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);

    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    // Super Admin has unrestricted platform and tenant access
    if (request.user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    // Resolve target businessId from header, query, or path params
    const params = request.params as Record<string, string> | undefined;
    let businessId =
      (request.headers['x-business-id'] as string) ||
      params?.id ||
      params?.businessId ||
      request.businessId;

    // Check if target business exists
    let [biz] = businessId
      ? await db
          .select({ id: businesses.id, ownerId: businesses.ownerId })
          .from(businesses)
          .where(eq(businesses.id, businessId))
          .limit(1)
      : [undefined];

    // Fallback if business not found or not specified: check user's actual business
    if (!biz && request.user) {
      const [ownedBiz] = await db
        .select({ id: businesses.id, ownerId: businesses.ownerId })
        .from(businesses)
        .where(eq(businesses.ownerId, request.user.id))
        .limit(1);

      if (ownedBiz) {
        biz = ownedBiz;
        businessId = ownedBiz.id;
      } else {
        const [memberBiz] = await db
          .select({ id: businesses.id, ownerId: businesses.ownerId })
          .from(businesses)
          .innerJoin(businessMembers, eq(businessMembers.businessId, businesses.id))
          .where(eq(businessMembers.userId, request.user.id))
          .limit(1);

        if (memberBiz) {
          biz = memberBiz;
          businessId = memberBiz.id;
        }
      }
    }

    if (!biz || !businessId) {
      throw new ForbiddenError('Business not found or access denied.');
    }

    let effectiveRole: UserRole;

    if (request.isApiKeyAuth) {
      if (request.apiKey?.businessId !== businessId) {
        throw new ForbiddenError('API key is not authorized for target business.');
      }
      effectiveRole = UserRole.DEVELOPER;
    } else if (biz.ownerId === request.user.id) {
      effectiveRole = UserRole.BUSINESS_OWNER;
    } else {
      // Check business_members
      const [membership] = await db
        .select({ role: businessMembers.role })
        .from(businessMembers)
        .where(
          and(
            eq(businessMembers.businessId, businessId),
            eq(businessMembers.userId, request.user.id),
          ),
        )
        .limit(1);

      if (!membership) {
        throw new ForbiddenError('You do not belong to this business.');
      }
      effectiveRole = membership.role as UserRole;
    }

    if (!hasPermission(effectiveRole, permission)) {
      throw new ForbiddenError(
        `Action forbidden: Role [${effectiveRole}] lacks tenant permission [${permission}].`,
      );
    }

    // Attach resolved businessId and effectiveRole
    request.businessId = businessId;
  };
}

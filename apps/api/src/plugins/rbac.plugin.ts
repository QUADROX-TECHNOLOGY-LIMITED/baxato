import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  Permission,
  hasPermission,
  ForbiddenError,
  UserRole,
  ApiKeyEnvironment,
} from '@baxato/common';
import { env } from '@baxato/config';
import { db, businesses, businessMembers, eq, and } from '@baxato/database';
import { authenticate } from './auth.plugin.js';

const API_KEY_FORBIDDEN_PERMISSIONS = new Set<Permission>([
  Permission.TENANT_APIKEYS_MANAGE,
  Permission.TENANT_MEMBERS_MANAGE,
  Permission.TENANT_BUSINESS_UPDATE,
  Permission.TENANT_BUSINESS_DELETE,
  Permission.TENANT_WALLETS_TRANSFER,
]);

/**
 * Fastify pre-handler guard requiring a platform-level permission (strictly checked against users.role).
 */
export function requirePlatformPermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);

    if (!request.user || request.isApiKeyAuth || !request.platformRole) {
      throw new ForbiddenError('Platform authentication required');
    }

    if (!hasPermission(request.platformRole, permission)) {
      throw new ForbiddenError(
        `Action forbidden: Missing platform permission [${permission}].`,
      );
    }
  };
}

/**
 * Fastify pre-handler guard requiring a tenant-level permission within an active business context.
 */
export function requireTenantPermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);

    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    // Super Admin has unrestricted platform and tenant access (session auth only)
    if (!request.isApiKeyAuth && request.platformRole === UserRole.SUPER_ADMIN) {
      return;
    }

    if (request.isApiKeyAuth) {
      if (API_KEY_FORBIDDEN_PERMISSIONS.has(permission)) {
        throw new ForbiddenError(
          'API keys cannot manage workspace keys, webhooks, members, or business settings.',
        );
      }
      if (
        env.NODE_ENV === 'production' &&
        request.apiKeyEnvironment === ApiKeyEnvironment.TEST &&
        (permission === Permission.TENANT_SERVICES_EXECUTE ||
          permission === Permission.TENANT_WEBHOOKS_MANAGE)
      ) {
        throw new ForbiddenError(
          'Sandbox test API keys (bx_test_...) cannot execute live purchases or modify webhook configuration in production.',
        );
      }
    }

    const params = request.params as Record<string, string> | undefined;
    let businessId =
      (request.headers['x-business-id'] as string) ||
      params?.id ||
      params?.businessId ||
      request.businessId;

    let [biz] = businessId
      ? await db
          .select({ id: businesses.id, ownerId: businesses.ownerId, status: businesses.status })
          .from(businesses)
          .where(eq(businesses.id, businessId))
          .limit(1)
      : [undefined];

    if (!biz && request.user && !request.isApiKeyAuth) {
      const [ownedBiz] = await db
        .select({ id: businesses.id, ownerId: businesses.ownerId, status: businesses.status })
        .from(businesses)
        .where(eq(businesses.ownerId, request.user.id))
        .limit(1);

      if (ownedBiz) {
        biz = ownedBiz;
        businessId = ownedBiz.id;
      } else {
        const [memberBiz] = await db
          .select({ id: businesses.id, ownerId: businesses.ownerId, status: businesses.status })
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

    if (biz.status && biz.status !== 'ACTIVE') {
      throw new ForbiddenError('This business workspace is currently suspended or inactive.');
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

    request.businessId = businessId;
  };
}

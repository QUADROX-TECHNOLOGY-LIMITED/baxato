import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '@baxato/config';
import {
  AuthenticationError,
  ForbiddenError,
  UserRole,
  KycStatus,
  type AuthSessionUser,
  type ApiKeyContext,
  type ApiKeyEnvironment,
} from '@baxato/common';
import { db, users, businesses, businessMembers, eq, and } from '@baxato/database';
import { apiKeyService } from '../services/api-key.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthSessionUser;
    platformRole?: UserRole;
    businessId?: string;
    apiKey?: ApiKeyContext;
    isApiKeyAuth?: boolean;
    apiKeyEnvironment?: ApiKeyEnvironment;
  }
}

export function generateToken(payload: AuthSessionUser): string {
  return jwt.sign({ ...payload, purpose: 'SESSION' }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): AuthSessionUser {
  let decoded: Record<string, unknown>;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
    }) as Record<string, unknown>;
  } catch {
    throw new AuthenticationError('Invalid or expired authentication session token');
  }

  // Reject temporary setup/verification tokens (e.g. STAFF_2FA_SETUP, ADMIN_2FA_SETUP, EMAIL_VERIFY)
  if (decoded.purpose && decoded.purpose !== 'SESSION') {
    throw new AuthenticationError('Temporary verification token cannot be used as a session token');
  }

  if (!decoded || typeof decoded.id !== 'string' || !decoded.id.trim()) {
    throw new AuthenticationError('Malformed authentication token payload');
  }

  return decoded as unknown as AuthSessionUser;
}

export const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('user', undefined);
  fastify.decorateRequest('platformRole', undefined);
  fastify.decorateRequest('businessId', undefined);
  fastify.decorateRequest('apiKey', undefined);
  fastify.decorateRequest('isApiKeyAuth', false);
  fastify.decorateRequest('apiKeyEnvironment', undefined);
};

/**
 * Hook to authenticate request using an API Key (x-api-key or Bearer bx_...)
 */
export async function authenticateApiKey(request: FastifyRequest, _reply: FastifyReply) {
  let rawKey = request.headers['x-api-key'] as string | undefined;

  if (!rawKey && request.headers.authorization?.startsWith('Bearer bx_')) {
    rawKey = request.headers.authorization.slice(7).trim();
  }

  if (!rawKey) {
    throw new AuthenticationError('API key required. Please provide a valid x-api-key header or Bearer bx_... token.');
  }

  const result = await apiKeyService.validateApiKey(rawKey);
  if (!result.isValid || !result.apiKey || !result.businessId) {
    throw new AuthenticationError('Invalid, expired, or revoked API key.');
  }

  // Verify target business exists and is active, and resolve ownerId so FK constraints hold
  const [biz] = await db
    .select({
      id: businesses.id,
      ownerId: businesses.ownerId,
      status: businesses.status,
    })
    .from(businesses)
    .where(eq(businesses.id, result.businessId))
    .limit(1);

  if (!biz || (biz.status && biz.status !== 'ACTIVE')) {
    throw new ForbiddenError('Business workspace associated with this API key is suspended or inactive.');
  }

  request.apiKey = {
    id: result.apiKey.id,
    name: result.apiKey.name,
    businessId: result.businessId,
    environment: result.environment!,
  };
  request.businessId = result.businessId;
  request.isApiKeyAuth = true;
  request.apiKeyEnvironment = result.environment;
  request.platformRole = undefined;

  // Bind real ownerId so service_transactions.user_id foreign key never fails after wallet debit
  request.user = {
    id: biz.ownerId || result.apiKey.id,
    email: `${result.apiKey.keyPrefix}@apikey.baxato.internal`,
    role: UserRole.DEVELOPER,
    businessId: result.businessId,
    kycStatus: KycStatus.VERIFIED,
  };
}

/**
 * Hybrid hook: Authenticates request via either Developer API Key or user JWT Bearer token
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  if (request.headers['x-api-key'] || request.headers.authorization?.startsWith('Bearer bx_')) {
    return authenticateApiKey(request, reply);
  }

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Authentication required. Please provide a Bearer token or x-api-key header.');
  }

  const token = authHeader.slice(7).trim();
  const sessionUser = verifyToken(token);

  const [dbUser] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      status: users.status,
      kycStatus: users.kycStatus,
    })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);

  if (!dbUser || dbUser.status !== 'ACTIVE') {
    throw new AuthenticationError('User account is inactive, suspended, or not found.');
  }

  // Platform role comes strictly from users.role in DB — never from tenant business_members
  const dbPlatformRole = dbUser.role as UserRole;
  request.platformRole = dbPlatformRole;

  const headerBizId = (request.headers['x-business-id'] as string | undefined)?.trim();
  const requestedBizId = headerBizId || sessionUser.businessId;

  let activeBizId: string | undefined;
  let activeRole: UserRole = dbPlatformRole;

  if (requestedBizId) {
    const [biz] = await db
      .select({ id: businesses.id, ownerId: businesses.ownerId, status: businesses.status })
      .from(businesses)
      .where(eq(businesses.id, requestedBizId))
      .limit(1);

    if (biz && (!biz.status || biz.status === 'ACTIVE')) {
      if (biz.ownerId === dbUser.id) {
        activeBizId = biz.id;
        activeRole = UserRole.BUSINESS_OWNER;
      } else {
        const [membership] = await db
          .select({ businessId: businessMembers.businessId, role: businessMembers.role })
          .from(businessMembers)
          .where(and(eq(businessMembers.businessId, biz.id), eq(businessMembers.userId, dbUser.id)))
          .limit(1);
        if (membership) {
          activeBizId = membership.businessId;
          activeRole = membership.role as UserRole;
        }
      }
    }
  }

  if (!activeBizId) {
    const [ownedBiz] = await db
      .select({ id: businesses.id, status: businesses.status })
      .from(businesses)
      .where(eq(businesses.ownerId, dbUser.id))
      .limit(1);

    if (ownedBiz && (!ownedBiz.status || ownedBiz.status === 'ACTIVE')) {
      activeBizId = ownedBiz.id;
      activeRole = UserRole.BUSINESS_OWNER;
    } else {
      const [membership] = await db
        .select({ businessId: businessMembers.businessId, role: businessMembers.role })
        .from(businessMembers)
        .where(eq(businessMembers.userId, dbUser.id))
        .limit(1);
      if (membership) {
        activeBizId = membership.businessId;
        activeRole = membership.role as UserRole;
      }
    }
  }

  const isTruePlatformRole =
    dbPlatformRole === UserRole.SUPER_ADMIN ||
    dbPlatformRole === UserRole.STAFF ||
    dbPlatformRole === UserRole.SUPPORT;

  request.user = {
    id: dbUser.id,
    email: dbUser.email,
    role: isTruePlatformRole ? dbPlatformRole : activeRole,
    businessId: activeBizId,
    kycStatus: dbUser.kycStatus as KycStatus,
  };
  request.businessId = activeBizId;
}

/**
 * Guard: Platform Owner ONLY (SUPER_ADMIN from users.role)
 */
export async function requirePlatformAdmin(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (request.isApiKeyAuth || request.platformRole !== UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Platform Owner (Super Admin) permission required.');
  }
}

/**
 * Guard: Platform Staff & Support (strictly from users.role, never tenant memberships)
 */
export async function requirePlatformStaff(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  const allowed = [UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.SUPPORT];
  if (request.isApiKeyAuth || !request.platformRole || !allowed.includes(request.platformRole)) {
    throw new ForbiddenError('Platform Operator or Admin permission required.');
  }
}

/**
 * Guard: Business Merchant Owner (BUSINESS_OWNER / SUPER_ADMIN)
 */
export async function requireBusinessOwner(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (request.isApiKeyAuth) {
    throw new ForbiddenError('Business Merchant Owner permission required.');
  }
  const allowed = [UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER];
  if (!request.user || !allowed.includes(request.user.role)) {
    throw new ForbiddenError('Business Merchant Owner permission required.');
  }
}

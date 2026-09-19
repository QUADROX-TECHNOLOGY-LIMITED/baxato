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
import { db, users, businesses, eq } from '@baxato/database';
import { apiKeyService } from '../services/api-key.service';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthSessionUser;
    businessId?: string;
    apiKey?: ApiKeyContext;
    isApiKeyAuth?: boolean;
    apiKeyEnvironment?: ApiKeyEnvironment;
  }
}

export function generateToken(payload: AuthSessionUser): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthSessionUser {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthSessionUser;
  } catch {
    throw new AuthenticationError('Invalid or expired authentication session token');
  }
}

export const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('user', undefined);
  fastify.decorateRequest('businessId', undefined);
  fastify.decorateRequest('apiKey', undefined);
  fastify.decorateRequest('isApiKeyAuth', false);
  fastify.decorateRequest('apiKeyEnvironment', undefined);
};

/**
 * Hook to authenticate request using an API Key (x-api-key or Bearer bx_...)
 */
export async function authenticateApiKey(request: FastifyRequest, reply: FastifyReply) {
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

  request.apiKey = {
    id: result.apiKey.id,
    name: result.apiKey.name,
    businessId: result.businessId,
    environment: result.environment!,
  };
  request.businessId = result.businessId;
  request.isApiKeyAuth = true;
  request.apiKeyEnvironment = result.environment;

  // Bind a synthetic developer user so that tenant RBAC permission guards permit execution
  request.user = {
    id: result.apiKey.id,
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
  // Check if API key authentication is provided
  if (request.headers['x-api-key'] || request.headers.authorization?.startsWith('Bearer bx_')) {
    return authenticateApiKey(request, reply);
  }

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Authentication required. Please provide a Bearer token or x-api-key header.');
  }

  const token = authHeader.slice(7).trim();
  const sessionUser = verifyToken(token);

  // Verify user still exists and is active in DB
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

  // Get active business if present
  let activeBizId = sessionUser.businessId;
  if (!activeBizId && (dbUser.role === UserRole.BUSINESS_OWNER || dbUser.role === UserRole.BUSINESS_ADMIN)) {
    const [biz] = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.ownerId, dbUser.id))
      .limit(1);
    activeBizId = biz?.id;
  }

  request.user = {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role as UserRole,
    businessId: activeBizId,
    kycStatus: dbUser.kycStatus as KycStatus,
  };
  request.businessId = activeBizId;
}

/**
 * Guard: Platform Owner ONLY (SUPER_ADMIN)
 */
export async function requirePlatformAdmin(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (request.user?.role !== UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Platform Owner (Super Admin) permission required.');
  }
}

/**
 * Guard: Platform Staff & Support (STAFF / SUPPORT / SUPER_ADMIN)
 */
export async function requirePlatformStaff(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  const allowed = [UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.SUPPORT];
  if (!request.user || !allowed.includes(request.user.role)) {
    throw new ForbiddenError('Platform Operator or Admin permission required.');
  }
}

/**
 * Guard: Business Merchant Owner (BUSINESS_OWNER / SUPER_ADMIN)
 */
export async function requireBusinessOwner(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  const allowed = [UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER];
  if (!request.user || !allowed.includes(request.user.role)) {
    throw new ForbiddenError('Business Merchant Owner permission required.');
  }
}

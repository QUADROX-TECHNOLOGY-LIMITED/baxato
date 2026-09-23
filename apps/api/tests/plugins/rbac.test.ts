import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  Permission,
  hasPermission,
  UserRole,
  KycStatus,
  createSuccessResponse,
  AppError,
  createErrorResponse,
} from '@baxato/common';
import { requirePlatformPermission, requireTenantPermission } from '../../src/plugins/rbac.plugin';
import { generateToken, authPlugin } from '../../src/plugins/auth.plugin';
import { inMemoryDb } from '../test-utils/mock-db';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('Role-Based Access Control (RBAC) & Policy Evaluator', () => {
  describe('Policy Matrix Evaluation', () => {
    it('SUPER_ADMIN possesses full platform and financial access', () => {
      expect(hasPermission(UserRole.SUPER_ADMIN, Permission.PLATFORM_FINANCIAL_READ)).toBe(true);
      expect(hasPermission(UserRole.SUPER_ADMIN, Permission.PLATFORM_USERS_DELETE)).toBe(true);
      expect(hasPermission(UserRole.SUPER_ADMIN, Permission.PLATFORM_PROVIDERS_MANAGE)).toBe(true);
      expect(hasPermission(UserRole.SUPER_ADMIN, Permission.TENANT_WALLETS_TRANSFER)).toBe(true);
    });

    it('STAFF possesses service management & KYC review, but CANNOT delete users or see financial balance sheets', () => {
      expect(hasPermission(UserRole.STAFF, Permission.PLATFORM_PROVIDERS_MANAGE)).toBe(true);
      expect(hasPermission(UserRole.STAFF, Permission.PLATFORM_SERVICES_MANAGE)).toBe(true);
      expect(hasPermission(UserRole.STAFF, Permission.PLATFORM_KYC_REVIEW)).toBe(true);
      expect(hasPermission(UserRole.STAFF, Permission.PLATFORM_USERS_READ)).toBe(true);

      // Strict boundaries
      expect(hasPermission(UserRole.STAFF, Permission.PLATFORM_USERS_DELETE)).toBe(false);
      expect(hasPermission(UserRole.STAFF, Permission.PLATFORM_FINANCIAL_READ)).toBe(false);
    });

    it('SUPPORT possesses basic user and KYC read access, but CANNOT manage providers or see financial balance sheets', () => {
      expect(hasPermission(UserRole.SUPPORT, Permission.PLATFORM_USERS_READ)).toBe(true);
      expect(hasPermission(UserRole.SUPPORT, Permission.PLATFORM_KYC_REVIEW)).toBe(true);

      expect(hasPermission(UserRole.SUPPORT, Permission.PLATFORM_PROVIDERS_MANAGE)).toBe(false);
      expect(hasPermission(UserRole.SUPPORT, Permission.PLATFORM_FINANCIAL_READ)).toBe(false);
      expect(hasPermission(UserRole.SUPPORT, Permission.PLATFORM_USERS_DELETE)).toBe(false);
    });

    it('BUSINESS_OWNER possesses full tenant permissions', () => {
      expect(hasPermission(UserRole.BUSINESS_OWNER, Permission.TENANT_MEMBERS_MANAGE)).toBe(true);
      expect(hasPermission(UserRole.BUSINESS_OWNER, Permission.TENANT_WALLETS_TRANSFER)).toBe(true);
      expect(hasPermission(UserRole.BUSINESS_OWNER, Permission.TENANT_WEBHOOKS_MANAGE)).toBe(true);
      expect(hasPermission(UserRole.BUSINESS_OWNER, Permission.TENANT_BUSINESS_DELETE)).toBe(true);
    });

    it('BUSINESS_ADMIN can manage team and webhooks, but CANNOT delete business or withdraw funds', () => {
      expect(hasPermission(UserRole.BUSINESS_ADMIN, Permission.TENANT_MEMBERS_MANAGE)).toBe(true);
      expect(hasPermission(UserRole.BUSINESS_ADMIN, Permission.TENANT_WEBHOOKS_MANAGE)).toBe(true);
      expect(hasPermission(UserRole.BUSINESS_ADMIN, Permission.TENANT_APIKEYS_MANAGE)).toBe(true);

      expect(hasPermission(UserRole.BUSINESS_ADMIN, Permission.TENANT_BUSINESS_DELETE)).toBe(false);
      expect(hasPermission(UserRole.BUSINESS_ADMIN, Permission.TENANT_WALLETS_TRANSFER)).toBe(false);
    });

    it('DEVELOPER can manage API keys, webhooks, and view transactions, but CANNOT manage members or business settings', () => {
      expect(hasPermission(UserRole.DEVELOPER, Permission.TENANT_APIKEYS_MANAGE)).toBe(true);
      expect(hasPermission(UserRole.DEVELOPER, Permission.TENANT_WEBHOOKS_MANAGE)).toBe(true);
      expect(hasPermission(UserRole.DEVELOPER, Permission.TENANT_TRANSACTIONS_READ)).toBe(true);
      expect(hasPermission(UserRole.DEVELOPER, Permission.TENANT_SERVICES_EXECUTE)).toBe(true);

      expect(hasPermission(UserRole.DEVELOPER, Permission.TENANT_MEMBERS_MANAGE)).toBe(false);
      expect(hasPermission(UserRole.DEVELOPER, Permission.TENANT_BUSINESS_DELETE)).toBe(false);
      expect(hasPermission(UserRole.DEVELOPER, Permission.TENANT_WALLETS_TRANSFER)).toBe(false);
    });
  });

  describe('Route-Level Fastify RBAC Pre-Handler Guard Execution', () => {
    let app: FastifyInstance;
    let superAdminToken: string;
    let staffToken: string;
    let merchantOwnerToken: string;
    let developerToken: string;
    let outsiderToken: string;
    let targetBizId: string;

    beforeAll(async () => {
      inMemoryDb.reset();

      // Create test users in inMemoryDb
      const adminUser = {
        id: 'usr_admin_1',
        email: 'admin@baxato.com',
        firstName: 'Admin',
        lastName: 'Owner',
        role: UserRole.SUPER_ADMIN,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const staffUser = {
        id: 'usr_staff_1',
        email: 'staff@baxato.com',
        firstName: 'Staff',
        lastName: 'Operator',
        role: UserRole.STAFF,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const merchantOwner = {
        id: 'usr_merchant_1',
        email: 'merchant@baxato.com',
        firstName: 'Merchant',
        lastName: 'Owner',
        role: UserRole.BUSINESS_OWNER,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const developerUser = {
        id: 'usr_developer_1',
        email: 'dev@baxato.com',
        firstName: 'Developer',
        lastName: 'Engineer',
        role: UserRole.DEVELOPER,
        status: 'ACTIVE',
        kycStatus: KycStatus.UNVERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const outsiderUser = {
        id: 'usr_outsider_1',
        email: 'outsider@baxato.com',
        firstName: 'Outsider',
        lastName: 'Stranger',
        role: UserRole.BUSINESS_OWNER,
        status: 'ACTIVE',
        kycStatus: KycStatus.UNVERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      inMemoryDb.users.push(adminUser, staffUser, merchantOwner, developerUser, outsiderUser);

      // Create target business owned by merchantOwner
      targetBizId = 'biz_target_123';
      inMemoryDb.businesses.push({
        id: targetBizId,
        ownerId: merchantOwner.id,
        name: 'Target Merchant Ltd',
        slug: 'target-merchant-ltd',
        country: 'NG',
        state: 'Lagos',
        lga: 'Ikeja',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add developer to business_members with DEVELOPER role
      inMemoryDb.businessMembers.push({
        id: 'mem_dev_1',
        businessId: targetBizId,
        userId: developerUser.id,
        role: UserRole.DEVELOPER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Tokens
      superAdminToken = generateToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role, kycStatus: adminUser.kycStatus });
      staffToken = generateToken({ id: staffUser.id, email: staffUser.email, role: staffUser.role, kycStatus: staffUser.kycStatus });
      merchantOwnerToken = generateToken({ id: merchantOwner.id, email: merchantOwner.email, role: merchantOwner.role, businessId: targetBizId, kycStatus: merchantOwner.kycStatus });
      developerToken = generateToken({ id: developerUser.id, email: developerUser.email, role: developerUser.role, businessId: targetBizId, kycStatus: developerUser.kycStatus });
      outsiderToken = generateToken({ id: outsiderUser.id, email: outsiderUser.email, role: outsiderUser.role, kycStatus: outsiderUser.kycStatus });

      // Build Fastify app with test routes
      app = Fastify({ logger: false });
      app.register(authPlugin);
      app.setErrorHandler((error: Error & { statusCode?: number; code?: string }, request, reply) => {
        const isAppError = error instanceof AppError;
        const statusCode = isAppError ? error.statusCode : typeof error.statusCode === 'number' ? error.statusCode : 500;
        const errorCode = isAppError ? error.code : typeof error.code === 'string' ? error.code : 'INTERNAL_SERVER_ERROR';
        return reply.status(statusCode).send(createErrorResponse({ code: errorCode, message: error.message }, request.id));
      });

      // 1. Platform-protected route: Financial Reports
      app.get(
        '/admin/financial-sheets',
        { preHandler: [requirePlatformPermission(Permission.PLATFORM_FINANCIAL_READ)] },
        async (req, reply) => reply.send(createSuccessResponse({ sheet: 'Platform Balances: ₦50,000,000' })),
      );

      // 2. Tenant-protected route: Member Management
      app.post(
        '/businesses/:id/manage-team',
        { preHandler: [requireTenantPermission(Permission.TENANT_MEMBERS_MANAGE)] },
        async (req, reply) => reply.send(createSuccessResponse({ action: 'team_managed' })),
      );

      // 3. Tenant-protected route: Developer API Keys
      app.get(
        '/businesses/:id/api-keys',
        { preHandler: [requireTenantPermission(Permission.TENANT_APIKEYS_MANAGE)] },
        async (req, reply) => reply.send(createSuccessResponse({ keys: ['bx_live_key_123'] })),
      );

      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('Platform Owner (Super Admin) can access financial sheets', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/financial-sheets',
        headers: { authorization: `Bearer ${superAdminToken}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('Platform Staff is blocked from financial balance sheets with 403 FORBIDDEN', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/financial-sheets',
        headers: { authorization: `Bearer ${staffToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('Business Owner can manage team members for their business', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/businesses/${targetBizId}/manage-team`,
        headers: { authorization: `Bearer ${merchantOwnerToken}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('Business Developer is blocked from managing team with 403 FORBIDDEN', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/businesses/${targetBizId}/manage-team`,
        headers: { authorization: `Bearer ${developerToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('Business Developer CAN access API keys for their assigned business', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/businesses/${targetBizId}/api-keys`,
        headers: { authorization: `Bearer ${developerToken}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('Outsider merchant is blocked from accessing another business with 403 FORBIDDEN', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/businesses/${targetBizId}/api-keys`,
        headers: { authorization: `Bearer ${outsiderToken}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });
});

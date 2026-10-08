import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  ServiceType,
  TransactionStatus,
  ProviderName,
  type ApiResponse,
} from '@baxato/common';
import { generateToken } from '../../src/plugins/auth.plugin';
import { inMemoryDb } from '../test-utils/mock-db';
import { ProviderRoutingStrategy } from '../../src/services/providers';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('Staff Administration Endpoints (/admin/*)', () => {
  let app: FastifyInstance;
  let superAdminToken: string;
  let staffToken: string;
  let merchantToken: string;

  beforeAll(async () => {
    inMemoryDb.reset();

    // 1. Seed Super Admin
    inMemoryDb.users.push({
      id: 'usr_super_admin_ops',
      email: 'owner@baxato.com',
      firstName: 'Master',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
      kycStatus: KycStatus.VERIFIED,
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Seed Platform Staff
    inMemoryDb.users.push({
      id: 'usr_staff_ops',
      email: 'staff@baxato.com',
      firstName: 'Operations',
      lastName: 'Staff',
      role: UserRole.STAFF,
      status: 'ACTIVE',
      kycStatus: KycStatus.VERIFIED,
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. Seed Merchant
    inMemoryDb.users.push({
      id: 'usr_merchant_ops',
      email: 'merchant@baxato.com',
      firstName: 'Store',
      lastName: 'Owner',
      role: UserRole.BUSINESS_OWNER,
      status: 'ACTIVE',
      kycStatus: KycStatus.VERIFIED,
      nin: '12345678901',
      dob: '1990-01-01',
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Seed Business
    inMemoryDb.businesses.push({
      id: 'biz_sample_ops',
      ownerId: 'usr_merchant_ops',
      name: 'Sample Pay Enterprise',
      slug: 'sample-pay-enterprise',
      country: 'NG',
      state: 'Lagos',
      lga: 'Ikeja',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. Seed Wallets
    inMemoryDb.wallets.push(
      {
        id: 'wal_main_sample',
        businessId: 'biz_sample_ops',
        type: 'MAIN',
        balance: 5000000n,
        lockedBalance: 0n,
        version: 1,
      },
      {
        id: 'wal_comm_sample',
        businessId: 'biz_sample_ops',
        type: 'COMMISSION',
        balance: 150000n,
        lockedBalance: 0n,
        version: 1,
      },
    );

    // 6. Seed Service Transaction
    inMemoryDb.serviceTransactions.push({
      id: 'txn_airtime_sample',
      businessId: 'biz_sample_ops',
      userId: 'usr_merchant_ops',
      serviceType: ServiceType.AIRTIME,
      amount: 10000n,
      fee: 0n,
      discount: 200n,
      totalAmount: 9800n,
      status: TransactionStatus.SUCCESSFUL,
      recipient: '08012345678',
      providerName: ProviderName.MONNIFY,
      providerReference: 'MNF_TX_001',
      clientReference: 'CLI_REF_001',
      requestReference: 'REQ_REF_001',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 7. Seed KYC Verification
    inMemoryDb.kycVerifications.push({
      id: 'kyc_sample_001',
      userId: 'usr_merchant_ops',
      nin: '12345678901',
      dob: '1990-01-01',
      providerName: 'MONNIFY',
      status: KycStatus.VERIFIED,
      matchScore: 100,
      photoExtracted: true,
      rawResponse: { match: true },
      verifiedAt: new Date(),
      createdAt: new Date(),
    });

    superAdminToken = generateToken({
      id: 'usr_super_admin_ops',
      email: 'owner@baxato.com',
      role: UserRole.SUPER_ADMIN,
      kycStatus: KycStatus.VERIFIED,
    });

    staffToken = generateToken({
      id: 'usr_staff_ops',
      email: 'staff@baxato.com',
      role: UserRole.STAFF,
      kycStatus: KycStatus.VERIFIED,
    });

    merchantToken = generateToken({
      id: 'usr_merchant_ops',
      email: 'merchant@baxato.com',
      role: UserRole.BUSINESS_OWNER,
      kycStatus: KycStatus.VERIFIED,
    });

    const { buildServer } = await import('../../src/server');
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Security & Access Control', () => {
    it('returns 401 Unauthorized when no token is provided', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/overview',
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 403 Forbidden when accessed by a Merchant (BUSINESS_OWNER)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/overview',
        headers: {
          authorization: `Bearer ${merchantToken}`,
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 200 OK when accessed by Staff', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/overview',
        headers: {
          authorization: `Bearer ${staffToken}`,
        },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json<ApiResponse<any>>();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('today');
      expect(body.data).toHaveProperty('merchants');
      expect(body.data).toHaveProperty('providers');
    });

    it('returns 200 OK when accessed by Super Admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/overview',
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /admin/transactions', () => {
    it('returns paginated transactions for Staff', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/transactions?page=1&limit=10',
        headers: {
          authorization: `Bearer ${staffToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<ApiResponse<any[]>>();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
    });

    it('filters transactions by recipient phone search', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/transactions?search=08012345678',
        headers: {
          authorization: `Bearer ${staffToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<ApiResponse<any[]>>();
      expect(body.success).toBe(true);
    });
  });

  describe('GET /admin/merchants', () => {
    it('returns registered merchants with wallet balances for Staff', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/merchants',
        headers: {
          authorization: `Bearer ${staffToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<ApiResponse<any[]>>();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /admin/kyc/records', () => {
    it('returns NIN verification records for Staff', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/kyc/records',
        headers: {
          authorization: `Bearer ${staffToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<ApiResponse<any[]>>();
      expect(body.success).toBe(true);
    });
  });

  describe('GET /admin/providers/health', () => {
    it('returns live provider health and routing table for Staff', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/providers/health',
        headers: {
          authorization: `Bearer ${staffToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<ApiResponse<any>>();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('providerStatuses');
      expect(body.data).toHaveProperty('routingTable');
    });
  });

  describe('PATCH /admin/providers/routing (Staff Failover Trigger)', () => {
    it('allows Staff to switch routing strategy for Airtime', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/admin/providers/routing',
        headers: {
          authorization: `Bearer ${staffToken}`,
        },
        payload: {
          serviceType: ServiceType.AIRTIME,
          strategy: ProviderRoutingStrategy.INTERSWITCH_PRIMARY_MONNIFY_FALLBACK,
          allowFailover: true,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<ApiResponse<any>>();
      expect(body.success).toBe(true);
      expect(body.data.config.primaryProvider).toBe(ProviderName.INTERSWITCH);
      expect(body.data.config.fallbackProvider).toBe(ProviderName.MONNIFY);
    });

    it('rejects invalid serviceType with 400', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/admin/providers/routing',
        headers: {
          authorization: `Bearer ${staffToken}`,
        },
        payload: {
          serviceType: 'INVALID_SERVICE',
          strategy: ProviderRoutingStrategy.MONNIFY_ONLY,
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });
});

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  WalletType,
  TransactionStatus,
  TelecomNetwork,
  type ApiResponse,
} from '@baxato/common';
import { generateToken } from '../../../src/plugins/auth.plugin';
import { inMemoryDb } from '../../test-utils/mock-db';
import type { DataReceiptDto, PublicDataPlanDto } from '../../../src/services/data.service';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../../test-utils/mock-db');
  return createMockDatabase();
});

vi.mock('../../../src/services/providers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/providers')>();
  return {
    ...actual,
    providerRouterService: {
      resolveDynamicRouting: vi.fn().mockResolvedValue({
        primaryName: 'MONNIFY',
        allowFailover: false,
      }),
      vendService: vi.fn().mockResolvedValue({
        status: TransactionStatus.SUCCESSFUL,
        providerName: 'MONNIFY',
        providerReference: 'MNFY_DATA_ROUTE_12345',
        responseCode: '00',
        responseMessage: 'Data Bundle Vended Successfully',
      }),
    },
  };
});

describe('Data Domain Endpoints (/services/data/*)', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let supportToken: string;
  const testBizId = 'biz_data_route_1';
  const ownerId = 'usr_data_owner_1';
  const supportId = 'usr_data_support_1';
  const walletId = 'wal_data_route_main_1';

  beforeAll(async () => {
    inMemoryDb.reset();

    // 1. Seed Owner User & Support User
    inMemoryDb.users.push(
      {
        id: ownerId,
        email: 'data_owner@baxato.com',
        firstName: 'Data',
        lastName: 'Merchant',
        role: UserRole.BUSINESS_OWNER,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: supportId,
        email: 'data_support@baxato.com',
        firstName: 'Support',
        lastName: 'Agent',
        role: UserRole.SUPPORT,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    // 2. Seed Business
    inMemoryDb.businesses.push({
      id: testBizId,
      ownerId,
      name: 'Data Vending Enterprise',
      slug: 'data-vending-enterprise',
      country: 'NG',
      state: 'Lagos',
      lga: 'Ikeja',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. Seed Main Wallet with ₦10,000.00 (1,000,000 Kobo)
    inMemoryDb.wallets.push({
      id: walletId,
      businessId: testBizId,
      type: WalletType.MAIN,
      balance: 1000000n,
      lockedBalance: 0n,
      version: 1,
    });

    // 4. Seed Support Member
    inMemoryDb.businessMembers.push({
      id: 'mem_data_support_1',
      businessId: testBizId,
      userId: supportId,
      role: UserRole.SUPPORT,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ownerToken = generateToken({
      id: ownerId,
      email: 'data_owner@baxato.com',
      role: UserRole.BUSINESS_OWNER,
      businessId: testBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    supportToken = generateToken({
      id: supportId,
      email: 'data_support@baxato.com',
      role: UserRole.SUPPORT,
      businessId: testBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    const { buildServer } = await import('../../../src/server');
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /services/data/categories & /plans', () => {
    it('returns active provider categories without SME by default and strips internal vendor codes', async () => {
      const catRes = await app.inject({
        method: 'GET',
        url: '/services/data/categories',
      });
      expect(catRes.statusCode).toBe(200);
      const catJson = JSON.parse(catRes.payload) as ApiResponse<{
        categories: string[];
        dataTypes: string[];
      }>;
      expect(catJson.success).toBe(true);
      expect(catJson.data.categories).not.toContain('SME');
      expect(catJson.data.dataTypes).toEqual(['DIRECT']);

      const response = await app.inject({
        method: 'GET',
        url: '/services/data/plans',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload) as ApiResponse<PublicDataPlanDto[]>;
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(16);
      expect(json.data.some((p) => p.category === 'SME')).toBe(false);
      json.data.forEach((p: any) => {
        expect(p.monnifyPlanCode).toBeUndefined();
        expect(p.vtpassVariationCode).toBeUndefined();
        expect(p.supportedProviders).toBeUndefined();
      });
    });

    it('dynamically exposes SME categories and Glo SME plans when VTpass is active', async () => {
      const { providerRouterService } = await import('../../../src/services/providers');
      (providerRouterService.resolveDynamicRouting as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        primaryName: 'VTPASS',
        allowFailover: false,
      });

      const catRes = await app.inject({
        method: 'GET',
        url: '/services/data/categories?network=GLO',
      });
      expect(catRes.statusCode).toBe(200);
      const catJson = JSON.parse(catRes.payload) as ApiResponse<{
        categories: string[];
        dataTypes: string[];
      }>;
      expect(catJson.data.categories).toContain('SME');
      expect(catJson.data.dataTypes).toEqual(['DIRECT', 'SME']);

      (providerRouterService.resolveDynamicRouting as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        primaryName: 'VTPASS',
        allowFailover: false,
      });

      const smeRes = await app.inject({
        method: 'GET',
        url: '/services/data/plans?dataType=SME',
      });
      expect(smeRes.statusCode).toBe(200);
      const smeJson = JSON.parse(smeRes.payload) as ApiResponse<PublicDataPlanDto[]>;
      expect(smeJson.success).toBe(true);
      expect(smeJson.data.length).toBeGreaterThanOrEqual(10);
      expect(smeJson.data.every((p) => p.dataType === 'SME')).toBe(true);
      expect(smeJson.data.some((p) => p.id === 'glo_sme_200mb')).toBe(true);
    });

    it('filters plans by network query parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/services/data/plans?network=MTN',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload) as ApiResponse<PublicDataPlanDto[]>;
      expect(json.success).toBe(true);
      json.data.forEach((p) => expect(p.network).toBe(TelecomNetwork.MTN));
    });

    it('rejects invalid network, category, or dataType query parameter with 400', async () => {
      const invalidNet = await app.inject({
        method: 'GET',
        url: '/services/data/plans?network=INVALID_NET',
      });
      expect(invalidNet.statusCode).toBe(400);

      const invalidCat = await app.inject({
        method: 'GET',
        url: '/services/data/plans?category=INVALID_CAT',
      });
      expect(invalidCat.statusCode).toBe(400);

      const invalidType = await app.inject({
        method: 'GET',
        url: '/services/data/plans?dataType=INVALID_TYPE',
      });
      expect(invalidType.statusCode).toBe(400);
    });
  });

  describe('POST /services/data/purchase', () => {
    it('vends data bundle successfully to recipient and returns digital receipt envelope', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/data/purchase',
        headers: {
          authorization: `Bearer ${ownerToken}`,
          'x-idempotency-key': 'idem_data_route_001',
        },
        payload: {
          phone: '08161437292',
          planId: 'mtn_daily_110mb',
        },
      });

      expect(response.statusCode).toBe(201);
      const json = JSON.parse(response.payload) as ApiResponse<DataReceiptDto>;
      expect(json.success).toBe(true);
      expect(json.data.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(json.data.network).toBe(TelecomNetwork.MTN);
      expect(json.data.planId).toBe('mtn_daily_110mb');
      expect(json.data.dataAllowance).toBe('110MB');
      expect(json.data.recipientPhone).toBe('08161437292');
      expect(json.data.faceAmountNaira).toBe(100);
      expect(json.data.discountNaira).toBe(2.5);
      expect(json.data.amountDebitedNaira).toBe(97.5);
      expect(json.data.providerName).toBe('MONNIFY');
      expect(json.data.providerReference).toBe('MNFY_DATA_ROUTE_12345');
    });

    it('rejects data purchase when missing phone number', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/data/purchase',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          planId: 'mtn_daily_110mb',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain('phone number is required');
    });

    it('rejects data purchase when missing planId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/data/purchase',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          phone: '08161437292',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain('planId is required');
    });

    it('denies purchase when user role lacks TENANT_SERVICES_EXECUTE permission (RBAC check)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/data/purchase',
        headers: {
          authorization: `Bearer ${supportToken}`,
        },
        payload: {
          phone: '08161437292',
          planId: 'mtn_daily_110mb',
        },
      });

      expect(response.statusCode).toBe(403);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /services/data/history', () => {
    it('returns tenant data bundle transaction history', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/services/data/history?limit=10&offset=0',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload) as ApiResponse<{
        transactions: DataReceiptDto[];
        total: number;
      }>;

      expect(json.success).toBe(true);
      expect(json.data.total).toBeGreaterThanOrEqual(1);
      expect(json.data.transactions[0].planId).toBe('mtn_daily_110mb');
    });
  });
});

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
import type { AirtimeReceiptDto } from '../../../src/services/airtime.service';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../../test-utils/mock-db');
  return createMockDatabase();
});

vi.mock('../../../src/services/providers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/providers')>();
  return {
    ...actual,
    providerRouterService: {
      vendService: vi.fn().mockResolvedValue({
        status: TransactionStatus.SUCCESSFUL,
        providerName: 'MONNIFY',
        providerReference: 'MNFY_VAS_ROUTE_98765',
        responseCode: '00',
        responseMessage: 'Transaction Successful',
      }),
    },
  };
});

describe('Airtime Domain Endpoints (/services/airtime/*)', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let supportToken: string;
  const testBizId = 'biz_airtime_route_1';
  const ownerId = 'usr_airtime_owner_1';
  const supportId = 'usr_airtime_support_1';
  const walletId = 'wal_airtime_route_main_1';

  beforeAll(async () => {
    inMemoryDb.reset();

    // 1. Seed Owner User & Support User
    inMemoryDb.users.push(
      {
        id: ownerId,
        email: 'airtime_owner@baxato.com',
        firstName: 'Airtime',
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
        email: 'support@baxato.com',
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
      name: 'Airtime Vending Enterprise',
      slug: 'airtime-vending-enterprise',
      country: 'NG',
      state: 'Lagos',
      lga: 'Ikeja',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. Seed Main Wallet with ₦5,000.00 (500,000 Kobo)
    inMemoryDb.wallets.push({
      id: walletId,
      businessId: testBizId,
      type: WalletType.MAIN,
      balance: 500000n,
      lockedBalance: 0n,
      version: 1,
    });

    // 4. Seed Support Member
    inMemoryDb.businessMembers.push({
      id: 'mem_airtime_support_1',
      businessId: testBizId,
      userId: supportId,
      role: UserRole.SUPPORT,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ownerToken = generateToken({
      id: ownerId,
      email: 'airtime_owner@baxato.com',
      role: UserRole.BUSINESS_OWNER,
      businessId: testBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    supportToken = generateToken({
      id: supportId,
      email: 'support@baxato.com',
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

  describe('GET /services/airtime/networks', () => {
    it('returns supported networks, prefix directories, and commercial discount margins', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/services/airtime/networks',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload) as ApiResponse<Array<{
        network: string;
        name: string;
        discountPercent: string;
        minAmountKobo: string;
        maxAmountKobo: string;
        supportedPrefixes: string[];
      }>>;

      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(4);

      const mtn = json.data.find((n) => n.network === TelecomNetwork.MTN);
      expect(mtn).toBeDefined();
      expect(mtn?.name).toBe('MTN Nigeria');
      expect(mtn?.discountPercent).toBe('2.5%');
      expect(mtn?.supportedPrefixes).toContain('0803');
      expect(mtn?.supportedPrefixes).toContain('0816');
    });
  });

  describe('POST /services/airtime/purchase', () => {
    it('vends airtime successfully to recipient and returns digital receipt envelope', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/airtime/purchase',
        headers: {
          authorization: `Bearer ${ownerToken}`,
          'x-idempotency-key': 'idem_airtime_route_001',
        },
        payload: {
          phone: '08161437292',
          amountKobo: '10000', // ₦100.00
        },
      });

      expect(response.statusCode).toBe(201);
      const json = JSON.parse(response.payload) as ApiResponse<AirtimeReceiptDto>;
      expect(json.success).toBe(true);
      expect(json.data.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(json.data.network).toBe(TelecomNetwork.MTN);
      expect(json.data.recipientPhone).toBe('08161437292');
      expect(json.data.faceAmountKobo).toBe('10000');
      expect(json.data.discountKobo).toBe('250'); // 2.5% discount
      expect(json.data.amountDebitedKobo).toBe('9750');
      expect(json.data.providerName).toBe('MONNIFY');
      expect(json.data.providerReference).toBe('MNFY_VAS_ROUTE_98765');
    });

    it('rejects airtime purchase when missing phone number', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/airtime/purchase',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          amountKobo: '10000',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain('phone number is required');
    });

    it('rejects airtime purchase when amount is not a positive integer in Kobo', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/airtime/purchase',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          phone: '08161437292',
          amountKobo: '-500',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain('must be a positive integer in Kobo');
    });

    it('denies purchase when user role lacks TENANT_SERVICES_EXECUTE permission (RBAC check)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/airtime/purchase',
        headers: {
          authorization: `Bearer ${supportToken}`,
        },
        payload: {
          phone: '08161437292',
          amountKobo: '10000',
        },
      });

      expect(response.statusCode).toBe(403);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /services/airtime/history', () => {
    it('returns tenant airtime purchase history', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/services/airtime/history?limit=10&offset=0',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload) as ApiResponse<{
        transactions: AirtimeReceiptDto[];
        total: number;
      }>;

      expect(json.success).toBe(true);
      expect(json.data.total).toBeGreaterThanOrEqual(1);
      expect(json.data.transactions[0].recipientPhone).toBe('08161437292');
    });
  });
});

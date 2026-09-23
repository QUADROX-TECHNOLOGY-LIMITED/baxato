import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  WalletType,
  TransactionStatus,
  CableOperator,
  type ApiResponse,
} from '@baxato/common';
import { generateToken } from '../../../src/plugins/auth.plugin';
import { inMemoryDb } from '../../test-utils/mock-db';
import type { CableReceiptDto, CableValidationDto, CableBouquet } from '../../../src/services/cable.service';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../../test-utils/mock-db');
  return createMockDatabase();
});

vi.mock('../../../src/services/providers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/providers')>();
  return {
    ...actual,
    providerRouterService: {
      validateCustomer: vi.fn().mockResolvedValue({
        isValid: true,
        customerId: '1041541234',
        customerName: 'ADEKUNLE OLAWALE SAMSON',
        responseCode: '90000',
        responseMessage: 'Customer Validated Successfully',
      }),
      vendService: vi.fn().mockResolvedValue({
        status: TransactionStatus.SUCCESSFUL,
        providerName: 'MONNIFY',
        providerReference: 'MNFY_CABLE_ROUTE_12345',
        customerName: 'ADEKUNLE OLAWALE SAMSON',
        responseCode: '00',
        responseMessage: 'Cable TV Bouquet Subscribed Successfully',
      }),
    },
  };
});

describe('Cable Domain Endpoints (/services/cable/*)', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let supportToken: string;
  const testBizId = 'biz_cable_route_1';
  const ownerId = 'usr_cable_owner_1';
  const supportId = 'usr_cable_support_1';
  const walletId = 'wal_cable_route_main_1';

  beforeAll(async () => {
    inMemoryDb.reset();

    // 1. Seed Owner User & Support User
    inMemoryDb.users.push(
      {
        id: ownerId,
        email: 'cable_owner@baxato.com',
        firstName: 'Cable',
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
        email: 'cable_support@baxato.com',
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
      name: 'Cable Vending Enterprise',
      slug: 'cable-vending-enterprise',
      country: 'NG',
      state: 'Lagos',
      lga: 'Ikeja',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. Seed Main Wallet with ₦50,000.00 (5,000,000 Kobo)
    inMemoryDb.wallets.push({
      id: walletId,
      businessId: testBizId,
      type: WalletType.MAIN,
      balance: 5000000n,
      lockedBalance: 0n,
      version: 1,
    });

    // 4. Seed Support Member
    inMemoryDb.businessMembers.push({
      id: 'mem_cable_support_1',
      businessId: testBizId,
      userId: supportId,
      role: UserRole.SUPPORT,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ownerToken = generateToken({
      id: ownerId,
      email: 'cable_owner@baxato.com',
      role: UserRole.BUSINESS_OWNER,
      businessId: testBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    supportToken = generateToken({
      id: supportId,
      email: 'cable_support@baxato.com',
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

  describe('GET /services/cable/operators', () => {
    it('returns list of supported Cable TV operators', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/services/cable/operators',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload) as ApiResponse<Array<{ code: string; name: string }>>;
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(3);
      expect(json.data.map((o) => o.code)).toEqual(['DSTV', 'GOTV', 'STARTIMES']);
    });
  });

  describe('GET /services/cable/bouquets', () => {
    it('returns list of all available bouquets across operators', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/services/cable/bouquets',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload) as ApiResponse<CableBouquet[]>;
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(17);
    });

    it('filters bouquets by operator query parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/services/cable/bouquets?operator=DSTV',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload) as ApiResponse<CableBouquet[]>;
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(7);
      json.data.forEach((b) => expect(b.operator).toBe(CableOperator.DSTV));
    });

    it('rejects invalid operator query parameter with 400', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/services/cable/bouquets?operator=INVALID_OP',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /services/cable/validate', () => {
    it('validates subscriber smartcard and returns customer name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/cable/validate',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          operator: 'DSTV',
          smartcard: '1041541234',
        },
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload) as ApiResponse<CableValidationDto>;
      expect(json.success).toBe(true);
      expect(json.data.isValid).toBe(true);
      expect(json.data.operator).toBe(CableOperator.DSTV);
      expect(json.data.smartcard).toBe('1041541234');
      expect(json.data.customerName).toBe('ADEKUNLE OLAWALE SAMSON');
    });

    it('rejects validation when missing operator', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/cable/validate',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          smartcard: '1041541234',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain('operator is required');
    });

    it('rejects validation when missing smartcard', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/cable/validate',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          operator: 'DSTV',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain('Smartcard / IUC number is required');
    });
  });

  describe('POST /services/cable/purchase', () => {
    it('vends cable bouquet successfully to subscriber decoder and returns receipt envelope', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/cable/purchase',
        headers: {
          authorization: `Bearer ${ownerToken}`,
          'x-idempotency-key': 'idem_cable_route_001',
        },
        payload: {
          operator: 'DSTV',
          smartcard: '1041541234',
          bouquetId: 'dstv-confam',
          customerName: 'ADEKUNLE OLAWALE SAMSON',
        },
      });

      expect(response.statusCode).toBe(201);
      const json = JSON.parse(response.payload) as ApiResponse<CableReceiptDto>;
      expect(json.success).toBe(true);
      expect(json.data.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(json.data.operator).toBe(CableOperator.DSTV);
      expect(json.data.bouquetId).toBe('dstv-confam');
      expect(json.data.bouquetName).toBe('DStv Confam');
      expect(json.data.smartcard).toBe('1041541234');
      expect(json.data.customerName).toBe('ADEKUNLE OLAWALE SAMSON');
      expect(json.data.faceAmountNaira).toBe(11000);
      expect(json.data.discountNaira).toBe(165);
      expect(json.data.amountDebitedNaira).toBe(10835);
      expect(json.data.providerName).toBe('MONNIFY');
      expect(json.data.providerReference).toBe('MNFY_CABLE_ROUTE_12345');
    });

    it('rejects purchase when missing smartcard number', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/cable/purchase',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          operator: 'DSTV',
          bouquetId: 'dstv-confam',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain('Smartcard / IUC number is required');
    });

    it('rejects purchase when missing bouquetId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/cable/purchase',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          operator: 'DSTV',
          smartcard: '1041541234',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain('bouquetId is required');
    });

    it('denies purchase when user role lacks TENANT_SERVICES_EXECUTE permission (RBAC check)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/cable/purchase',
        headers: {
          authorization: `Bearer ${supportToken}`,
        },
        payload: {
          operator: 'DSTV',
          smartcard: '1041541234',
          bouquetId: 'dstv-confam',
        },
      });

      expect(response.statusCode).toBe(403);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /services/cable/history', () => {
    it('returns tenant Cable TV transaction history', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/services/cable/history?limit=10&offset=0',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload) as ApiResponse<{
        transactions: CableReceiptDto[];
        total: number;
      }>;

      expect(json.success).toBe(true);
      expect(json.data.total).toBeGreaterThanOrEqual(1);
      expect(json.data.transactions[0].bouquetId).toBe('dstv-confam');
      expect(json.data.transactions[0].operator).toBe(CableOperator.DSTV);
    });
  });
});

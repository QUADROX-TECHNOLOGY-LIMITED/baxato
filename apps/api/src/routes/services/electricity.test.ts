import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  WalletType,
  TransactionStatus,
  DiscoCode,
  ElectricityMeterType,
  type ApiResponse,
} from '@baxato/common';
import { generateToken } from '../../plugins/auth.plugin';
import { inMemoryDb } from '../../test-utils/mock-db';
import type { ElectricityReceiptDto, ElectricityValidationDto, DiscoInfo } from '../../services/electricity.service';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../../test-utils/mock-db');
  return createMockDatabase();
});

vi.mock('../../services/providers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/providers')>();
  return {
    ...actual,
    providerRouterService: {
      validateCustomer: vi.fn().mockResolvedValue({
        isValid: true,
        customerId: '45077162324',
        customerName: 'Sogbein Olusola Samson Mr Flat 2 .',
        customerAddress: '9, ORI OSOKO COMMUNITY, OLOKUTA OYO',
        responseCode: '90000',
        responseMessage: 'Customer Validated Successfully',
      }),
      vendService: vi.fn().mockResolvedValue({
        status: TransactionStatus.SUCCESSFUL,
        providerName: 'INTERSWITCH',
        providerReference: 'XAT|Web|3XAT0001|IBDPR|090926070221|A78FKC7H3RP',
        token: '18173728177997242246',
        units: '14.3 kWh',
        unitsCostKobo: 46512n,
        vatKobo: 3488n,
        tariff: 'R2',
        feeder: 'ELEWERAN 33KV FEEDER',
        customerName: 'Sogbein Olusola Samson Mr Flat 2 .',
        customerAddress: '9, ORI OSOKO COMMUNITY, OLOKUTA OYO',
        responseCode: '90000',
        responseMessage: 'Transaction Successful',
      }),
    },
  };
});

describe('Electricity Domain Endpoints (/services/electricity/*)', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let supportToken: string;
  const testBizId = 'biz_elec_route_1';
  const ownerId = 'usr_elec_owner_1';
  const supportId = 'usr_elec_support_1';
  const walletId = 'wal_elec_route_main_1';

  beforeAll(async () => {
    inMemoryDb.reset();

    // 1. Seed Owner User & Support User
    inMemoryDb.users.push(
      {
        id: ownerId,
        email: 'electricity_owner@baxato.com',
        firstName: 'Power',
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
        email: 'electricity_support@baxato.com',
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
      name: 'Power Hub Nigeria Ltd',
      slug: 'power-hub-nigeria-ltd',
      country: 'NG',
      state: 'Oyo',
      lga: 'Ibadan North',
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
      id: 'mem_elec_support_1',
      businessId: testBizId,
      userId: supportId,
      role: UserRole.SUPPORT,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ownerToken = generateToken({
      id: ownerId,
      email: 'electricity_owner@baxato.com',
      role: UserRole.BUSINESS_OWNER,
      businessId: testBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    supportToken = generateToken({
      id: supportId,
      email: 'electricity_support@baxato.com',
      role: UserRole.SUPPORT,
      businessId: testBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    const { buildServer } = await import('../../server');
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /services/electricity/discos', () => {
    it('returns list of 12 supported Nigerian DISCOs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/services/electricity/discos',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload) as ApiResponse<DiscoInfo[]>;
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(12);
      expect(json.data.map((d) => d.code)).toEqual([
        DiscoCode.IBEDC,
        DiscoCode.IKEDC,
        DiscoCode.EKEDC,
        DiscoCode.AEDC,
        DiscoCode.EEDC,
        DiscoCode.KEDCO,
        DiscoCode.JED,
        DiscoCode.PHED,
        DiscoCode.BEDC,
        DiscoCode.KAEDCO,
        DiscoCode.YEDC,
        DiscoCode.APLE,
      ]);
    });
  });

  describe('POST /services/electricity/validate', () => {
    it('validates electricity meter number and returns consumer name and address', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/electricity/validate',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          disco: 'IBEDC',
          meterNumber: '45077162324',
          meterType: 'PREPAID',
        },
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload) as ApiResponse<ElectricityValidationDto>;
      expect(json.success).toBe(true);
      expect(json.data.isValid).toBe(true);
      expect(json.data.disco).toBe(DiscoCode.IBEDC);
      expect(json.data.meterNumber).toBe('45077162324');
      expect(json.data.customerName).toBe('Sogbein Olusola Samson Mr Flat 2 .');
      expect(json.data.customerAddress).toBe('9, ORI OSOKO COMMUNITY, OLOKUTA OYO');
    });

    it('rejects validation when missing DISCO code', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/electricity/validate',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          meterNumber: '45077162324',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain('DISCO code is required');
    });

    it('rejects validation with invalid DISCO code', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/electricity/validate',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          disco: 'UNKNOWN_DISCO',
          meterNumber: '45077162324',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain('Invalid DISCO code');
    });

    it('rejects validation when missing meter number', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/electricity/validate',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          disco: 'IBEDC',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain('Meter number is required');
    });

    it('denies validation when user lacks TENANT_SERVICES_EXECUTE permission (RBAC check)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/electricity/validate',
        headers: {
          authorization: `Bearer ${supportToken}`,
        },
        payload: {
          disco: 'IBEDC',
          meterNumber: '45077162324',
        },
      });

      expect(response.statusCode).toBe(403);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /services/electricity/purchase', () => {
    it('vends electricity prepaid STS token successfully and returns receipt envelope', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/electricity/purchase',
        headers: {
          authorization: `Bearer ${ownerToken}`,
          'x-idempotency-key': 'idem_elec_route_001',
        },
        payload: {
          disco: 'IBEDC',
          meterNumber: '45077162324',
          meterType: 'PREPAID',
          amount: 1000,
          customerMobile: '08161437292',
          customerName: 'Sogbein Olusola Samson Mr Flat 2 .',
        },
      });

      expect(response.statusCode).toBe(201);
      const json = JSON.parse(response.payload) as ApiResponse<ElectricityReceiptDto>;
      expect(json.success).toBe(true);
      expect(json.data.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(json.data.disco).toBe(DiscoCode.IBEDC);
      expect(json.data.meterNumber).toBe('45077162324');
      expect(json.data.meterType).toBe(ElectricityMeterType.PREPAID);
      expect(json.data.token).toBe('1817 3728 1779 9724 2246');
      expect(json.data.units).toBe('14.3 kWh');
      expect(json.data.tariff).toBe('R2');
      expect(json.data.feeder).toBe('ELEWERAN 33KV FEEDER');
      expect(json.data.faceAmountNaira).toBe(1000);
      expect(json.data.discountNaira).toBe(12); // 1.2% discount on 1000 = 12
      expect(json.data.amountDebitedNaira).toBe(988); // 1000 - 12 = 988
      expect(json.data.vatNaira).toBe(34.88);
      expect(json.data.providerName).toBe('INTERSWITCH');
      expect(json.data.providerReference).toBe('XAT|Web|3XAT0001|IBDPR|090926070221|A78FKC7H3RP');
    });

    it('rejects purchase when missing DISCO code', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/electricity/purchase',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          meterNumber: '45077162324',
          amount: 1000,
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain('DISCO code is required');
    });

    it('rejects purchase when missing meter number', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/electricity/purchase',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          disco: 'IBEDC',
          amount: 1000,
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain('Meter number is required');
    });

    it('rejects purchase when amount is below minimum ₦500', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/electricity/purchase',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          disco: 'IBEDC',
          meterNumber: '45077162324',
          amount: 200,
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain('is ₦500.00');
    });

    it('denies purchase when user role lacks TENANT_SERVICES_EXECUTE permission (RBAC check)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/services/electricity/purchase',
        headers: {
          authorization: `Bearer ${supportToken}`,
        },
        payload: {
          disco: 'IBEDC',
          meterNumber: '45077162324',
          amount: 1000,
        },
      });

      expect(response.statusCode).toBe(403);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /services/electricity/history', () => {
    it('returns tenant electricity transaction history', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/services/electricity/history?limit=10&offset=0',
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload) as ApiResponse<{
        transactions: ElectricityReceiptDto[];
        total: number;
      }>;

      expect(json.success).toBe(true);
      expect(json.data.total).toBeGreaterThanOrEqual(1);
      expect(json.data.transactions[0].disco).toBe(DiscoCode.IBEDC);
      expect(json.data.transactions[0].token).toBe('1817 3728 1779 9724 2246');
    });
  });
});

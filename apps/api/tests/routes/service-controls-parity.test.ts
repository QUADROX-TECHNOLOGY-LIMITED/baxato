import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  TransactionStatus,
  WalletType,
  DiscoCode,
  ElectricityMeterType,
  CableOperator,
  type ApiResponse,
} from '@baxato/common';
import { generateToken } from '../../src/plugins/auth.plugin';
import { inMemoryDb } from '../test-utils/mock-db';
import { providerRouterService } from '../../src/services/providers';
import { clearMeterValidationCache } from '../../src/services/electricity.service';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('Service Controls Parity (Electricity, Cable TV & Education)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let ownerToken: string;

  const adminId = 'usr_admin_ctrl_parity';
  const ownerId = 'usr_owner_ctrl_parity';
  const bizId = 'biz_ctrl_parity_1';
  const walletId = 'wal_ctrl_parity_main';

  const seedAccounts = () => {
    inMemoryDb.reset();
    clearMeterValidationCache();

    inMemoryDb.users.push(
      {
        id: adminId,
        email: 'admin-parity@baxato.com',
        firstName: 'Platform',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: ownerId,
        email: 'merchant-parity@baxato.com',
        firstName: 'Merchant',
        lastName: 'Owner',
        role: UserRole.BUSINESS_OWNER,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    inMemoryDb.businesses.push({
      id: bizId,
      ownerId,
      name: 'Parity Merchant Ltd',
      slug: 'parity-merchant-ltd',
      country: 'NG',
      state: 'Oyo',
      lga: 'Ibadan North',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    inMemoryDb.wallets.push({
      id: walletId,
      businessId: bizId,
      type: WalletType.MAIN,
      balance: 10_000_000n, // ₦100,000.00
      lockedBalance: 0n,
      version: 1,
    });
  };

  beforeAll(async () => {
    seedAccounts();

    vi.spyOn(providerRouterService, 'validateCustomer').mockImplementation(async (params) => ({
      isValid: true,
      customerId: params.customerId,
      customerName: 'VERIFIED TEST CUSTOMER',
      customerAddress: '12 TESTING AVENUE',
      responseCode: '90000',
      responseMessage: 'Customer Validated Successfully',
    }));

    vi.spyOn(providerRouterService, 'vendService').mockResolvedValue({
      status: TransactionStatus.SUCCESSFUL,
      providerName: 'MONNIFY',
      providerReference: 'MNFY_PARITY_REF_001',
      requestReference: 'REQ_PARITY_001',
      token: '1111-2222-3333-4444-5555',
      units: '14.3 kWh',
      customerName: 'VERIFIED TEST CUSTOMER',
      responseCode: '00',
      responseMessage: 'Transaction Successful',
      pinData: {
        pin: '9988-7766-5544',
        serialNumber: 'EDU-PARITY-001',
        instructions: 'Use PIN at portal',
      },
    });

    adminToken = generateToken({
      id: adminId,
      email: 'admin-parity@baxato.com',
      role: UserRole.SUPER_ADMIN,
      kycStatus: KycStatus.VERIFIED,
    });

    ownerToken = generateToken({
      id: ownerId,
      email: 'merchant-parity@baxato.com',
      role: UserRole.BUSINESS_OWNER,
      kycStatus: KycStatus.VERIFIED,
    });

    const { buildServer } = await import('../../src/server');
    app = buildServer();
    await app.ready();
  });

  beforeEach(() => {
    seedAccounts();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  it('persists ELECTRICITY, CABLE, and EDUCATION disabled controls while preserving AIRTIME/DATA', async () => {
    const settingsRes = await app.inject({
      method: 'GET',
      url: '/admin/settings',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(settingsRes.statusCode, settingsRes.payload).toBe(200);
    const settingsBody = settingsRes.json<ApiResponse<any>>();
    const firstDataOption =
      settingsBody.data.catalogControls.dataNetworks?.[0]?.code ?? 'GLO';
    const firstAirtimeNetwork =
      settingsBody.data.catalogControls.airtimeNetworks?.[0]?.code ?? '9MOBILE';

    const firstPatch = await app.inject({
      method: 'PATCH',
      url: '/admin/settings',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        disabledNetworks: {
          AIRTIME: [firstAirtimeNetwork],
          DATA: [firstDataOption],
        },
      },
    });
    expect(firstPatch.statusCode, `${firstPatch.payload} | keys=${Object.keys(settingsBody.data.catalogControls).join(',')}`).toBe(200);

    const secondPatch = await app.inject({
      method: 'PATCH',
      url: '/admin/settings',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        disabledNetworks: {
          ELECTRICITY: ['IBEDC_PREPAID'],
          CABLE: ['DSTV'],
          EDUCATION: ['JAMB_UTME_NO_MOCK'],
        },
      },
    });
    expect(secondPatch.statusCode).toBe(200);
    const secondBody = secondPatch.json<ApiResponse<any>>();
    expect(secondBody.success).toBe(true);

    const getRes = await app.inject({
      method: 'GET',
      url: '/admin/settings',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = getRes.json<ApiResponse<any>>();
    expect(getBody.data.disabledNetworks.AIRTIME).toEqual([firstAirtimeNetwork]);
    expect(getBody.data.disabledNetworks.DATA).toEqual([firstDataOption]);
    expect(getBody.data.disabledNetworks.ELECTRICITY).toEqual(['IBEDC_PREPAID']);
    expect(getBody.data.disabledNetworks.CABLE).toEqual(['DSTV']);
    expect(getBody.data.disabledNetworks.EDUCATION).toEqual(['JAMB_UTME_NO_MOCK']);
    expect(getBody.data.catalogControls.electricityOptions.some((o: any) => o.id === 'IBEDC_PREPAID')).toBe(true);
    expect(getBody.data.catalogControls.cableOperators.some((o: any) => o.code === 'DSTV')).toBe(true);
    expect(getBody.data.catalogControls.educationPackages.some((p: any) => p.packageCode === 'JAMB_UTME_NO_MOCK')).toBe(true);
  });

  it('enforces disabled IBEDC_PREPAID on electricity catalog, validate, and purchase without debit while allowing IBEDC POSTPAID', async () => {
    await app.inject({
      method: 'PATCH',
      url: '/admin/settings',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        disabledNetworks: { ELECTRICITY: ['IBEDC_PREPAID'] },
      },
    });

    const discosRes = await app.inject({
      method: 'GET',
      url: '/services/electricity/discos',
    });
    expect(discosRes.statusCode).toBe(200);
    const discosBody = discosRes.json<ApiResponse<any[]>>();
    const ibedc = discosBody.data.find((d) => d.code === DiscoCode.IBEDC);
    expect(ibedc).toBeDefined();
    expect(ibedc.prepaidEnabled).toBe(false);
    expect(ibedc.postpaidEnabled).toBe(true);

    const validateDisabledRes = await app.inject({
      method: 'POST',
      url: '/services/electricity/validate',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        disco: 'IBEDC',
        meterNumber: '45077162324',
        meterType: ElectricityMeterType.PREPAID,
      },
    });
    expect(validateDisabledRes.statusCode).toBe(400);

    const purchaseDisabledRes = await app.inject({
      method: 'POST',
      url: '/services/electricity/purchase',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        disco: 'IBEDC',
        meterNumber: '45077162324',
        meterType: ElectricityMeterType.PREPAID,
        amount: 1000,
      },
    });
    expect(purchaseDisabledRes.statusCode).toBe(400);
    expect(inMemoryDb.wallets.find((w) => w.id === walletId)?.balance).toBe(10_000_000n);

    const validatePostpaidRes = await app.inject({
      method: 'POST',
      url: '/services/electricity/validate',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        disco: 'IBEDC',
        meterNumber: '45077162324',
        meterType: ElectricityMeterType.POSTPAID,
      },
    });
    expect(validatePostpaidRes.statusCode).toBe(200);
    expect(validatePostpaidRes.json<ApiResponse<any>>().data.isValid).toBe(true);

    const purchasePostpaidRes = await app.inject({
      method: 'POST',
      url: '/services/electricity/purchase',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        disco: 'IBEDC',
        meterNumber: '45077162324',
        meterType: ElectricityMeterType.POSTPAID,
        amount: 1000,
        customerName: 'VERIFIED TEST CUSTOMER',
      },
    });
    expect(purchasePostpaidRes.statusCode).toBe(201);
  });

  it('enforces disabled Cable TV operator on operators, bouquets, validate, and purchase without debit', async () => {
    await app.inject({
      method: 'PATCH',
      url: '/admin/settings',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        disabledNetworks: { CABLE: ['DSTV'] },
      },
    });

    const opsRes = await app.inject({
      method: 'GET',
      url: '/services/cable/operators',
    });
    expect(opsRes.statusCode).toBe(200);
    const opsBody = opsRes.json<ApiResponse<any[]>>();
    expect(opsBody.data.find((o) => o.code === CableOperator.DSTV)?.enabled).toBe(false);
    expect(opsBody.data.find((o) => o.code === CableOperator.GOTV)?.enabled).toBe(true);

    const bouquetsRes = await app.inject({
      method: 'GET',
      url: '/services/cable/bouquets?operator=DSTV',
    });
    expect(bouquetsRes.statusCode).toBe(200);
    const bouquetsBody = bouquetsRes.json<ApiResponse<any[]>>();
    expect(bouquetsBody.data.every((b) => b.enabled === false)).toBe(true);

    const validateRes = await app.inject({
      method: 'POST',
      url: '/services/cable/validate',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        operator: 'DSTV',
        smartcard: '1041541234',
      },
    });
    expect(validateRes.statusCode).toBe(400);

    const purchaseRes = await app.inject({
      method: 'POST',
      url: '/services/cable/purchase',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        operator: 'DSTV',
        smartcard: '1041541234',
        bouquetId: 'dstv-confam',
      },
    });
    expect(purchaseRes.statusCode).toBe(400);
    expect(inMemoryDb.wallets.find((w) => w.id === walletId)?.balance).toBe(10_000_000n);
  });

  it('enforces disabled Education package on catalog, validate, and purchase without debit', async () => {
    await app.inject({
      method: 'PATCH',
      url: '/admin/settings',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        disabledNetworks: { EDUCATION: ['JAMB_UTME_NO_MOCK'] },
      },
    });

    const packagesRes = await app.inject({
      method: 'GET',
      url: '/services/education/packages',
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(packagesRes.statusCode).toBe(200);
    const packagesBody = packagesRes.json<ApiResponse<any[]>>();
    expect(packagesBody.data.find((p) => p.packageCode === 'JAMB_UTME_NO_MOCK')?.enabled).toBe(false);
    expect(packagesBody.data.find((p) => p.packageCode === 'WAEC_RESULT_CHECKER')?.enabled).toBe(true);

    const validateRes = await app.inject({
      method: 'POST',
      url: '/services/education/validate',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        examBody: 'JAMB',
        packageCode: 'JAMB_UTME_NO_MOCK',
        candidateId: '1029384756',
      },
    });
    expect(validateRes.statusCode).toBe(400);

    const purchaseRes = await app.inject({
      method: 'POST',
      url: '/services/education/purchase',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        packageCode: 'JAMB_UTME_NO_MOCK',
        candidateId: '1029384756',
        quantity: 1,
      },
    });
    expect(purchaseRes.statusCode).toBe(400);
    expect(inMemoryDb.wallets.find((w) => w.id === walletId)?.balance).toBe(10_000_000n);
  });
});

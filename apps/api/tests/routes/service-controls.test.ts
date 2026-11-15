import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  WalletType,
  TelecomNetwork,
  TransactionStatus,
  type ApiResponse,
} from '@baxato/common';
import { generateToken } from '../../src/plugins/auth.plugin';
import { inMemoryDb } from '../test-utils/mock-db';
import { serviceControlsService } from '../../src/services/service-controls.service';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

vi.mock('../../src/services/providers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/providers')>();
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
        providerReference: 'MNFY_CTRL_TEST_1',
        responseCode: '00',
        responseMessage: 'Transaction Successful',
      }),
    },
  };
});

describe('Admin Service Controls Persistence & Enforcement (/admin/settings + /services/*)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let merchantToken: string;

  const adminId = 'usr_ctrl_admin';
  const merchantId = 'usr_ctrl_merchant';
  const bizId = 'biz_ctrl_1';

  beforeAll(async () => {
    adminToken = generateToken({
      id: adminId,
      email: 'ctrl_admin@baxato.com',
      role: UserRole.SUPER_ADMIN,
      kycStatus: KycStatus.VERIFIED,
    });

    merchantToken = generateToken({
      id: merchantId,
      email: 'ctrl_merchant@baxato.com',
      role: UserRole.BUSINESS_OWNER,
      businessId: bizId,
      kycStatus: KycStatus.VERIFIED,
    });

    const { buildServer } = await import('../../src/server');
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    inMemoryDb.reset();
    serviceControlsService.invalidateCache();

    inMemoryDb.users.push(
      {
        id: adminId,
        email: 'ctrl_admin@baxato.com',
        firstName: 'Super',
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
        id: merchantId,
        email: 'ctrl_merchant@baxato.com',
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
      ownerId: merchantId,
      name: 'Control Merchant Ltd',
      slug: 'control-merchant-ltd',
      country: 'NG',
      state: 'Lagos',
      lga: 'Ikeja',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    inMemoryDb.wallets.push({
      id: 'wal_ctrl_main',
      businessId: bizId,
      type: WalletType.MAIN,
      balance: 500000n, // ₦5,000
      lockedBalance: 0n,
      version: 1,
    });
  });

  it('persists disabled airtime/data networks and data plans via PATCH /admin/settings', async () => {
    const patchRes = await app.inject({
      method: 'PATCH',
      url: '/admin/settings',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        disabledNetworks: {
          AIRTIME: [TelecomNetwork.MTN],
          DATA: [TelecomNetwork.GLO],
        },
        disabledDataPlans: ['mtn_daily_110mb'],
      },
    });

    expect(patchRes.statusCode).toBe(200);
    expect(inMemoryDb.systemSettings).toHaveLength(1);
    expect(inMemoryDb.systemSettings[0].disabledNetworks.AIRTIME).toEqual([TelecomNetwork.MTN]);
    expect(inMemoryDb.systemSettings[0].disabledNetworks.DATA).toEqual([TelecomNetwork.GLO]);
    expect(inMemoryDb.systemSettings[0].disabledDataPlans).toEqual(['mtn_daily_110mb']);

    const getRes = await app.inject({
      method: 'GET',
      url: '/admin/settings',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(getRes.statusCode).toBe(200);
    const getBody = getRes.json<ApiResponse<any>>();
    expect(getBody.data.disabledNetworks.AIRTIME).toEqual([TelecomNetwork.MTN]);
    expect(getBody.data.disabledNetworks.DATA).toEqual([TelecomNetwork.GLO]);
    expect(getBody.data.disabledDataPlans).toEqual(['mtn_daily_110mb']);
    expect(Array.isArray(getBody.data.catalogControls.dataPlans)).toBe(true);
    // Admin catalog retains disabled plans so they can be re-enabled
    expect(getBody.data.catalogControls.dataPlans.some((p: any) => p.id === 'mtn_daily_110mb')).toBe(true);
  });

  it('marks disabled airtime networks as enabled=false and blocks airtime purchase without debiting wallet', async () => {
    await serviceControlsService.updateSettings({
      disabledNetworks: { AIRTIME: [TelecomNetwork.MTN], DATA: [] },
    });

    const netRes = await app.inject({
      method: 'GET',
      url: '/services/airtime/networks',
    });
    expect(netRes.statusCode).toBe(200);
    const nets = netRes.json<ApiResponse<Array<{ network: string; enabled: boolean }>>>().data;
    expect(nets.find((n) => n.network === TelecomNetwork.MTN)?.enabled).toBe(false);
    expect(nets.find((n) => n.network === TelecomNetwork.AIRTEL)?.enabled).toBe(true);

    const buyDisabled = await app.inject({
      method: 'POST',
      url: '/services/airtime/purchase',
      headers: { authorization: `Bearer ${merchantToken}` },
      payload: {
        phone: '08031234567',
        network: TelecomNetwork.MTN,
        amountKobo: '10000',
      },
    });
    expect(buyDisabled.statusCode).toBe(400);
    expect(buyDisabled.json<ApiResponse>().error?.message).toContain('MTN Nigeria airtime is currently unavailable');
    expect(inMemoryDb.wallets[0].balance).toBe(500000n);

    // Other enabled networks keep working normally
    const buyEnabled = await app.inject({
      method: 'POST',
      url: '/services/airtime/purchase',
      headers: { authorization: `Bearer ${merchantToken}` },
      payload: {
        phone: '08021234567',
        network: TelecomNetwork.AIRTEL,
        amountKobo: '10000',
      },
    });
    expect(buyEnabled.statusCode).toBe(201);
  });

  it('omits disabled data plans and networks from catalog and rejects direct purchase attempts', async () => {
    await serviceControlsService.updateSettings({
      disabledNetworks: { AIRTIME: [], DATA: [TelecomNetwork.GLO] },
      disabledDataPlans: ['mtn_daily_110mb'],
    });

    const dataNetsRes = await app.inject({
      method: 'GET',
      url: '/services/data/networks',
    });
    expect(dataNetsRes.statusCode).toBe(200);
    const dataNets = dataNetsRes.json<ApiResponse<Array<{ network: string; enabled: boolean }>>>().data;
    expect(dataNets.find((n) => n.network === TelecomNetwork.GLO)?.enabled).toBe(false);
    expect(dataNets.find((n) => n.network === TelecomNetwork.MTN)?.enabled).toBe(true);

    const plansRes = await app.inject({
      method: 'GET',
      url: '/services/data/plans',
    });
    expect(plansRes.statusCode).toBe(200);
    const plans = plansRes.json<ApiResponse<Array<{ id: string; network: string }>>>().data;
    expect(plans.some((p) => p.network === TelecomNetwork.GLO)).toBe(false);
    expect(plans.some((p) => p.id === 'mtn_daily_110mb')).toBe(false);
    expect(plans.some((p) => p.network === TelecomNetwork.MTN && p.id !== 'mtn_daily_110mb')).toBe(true);

    // Direct attempt to purchase disabled plan is blocked before debit
    const disabledPlanBuy = await app.inject({
      method: 'POST',
      url: '/services/data/purchase',
      headers: { authorization: `Bearer ${merchantToken}` },
      payload: {
        phone: '08031234567',
        planId: 'mtn_daily_110mb',
      },
    });
    expect(disabledPlanBuy.statusCode).toBe(400);
    expect(disabledPlanBuy.json<ApiResponse>().error?.message).toContain('currently unavailable');
    expect(inMemoryDb.wallets[0].balance).toBe(500000n);

    // Direct attempt to purchase plan on disabled GLO network is blocked
    const disabledNetBuy = await app.inject({
      method: 'POST',
      url: '/services/data/purchase',
      headers: { authorization: `Bearer ${merchantToken}` },
      payload: {
        phone: '08051234567',
        planId: 'glo_monthly_4gb',
      },
    });
    expect(disabledNetBuy.statusCode).toBe(400);
    expect(disabledNetBuy.json<ApiResponse>().error?.message).toContain('Globacom (Glo) data bundles are currently unavailable');
    expect(inMemoryDb.wallets[0].balance).toBe(500000n);
  });
});

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  WalletType,
  TransactionStatus,
  TelecomNetwork,
  ApiKeyEnvironment,
  type ApiResponse,
} from '@baxato/common';
import { inMemoryDb } from '../../test-utils/mock-db';
import { apiKeyService } from '../../../src/services/api-key.service';

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
        providerReference: 'MNFY_KEY_VEND_12345',
        responseCode: '00',
        responseMessage: 'Vending Successful via Developer API',
      }),
    },
  };
});

describe('Developer Dual-Authentication & Service Vending Integration', () => {
  let app: FastifyInstance;
  let liveRawKey: string;
  let testRawKey: string;
  let revokedRawKey: string;

  const bizId = 'biz_dual_auth_1';
  const otherBizId = 'biz_dual_auth_2';
  const ownerId = 'usr_dual_auth_owner_1';
  const walletId = 'wal_dual_auth_main_1';

  beforeAll(async () => {
    inMemoryDb.reset();

    // 1. Seed Business Owner
    inMemoryDb.users.push({
      id: ownerId,
      email: 'dual_owner@baxato.com',
      firstName: 'Dual',
      lastName: 'Auth',
      role: UserRole.BUSINESS_OWNER,
      status: 'ACTIVE',
      kycStatus: KycStatus.VERIFIED,
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Seed Businesses
    inMemoryDb.businesses.push(
      {
        id: bizId,
        name: 'API Key Vending Merchant',
        slug: 'api-key-merchant',
        ownerId,
        status: 'ACTIVE',
        tier: 'GROWTH',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: otherBizId,
        name: 'Target Business B',
        slug: 'target-biz-b',
        ownerId,
        status: 'ACTIVE',
        tier: 'STARTER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    // 3. Seed Wallet for bizId with 500,000 Kobo (₦5,000)
    inMemoryDb.wallets.push({
      id: walletId,
      businessId: bizId,
      type: WalletType.MAIN,
      currency: 'NGN',
      balance: 500000n,
      ledgerBalance: 500000n,
      lockedBalance: 0n,
      dailyDebitLimit: 100000000n,
      version: 1,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Generate Live and Test API keys directly via service
    const liveKeyRes = await apiKeyService.generateApiKey({
      businessId: bizId,
      name: 'Automated Vending Live Key',
      environment: ApiKeyEnvironment.LIVE,
    });
    liveRawKey = liveKeyRes.secretKey;

    const testKeyRes = await apiKeyService.generateApiKey({
      businessId: bizId,
      name: 'Automated Vending Test Key',
      environment: ApiKeyEnvironment.TEST,
    });
    testRawKey = testKeyRes.secretKey;

    const revokedKeyRes = await apiKeyService.generateApiKey({
      businessId: bizId,
      name: 'Revoked Key',
      environment: ApiKeyEnvironment.LIVE,
    });
    revokedRawKey = revokedKeyRes.secretKey;
    await apiKeyService.revokeApiKey(revokedKeyRes.apiKey.id, bizId);

    const { buildServer } = await import('../../../src/server');
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows querying telecom networks with x-api-key header', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/services/airtime/networks',
      headers: {
        'x-api-key': liveRawKey,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<ApiResponse<unknown>>();
    expect(body.success).toBe(true);
  });

  it('allows querying data plans using Bearer bx_... format', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/services/data/plans',
      headers: {
        authorization: `Bearer ${testRawKey}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<ApiResponse<unknown>>();
    expect(body.success).toBe(true);
  });

  it('executes airtime purchase using x-api-key, deducting business wallet', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/services/airtime/purchase',
      headers: {
        'x-api-key': liveRawKey,
      },
      payload: {
        phone: '08031234567',
        amountKobo: 100000, // ₦1,000
        network: TelecomNetwork.MTN,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<ApiResponse<any>>();
    expect(body.success).toBe(true);
    expect(body.data.recipientPhone).toBe('08031234567');
    expect(body.data.status).toBe(TransactionStatus.SUCCESSFUL);

    // Verify wallet was debited: ₦1,000 airtime at 2.5% discount = ₦975 (97500 kobo) debit
    const wallet = inMemoryDb.wallets.find((w) => w.id === walletId)!;
    expect(wallet.balance).toBe(500000n - 97500n);
  });

  it('rejects requests with invalid or nonexistent API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/services/airtime/purchase',
      headers: {
        'x-api-key': 'bx_live_0000000000000000000000000000000000000000000000000000000000000000',
      },
      payload: {
        phone: '08031234567',
        amountKobo: 10000,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects requests with revoked API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/services/airtime/purchase',
      headers: {
        'x-api-key': revokedRawKey,
      },
      payload: {
        phone: '08031234567',
        amountKobo: 10000,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('prevents cross-tenant privilege escalation: API key cannot act on another business', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/services/airtime/purchase',
      headers: {
        'x-api-key': liveRawKey,
        'x-business-id': otherBizId, // Trying to target business 2 with key from business 1
      },
      payload: {
        phone: '08031234567',
        amountKobo: 10000,
      },
    });

    expect(response.statusCode).toBe(403);
  });
});

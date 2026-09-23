import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  WalletType,
  type ApiResponse,
  type WalletBalanceDto,
} from '@baxato/common';
import { generateToken } from '../../src/plugins/auth.plugin';
import { inMemoryDb } from '../test-utils/mock-db';
import { walletService } from '../../src/services/wallet.service';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('Wallet Engine & Concurrency Locking Endpoints (/wallets/*)', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let devToken: string;
  const testBizId = 'biz_fin_100';
  const ownerId = 'usr_owner_100';
  const devId = 'usr_dev_100';

  beforeAll(async () => {
    inMemoryDb.reset();

    // 1. Seed Owner User
    inMemoryDb.users.push(
      {
        id: ownerId,
        email: 'merchant_owner@baxato.com',
        firstName: 'Owner',
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
        id: devId,
        email: 'dev@baxato.com',
        firstName: 'Dev',
        lastName: 'User',
        role: UserRole.DEVELOPER,
        status: 'ACTIVE',
        kycStatus: KycStatus.UNVERIFIED,
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
      name: 'Fintech Ventures Ltd',
      slug: 'fintech-ventures-ltd',
      country: 'NG',
      state: 'Lagos',
      lga: 'Ikeja',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. Seed Wallets
    inMemoryDb.wallets.push(
      {
        id: 'wal_main_test',
        businessId: testBizId,
        type: WalletType.MAIN,
        balance: 1000000n, // ₦10,000.00
        lockedBalance: 0n,
        version: 1,
      },
      {
        id: 'wal_comm_test',
        businessId: testBizId,
        type: WalletType.COMMISSION,
        balance: 250000n, // ₦2,500.00
        lockedBalance: 0n,
        version: 1,
      },
    );

    // 4. Seed Developer Membership
    inMemoryDb.businessMembers.push({
      id: 'mem_dev_100',
      businessId: testBizId,
      userId: devId,
      role: UserRole.DEVELOPER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ownerToken = generateToken({
      id: ownerId,
      email: 'merchant_owner@baxato.com',
      role: UserRole.BUSINESS_OWNER,
      businessId: testBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    devToken = generateToken({
      id: devId,
      email: 'dev@baxato.com',
      role: UserRole.DEVELOPER,
      businessId: testBizId,
      kycStatus: KycStatus.UNVERIFIED,
    });

    const { buildServer } = await import('../../src/server');
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /wallets returns both MAIN and COMMISSION wallets for active business', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/wallets',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ wallets: WalletBalanceDto[] }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.wallets).toHaveLength(2);
  });

  it('GET /wallets/main returns MAIN wallet details', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/wallets/main',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ wallet: WalletBalanceDto }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.wallet.type).toBe('MAIN');
    expect(body.data?.wallet.balanceNaira).toBe(10000);
  });

  it('GET /wallets/commission returns COMMISSION wallet details', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/wallets/commission',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ wallet: WalletBalanceDto }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.wallet.type).toBe('COMMISSION');
    expect(body.data?.wallet.balanceNaira).toBe(2500);
  });

  it('POST /wallets/transfer allows owner to sweep commission earnings to main wallet', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/wallets/transfer',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
      payload: {
        amountNaira: 1000,
        narration: 'Sweeping daily commissions',
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{
      transfer: {
        amountNaira: number;
        commissionWallet: WalletBalanceDto;
        mainWallet: WalletBalanceDto;
      };
    }> = res.json();

    expect(body.success).toBe(true);
    expect(body.data?.transfer.commissionWallet.balanceNaira).toBe(1500); // ₦2500 - ₦1000 = ₦1500
    expect(body.data?.transfer.mainWallet.balanceNaira).toBe(11000); // ₦10000 + ₦1000 = ₦11000
  });

  it('POST /wallets/transfer blocks Developer from withdrawing/transferring wallet funds with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/wallets/transfer',
      headers: {
        authorization: `Bearer ${devToken}`,
        'x-business-id': testBizId,
      },
      payload: {
        amountNaira: 500,
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('POST /wallets/transfer rejects transfer exceeding commission balance with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/wallets/transfer',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
      payload: {
        amountNaira: 50000, // Exceeds available ₦1500
      },
    });

    expect(res.statusCode).toBe(402);
    const body: ApiResponse = res.json();
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('INSUFFICIENT_BALANCE');
  });

  it('High-Concurrency Race Condition: 10 parallel debit requests prevent double-spending & negative balances', async () => {
    // Seed new wallet with ₦1,000 (100,000 Kobo)
    const stressWalletId = 'wal_stress_1';
    inMemoryDb.wallets.push({
      id: stressWalletId,
      businessId: testBizId,
      type: WalletType.MAIN,
      balance: 100000n, // ₦1,000
      lockedBalance: 0n,
      version: 1,
    });

    const debitAmount = 30000n; // ₦300 each (10 * 300 = ₦3,000 total requested)

    // Execute 10 concurrent debit requests simultaneously
    const results = await Promise.allSettled(
      Array.from({ length: 10 }).map(() => walletService.debitWallet(stressWalletId, debitAmount)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    // Exactly 3 debits must succeed (3 * 300 = ₦900)
    expect(succeeded.length).toBe(3);
    expect(failed.length).toBe(7);

    // Final wallet balance must be exactly ₦100 (10,000 Kobo), NEVER negative!
    const finalWallet = inMemoryDb.wallets.find((w) => w.id === stressWalletId);
    expect(finalWallet?.balance).toBe(10000n);
  });
});

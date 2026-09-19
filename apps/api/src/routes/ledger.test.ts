import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  LedgerDirection,
  type ApiResponse,
  type LedgerStatementDto,
} from '@baxato/common';
import { generateToken } from '../plugins/auth.plugin';
import { inMemoryDb } from '../test-utils/mock-db';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('Financial Ledger & Audit Endpoints (/ledger/*)', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  const testBizId = 'biz_ledger_route_100';
  const ownerId = 'usr_ledger_owner_100';
  const walletId = 'wal_ledger_route_test';

  beforeAll(async () => {
    inMemoryDb.reset();

    // 1. Seed Owner User
    inMemoryDb.users.push({
      id: ownerId,
      email: 'ledger_owner@baxato.com',
      firstName: 'Ledger',
      lastName: 'Owner',
      role: UserRole.BUSINESS_OWNER,
      status: 'ACTIVE',
      kycStatus: KycStatus.VERIFIED,
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Seed Business
    inMemoryDb.businesses.push({
      id: testBizId,
      ownerId,
      name: 'Ledger Audit Corp',
      slug: 'ledger-audit-corp',
      country: 'NG',
      state: 'Lagos',
      lga: 'Victoria Island',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. Seed Wallet
    inMemoryDb.wallets.push({
      id: walletId,
      businessId: testBizId,
      type: 'MAIN',
      balance: 150000n, // ₦1,500
      lockedBalance: 0n,
      version: 1,
    });

    // 4. Seed Ledger Entries
    inMemoryDb.financialLedger.push(
      {
        id: 'ldg_route_1',
        businessId: testBizId,
        walletId,
        amount: 200000n, // +₦2,000
        balanceBefore: 0n,
        balanceAfter: 200000n,
        entryType: LedgerDirection.CREDIT,
        direction: LedgerDirection.CREDIT,
        category: 'FUNDING',
        description: 'Wallet Funding',
        reference: 'FUND_001',
        createdAt: new Date(Date.now() - 10000),
      },
      {
        id: 'ldg_route_2',
        businessId: testBizId,
        walletId,
        amount: 50000n, // -₦500
        balanceBefore: 200000n,
        balanceAfter: 150000n,
        entryType: LedgerDirection.DEBIT,
        direction: LedgerDirection.DEBIT,
        category: 'AIRTIME_PURCHASE',
        description: 'Airtime Purchase',
        reference: 'AIRTIME_001',
        createdAt: new Date(),
      },
    );

    ownerToken = generateToken({
      id: ownerId,
      email: 'ledger_owner@baxato.com',
      role: UserRole.BUSINESS_OWNER,
      businessId: testBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    const { buildServer } = await import('../server');
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /ledger/wallets/:walletId returns paginated financial ledger statement', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/ledger/wallets/${walletId}`,
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<LedgerStatementDto> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.walletId).toBe(walletId);
    expect(body.data?.totalCreditsNaira).toBe(2000);
    expect(body.data?.totalDebitsNaira).toBe(500);
    expect(body.data?.netNaira).toBe(1500);
    expect(body.data?.count).toBe(2);
  });

  it('GET /ledger/wallets/:walletId/verify proves zero discrepancy with mathematical audit', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/ledger/wallets/${walletId}/verify`,
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ matches: boolean; discrepancyKobo: string }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.matches).toBe(true);
    expect(body.data?.discrepancyKobo).toBe('0');
  });
});

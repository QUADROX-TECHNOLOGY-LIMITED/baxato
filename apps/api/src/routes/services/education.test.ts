import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  WalletType,
  TransactionStatus,
  ExamBody,
  type ApiResponse,
} from '@baxato/common';
import { generateToken } from '../../plugins/auth.plugin';
import { inMemoryDb } from '../../test-utils/mock-db';
import type { ExamPinReceiptDto, CandidateValidationDto } from '../../services/education.service';

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
        customerId: '1029384756',
        customerName: 'MUSA IBRAHIM CHUKWUEMEKA',
        responseCode: '90000',
        responseMessage: 'Customer Validated Successfully',
      }),
      vendService: vi.fn().mockResolvedValue({
        status: TransactionStatus.SUCCESSFUL,
        providerName: 'INTERSWITCH',
        providerReference: 'ISW_ORION_99214',
        requestReference: '241109283746',
        amountKobo: 570000n,
        responseCode: '90000',
        responseMessage: 'Transaction Successful',
        pinData: {
          pin: '8392-1029-4821',
          serialNumber: 'JAMB-2026-99214',
          instructions: 'Candidate should present profile code at any accredited CBT centre.',
        },
      }),
      requeryTransaction: vi.fn(),
      getHealth: vi.fn(),
    },
  };
});

describe('Education PIN Domain Endpoints (/services/education/*)', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let supportToken: string;
  const testBizId = 'biz_edu_route_1';
  const ownerId = 'usr_edu_owner_1';
  const supportId = 'usr_edu_support_1';
  const walletId = 'wal_edu_route_main_1';

  beforeAll(async () => {
    inMemoryDb.reset();

    // 1. Seed Owner User & Support User
    inMemoryDb.users.push(
      {
        id: ownerId,
        email: 'edu_owner@baxato.com',
        firstName: 'Education',
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
        email: 'support_edu@baxato.com',
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

    // 2. Seed Business & Membership
    inMemoryDb.businesses.push({
      id: testBizId,
      ownerId,
      name: 'EduPin Pro Global Ltd',
      slug: 'edupin-pro-global',
      country: 'NG',
      state: 'Lagos',
      lga: 'Ikeja',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    inMemoryDb.businessMembers.push({
      id: 'mem_edu_1',
      businessId: testBizId,
      userId: ownerId,
      role: UserRole.BUSINESS_OWNER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. Seed Main Wallet with ₦100,000.00 (10,000,000 Kobo)
    inMemoryDb.wallets.push({
      id: walletId,
      businessId: testBizId,
      type: WalletType.MAIN,
      balance: 10000000n,
      lockedBalance: 0n,
      version: 1,
    });

    // 4. Seed Support Member
    inMemoryDb.businessMembers.push({
      id: 'mem_edu_support_1',
      businessId: testBizId,
      userId: supportId,
      role: UserRole.SUPPORT,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. Generate JWT Tokens
    ownerToken = generateToken({
      id: ownerId,
      email: 'edu_owner@baxato.com',
      role: UserRole.BUSINESS_OWNER,
      businessId: testBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    supportToken = generateToken({
      id: supportId,
      email: 'support_edu@baxato.com',
      role: UserRole.SUPPORT,
      businessId: testBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    // 6. Build Server
    const { buildServer } = await import('../../server');
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /services/education/packages > returns catalog with dynamic pricing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/services/education/packages',
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<ApiResponse<any[]>>();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(8);

    const jambDE = body.data.find((p) => p.packageCode === 'JAMB_DIRECT_ENTRY');
    expect(jambDE).toBeDefined();
    expect(jambDE.examBody).toBe('JAMB');
    expect(jambDE.baseCostKobo).toBe('570000');
    expect(jambDE.baseCostNaira).toBe(5700);
  });

  it('POST /services/education/validate > validates JAMB candidate 10-digit profile code', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/services/education/validate',
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        examBody: 'JAMB',
        candidateId: '1029384756',
        packageCode: 'JAMB_DIRECT_ENTRY',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<ApiResponse<CandidateValidationDto>>();
    expect(body.success).toBe(true);
    expect(body.data.isValid).toBe(true);
    expect(body.data.candidateId).toBe('1029384756');
    expect(body.data.candidateName).toBe('MUSA IBRAHIM CHUKWUEMEKA');
  });

  it('POST /services/education/validate > returns 400 on invalid candidate ID', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/services/education/validate',
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        examBody: 'JAMB',
        candidateId: '123', // Invalid length
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('POST /services/education/purchase > successfully vends JAMB Direct Entry PIN and returns receipt', async () => {
    const initialWallet = inMemoryDb.wallets.find((w) => w.id === walletId)!;
    const initialBal = initialWallet.balance;

    const response = await app.inject({
      method: 'POST',
      url: '/services/education/purchase',
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        packageCode: 'JAMB_DIRECT_ENTRY',
        candidateId: '1029384756',
        candidateName: 'Musa Ibrahim Chukwuemeka',
        quantity: 1,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<ApiResponse<ExamPinReceiptDto>>();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(body.data.packageCode).toBe('JAMB_DIRECT_ENTRY');
    expect(body.data.pins).toHaveLength(1);
    expect(body.data.pins[0]?.pin).toBe('8392-1029-4821');
    expect(body.data.amountDebitedKobo).toBe('570000'); // ₦5,700.00 exact wholesale cost

    // Verify wallet was debited by wholesale cost
    const updatedWallet = inMemoryDb.wallets.find((w) => w.id === walletId)!;
    expect(updatedWallet.balance).toBe(initialBal - 570000n);
  });

  it('POST /services/education/purchase > enforces idempotency with identical replay response', async () => {
    const idempotencyKey = 'idem_route_exam_test_8832';

    const firstRes = await app.inject({
      method: 'POST',
      url: '/services/education/purchase',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-idempotency-key': idempotencyKey,
      },
      payload: {
        packageCode: 'WAEC_RESULT_CHECKER',
        candidateId: '08098765432',
      },
    });

    expect(firstRes.statusCode).toBe(201);

    const secondRes = await app.inject({
      method: 'POST',
      url: '/services/education/purchase',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-idempotency-key': idempotencyKey,
      },
      payload: {
        packageCode: 'WAEC_RESULT_CHECKER',
        candidateId: '08098765432',
      },
    });

    expect(secondRes.statusCode).toBe(201);
    expect(secondRes.json().data.transactionId).toBe(firstRes.json().data.transactionId);
  });

  it('PUT /services/education/pricing > updates custom markup dynamically', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/services/education/pricing',
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        packageCode: 'JAMB_DIRECT_ENTRY',
        markupKobo: '45000', // ₦450.00 markup
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.markupKobo).toBe('45000');
  });

  it('GET /services/education/history > retrieves paginated transactions for tenant', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/services/education/history?limit=10&offset=0',
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<ApiResponse<{ transactions: ExamPinReceiptDto[]; total: number }>>();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.transactions)).toBe(true);
    expect(body.data.transactions.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects unprivileged user (SUPPORT) from executing service purchases (403 Forbidden)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/services/education/purchase',
      headers: {
        authorization: `Bearer ${supportToken}`,
      },
      payload: {
        packageCode: 'JAMB_DIRECT_ENTRY',
        candidateId: '1029384756',
      },
    });

    expect(response.statusCode).toBe(403);
  });
});

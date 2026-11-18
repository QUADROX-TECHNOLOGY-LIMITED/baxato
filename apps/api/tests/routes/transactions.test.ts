import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  ServiceType,
  TransactionStatus,
  type ApiResponse,
} from '@baxato/common';
import { generateToken } from '../../src/plugins/auth.plugin';
import { inMemoryDb } from '../test-utils/mock-db';
import { buildTransactionConditions } from '../../src/routes/transactions';
import { providerRouterService } from '../../src/services/providers';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('Unified Transactions Endpoint (/transactions)', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  const testBizId = 'biz_tx_route_100';
  const ownerId = 'usr_tx_owner_100';

  beforeAll(async () => {
    inMemoryDb.reset();

    inMemoryDb.users.push({
      id: ownerId,
      email: 'tx_owner@baxato.com',
      firstName: 'Tx',
      lastName: 'Owner',
      role: UserRole.BUSINESS_OWNER,
      status: 'ACTIVE',
      kycStatus: KycStatus.VERIFIED,
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    inMemoryDb.businesses.push({
      id: testBizId,
      ownerId,
      name: 'Tx Audit Corp',
      slug: 'tx-audit-corp',
      country: 'NG',
      state: 'Lagos',
      lga: 'Ikeja',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    inMemoryDb.wallets.push({
      id: 'wal_tx_main_100',
      businessId: testBizId,
      type: 'MAIN',
      balance: 1000000n,
      lockedBalance: 0n,
      version: 1,
    });

    inMemoryDb.serviceTransactions.push(
      {
        id: 'txn_web_1',
        businessId: testBizId,
        userId: ownerId,
        serviceType: ServiceType.ELECTRICITY,
        amount: 500000n,
        fee: 0n,
        discount: 0n,
        totalAmount: 500000n,
        status: TransactionStatus.FAILED,
        recipient: '45012345678',
        providerName: 'VTPASS',
        requestReference: 'REQ_WEB_1',
        clientReference: 'CLIENT_WEB_1',
        errorMessage: 'Upstream gateway timeout on DISCO node',
        metadata: { disco: 'IKEDC' },
        createdAt: new Date('2026-11-10T12:00:00.000Z'),
        updatedAt: new Date('2026-11-10T12:00:00.000Z'),
      },
      {
        id: 'txn_api_1',
        businessId: testBizId,
        userId: 'key_live_12345',
        serviceType: ServiceType.AIRTIME,
        amount: 100000n,
        fee: 0n,
        discount: 2000n,
        totalAmount: 98000n,
        status: TransactionStatus.SUCCESSFUL,
        recipient: '08012345678',
        providerName: 'MONNIFY',
        requestReference: 'REQ_API_1',
        clientReference: 'CLIENT_API_1',
        errorMessage: null,
        metadata: { channel: 'API' },
        createdAt: new Date('2026-11-18T09:00:00.000Z'),
        updatedAt: new Date('2026-11-18T09:00:00.000Z'),
      },
    );

    ownerToken = generateToken({
      id: ownerId,
      email: 'tx_owner@baxato.com',
      role: UserRole.BUSINESS_OWNER,
      businessId: testBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    const { buildServer } = await import('../../src/server');
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/transactions',
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns merchant-safe records with channel and clientReference without leaking internal errorMessage or providerName', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/transactions',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<{ transactions: any[]; total: number }>>();
    expect(body.success).toBe(true);
    expect(body.data?.transactions.length).toBe(2);

    const webTx = body.data!.transactions.find((t) => t.id === 'txn_web_1');
    const apiTx = body.data!.transactions.find((t) => t.id === 'txn_api_1');

    expect(webTx?.channel).toBe('WEB');
    expect(webTx?.clientReference).toBe('CLIENT_WEB_1');
    expect(webTx).not.toHaveProperty('errorMessage');
    expect(webTx).not.toHaveProperty('providerName');

    expect(apiTx?.channel).toBe('API');
    expect(apiTx?.clientReference).toBe('CLIENT_API_1');
    expect(apiTx).not.toHaveProperty('errorMessage');
    expect(apiTx).not.toHaveProperty('providerName');
  });

  it('builds PENDING filter combining PENDING and PROCESSING and separate API vs WEB channel predicates', () => {
    const pendingConds = buildTransactionConditions(testBizId, { status: 'PENDING' });
    expect(pendingConds).toHaveLength(2);
    expect((pendingConds[1] as any).type).toBe('or');
    expect((pendingConds[1] as any).conditions).toHaveLength(2);

    const apiConds = buildTransactionConditions(testBizId, { channel: 'API' });
    expect(apiConds).toHaveLength(2);
    expect((apiConds[1] as any).type).toBe('or');

    const webConds = buildTransactionConditions(testBizId, { channel: 'WEB' });
    expect(webConds).toHaveLength(2);
    expect((webConds[1] as any).type).toBe('and');
  });

  it('filters transactions by startDate and endDate calendar bounds', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/transactions?startDate=2026-11-18&endDate=2026-11-18',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<{ transactions: any[]; total: number }>>();
    expect(body.success).toBe(true);
    expect(body.data?.transactions).toHaveLength(1);
    expect(body.data?.transactions[0]?.id).toBe('txn_api_1');

    const badRes = await app.inject({
      method: 'GET',
      url: '/transactions?startDate=2026-02-31',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });
    expect(badRes.statusCode).toBe(400);
  });

  it('checks PROCESSING transaction status: keeps wallet debited while processing, updates to SUCCESSFUL on delivery, and refunds once on confirmed FAILED', async () => {
    inMemoryDb.serviceTransactions.push(
      {
        id: 'txn_proc_ok',
        businessId: testBizId,
        userId: ownerId,
        serviceType: ServiceType.AIRTIME,
        amount: 20000n,
        fee: 0n,
        discount: 400n,
        totalAmount: 19600n,
        status: TransactionStatus.PROCESSING,
        recipient: '08011111111',
        providerName: 'VTPASS',
        requestReference: '202611181135BXPROC0001',
        clientReference: 'CLIENT_PROC_1',
        errorMessage: null,
        metadata: { network: 'MTN' },
        createdAt: new Date('2026-11-18T10:35:00.000Z'),
        updatedAt: new Date('2026-11-18T10:35:00.000Z'),
      },
      {
        id: 'txn_proc_fail',
        businessId: testBizId,
        userId: ownerId,
        serviceType: ServiceType.AIRTIME,
        amount: 50000n,
        fee: 0n,
        discount: 1000n,
        totalAmount: 49000n,
        status: TransactionStatus.PROCESSING,
        recipient: '08030000000',
        providerName: 'VTPASS',
        requestReference: '202611181136BXPROC0002',
        clientReference: 'CLIENT_PROC_2',
        errorMessage: null,
        metadata: { network: 'MTN' },
        createdAt: new Date('2026-11-18T10:36:00.000Z'),
        updatedAt: new Date('2026-11-18T10:36:00.000Z'),
      },
      {
        id: 'txn_other_biz',
        businessId: 'biz_other_999',
        userId: 'usr_other_999',
        serviceType: ServiceType.AIRTIME,
        amount: 10000n,
        fee: 0n,
        discount: 0n,
        totalAmount: 10000n,
        status: TransactionStatus.PROCESSING,
        recipient: '08099999999',
        providerName: 'VTPASS',
        requestReference: '202611181137BXOTHER999',
        clientReference: 'CLIENT_OTHER_999',
        errorMessage: null,
        metadata: {},
        createdAt: new Date('2026-11-18T10:37:00.000Z'),
        updatedAt: new Date('2026-11-18T10:37:00.000Z'),
      },
    );

    const requerySpy = vi.spyOn(providerRouterService, 'requeryTransaction');

    // 1. Still processing -> wallet stays untouched
    requerySpy.mockResolvedValueOnce({
      status: TransactionStatus.PROCESSING,
      providerName: 'VTPASS' as any,
      providerReference: '202611181135BXPROC0001',
      requestReference: '202611181135BXPROC0001',
      responseCode: '099',
      responseMessage: 'TRANSACTION PROCESSING',
    });

    const stillProcRes = await app.inject({
      method: 'POST',
      url: '/transactions/txn_proc_ok/check-status',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });
    expect(stillProcRes.statusCode).toBe(200);
    expect(stillProcRes.json<ApiResponse<any>>().data.status).toBe('PROCESSING');
    expect(inMemoryDb.wallets[0]?.balance).toBe(1000000n);

    // 2. Delivered -> updates to SUCCESSFUL without crediting wallet
    requerySpy.mockResolvedValueOnce({
      status: TransactionStatus.SUCCESSFUL,
      providerName: 'VTPASS' as any,
      providerReference: '202611181135BXPROC0001',
      requestReference: '202611181135BXPROC0001',
      responseCode: '000',
      responseMessage: 'TRANSACTION SUCCESSFUL',
    });

    const deliveredRes = await app.inject({
      method: 'POST',
      url: '/transactions/txn_proc_ok/check-status',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });
    expect(deliveredRes.statusCode).toBe(200);
    const deliveredData = deliveredRes.json<ApiResponse<any>>().data;
    expect(deliveredData.status).toBe('SUCCESSFUL');
    expect(deliveredData.updated).toBe(true);
    expect(deliveredData.refunded).toBe(false);
    expect(deliveredData.transaction).not.toHaveProperty('providerName');
    expect(inMemoryDb.wallets[0]?.balance).toBe(1000000n);

    // 3. Confirmed FAILED -> refunds 49000n ONCE, and repeat call does not double-refund
    requerySpy.mockResolvedValueOnce({
      status: TransactionStatus.FAILED,
      providerName: 'VTPASS' as any,
      providerReference: '202611181136BXPROC0002',
      requestReference: '202611181136BXPROC0002',
      responseCode: '016',
      responseMessage: 'TRANSACTION FAILED',
    });

    const failedRes = await app.inject({
      method: 'POST',
      url: '/transactions/txn_proc_fail/check-status',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });
    expect(failedRes.statusCode).toBe(200);
    const failedData = failedRes.json<ApiResponse<any>>().data;
    expect(failedData.status).toBe('FAILED');
    expect(failedData.refunded).toBe(true);
    expect(inMemoryDb.wallets[0]?.balance).toBe(1049000n);

    // Repeat call on already-refunded FAILED transaction must be idempotent
    const repeatFailedRes = await app.inject({
      method: 'POST',
      url: '/transactions/txn_proc_fail/check-status',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });
    expect(repeatFailedRes.statusCode).toBe(200);
    expect(repeatFailedRes.json<ApiResponse<any>>().data.refunded).toBe(false);
    expect(inMemoryDb.wallets[0]?.balance).toBe(1049000n);

    // 4. Cross-tenant isolation -> 404
    const crossTenantRes = await app.inject({
      method: 'POST',
      url: '/transactions/txn_other_biz/check-status',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });
    expect(crossTenantRes.statusCode).toBe(404);

    requerySpy.mockRestore();
  });
});


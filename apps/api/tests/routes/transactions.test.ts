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
        createdAt: new Date(),
        updatedAt: new Date(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
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
});


import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  ApiKeyEnvironment,
  TransactionStatus,
  type ApiResponse,
} from '@baxato/common';
import { generateToken } from '../../src/plugins/auth.plugin';
import { inMemoryDb } from '../test-utils/mock-db';
import { apiKeyService } from '../../src/services/api-key.service';
import { providerRouterService } from '../../src/services/providers/index';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

interface BusinessLogItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string | null;
  deviceName: string | null;
  source: 'DASHBOARD' | 'API_KEY';
  actor: {
    type: 'USER' | 'API_KEY';
    id: string | null;
    name: string;
    email: string | null;
    detail: string;
  };
  title: string;
  description: string;
  category: string;
  changes: Record<string, unknown>;
  createdAt: string;
}

describe('Business Logs & Account Security Separation', () => {
  let app: FastifyInstance;

  const ownerId = 'usr_log_owner_1';
  const adminId = 'usr_log_admin_1';
  const devId = 'usr_log_dev_1';
  const financeId = 'usr_log_fin_1';
  const viewerId = 'usr_log_view_1';
  const outsiderId = 'usr_log_outsider_1';
  const bizId = 'biz_log_ops_1';

  let ownerToken: string;
  let adminToken: string;
  let devToken: string;
  let financeToken: string;
  let viewerToken: string;
  let outsiderToken: string;
  let rawApiKey: string;

  beforeAll(async () => {
    inMemoryDb.reset();

    inMemoryDb.users.push(
      {
        id: ownerId,
        email: 'owner@logtest.ng',
        firstName: 'Amina',
        lastName: 'Bello',
        role: UserRole.BUSINESS_OWNER,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: adminId,
        email: 'admin@logtest.ng',
        firstName: 'Chidi',
        lastName: 'Okeke',
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
        email: 'dev@logtest.ng',
        firstName: 'Tunde',
        lastName: 'Ade',
        role: UserRole.BUSINESS_OWNER,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: financeId,
        email: 'fin@logtest.ng',
        firstName: 'Ngozi',
        lastName: 'Eze',
        role: UserRole.BUSINESS_OWNER,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: viewerId,
        email: 'viewer@logtest.ng',
        firstName: 'Musa',
        lastName: 'Danjuma',
        role: UserRole.BUSINESS_OWNER,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: outsiderId,
        email: 'outsider@logtest.ng',
        firstName: 'Stranger',
        lastName: 'User',
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
      name: 'LogOps Enterprise',
      slug: 'logops-enterprise',
      country: 'NG',
      state: 'Lagos',
      lga: 'Ikeja',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    inMemoryDb.businessMembers.push(
      { id: 'mem_l_admin', businessId: bizId, userId: adminId, role: UserRole.BUSINESS_ADMIN, createdAt: new Date(), updatedAt: new Date() },
      { id: 'mem_l_dev', businessId: bizId, userId: devId, role: UserRole.DEVELOPER, createdAt: new Date(), updatedAt: new Date() },
      { id: 'mem_l_fin', businessId: bizId, userId: financeId, role: UserRole.FINANCE, createdAt: new Date(), updatedAt: new Date() },
      { id: 'mem_l_view', businessId: bizId, userId: viewerId, role: UserRole.VIEWER, createdAt: new Date(), updatedAt: new Date() },
    );

    inMemoryDb.wallets.push({
      id: 'wal_logops_main',
      businessId: bizId,
      type: 'MAIN',
      balance: 10000000n,
      lockedBalance: 0n,
      version: 1,
    });

    const generated = await apiKeyService.generateApiKey({
      businessId: bizId,
      name: 'Checkout Gateway Key',
      environment: ApiKeyEnvironment.TEST,
    });
    rawApiKey = generated.secretKey;

    const now = Date.now();
    inMemoryDb.auditLogs.push(
      {
        id: 'aud_personal_reg',
        userId: ownerId,
        businessId: bizId,
        action: 'USER_REGISTERED',
        resourceType: 'USER',
        resourceId: ownerId,
        ipAddress: '102.89.33.10',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
        changes: { email: 'owner@logtest.ng', businessName: 'LogOps Enterprise' },
        createdAt: new Date(now - 60000),
      },
      {
        id: 'aud_personal_login',
        userId: ownerId,
        action: 'USER_LOGIN',
        resourceType: 'USER',
        resourceId: ownerId,
        ipAddress: '102.89.33.10',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
        changes: { email: 'owner@logtest.ng' },
        createdAt: new Date(now - 50000),
      },
      {
        id: 'aud_personal_pwd',
        userId: ownerId,
        action: 'PASSWORD_CHANGED',
        resourceType: 'USER',
        resourceId: ownerId,
        ipAddress: '102.89.33.10',
        userAgent: 'Mozilla/5.0 Chrome/130.0.0.0',
        changes: {},
        createdAt: new Date(now - 40000),
      },
      {
        id: 'aud_biz_team',
        userId: adminId,
        businessId: bizId,
        action: 'TEAM_MEMBER_INVITED',
        resourceType: 'TEAM_INVITATION',
        resourceId: 'inv_1',
        ipAddress: '102.89.33.25',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
        changes: { email: 'newdev@logtest.ng', role: UserRole.DEVELOPER },
        createdAt: new Date(now - 30000),
      },
      {
        id: 'aud_biz_key',
        userId: ownerId,
        businessId: bizId,
        action: 'API_KEY_CREATED',
        resourceType: 'API_KEY',
        resourceId: generated.apiKey.id,
        ipAddress: '102.89.33.10',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
        changes: {
          actorSource: 'DASHBOARD',
          actorEmail: 'owner@logtest.ng',
          name: 'Checkout Gateway Key',
          environment: 'TEST',
          provider: 'MONNIFY',
        },
        createdAt: new Date(now - 20000),
      },
    );

    ownerToken = generateToken({ id: ownerId, email: 'owner@logtest.ng', role: UserRole.BUSINESS_OWNER, businessId: bizId, kycStatus: KycStatus.VERIFIED });
    adminToken = generateToken({ id: adminId, email: 'admin@logtest.ng', role: UserRole.BUSINESS_ADMIN, businessId: bizId, kycStatus: KycStatus.VERIFIED });
    devToken = generateToken({ id: devId, email: 'dev@logtest.ng', role: UserRole.DEVELOPER, businessId: bizId, kycStatus: KycStatus.VERIFIED });
    financeToken = generateToken({ id: financeId, email: 'fin@logtest.ng', role: UserRole.FINANCE, businessId: bizId, kycStatus: KycStatus.VERIFIED });
    viewerToken = generateToken({ id: viewerId, email: 'viewer@logtest.ng', role: UserRole.VIEWER, businessId: bizId, kycStatus: KycStatus.VERIFIED });
    outsiderToken = generateToken({ id: outsiderId, email: 'outsider@logtest.ng', role: UserRole.BUSINESS_OWNER, kycStatus: KycStatus.VERIFIED });

    const { buildServer } = await import('../../src/server');
    app = buildServer();
    await app.ready();
  });

  it('rejects unauthenticated callers with 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/audit-logs/business',
    });
    expect(res.statusCode).toBe(401);
  });

  it('allows BUSINESS_OWNER and BUSINESS_ADMIN, blocks DEVELOPER, FINANCE, VIEWER, API Key, and outsiders with 403', async () => {
    const allowedTokens = [ownerToken, adminToken];
    for (const token of allowedTokens) {
      const res = await app.inject({
        method: 'GET',
        url: '/audit-logs/business',
        headers: {
          authorization: `Bearer ${token}`,
          'x-business-id': bizId,
        },
      });
      expect(res.statusCode).toBe(200);
    }

    const blockedTokens = [devToken, financeToken, viewerToken, outsiderToken];
    for (const token of blockedTokens) {
      const res = await app.inject({
        method: 'GET',
        url: '/audit-logs/business',
        headers: {
          authorization: `Bearer ${token}`,
          'x-business-id': bizId,
        },
      });
      expect(res.statusCode).toBe(403);
    }

    const apiKeyRes = await app.inject({
      method: 'GET',
      url: '/audit-logs/business',
      headers: {
        'x-api-key': rawApiKey,
      },
    });
    expect(apiKeyRes.statusCode).toBe(403);
  });

  it('separates personal audit trail (/users/me/security) from workspace logs (/audit-logs/business)', async () => {
    const personalRes = await app.inject({
      method: 'GET',
      url: '/users/me/security',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': bizId,
      },
    });
    expect(personalRes.statusCode).toBe(200);
    const personalBody = personalRes.json<ApiResponse<{ auditLogs: Array<{ action: string }> }>>();
    const personalActions = personalBody.data?.auditLogs.map((l) => l.action) || [];
    expect(personalActions).toEqual(
      expect.arrayContaining(['USER_REGISTERED', 'USER_LOGIN', 'PASSWORD_CHANGED']),
    );
    expect(personalActions).not.toContain('API_KEY_CREATED');
    expect(personalActions).not.toContain('TEAM_MEMBER_INVITED');

    const bizRes = await app.inject({
      method: 'GET',
      url: '/audit-logs/business',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': bizId,
      },
    });
    expect(bizRes.statusCode).toBe(200);
    const bizBody = bizRes.json<ApiResponse<{ logs: BusinessLogItem[]; total: number }>>();
    const bizActions = bizBody.data?.logs.map((l) => l.action) || [];

    expect(bizActions).toEqual(expect.arrayContaining(['TEAM_MEMBER_INVITED', 'API_KEY_CREATED']));
    expect(bizActions).not.toContain('USER_REGISTERED');
    expect(bizActions).not.toContain('USER_LOGIN');
    expect(bizActions).not.toContain('PASSWORD_CHANGED');

    // Sanitizes internal upstream provider keys and resolves acting member identity
    const keyEvent = bizBody.data?.logs.find((l) => l.action === 'API_KEY_CREATED');
    expect(keyEvent?.changes.provider).toBeUndefined();
    expect(keyEvent?.actor.type).toBe('USER');
    expect(keyEvent?.actor.name).toBe('Amina Bello');
    expect(keyEvent?.actor.email).toBe('owner@logtest.ng');

    const teamEvent = bizBody.data?.logs.find((l) => l.action === 'TEAM_MEMBER_INVITED');
    expect(teamEvent?.actor.name).toBe('Chidi Okeke');
    expect(teamEvent?.actor.email).toBe('admin@logtest.ng');
  });

  it('records service purchases from both Dashboard and API Key into business logs with actor & IP attribution', async () => {
    const vendSpy = vi.spyOn(providerRouterService, 'vendService').mockResolvedValue({
      status: TransactionStatus.SUCCESSFUL,
      providerName: 'MONNIFY',
      providerReference: 'MNFY_AUDIT_REF_001',
      requestReference: 'REQ_AUDIT_001',
      responseCode: '00',
      responseMessage: 'Transaction Successful',
    } as any);

    const dashBuy = await app.inject({
      method: 'POST',
      url: '/services/airtime/purchase',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': bizId,
        'x-forwarded-for': '41.203.72.10',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36',
      },
      payload: {
        phone: '08031234567',
        amountKobo: '10000',
        network: 'MTN',
      },
    });
    expect(dashBuy.statusCode).toBe(201);

    const apiBuy = await app.inject({
      method: 'POST',
      url: '/services/airtime/purchase',
      headers: {
        'x-api-key': rawApiKey,
        'x-forwarded-for': '197.210.55.12',
        'user-agent': 'axios/1.7.7',
      },
      payload: {
        phone: '08031234568',
        amountKobo: '20000',
        network: 'MTN',
      },
    });
    expect(apiBuy.statusCode).toBe(201);

    // Confirm personal security trail does NOT include service purchases
    const secRes = await app.inject({
      method: 'GET',
      url: '/users/me/security',
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    const secActions = secRes.json<ApiResponse<{ auditLogs: Array<{ action: string }> }>>().data?.auditLogs.map((l) => l.action) || [];
    expect(secActions).not.toContain('AIRTIME_PURCHASE');

    // Filter business logs by source=API_KEY
    const apiLogsRes = await app.inject({
      method: 'GET',
      url: '/audit-logs/business?source=API_KEY&category=transaction',
      headers: {
        authorization: `Bearer ${adminToken}`,
        'x-business-id': bizId,
      },
    });
    expect(apiLogsRes.statusCode).toBe(200);
    const apiLogsBody = apiLogsRes.json<ApiResponse<{ logs: BusinessLogItem[]; total: number }>>();
    expect(apiLogsBody.data?.logs.length).toBeGreaterThanOrEqual(1);
    const apiEntry = apiLogsBody.data?.logs[0];
    expect(apiEntry?.action).toBe('AIRTIME_PURCHASE');
    expect(apiEntry?.source).toBe('API_KEY');
    expect(apiEntry?.actor.type).toBe('API_KEY');
    expect(apiEntry?.actor.name).toBe('Checkout Gateway Key');
    expect(apiEntry?.actor.detail).toBe('TEST API Key');
    expect(apiEntry?.ipAddress).toBe('197.210.55.12');
    expect(JSON.stringify(apiEntry)).not.toContain('MONNIFY');
    vendSpy.mockRestore();
  });
});

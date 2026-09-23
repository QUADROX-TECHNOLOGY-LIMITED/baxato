import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  ApiKeyStatus,
  ApiKeyEnvironment,
  type ApiResponse,
  type ApiKeyDto,
  type ApiKeyGeneratedResponse,
} from '@baxato/common';
import { generateToken } from '../../../src/plugins/auth.plugin';
import { inMemoryDb } from '../../test-utils/mock-db';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../../test-utils/mock-db');
  return createMockDatabase();
});

describe('Developer API Key Endpoints (/developer/keys/*)', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let developerToken: string;
  let supportToken: string;
  let otherOwnerToken: string;

  const testBizId = 'biz_dev_keys_1';
  const otherBizId = 'biz_dev_keys_2';
  const ownerId = 'usr_dev_owner_1';
  const devUserId = 'usr_dev_team_1';
  const supportId = 'usr_support_1';
  const otherOwnerId = 'usr_other_owner_1';

  beforeAll(async () => {
    inMemoryDb.reset();

    // 1. Seed Users
    inMemoryDb.users.push(
      {
        id: ownerId,
        email: 'owner@devkeys.com',
        firstName: 'Key',
        lastName: 'Owner',
        role: UserRole.BUSINESS_OWNER,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: devUserId,
        email: 'dev@devkeys.com',
        firstName: 'Tech',
        lastName: 'Lead',
        role: UserRole.DEVELOPER,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: supportId,
        email: 'support@baxato.internal',
        firstName: 'Platform',
        lastName: 'Support',
        role: UserRole.SUPPORT,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: otherOwnerId,
        email: 'other@competitor.com',
        firstName: 'Other',
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

    // 2. Seed Businesses
    inMemoryDb.businesses.push(
      {
        id: testBizId,
        name: 'Dev Keys Test Business',
        slug: 'dev-keys-test',
        ownerId,
        status: 'ACTIVE',
        tier: 'GROWTH',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: otherBizId,
        name: 'Competitor Business',
        slug: 'competitor-biz',
        ownerId: otherOwnerId,
        status: 'ACTIVE',
        tier: 'STARTER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    // 3. Seed Business Members
    inMemoryDb.businessMembers.push({
      id: 'mem_dev_1',
      businessId: testBizId,
      userId: devUserId,
      role: UserRole.DEVELOPER,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Generate Auth Tokens
    ownerToken = generateToken({
      id: ownerId,
      email: 'owner@devkeys.com',
      role: UserRole.BUSINESS_OWNER,
      businessId: testBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    developerToken = generateToken({
      id: devUserId,
      email: 'dev@devkeys.com',
      role: UserRole.DEVELOPER,
      businessId: testBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    supportToken = generateToken({
      id: supportId,
      email: 'support@baxato.internal',
      role: UserRole.SUPPORT,
      kycStatus: KycStatus.VERIFIED,
    });

    otherOwnerToken = generateToken({
      id: otherOwnerId,
      email: 'other@competitor.com',
      role: UserRole.BUSINESS_OWNER,
      businessId: otherBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    const { buildServer } = await import('../../../src/server');
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /developer/keys returns empty list initially', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/developer/keys',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<ApiResponse<ApiKeyDto[]>>();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it('POST /developer/keys generates a new LIVE API key with secret returned once', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/developer/keys',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
      payload: {
        name: 'Production Core Vending Key',
        environment: ApiKeyEnvironment.LIVE,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<ApiResponse<ApiKeyGeneratedResponse>>();
    expect(body.success).toBe(true);
    expect(body.data.apiKey.name).toBe('Production Core Vending Key');
    expect(body.data.apiKey.environment).toBe(ApiKeyEnvironment.LIVE);
    expect(body.data.apiKey.status).toBe(ApiKeyStatus.ACTIVE);
    expect(body.data.secretKey).toMatch(/^bx_live_[a-f0-9]{64}$/);
    expect(body.data.apiKey.keyPrefix).toBe(body.data.secretKey.slice(0, 14) + '...');
    expect((body.data.apiKey as any).keyHash).toBeUndefined();
  });

  it('POST /developer/keys allows developer role to generate a TEST API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/developer/keys',
      headers: {
        authorization: `Bearer ${developerToken}`,
        'x-business-id': testBizId,
      },
      payload: {
        name: 'Staging Integration Key',
        environment: ApiKeyEnvironment.TEST,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<ApiResponse<ApiKeyGeneratedResponse>>();
    expect(body.success).toBe(true);
    expect(body.data.apiKey.name).toBe('Staging Integration Key');
    expect(body.data.apiKey.environment).toBe(ApiKeyEnvironment.TEST);
    expect(body.data.secretKey).toMatch(/^bx_test_[a-f0-9]{64}$/);
  });

  it('GET /developer/keys lists all created keys with masked values and no raw hashes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/developer/keys',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<ApiResponse<ApiKeyDto[]>>();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(2);

    for (const key of body.data) {
      expect(key.businessId).toBe(testBizId);
      expect((key as any).secretKey).toBeUndefined();
      expect((key as any).keyHash).toBeUndefined();
      expect(key.keyPrefix).toBeDefined();
    }
  });

  it('GET /developer/keys/:id retrieves metadata for a specific key', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/developer/keys',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });
    const keys = listRes.json<ApiResponse<ApiKeyDto[]>>().data;
    const targetKey = keys[0];

    const response = await app.inject({
      method: 'GET',
      url: `/developer/keys/${targetKey.id}`,
      headers: {
        authorization: `Bearer ${developerToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<ApiResponse<ApiKeyDto>>();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(targetKey.id);
    expect(body.data.name).toBe(targetKey.name);
    expect(body.data.status).toBe(ApiKeyStatus.ACTIVE);
  });

  it('POST /developer/keys/:id/rotate revokes old key and returns new secret', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/developer/keys',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });
    const initialKeys = listRes.json<ApiResponse<ApiKeyDto[]>>().data;
    const oldKey = initialKeys[0];

    const response = await app.inject({
      method: 'POST',
      url: `/developer/keys/${oldKey.id}/rotate`,
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<ApiResponse<ApiKeyGeneratedResponse>>();
    expect(body.success).toBe(true);
    expect(body.data.apiKey.id).not.toBe(oldKey.id);
    expect(body.data.apiKey.name).toBe(oldKey.name);
    expect(body.data.apiKey.environment).toBe(oldKey.environment);
    expect(body.data.secretKey).toBeDefined();

    // Verify old key is now REVOKED
    const oldKeyRes = await app.inject({
      method: 'GET',
      url: `/developer/keys/${oldKey.id}`,
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });
    expect(oldKeyRes.json<ApiResponse<ApiKeyDto>>().data.status).toBe(ApiKeyStatus.REVOKED);
  });

  it('POST /developer/keys/:id/revoke revokes an active key immediately', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/developer/keys',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });
    const keys = listRes.json<ApiResponse<ApiKeyDto[]>>().data;
    const activeKey = keys.find((k) => k.status === ApiKeyStatus.ACTIVE)!;

    const response = await app.inject({
      method: 'POST',
      url: `/developer/keys/${activeKey.id}/revoke`,
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<ApiResponse<ApiKeyDto>>();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe(ApiKeyStatus.REVOKED);
  });

  it('enforces cross-tenant isolation: other business cannot access keys', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/developer/keys',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });
    const keys = listRes.json<ApiResponse<ApiKeyDto[]>>().data;
    const keyId = keys[0].id;

    // Competitor owner tries to fetch key of testBizId
    const getRes = await app.inject({
      method: 'GET',
      url: `/developer/keys/${keyId}`,
      headers: {
        authorization: `Bearer ${otherOwnerToken}`,
        'x-business-id': otherBizId,
      },
    });
    expect(getRes.statusCode).toBe(404);

    // Competitor tries to revoke key of testBizId
    const revokeRes = await app.inject({
      method: 'POST',
      url: `/developer/keys/${keyId}/revoke`,
      headers: {
        authorization: `Bearer ${otherOwnerToken}`,
        'x-business-id': otherBizId,
      },
    });
    expect(revokeRes.statusCode).toBe(404);
  });

  it('enforces RBAC: roles without TENANT_APIKEYS_MANAGE receive 403 Forbidden', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/developer/keys',
      headers: {
        authorization: `Bearer ${supportToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('rejects invalid payload on key generation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/developer/keys',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
      payload: {
        name: '', // Empty name
        environment: 'INVALID_ENV',
      },
    });

    expect(response.statusCode).toBe(400);
  });
});

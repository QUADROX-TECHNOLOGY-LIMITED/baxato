import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  WebhookDeliveryStatus,
  WebhookEventType,
  ApiKeyEnvironment,
  type ApiResponse,
  type WebhookConfigDto,
  type WebhookDeliveryDto,
  type TestWebhookResult,
} from '@baxato/common';
import { generateToken } from '../../../src/plugins/auth.plugin';
import { inMemoryDb } from '../../test-utils/mock-db';
import { apiKeyService } from '../../../src/services/api-key.service';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../../test-utils/mock-db');
  return createMockDatabase();
});

describe('Developer Webhook Management Endpoints (/developer/webhooks/*)', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let developerToken: string;
  let supportToken: string;
  let otherOwnerToken: string;
  let liveApiKey: string;

  const testBizId = 'biz_dev_wh_1';
  const otherBizId = 'biz_dev_wh_2';
  const ownerId = 'usr_dev_wh_owner_1';
  const devUserId = 'usr_dev_wh_dev_1';
  const supportId = 'usr_dev_wh_supp_1';
  const otherOwnerId = 'usr_dev_wh_other_1';

  beforeAll(async () => {
    inMemoryDb.reset();

    // 1. Seed Users
    inMemoryDb.users.push(
      {
        id: ownerId,
        email: 'wh_owner@baxato.com',
        firstName: 'Webhook',
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
        email: 'wh_dev@baxato.com',
        firstName: 'API',
        lastName: 'Developer',
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
        email: 'wh_support@baxato.internal',
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
        email: 'competitor@other.com',
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
        name: 'Webhook Test Business',
        slug: 'wh-test-biz',
        ownerId,
        status: 'ACTIVE',
        country: 'NG',
        state: 'Lagos',
        lga: 'Ikeja',
        webhookUrl: 'https://webhook.site/baxato-test',
        webhookSecret: 'whsec_original_secret_1234567890abcdef1234567890abcdef',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: otherBizId,
        name: 'Competitor Biz',
        slug: 'competitor-biz',
        ownerId: otherOwnerId,
        status: 'ACTIVE',
        country: 'NG',
        state: 'Lagos',
        lga: 'Ikeja',
        webhookUrl: null,
        webhookSecret: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    // 3. Seed Business Member
    inMemoryDb.businessMembers.push({
      id: 'mem_wh_1',
      businessId: testBizId,
      userId: devUserId,
      role: UserRole.DEVELOPER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Auth tokens
    ownerToken = generateToken({
      id: ownerId,
      email: 'wh_owner@baxato.com',
      role: UserRole.BUSINESS_OWNER,
      businessId: testBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    developerToken = generateToken({
      id: devUserId,
      email: 'wh_dev@baxato.com',
      role: UserRole.DEVELOPER,
      businessId: testBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    supportToken = generateToken({
      id: supportId,
      email: 'wh_support@baxato.internal',
      role: UserRole.SUPPORT,
      kycStatus: KycStatus.VERIFIED,
    });

    otherOwnerToken = generateToken({
      id: otherOwnerId,
      email: 'competitor@other.com',
      role: UserRole.BUSINESS_OWNER,
      businessId: otherBizId,
      kycStatus: KycStatus.VERIFIED,
    });

    const keyRes = await apiKeyService.generateApiKey({
      businessId: testBizId,
      name: 'Developer Webhooks Key',
      environment: ApiKeyEnvironment.LIVE,
    });
    liveApiKey = keyRes.secretKey;

    const { buildServer } = await import('../../../src/server');
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /developer/webhooks returns current webhook configuration', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/developer/webhooks',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<ApiResponse<WebhookConfigDto>>();
    expect(body.success).toBe(true);
    expect(body.data.webhookUrl).toBe('https://webhook.site/baxato-test');
    expect(body.data.hasSecret).toBe(true);
    expect(body.data.webhookSecretPrefix).toBe('whsec_origin...');
  });

  it('POST /developer/webhooks updates URL and regenerates secret (returned strictly once)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/developer/webhooks',
      headers: {
        authorization: `Bearer ${developerToken}`,
        'x-business-id': testBizId,
      },
      payload: {
        webhookUrl: 'https://api.merchant.com/v1/webhook-listener',
        regenerateSecret: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<ApiResponse<{ config: WebhookConfigDto; newSecret?: string }>>();
    expect(body.success).toBe(true);
    expect(body.data.config.webhookUrl).toBe('https://api.merchant.com/v1/webhook-listener');
    expect(body.data.newSecret).toBeDefined();
    expect(body.data.newSecret).toMatch(/^whsec_[a-f0-9]{64}$/);
  });

  it('allows access via x-api-key dual-authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/developer/webhooks',
      headers: {
        'x-api-key': liveApiKey,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<ApiResponse<WebhookConfigDto>>();
    expect(body.success).toBe(true);
    expect(body.data.webhookUrl).toBe('https://api.merchant.com/v1/webhook-listener');
  });

  it('POST /developer/webhooks/test executes synthetic connection ping', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue('{"success":true}'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const response = await app.inject({
      method: 'POST',
      url: '/developer/webhooks/test',
      headers: {
        authorization: `Bearer ${developerToken}`,
        'x-business-id': testBizId,
      },
      payload: {
        eventType: WebhookEventType.PING,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<ApiResponse<TestWebhookResult>>();
    expect(body.success).toBe(true);
    expect(body.data.success).toBe(true);
    expect(body.data.statusCode).toBe(200);
    expect(body.data.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('GET /developer/webhooks/deliveries retrieves paginated delivery audit logs', async () => {
    inMemoryDb.webhookDeliveries.push({
      id: 'whd_log_1',
      businessId: testBizId,
      eventType: WebhookEventType.TRANSACTION_SUCCESSFUL,
      payload: { transactionId: 'txn_987' },
      status: WebhookDeliveryStatus.SUCCESSFUL,
      attempts: 1,
      responseStatus: 200,
      createdAt: new Date(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/developer/webhooks/deliveries?limit=10&offset=0',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<ApiResponse<{ deliveries: WebhookDeliveryDto[]; total: number }>>();
    expect(body.success).toBe(true);
    expect(body.data.total).toBeGreaterThanOrEqual(1);
    expect(body.data.deliveries[0].id).toBe('whd_log_1');
    expect(body.data.deliveries[0].status).toBe(WebhookDeliveryStatus.SUCCESSFUL);
  });

  it('POST /developer/webhooks/deliveries/:id/retry re-dispatches delivery', async () => {
    inMemoryDb.webhookDeliveries.push({
      id: 'whd_to_retry_route',
      businessId: testBizId,
      eventType: WebhookEventType.TRANSACTION_SUCCESSFUL,
      payload: { transactionId: 'txn_retry_route' },
      status: WebhookDeliveryStatus.PENDING,
      attempts: 1,
      createdAt: new Date(),
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue('Retried OK'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const response = await app.inject({
      method: 'POST',
      url: '/developer/webhooks/deliveries/whd_to_retry_route/retry',
      headers: {
        authorization: `Bearer ${developerToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<ApiResponse<WebhookDeliveryDto>>();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('whd_to_retry_route');
    expect(body.data.status).toBe(WebhookDeliveryStatus.SUCCESSFUL);
    expect(body.data.attempts).toBe(2);
  });

  it('enforces RBAC: SUPPORT role without TENANT_WEBHOOKS_MANAGE is denied (403)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/developer/webhooks',
      headers: {
        authorization: `Bearer ${supportToken}`,
        'x-business-id': testBizId,
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('enforces cross-tenant isolation: merchant cannot access or retry other business webhooks', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/developer/webhooks/deliveries/whd_log_1/retry',
      headers: {
        authorization: `Bearer ${otherOwnerToken}`,
        'x-business-id': otherBizId, // Competitor trying to retry testBizId's delivery
      },
    });

    expect(response.statusCode).toBe(404);
  });
});

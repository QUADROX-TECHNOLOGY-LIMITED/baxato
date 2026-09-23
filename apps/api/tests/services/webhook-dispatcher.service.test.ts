import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  WebhookDeliveryStatus,
  WebhookEventType,
  NotFoundError,
  ValidationError,
} from '@baxato/common';
import { inMemoryDb } from '../test-utils/mock-db';
import {
  WebhookDispatcherService,
  MAX_WEBHOOK_ATTEMPTS,
  RETRY_DELAYS_MS,
} from '../../src/services/webhook-dispatcher.service';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('WebhookDispatcherService', () => {
  let service: WebhookDispatcherService;
  const testBizId = 'biz_wh_dispatcher_1';
  const sampleSecret = 'whsec_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  beforeEach(() => {
    inMemoryDb.reset();
    service = new WebhookDispatcherService();

    inMemoryDb.businesses.push({
      id: testBizId,
      ownerId: 'usr_owner_1',
      name: 'Webhook Test Merchant',
      slug: 'wh-test-merchant',
      status: 'ACTIVE',
      country: 'NG',
      state: 'Lagos',
      lga: 'Ikeja',
      webhookUrl: 'https://merchant.example.com/api/webhooks',
      webhookSecret: sampleSecret,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Secret & Signature Cryptography', () => {
    it('generates 256-bit cryptographically secure secret starting with whsec_', () => {
      const secret = service.generateSecret();
      expect(secret).toMatch(/^whsec_[a-f0-9]{64}$/);
    });

    it('generates compliant HMAC-SHA256 signature header formatted as t=...,v1=...', () => {
      const payload = JSON.stringify({ event: 'ping', test: true });
      const timestamp = 1726640000;
      const signature = service.generateSignature(payload, sampleSecret, timestamp);

      expect(signature).toMatch(/^t=1726640000,v1=[a-f0-9]{64}$/);
    });

    it('verifies valid signature successfully', () => {
      const payload = JSON.stringify({ event: 'ping', test: true });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = service.generateSignature(payload, sampleSecret, timestamp);

      const isValid = service.verifySignature(payload, signature, sampleSecret);
      expect(isValid).toBe(true);
    });

    it('rejects tampered payload', () => {
      const payload = JSON.stringify({ event: 'ping', test: true });
      const tampered = JSON.stringify({ event: 'ping', test: false });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = service.generateSignature(payload, sampleSecret, timestamp);

      const isValid = service.verifySignature(tampered, signature, sampleSecret);
      expect(isValid).toBe(false);
    });

    it('rejects signature created with different secret', () => {
      const payload = JSON.stringify({ event: 'ping' });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = service.generateSignature(payload, sampleSecret, timestamp);

      const wrongSecret = 'whsec_0000000000000000000000000000000000000000000000000000000000000000';
      const isValid = service.verifySignature(payload, signature, wrongSecret);
      expect(isValid).toBe(false);
    });

    it('rejects signature outside timestamp tolerance window (anti-replay check)', () => {
      const payload = JSON.stringify({ event: 'ping' });
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400s ago (> 300s window)
      const signature = service.generateSignature(payload, sampleSecret, oldTimestamp);

      const isValid = service.verifySignature(payload, signature, sampleSecret, 300);
      expect(isValid).toBe(false);
    });
  });

  describe('Exponential Backoff Retry Schedule', () => {
    it('schedules retry intervals according to backoff delays', () => {
      const now = Date.now();

      const next1 = service.getNextRetryDate(1);
      expect(next1).not.toBeNull();
      expect(next1!.getTime()).toBeGreaterThanOrEqual(now + RETRY_DELAYS_MS[1] - 100);

      const next2 = service.getNextRetryDate(2);
      expect(next2!.getTime()).toBeGreaterThanOrEqual(now + RETRY_DELAYS_MS[2] - 100);

      const next4 = service.getNextRetryDate(4);
      expect(next4!.getTime()).toBeGreaterThanOrEqual(now + RETRY_DELAYS_MS[4] - 100);
    });

    it('returns null when maximum attempt limit is reached', () => {
      const nextExhausted = service.getNextRetryDate(MAX_WEBHOOK_ATTEMPTS);
      expect(nextExhausted).toBeNull();
    });
  });

  describe('Webhook Configuration Management', () => {
    it('retrieves webhook configuration with masked secret prefix', async () => {
      const config = await service.getWebhookConfig(testBizId);
      expect(config.webhookUrl).toBe('https://merchant.example.com/api/webhooks');
      expect(config.hasSecret).toBe(true);
      expect(config.webhookSecretPrefix).toBe('whsec_e3b0c4...');
    });

    it('throws NotFoundError for non-existent business', async () => {
      await expect(service.getWebhookConfig('biz_nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('updates webhook URL without changing secret if regenerateSecret is false', async () => {
      const result = await service.updateWebhookConfig(testBizId, {
        webhookUrl: 'https://new-api.merchant.com/events',
        regenerateSecret: false,
      });

      expect(result.config.webhookUrl).toBe('https://new-api.merchant.com/events');
      expect(result.newSecret).toBeUndefined();

      const biz = inMemoryDb.businesses.find((b) => b.id === testBizId)!;
      expect(biz.webhookSecret).toBe(sampleSecret);
    });

    it('regenerates secret and returns newSecret strictly once', async () => {
      const result = await service.updateWebhookConfig(testBizId, {
        regenerateSecret: true,
      });

      expect(result.newSecret).toBeDefined();
      expect(result.newSecret).toMatch(/^whsec_[a-f0-9]{64}$/);
      expect(result.newSecret).not.toBe(sampleSecret);

      const biz = inMemoryDb.businesses.find((b) => b.id === testBizId)!;
      expect(biz.webhookSecret).toBe(result.newSecret);
    });
  });

  describe('Outbound Webhook Dispatching & Delivery', () => {
    it('returns null if business has no webhook URL configured', async () => {
      const bizNoUrlId = 'biz_no_url';
      inMemoryDb.businesses.push({
        id: bizNoUrlId,
        ownerId: 'usr_owner_2',
        name: 'No URL Biz',
        slug: 'no-url-biz',
        status: 'ACTIVE',
        country: 'NG',
        state: 'Lagos',
        lga: 'Ikeja',
        webhookUrl: null,
        webhookSecret: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.dispatch(bizNoUrlId, WebhookEventType.TRANSACTION_SUCCESSFUL, {
        test: true,
      });
      expect(result).toBeNull();
      expect(inMemoryDb.webhookDeliveries).toHaveLength(0);
    });

    it('executes successful delivery when merchant endpoint returns 200 OK', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('{"received":true}'),
      });
      vi.stubGlobal('fetch', mockFetch);

      const delivery = await service.dispatch(testBizId, WebhookEventType.TRANSACTION_SUCCESSFUL, {
        transactionId: 'txn_123',
        amountKobo: 100000,
      });

      expect(delivery).not.toBeNull();
      expect(delivery!.status).toBe(WebhookDeliveryStatus.SUCCESSFUL);
      expect(delivery!.attempts).toBe(1);
      expect(delivery!.responseStatus).toBe(200);
      expect(delivery!.responseBody).toBe('{"received":true}');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
      expect(calledUrl).toBe('https://merchant.example.com/api/webhooks');
      expect(calledOptions.headers['x-baxato-signature']).toBeDefined();
      expect(calledOptions.headers['x-baxato-delivery-id']).toBe(delivery!.id);
    });

    it('sets status to PENDING and schedules nextRetryAt when endpoint returns 500 error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      });
      vi.stubGlobal('fetch', mockFetch);

      const delivery = await service.dispatch(testBizId, WebhookEventType.TRANSACTION_FAILED, {
        transactionId: 'txn_fail_1',
      });

      expect(delivery).not.toBeNull();
      expect(delivery!.status).toBe(WebhookDeliveryStatus.PENDING);
      expect(delivery!.attempts).toBe(1);
      expect(delivery!.responseStatus).toBe(500);
      expect(delivery!.nextRetryAt).not.toBeNull();
    });

    it('marks delivery as FAILED when max attempts are reached', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: vi.fn().mockResolvedValue('Service Unavailable'),
      });
      vi.stubGlobal('fetch', mockFetch);

      inMemoryDb.webhookDeliveries.push({
        id: 'whd_exhausted',
        businessId: testBizId,
        eventType: WebhookEventType.TRANSACTION_SUCCESSFUL,
        payload: { test: true },
        status: WebhookDeliveryStatus.PENDING,
        attempts: 4,
        createdAt: new Date(),
      });

      // Execute 5th attempt (currentAttempts = 4)
      const delivery = await service.executeDelivery(
        'whd_exhausted',
        'https://merchant.example.com/api/webhooks',
        sampleSecret,
        { test: true },
        MAX_WEBHOOK_ATTEMPTS - 1,
      );

      expect(delivery.status).toBe(WebhookDeliveryStatus.FAILED);
      expect(delivery.attempts).toBe(MAX_WEBHOOK_ATTEMPTS);
      expect(delivery.nextRetryAt).toBeNull();
    });
  });

  describe('Test Webhook & Manual Retries', () => {
    it('sends test ping successfully and records latency', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: vi.fn().mockResolvedValue('Pong received'),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await service.testWebhook(testBizId, WebhookEventType.PING);
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.responseBody).toBe('Pong received');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeNull();
    });

    it('handles network failure on test webhook gracefully without crashing', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')));

      const result = await service.testWebhook(testBizId);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBeNull();
      expect(result.error).toContain('Connection refused');
    });

    it('lists delivery logs sorted by creation date with pagination', async () => {
      inMemoryDb.webhookDeliveries.push(
        {
          id: 'whd_1',
          businessId: testBizId,
          eventType: WebhookEventType.TRANSACTION_SUCCESSFUL,
          payload: { id: 1 },
          status: WebhookDeliveryStatus.SUCCESSFUL,
          attempts: 1,
          createdAt: new Date(Date.now() - 10000),
        },
        {
          id: 'whd_2',
          businessId: testBizId,
          eventType: WebhookEventType.WALLET_CREDITED,
          payload: { id: 2 },
          status: WebhookDeliveryStatus.PENDING,
          attempts: 2,
          createdAt: new Date(),
        },
      );

      const result = await service.listDeliveries(testBizId, { limit: 10, offset: 0 });
      expect(result.total).toBe(2);
      expect(result.deliveries).toHaveLength(2);
      expect(result.deliveries[0].id).toBe('whd_2'); // Most recent first
    });

    it('retries an existing delivery record', async () => {
      inMemoryDb.webhookDeliveries.push({
        id: 'whd_retry_me',
        businessId: testBizId,
        eventType: WebhookEventType.TRANSACTION_SUCCESSFUL,
        payload: { transactionId: 'txn_retry_99' },
        status: WebhookDeliveryStatus.PENDING,
        attempts: 1,
        createdAt: new Date(),
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Delivered successfully on retry'),
      });
      vi.stubGlobal('fetch', mockFetch);

      const retried = await service.retryDelivery('whd_retry_me', testBizId);
      expect(retried.status).toBe(WebhookDeliveryStatus.SUCCESSFUL);
      expect(retried.attempts).toBe(2);
    });
  });
});

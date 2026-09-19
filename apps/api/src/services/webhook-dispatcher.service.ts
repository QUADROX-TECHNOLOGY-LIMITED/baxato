import crypto from 'node:crypto';
import {
  generateEntityId,
  NotFoundError,
  ValidationError,
  WebhookDeliveryStatus,
  WebhookEventType,
  type WebhookConfigDto,
  type UpdateWebhookConfigInput,
  type WebhookDeliveryDto,
  type TestWebhookResult,
  type WebhookEventEnvelope,
} from '@baxato/common';
import {
  db,
  businesses,
  webhookDeliveries,
  eq,
  and,
  desc,
  lte,
} from '@baxato/database';

export const RETRY_DELAYS_MS = [
  0, // Attempt 1: Immediate
  1 * 60 * 1000, // Attempt 2: 1 minute
  5 * 60 * 1000, // Attempt 3: 5 minutes
  15 * 60 * 1000, // Attempt 4: 15 minutes
  60 * 60 * 1000, // Attempt 5: 1 hour
];

export const MAX_WEBHOOK_ATTEMPTS = 5;

export class WebhookDispatcherService {
  /**
   * Generates a 256-bit cryptographically secure webhook secret
   */
  public generateSecret(): string {
    const randomHex = crypto.randomBytes(32).toString('hex');
    return `whsec_${randomHex}`;
  }

  /**
   * Computes standard HMAC-SHA256 signature header:
   * t={timestamp},v1={hmac_sha256}
   */
  public generateSignature(payloadString: string, secret: string, timestamp: number): string {
    const signaturePayload = `${timestamp}.${payloadString}`;
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');
    return `t=${timestamp},v1=${hmac}`;
  }

  /**
   * Verifies an incoming webhook signature against secret
   */
  public verifySignature(
    payloadString: string,
    signatureHeader: string,
    secret: string,
    toleranceSeconds = 300,
  ): boolean {
    if (!signatureHeader || !secret) return false;

    const parts = signatureHeader.split(',');
    let timestampStr: string | undefined;
    let signatureStr: string | undefined;

    for (const part of parts) {
      const [key, val] = part.split('=');
      if (key === 't') timestampStr = val;
      if (key === 'v1') signatureStr = val;
    }

    if (!timestampStr || !signatureStr) return false;

    const timestamp = Number.parseInt(timestampStr, 10);
    if (Number.isNaN(timestamp)) return false;

    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTimestamp - timestamp) > toleranceSeconds) {
      return false; // Timestamp outside tolerance window (anti-replay)
    }

    const expectedSignaturePayload = `${timestamp}.${payloadString}`;
    const expectedHmac = crypto
      .createHmac('sha256', secret)
      .update(expectedSignaturePayload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signatureStr, 'hex'),
        Buffer.from(expectedHmac, 'hex'),
      );
    } catch {
      return false;
    }
  }

  /**
   * Calculates next retry timestamp using exponential backoff schedule
   */
  public getNextRetryDate(attemptNumber: number): Date | null {
    if (attemptNumber >= MAX_WEBHOOK_ATTEMPTS) {
      return null;
    }
    const delay = RETRY_DELAYS_MS[attemptNumber] ?? 60 * 60 * 1000;
    return new Date(Date.now() + delay);
  }

  /**
   * Retrieves active webhook configuration for a business
   */
  public async getWebhookConfig(businessId: string): Promise<WebhookConfigDto> {
    const [biz] = await db
      .select({
        webhookUrl: businesses.webhookUrl,
        webhookSecret: businesses.webhookSecret,
        updatedAt: businesses.updatedAt,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz) {
      throw new NotFoundError(`Business with ID [${businessId}] not found`);
    }

    return {
      webhookUrl: biz.webhookUrl ?? null,
      webhookSecretPrefix: biz.webhookSecret ? `${biz.webhookSecret.slice(0, 12)}...` : null,
      hasSecret: Boolean(biz.webhookSecret),
      updatedAt: biz.updatedAt ?? null,
    };
  }

  /**
   * Configures or updates webhook URL and optionally generates a new secret.
   * If a new secret is generated, it is returned strictly once in newSecret.
   */
  public async updateWebhookConfig(
    businessId: string,
    input: UpdateWebhookConfigInput,
  ): Promise<{ config: WebhookConfigDto; newSecret?: string }> {
    const [biz] = await db
      .select({
        id: businesses.id,
        webhookUrl: businesses.webhookUrl,
        webhookSecret: businesses.webhookSecret,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz) {
      throw new NotFoundError(`Business with ID [${businessId}] not found`);
    }

    let newSecret: string | undefined;
    let finalSecret = biz.webhookSecret;

    if (input.regenerateSecret || !finalSecret) {
      newSecret = this.generateSecret();
      finalSecret = newSecret;
    }

    const updatedUrl = input.webhookUrl !== undefined ? input.webhookUrl || null : biz.webhookUrl;

    const [updated] = await db
      .update(businesses)
      .set({
        webhookUrl: updatedUrl,
        webhookSecret: finalSecret,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, businessId))
      .returning();

    if (!updated) {
      throw new NotFoundError('Business');
    }

    return {
      config: {
        webhookUrl: updated.webhookUrl,
        webhookSecretPrefix: updated.webhookSecret ? `${updated.webhookSecret.slice(0, 12)}...` : null,
        hasSecret: Boolean(updated.webhookSecret),
        updatedAt: updated.updatedAt,
      },
      newSecret,
    };
  }

  /**
   * Dispatches an outbound webhook event asynchronously.
   * If no webhook URL is configured for the business, returns null (no-op).
   */
  public async dispatch<T = unknown>(
    businessId: string,
    eventType: WebhookEventType | string,
    data: T,
  ): Promise<WebhookDeliveryDto | null> {
    const [biz] = await db
      .select({
        webhookUrl: businesses.webhookUrl,
        webhookSecret: businesses.webhookSecret,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz || !biz.webhookUrl) {
      return null;
    }

    const deliveryId = generateEntityId('whd');
    const secret = biz.webhookSecret || this.generateSecret();

    const envelope: WebhookEventEnvelope<T> = {
      id: generateEntityId('evt'),
      event: eventType,
      timestamp: Math.floor(Date.now() / 1000),
      data,
    };

    // Insert pending delivery record
    const [created] = await db
      .insert(webhookDeliveries)
      .values({
        id: deliveryId,
        businessId,
        eventType,
        payload: envelope as unknown as Record<string, unknown>,
        status: WebhookDeliveryStatus.PENDING,
        attempts: 0,
        nextRetryAt: new Date(),
      })
      .returning();

    if (!created) {
      throw new Error('Failed to record webhook delivery entity');
    }

    // Execute first delivery attempt
    return this.executeDelivery(created.id, biz.webhookUrl, secret, envelope, 0);
  }

  /**
   * Executes HTTP POST delivery to the target webhook URL with HMAC-SHA256 signature
   */
  public async executeDelivery(
    deliveryId: string,
    url: string,
    secret: string,
    payload: unknown,
    currentAttempts: number,
  ): Promise<WebhookDeliveryDto> {
    const payloadString = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(payloadString, secret, timestamp);

    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let isSuccess = false;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BAXATO-Webhook-Dispatcher/1.0',
          'x-baxato-delivery-id': deliveryId,
          'x-baxato-signature': signature,
        },
        body: payloadString,
        signal: AbortSignal.timeout(5000),
      });

      responseStatus = response.status;
      const text = await response.text();
      responseBody = text.slice(0, 1000); // Truncate response body if large

      if (response.ok) {
        isSuccess = true;
      }
    } catch (err) {
      responseBody = err instanceof Error ? err.message : 'Unknown network/connection error';
    }

    const nextAttempts = currentAttempts + 1;
    let nextStatus = WebhookDeliveryStatus.PENDING;
    let nextRetryDate: Date | null = null;

    if (isSuccess) {
      nextStatus = WebhookDeliveryStatus.SUCCESSFUL;
    } else {
      nextRetryDate = this.getNextRetryDate(nextAttempts);
      if (!nextRetryDate) {
        nextStatus = WebhookDeliveryStatus.FAILED;
      }
    }

    const [updated] = await db
      .update(webhookDeliveries)
      .set({
        status: nextStatus,
        attempts: nextAttempts,
        lastAttemptAt: new Date(),
        nextRetryAt: nextRetryDate,
        responseStatus,
        responseBody,
      })
      .where(eq(webhookDeliveries.id, deliveryId))
      .returning();

    if (!updated) {
      throw new NotFoundError('WebhookDelivery');
    }

    return {
      id: updated.id,
      businessId: updated.businessId,
      eventType: updated.eventType,
      payload: updated.payload as Record<string, unknown>,
      status: updated.status as WebhookDeliveryStatus,
      attempts: updated.attempts,
      lastAttemptAt: updated.lastAttemptAt,
      nextRetryAt: updated.nextRetryAt,
      responseStatus: updated.responseStatus,
      responseBody: updated.responseBody,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Sends a synchronous test event to the configured webhook endpoint
   */
  public async testWebhook(
    businessId: string,
    eventType: WebhookEventType = WebhookEventType.PING,
  ): Promise<TestWebhookResult> {
    const [biz] = await db
      .select({
        webhookUrl: businesses.webhookUrl,
        webhookSecret: businesses.webhookSecret,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz || !biz.webhookUrl) {
      throw new ValidationError('Please configure a valid Webhook URL before sending a test event.');
    }

    const secret = biz.webhookSecret || this.generateSecret();
    const timestamp = Math.floor(Date.now() / 1000);
    const testPayload = {
      id: generateEntityId('evt'),
      event: eventType,
      timestamp,
      businessId,
      message: 'BAXATO Developer Webhook Connection Test',
      sampleData: {
        transactionId: 'txn_test_preview_9981',
        amountNaira: 1000.0,
        currency: 'NGN',
        status: 'SUCCESSFUL',
      },
    };

    const payloadString = JSON.stringify(testPayload);
    const signature = this.generateSignature(payloadString, secret, timestamp);
    const startTime = Date.now();

    try {
      const response = await fetch(biz.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BAXATO-Webhook-Dispatcher/1.0 (Test-Ping)',
          'x-baxato-signature': signature,
          'x-baxato-test': 'true',
        },
        body: payloadString,
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Date.now() - startTime;
      const text = await response.text();

      return {
        success: response.ok,
        statusCode: response.status,
        responseBody: text.slice(0, 500),
        latencyMs,
        error: response.ok ? null : `HTTP Error ${response.status}: ${response.statusText}`,
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : 'Network connection failed';
      return {
        success: false,
        statusCode: null,
        responseBody: null,
        latencyMs,
        error: message,
      };
    }
  }

  /**
   * Lists recent webhook delivery logs for a business
   */
  public async listDeliveries(
    businessId: string,
    options?: { status?: WebhookDeliveryStatus; limit?: number; offset?: number },
  ): Promise<{ deliveries: WebhookDeliveryDto[]; total: number }> {
    const limit = Math.min(options?.limit || 20, 100);
    const offset = options?.offset || 0;

    let query = db
      .select()
      .from(webhookDeliveries)
      .where(
        options?.status
          ? and(
              eq(webhookDeliveries.businessId, businessId),
              eq(webhookDeliveries.status, options.status),
            )
          : eq(webhookDeliveries.businessId, businessId),
      );

    const all = await query;
    const sorted = [...all].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const paginated = sorted.slice(offset, offset + limit);

    return {
      deliveries: paginated.map((d) => ({
        id: d.id,
        businessId: d.businessId,
        eventType: d.eventType,
        payload: d.payload as Record<string, unknown>,
        status: d.status as WebhookDeliveryStatus,
        attempts: d.attempts,
        lastAttemptAt: d.lastAttemptAt,
        nextRetryAt: d.nextRetryAt,
        responseStatus: d.responseStatus,
        responseBody: d.responseBody,
        createdAt: d.createdAt,
      })),
      total: all.length,
    };
  }

  /**
   * Manually re-triggers a webhook delivery attempt
   */
  public async retryDelivery(deliveryId: string, businessId: string): Promise<WebhookDeliveryDto> {
    const [delivery] = await db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.id, deliveryId),
          eq(webhookDeliveries.businessId, businessId),
        ),
      )
      .limit(1);

    if (!delivery) {
      throw new NotFoundError(`Webhook delivery record [${deliveryId}] not found`);
    }

    const [biz] = await db
      .select({
        webhookUrl: businesses.webhookUrl,
        webhookSecret: businesses.webhookSecret,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz || !biz.webhookUrl) {
      throw new ValidationError('Cannot retry delivery: business webhook URL is not configured.');
    }

    const secret = biz.webhookSecret || this.generateSecret();
    return this.executeDelivery(delivery.id, biz.webhookUrl, secret, delivery.payload, delivery.attempts);
  }

  /**
   * Background retry worker: executes retries for pending deliveries due for processing
   */
  public async processRetries(batchSize = 25): Promise<number> {
    const now = new Date();
    const pendingDeliveries = await db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.status, WebhookDeliveryStatus.PENDING),
          lte(webhookDeliveries.nextRetryAt, now),
        ),
      )
      .limit(batchSize);

    let processed = 0;

    for (const delivery of pendingDeliveries) {
      const [biz] = await db
        .select({
          webhookUrl: businesses.webhookUrl,
          webhookSecret: businesses.webhookSecret,
        })
        .from(businesses)
        .where(eq(businesses.id, delivery.businessId))
        .limit(1);

      if (biz?.webhookUrl) {
        const secret = biz.webhookSecret || this.generateSecret();
        await this.executeDelivery(
          delivery.id,
          biz.webhookUrl,
          secret,
          delivery.payload,
          delivery.attempts,
        );
        processed++;
      } else {
        // No webhook URL configured anymore; mark failed
        await db
          .update(webhookDeliveries)
          .set({ status: WebhookDeliveryStatus.FAILED })
          .where(eq(webhookDeliveries.id, delivery.id));
      }
    }

    return processed;
  }
}

export const webhookDispatcherService = new WebhookDispatcherService();

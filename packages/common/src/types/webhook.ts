import { z } from 'zod';
import { WebhookDeliveryStatus, WebhookEventType } from './enums.js';

export interface WebhookConfigDto {
  webhookUrl: string | null;
  webhookSecretPrefix: string | null;
  hasSecret: boolean;
  updatedAt: Date | null;
}

export const updateWebhookConfigSchema = z.object({
  webhookUrl: z
    .string()
    .trim()
    .url('Webhook URL must be a valid HTTP or HTTPS URL')
    .or(z.literal(''))
    .optional(),
  regenerateSecret: z.boolean().optional(),
});

export type UpdateWebhookConfigInput = z.infer<typeof updateWebhookConfigSchema>;

export interface WebhookDeliveryDto {
  id: string;
  businessId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  attempts: number;
  lastAttemptAt: Date | null;
  nextRetryAt: Date | null;
  responseStatus: number | null;
  responseBody: string | null;
  createdAt: Date;
}

export const testWebhookSchema = z.object({
  eventType: z.nativeEnum(WebhookEventType).default(WebhookEventType.PING),
});

export type TestWebhookInput = z.infer<typeof testWebhookSchema>;

export interface TestWebhookResult {
  success: boolean;
  statusCode: number | null;
  responseBody: string | null;
  latencyMs: number;
  error: string | null;
}

export interface WebhookEventEnvelope<T = unknown> {
  id: string;
  event: WebhookEventType | string;
  timestamp: number;
  data: T;
}

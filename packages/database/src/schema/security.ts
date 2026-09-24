import { pgTable, text, timestamp, integer, jsonb, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { generateEntityId } from '@baxato/common';
import { businesses, users } from './core.js';

export const apiKeyStatusEnum = pgEnum('api_key_status', [
  'ACTIVE',
  'REVOKED',
  'EXPIRED',
]);

export const apiKeyEnvironmentEnum = pgEnum('api_key_environment', [
  'LIVE',
  'TEST',
]);

export const webhookDeliveryStatusEnum = pgEnum('webhook_delivery_status', [
  'PENDING',
  'SUCCESSFUL',
  'FAILED',
]);

// 1. Merchant API Keys (Hashed with SHA-256, Environment Scoped)
export const apiKeys = pgTable(
  'api_keys',
  {
    id: text('id').primaryKey().$defaultFn(() => generateEntityId('key')),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    keyHash: text('key_hash').notNull().unique(),
    keyPrefix: text('key_prefix').notNull(),
    environment: apiKeyEnvironmentEnum('environment').default('TEST').notNull(),
    status: apiKeyStatusEnum('status').default('ACTIVE').notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('api_keys_hash_idx').on(table.keyHash),
    index('api_keys_business_id_idx').on(table.businessId),
    index('api_keys_status_idx').on(table.status),
  ],
);

// 2. Idempotency Keys (Distributed Lock & Response Caching)
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: text('id').primaryKey().$defaultFn(() => generateEntityId('idemp')),
    key: text('key').notNull(),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body'),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idempotency_biz_key_idx').on(table.businessId, table.key),
    index('idempotency_locked_until_idx').on(table.lockedUntil),
  ],
);

// 3. Webhook Deliveries (Outbound Event Queue & Exponential Backoff Logs)
export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: text('id').primaryKey().$defaultFn(() => generateEntityId('whd')),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    status: webhookDeliveryStatusEnum('status').default('PENDING').notNull(),
    attempts: integer('attempts').default(0).notNull(),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('whd_business_id_idx').on(table.businessId),
    index('whd_status_next_retry_idx').on(table.status, table.nextRetryAt),
  ],
);

// 4. Comprehensive Audit Trail
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id').primaryKey().$defaultFn(() => generateEntityId('aud')),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    businessId: text('business_id').references(() => businesses.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    changes: jsonb('changes').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_user_id_idx').on(table.userId),
    index('audit_business_id_idx').on(table.businessId),
    index('audit_action_idx').on(table.action),
    index('audit_resource_idx').on(table.resourceType, table.resourceId),
    index('audit_created_at_idx').on(table.createdAt),
  ],
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type NewIdempotencyKey = typeof idempotencyKeys.$inferInsert;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

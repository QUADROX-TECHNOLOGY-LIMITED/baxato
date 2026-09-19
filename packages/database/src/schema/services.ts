import { pgTable, text, timestamp, bigint, integer, boolean, jsonb, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { generateEntityId, ServiceType, TransactionStatus, ProviderName } from '@baxato/common';
import { businesses, users } from './core';

export const serviceTypeEnum = pgEnum('service_type', [
  ServiceType.AIRTIME,
  ServiceType.DATA,
  ServiceType.CABLE_TV,
  ServiceType.ELECTRICITY,
  ServiceType.EXAM_PIN,
]);

export const transactionStatusEnum = pgEnum('transaction_status', [
  TransactionStatus.PENDING,
  TransactionStatus.PROCESSING,
  TransactionStatus.SUCCESSFUL,
  TransactionStatus.FAILED,
  TransactionStatus.REVERSED,
]);

export const providerNameEnum = pgEnum('provider_name', [
  ProviderName.INTERSWITCH,
  ProviderName.MONNIFY,
  ProviderName.INTERNAL_MOCK,
]);

export const providerStatusEnum = pgEnum('provider_status', [
  'ACTIVE',
  'DEGRADED',
  'MAINTENANCE',
  'INACTIVE',
]);

export const examPinStatusEnum = pgEnum('exam_pin_status', [
  'AVAILABLE',
  'RESERVED',
  'DISPENSED',
  'INVALIDATED',
]);

export const examBodyEnum = pgEnum('exam_body', [
  'WAEC',
  'NECO',
  'NABTEB',
  'JAMB',
]);

// 1. Providers Configuration & Circuit Breaker Registry
export const providers = pgTable(
  'providers',
  {
    id: text('id').primaryKey().$defaultFn(() => generateEntityId('prv')),
    name: providerNameEnum('name').notNull().unique(),
    status: providerStatusEnum('status').default('ACTIVE').notNull(),
    failureRate: integer('failure_rate').default(0).notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    config: jsonb('config').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('providers_name_idx').on(table.name),
    index('providers_status_idx').on(table.status),
  ],
);

// 2. Service Transactions (Airtime, Data, Cable, Electricity, Exam PINs)
export const serviceTransactions = pgTable(
  'service_transactions',
  {
    id: text('id').primaryKey().$defaultFn(() => generateEntityId('txn')),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    serviceType: serviceTypeEnum('service_type').notNull(),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    fee: bigint('fee', { mode: 'bigint' }).default(sql`0`).notNull(),
    discount: bigint('discount', { mode: 'bigint' }).default(sql`0`).notNull(),
    totalAmount: bigint('total_amount', { mode: 'bigint' }).notNull(),
    status: transactionStatusEnum('status').default(TransactionStatus.PENDING).notNull(),
    recipient: text('recipient').notNull(),
    providerName: providerNameEnum('provider_name').notNull(),
    providerReference: text('provider_reference'),
    clientReference: text('client_reference'),
    requestReference: text('request_reference'),
    metadata: jsonb('metadata').default({}).notNull(),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('txn_business_id_idx').on(table.businessId),
    index('txn_user_id_idx').on(table.userId),
    index('txn_service_type_idx').on(table.serviceType),
    index('txn_status_idx').on(table.status),
    index('txn_client_reference_idx').on(table.clientReference),
    index('txn_request_reference_idx').on(table.requestReference),
    index('txn_provider_reference_idx').on(table.providerReference),
    index('txn_created_at_idx').on(table.createdAt),
  ],
);

// 3. Raw Provider Request/Response Audit Logs
export const providerTransactions = pgTable(
  'provider_transactions',
  {
    id: text('id').primaryKey().$defaultFn(() => generateEntityId('ptx')),
    transactionId: text('transaction_id')
      .notNull()
      .references(() => serviceTransactions.id, { onDelete: 'cascade' }),
    providerName: providerNameEnum('provider_name').notNull(),
    requestPayload: jsonb('request_payload').default({}).notNull(),
    responsePayload: jsonb('response_payload').default({}).notNull(),
    statusCode: text('status_code'),
    durationMs: integer('duration_ms').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ptx_transaction_id_idx').on(table.transactionId),
    index('ptx_provider_name_idx').on(table.providerName),
  ],
);

// 4. Examination PINs Encrypted Inventory Table
export const examPins = pgTable(
  'exam_pins',
  {
    id: text('id').primaryKey().$defaultFn(() => generateEntityId('pin')),
    examBody: examBodyEnum('exam_body').notNull(),
    pinEncrypted: text('pin_encrypted').notNull(),
    serialEncrypted: text('serial_encrypted').notNull(),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    status: examPinStatusEnum('status').default('AVAILABLE').notNull(),
    dispensedTransactionId: text('dispensed_transaction_id')
      .references(() => serviceTransactions.id, { onDelete: 'set null' }),
    dispensedAt: timestamp('dispensed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('pins_exam_body_status_idx').on(table.examBody, table.status),
    index('pins_dispensed_txn_idx').on(table.dispensedTransactionId),
  ],
);

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type ServiceTransaction = typeof serviceTransactions.$inferSelect;
export type NewServiceTransaction = typeof serviceTransactions.$inferInsert;
export type ProviderTransaction = typeof providerTransactions.$inferSelect;
export type NewProviderTransaction = typeof providerTransactions.$inferInsert;
export type ExamPin = typeof examPins.$inferSelect;
export type NewExamPin = typeof examPins.$inferInsert;

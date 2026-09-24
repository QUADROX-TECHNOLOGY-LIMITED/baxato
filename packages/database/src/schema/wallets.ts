import { pgTable, text, timestamp, bigint, integer, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { generateEntityId, WalletType, LedgerDirection } from '@baxato/common';
import { businesses } from './core.js';

export const walletTypeEnum = pgEnum('wallet_type', [
  WalletType.MAIN,
  WalletType.COMMISSION,
]);

export const ledgerEntryTypeEnum = pgEnum('ledger_entry_type', [
  LedgerDirection.DEBIT,
  LedgerDirection.CREDIT,
]);

export const ledgerCategoryEnum = pgEnum('ledger_category', [
  'FUNDING',
  'AIRTIME_PURCHASE',
  'DATA_PURCHASE',
  'CABLE_TV_PURCHASE',
  'ELECTRICITY_PURCHASE',
  'EXAM_PIN_PURCHASE',
  'COMMISSION_EARNED',
  'REFUND',
  'ADJUSTMENT',
  'WITHDRAWAL',
]);

// 1. Wallets Table (Stores financial balances in integer Kobo)
export const wallets = pgTable(
  'wallets',
  {
    id: text('id').primaryKey().$defaultFn(() => generateEntityId('wal')),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    type: walletTypeEnum('type').default(WalletType.MAIN).notNull(),
    balance: bigint('balance', { mode: 'bigint' }).default(sql`0`).notNull(),
    lockedBalance: bigint('locked_balance', { mode: 'bigint' }).default(sql`0`).notNull(),
    currency: text('currency').default('NGN').notNull(),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('wallets_biz_type_idx').on(table.businessId, table.type),
    index('wallets_business_id_idx').on(table.businessId),
  ],
);

// 2. Financial Ledger Table (Append-only double-entry audit trail)
export const financialLedger = pgTable(
  'financial_ledger',
  {
    id: text('id').primaryKey().$defaultFn(() => generateEntityId('led')),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    walletId: text('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'restrict' }),
    transactionId: text('transaction_id'),
    entryType: ledgerEntryTypeEnum('entry_type').notNull(),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    balanceBefore: bigint('balance_before', { mode: 'bigint' }).notNull(),
    balanceAfter: bigint('balance_after', { mode: 'bigint' }).notNull(),
    category: ledgerCategoryEnum('category').notNull(),
    description: text('description').notNull(),
    reference: text('reference').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ledger_business_id_idx').on(table.businessId),
    index('ledger_wallet_id_idx').on(table.walletId),
    index('ledger_transaction_id_idx').on(table.transactionId),
    index('ledger_reference_idx').on(table.reference),
    index('ledger_created_at_idx').on(table.createdAt),
  ],
);

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
export type FinancialLedgerEntry = typeof financialLedger.$inferSelect;
export type NewFinancialLedgerEntry = typeof financialLedger.$inferInsert;

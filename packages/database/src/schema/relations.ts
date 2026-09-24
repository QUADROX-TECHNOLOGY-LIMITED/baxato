import { relations } from 'drizzle-orm';
import { users, businesses, businessMembers, kycVerifications } from './core.js';
import { wallets, financialLedger } from './wallets.js';
import { serviceTransactions, providerTransactions, examPins } from './services.js';
import { apiKeys, idempotencyKeys, webhookDeliveries, auditLogs } from './security.js';

export const usersRelations = relations(users, ({ many }) => ({
  ownedBusinesses: many(businesses),
  memberships: many(businessMembers),
  transactions: many(serviceTransactions),
  kycVerifications: many(kycVerifications),
  auditLogs: many(auditLogs),
}));

export const kycVerificationsRelations = relations(kycVerifications, ({ one }) => ({
  user: one(users, {
    fields: [kycVerifications.userId],
    references: [users.id],
  }),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, {
    fields: [businesses.ownerId],
    references: [users.id],
  }),
  members: many(businessMembers),
  wallets: many(wallets),
  ledgerEntries: many(financialLedger),
  transactions: many(serviceTransactions),
  apiKeys: many(apiKeys),
  idempotencyKeys: many(idempotencyKeys),
  webhookDeliveries: many(webhookDeliveries),
}));

export const businessMembersRelations = relations(businessMembers, ({ one }) => ({
  business: one(businesses, {
    fields: [businessMembers.businessId],
    references: [businesses.id],
  }),
  user: one(users, {
    fields: [businessMembers.userId],
    references: [users.id],
  }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  business: one(businesses, {
    fields: [wallets.businessId],
    references: [businesses.id],
  }),
  ledgerEntries: many(financialLedger),
}));

export const financialLedgerRelations = relations(financialLedger, ({ one }) => ({
  business: one(businesses, {
    fields: [financialLedger.businessId],
    references: [businesses.id],
  }),
  wallet: one(wallets, {
    fields: [financialLedger.walletId],
    references: [wallets.id],
  }),
  transaction: one(serviceTransactions, {
    fields: [financialLedger.transactionId],
    references: [serviceTransactions.id],
  }),
}));

export const serviceTransactionsRelations = relations(serviceTransactions, ({ one, many }) => ({
  business: one(businesses, {
    fields: [serviceTransactions.businessId],
    references: [businesses.id],
  }),
  user: one(users, {
    fields: [serviceTransactions.userId],
    references: [users.id],
  }),
  providerLogs: many(providerTransactions),
  ledgerEntries: many(financialLedger),
}));

export const providerTransactionsRelations = relations(providerTransactions, ({ one }) => ({
  transaction: one(serviceTransactions, {
    fields: [providerTransactions.transactionId],
    references: [serviceTransactions.id],
  }),
}));

export const examPinsRelations = relations(examPins, ({ one }) => ({
  dispensedTransaction: one(serviceTransactions, {
    fields: [examPins.dispensedTransactionId],
    references: [serviceTransactions.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  business: one(businesses, {
    fields: [apiKeys.businessId],
    references: [businesses.id],
  }),
}));

export const idempotencyKeysRelations = relations(idempotencyKeys, ({ one }) => ({
  business: one(businesses, {
    fields: [idempotencyKeys.businessId],
    references: [businesses.id],
  }),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  business: one(businesses, {
    fields: [webhookDeliveries.businessId],
    references: [businesses.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  business: one(businesses, {
    fields: [auditLogs.businessId],
    references: [businesses.id],
  }),
}));

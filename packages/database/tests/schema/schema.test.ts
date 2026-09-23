import { describe, it, expect } from 'vitest';
import { getTableColumns, getTableName } from 'drizzle-orm';
import {
  users,
  businesses,
  businessMembers,
  wallets,
  financialLedger,
  serviceTransactions,
  providers,
  providerTransactions,
  examPins,
  apiKeys,
  idempotencyKeys,
  webhookDeliveries,
  auditLogs,
  kycVerifications,
} from '../../src/schema/index';

describe('Database Schemas Specification', () => {
  it('correctly defines core tables with expected names, location, and KYC columns', () => {
    expect(getTableName(users)).toBe('users');
    expect(getTableName(businesses)).toBe('businesses');
    expect(getTableName(businessMembers)).toBe('business_members');
    expect(getTableName(kycVerifications)).toBe('kyc_verifications');

    const userCols = getTableColumns(users);
    expect(userCols.id.primary).toBe(true);
    expect(userCols.email.isUnique).toBe(true);
    expect(userCols.role).toBeDefined();
    expect(userCols.middleName).toBeDefined();
    expect(userCols.avatarUrl).toBeDefined();
    expect(userCols.kycStatus).toBeDefined();
    expect(userCols.isEmailVerified).toBeDefined();
    expect(userCols.isPhoneVerified).toBeDefined();

    const bizCols = getTableColumns(businesses);
    expect(bizCols.id.primary).toBe(true);
    expect(bizCols.slug.isUnique).toBe(true);
    expect(bizCols.ownerId).toBeDefined();
    expect(bizCols.country).toBeDefined();
    expect(bizCols.state).toBeDefined();
    expect(bizCols.lga).toBeDefined();
    expect(bizCols.websiteUrl).toBeDefined();

    const kycCols = getTableColumns(kycVerifications);
    expect(kycCols.id.primary).toBe(true);
    expect(kycCols.userId).toBeDefined();
    expect(kycCols.nin).toBeDefined();
    expect(kycCols.dob).toBeDefined();
    expect(kycCols.photoExtracted).toBeDefined();
  });

  it('correctly configures wallet and financial ledger integer Kobo columns', () => {
    expect(getTableName(wallets)).toBe('wallets');
    expect(getTableName(financialLedger)).toBe('financial_ledger');

    const walletCols = getTableColumns(wallets);
    expect(walletCols.id.primary).toBe(true);
    expect(walletCols.balance.dataType).toBe('bigint');
    expect(walletCols.lockedBalance.dataType).toBe('bigint');
    expect(walletCols.version.dataType).toBe('number');

    const ledgerCols = getTableColumns(financialLedger);
    expect(ledgerCols.id.primary).toBe(true);
    expect(ledgerCols.amount.dataType).toBe('bigint');
    expect(ledgerCols.balanceBefore.dataType).toBe('bigint');
    expect(ledgerCols.balanceAfter.dataType).toBe('bigint');
    expect(ledgerCols.entryType).toBeDefined();
    expect(ledgerCols.category).toBeDefined();
  });

  it('correctly configures service transactions and provider audit tables', () => {
    expect(getTableName(serviceTransactions)).toBe('service_transactions');
    expect(getTableName(providers)).toBe('providers');
    expect(getTableName(providerTransactions)).toBe('provider_transactions');
    expect(getTableName(examPins)).toBe('exam_pins');

    const txnCols = getTableColumns(serviceTransactions);
    expect(txnCols.amount.dataType).toBe('bigint');
    expect(txnCols.totalAmount.dataType).toBe('bigint');
    expect(txnCols.serviceType).toBeDefined();
    expect(txnCols.status).toBeDefined();

    const pinCols = getTableColumns(examPins);
    expect(pinCols.pinEncrypted).toBeDefined();
    expect(pinCols.serialEncrypted).toBeDefined();
    expect(pinCols.status).toBeDefined();
  });

  it('correctly configures security and idempotency tables', () => {
    expect(getTableName(apiKeys)).toBe('api_keys');
    expect(getTableName(idempotencyKeys)).toBe('idempotency_keys');
    expect(getTableName(webhookDeliveries)).toBe('webhook_deliveries');
    expect(getTableName(auditLogs)).toBe('audit_logs');

    const keyCols = getTableColumns(apiKeys);
    expect(keyCols.keyHash.isUnique).toBe(true);
    expect(keyCols.environment).toBeDefined();

    const idempCols = getTableColumns(idempotencyKeys);
    expect(idempCols.key).toBeDefined();
    expect(idempCols.requestHash).toBeDefined();
  });
});

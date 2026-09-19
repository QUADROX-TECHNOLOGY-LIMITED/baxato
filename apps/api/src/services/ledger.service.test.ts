import { describe, it, expect, beforeAll, vi } from 'vitest';
import { LedgerEntryType, LedgerDirection, ValidationError } from '@baxato/common';
import { ledgerService } from './ledger.service';
import { inMemoryDb } from '../test-utils/mock-db';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('LedgerService (Immutable Double-Entry Accounting)', () => {
  const testBizId = 'biz_ledger_100';
  const mainWalletId = 'wal_main_ledger_100';
  const commissionWalletId = 'wal_comm_ledger_100';

  beforeAll(() => {
    inMemoryDb.reset();

    inMemoryDb.wallets.push({
      id: mainWalletId,
      businessId: testBizId,
      type: 'MAIN',
      balance: 100000n, // ₦1,000.00
      lockedBalance: 0n,
      version: 1,
    });
  });

  it('records a balanced double-entry transaction (Zero-Sum Invariant)', async () => {
    const [debit, credit] = await ledgerService.recordDoubleEntry({
      businessId: testBizId,
      reference: 'TX_REF_24110001',
      type: LedgerEntryType.COMMISSION_SWEEP,
      description: 'Commission sweep to main wallet',
      debit: {
        walletId: commissionWalletId,
        amountKobo: 50000n, // ₦500
        balanceBeforeKobo: 50000n,
        balanceAfterKobo: 0n,
      },
      credit: {
        walletId: mainWalletId,
        amountKobo: 50000n, // ₦500
        balanceBeforeKobo: 50000n,
        balanceAfterKobo: 100000n,
      },
    });

    expect(debit.direction).toBe(LedgerDirection.DEBIT);
    expect(debit.amountKobo).toBe('50000');
    expect(debit.walletId).toBe(commissionWalletId);

    expect(credit.direction).toBe(LedgerDirection.CREDIT);
    expect(credit.amountKobo).toBe('50000');
    expect(credit.walletId).toBe(mainWalletId);
  });

  it('rejects an unbalanced double-entry transaction with ValidationError', async () => {
    await expect(
      ledgerService.recordDoubleEntry({
        businessId: testBizId,
        reference: 'TX_REF_UNBALANCED',
        type: LedgerEntryType.SERVICE_PURCHASE,
        debit: {
          walletId: mainWalletId,
          amountKobo: 50000n, // ₦500
          balanceBeforeKobo: 100000n,
          balanceAfterKobo: 50000n,
        },
        credit: {
          walletId: 'wal_provider_clearing',
          amountKobo: 40000n, // ₦400 (Unbalanced!)
          balanceBeforeKobo: 0n,
          balanceAfterKobo: 40000n,
        },
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('retrieves a paginated ledger statement with running totals', async () => {
    const statement = await ledgerService.getWalletStatement(mainWalletId);
    expect(statement.walletId).toBe(mainWalletId);
    expect(statement.totalCreditsKobo).toBe('50000');
    expect(statement.totalCreditsNaira).toBe(500);
    expect(statement.entries.length).toBeGreaterThan(0);
  });

  it('verifies mathematical audit integrity of wallet ledger', async () => {
    // Add initial funding entry of ₦500 to match total wallet balance of ₦1,000 (500 + 500)
    inMemoryDb.financialLedger.push({
      id: 'ldg_initial_funding',
      businessId: testBizId,
      walletId: mainWalletId,
      amount: 50000n,
      balanceBefore: 0n,
      balanceAfter: 50000n,
      entryType: LedgerDirection.CREDIT,
      direction: LedgerDirection.CREDIT,
      category: 'FUNDING',
      description: 'Initial funding',
      reference: 'FUND_REF_001',
      createdAt: new Date(),
    });

    const audit = await ledgerService.verifyWalletLedgerAudit(mainWalletId);
    expect(audit.matches).toBe(true);
    expect(audit.currentBalanceKobo).toBe('100000');
    expect(audit.ledgerCalculatedKobo).toBe('100000');
    expect(audit.discrepancyKobo).toBe('0');
  });
});

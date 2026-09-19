import { describe, it, expect, beforeAll, vi } from 'vitest';
import { WalletType, InsufficientFundsError } from '@baxato/common';
import { walletService } from './wallet.service';
import { inMemoryDb } from '../test-utils/mock-db';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('WalletService (Integer Kobo & Concurrency Locking)', () => {
  const testBizId = 'biz_wallet_test_1';
  let mainWalletId: string;
  let commissionWalletId: string;

  beforeAll(() => {
    inMemoryDb.reset();

    // Seed test wallets
    mainWalletId = 'wal_main_1';
    commissionWalletId = 'wal_comm_1';

    inMemoryDb.wallets.push(
      {
        id: mainWalletId,
        businessId: testBizId,
        type: WalletType.MAIN,
        balance: 100000n, // ₦1,000.00 (100,000 Kobo)
        lockedBalance: 0n,
        version: 1,
      },
      {
        id: commissionWalletId,
        businessId: testBizId,
        type: WalletType.COMMISSION,
        balance: 50000n, // ₦500.00 (50,000 Kobo)
        lockedBalance: 0n,
        version: 1,
      },
    );
  });

  it('creditWallet increases available balance and increments version', async () => {
    const updated = await walletService.creditWallet(mainWalletId, 20000n); // +₦200.00
    expect(updated.balanceKobo).toBe('120000');
    expect(updated.balanceNaira).toBe(1200);
    expect(updated.version).toBe(2);
  });

  it('debitWallet decreases available balance and increments version', async () => {
    const updated = await walletService.debitWallet(mainWalletId, 20000n); // -₦200.00
    expect(updated.balanceKobo).toBe('100000');
    expect(updated.balanceNaira).toBe(1000);
    expect(updated.version).toBe(3);
  });

  it('debitWallet rejects debit exceeding available balance with InsufficientFundsError', async () => {
    await expect(walletService.debitWallet(mainWalletId, 500000n)).rejects.toThrow(
      InsufficientFundsError,
    );
  });

  it('lockFunds moves available balance to lockedBalance', async () => {
    const updated = await walletService.lockFunds(mainWalletId, 30000n); // Lock ₦300
    expect(updated.balanceKobo).toBe('70000');
    expect(updated.lockedBalanceKobo).toBe('30000');
    expect(updated.lockedBalanceNaira).toBe(300);
    expect(updated.version).toBe(4);
  });

  it('unlockFunds with rollback restores locked balance back to available balance', async () => {
    const updated = await walletService.unlockFunds(mainWalletId, 30000n, false);
    expect(updated.balanceKobo).toBe('100000');
    expect(updated.lockedBalanceKobo).toBe('0');
    expect(updated.version).toBe(5);
  });

  it('unlockFunds with commit permanently settles locked balance', async () => {
    // Lock ₦200
    await walletService.lockFunds(mainWalletId, 20000n);
    // Commit (deduct) ₦200
    const updated = await walletService.unlockFunds(mainWalletId, 20000n, true);
    expect(updated.balanceKobo).toBe('80000');
    expect(updated.lockedBalanceKobo).toBe('0');
  });

  it('transferCommissionToMain atomically sweeps commission funds to main wallet', async () => {
    const transfer = await walletService.transferCommissionToMain(testBizId, 50000n); // ₦500
    expect(transfer.commissionWallet.balanceKobo).toBe('0');
    expect(transfer.mainWallet.balanceKobo).toBe('130000'); // ₦800 + ₦500 = ₦1,300
  });
});

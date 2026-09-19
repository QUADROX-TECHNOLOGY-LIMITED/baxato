import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TelecomNetwork,
  ServiceType,
  TransactionStatus,
  WalletType,
  ValidationError,
  NotFoundError,
  AppError,
} from '@baxato/common';
import { DataService, DATA_PLANS } from './data.service';
import { inMemoryDb } from '../test-utils/mock-db';
import type { ProviderRouterService } from './providers';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('DataService (Catalog, Concurrency Locking & Multi-Provider Vending)', () => {
  const testBizId = 'biz_data_unit_1';
  const testUserId = 'usr_data_unit_1';
  const mainWalletId = 'wal_data_main_1';

  let mockRouter: ProviderRouterService;
  let service: DataService;

  beforeEach(() => {
    inMemoryDb.reset();

    // Setup tenant business & main wallet with ₦2,000.00 (200,000 Kobo)
    inMemoryDb.businesses.push({
      id: testBizId,
      ownerId: testUserId,
      name: 'Data Test Enterprise',
      slug: 'data-test-enterprise',
      country: 'NG',
      state: 'Lagos',
      lga: 'Ikeja',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    inMemoryDb.wallets.push({
      id: mainWalletId,
      businessId: testBizId,
      type: WalletType.MAIN,
      balance: 200000n, // 200,000 Kobo = ₦2,000.00
      lockedBalance: 0n,
      version: 1,
    });

    // Mock Provider Router
    mockRouter = {
      vendService: vi.fn().mockResolvedValue({
        status: TransactionStatus.SUCCESSFUL,
        providerName: 'MONNIFY',
        providerReference: 'MNFY_DATA_123456789',
        responseCode: '00',
        responseMessage: 'Data Bundle Vended Successfully',
      }),
    } as unknown as ProviderRouterService;

    service = new DataService(mockRouter);
  });

  describe('Data Plan Catalog & Lookups', () => {
    it('returns all active data plans across 4 major Nigerian operators', () => {
      const allPlans = service.getDataPlans();
      expect(allPlans.length).toBeGreaterThanOrEqual(16);
    });

    it('filters data plans by telecom network', () => {
      const mtnPlans = service.getDataPlans(TelecomNetwork.MTN);
      expect(mtnPlans.length).toBeGreaterThanOrEqual(5);
      mtnPlans.forEach((p) => expect(p.network).toBe(TelecomNetwork.MTN));

      const airtelPlans = service.getDataPlans(TelecomNetwork.AIRTEL);
      airtelPlans.forEach((p) => expect(p.network).toBe(TelecomNetwork.AIRTEL));
    });

    it('filters data plans by validity category', () => {
      const monthlyPlans = service.getDataPlans(undefined, 'MONTHLY');
      expect(monthlyPlans.length).toBeGreaterThanOrEqual(4);
      monthlyPlans.forEach((p) => expect(p.category).toBe('MONTHLY'));
    });

    it('finds data plan by ID', () => {
      const plan = service.getPlanById('airtel_daily_100mb');
      expect(plan).toBeDefined();
      expect(plan.name).toBe('Airtel 100MB Daily Plan');
      expect(plan.dataAllowance).toBe('100MB');
      expect(plan.interswitchPaymentCode).toBe('04277538');
    });

    it('throws NotFoundError for non-existent plan ID', () => {
      expect(() => service.getPlanById('invalid_plan_id')).toThrow(NotFoundError);
    });
  });

  describe('Phone Normalization & Network Validation', () => {
    it('normalizes Nigerian phone numbers', () => {
      expect(service.normalizePhoneNumber('+2348161437292')).toBe('08161437292');
      expect(service.normalizePhoneNumber('0701-936-7464')).toBe('07019367464');
    });

    it('rejects data purchase when phone prefix network mismatches selected plan network', async () => {
      // Recipient is Airtel (07019367464), but plan is MTN Daily
      await expect(
        service.purchaseDataBundle({
          businessId: testBizId,
          userId: testUserId,
          phone: '07019367464',
          planId: 'mtn_daily_100mb',
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Data Bundle Vending Execution Flow', () => {
    it('vends data bundle, calculates merchant discount, debits wallet, and posts ledger entries', async () => {
      // Purchase MTN 100MB Daily (₦100.00 / 10,000 Kobo) to 08161437292
      // MTN Discount: 2.5% = 250 Kobo (₦2.50)
      // Debit: 9,750 Kobo (₦97.50)
      const receipt = await service.purchaseDataBundle({
        businessId: testBizId,
        userId: testUserId,
        phone: '08161437292',
        planId: 'mtn_daily_100mb',
      });

      expect(receipt.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(receipt.network).toBe(TelecomNetwork.MTN);
      expect(receipt.planId).toBe('mtn_daily_100mb');
      expect(receipt.dataAllowance).toBe('100MB');
      expect(receipt.validity).toBe('1 Day');
      expect(receipt.faceAmountKobo).toBe('10000');
      expect(receipt.faceAmountNaira).toBe(100);
      expect(receipt.discountKobo).toBe('250');
      expect(receipt.discountNaira).toBe(2.5);
      expect(receipt.amountDebitedKobo).toBe('9750');
      expect(receipt.amountDebitedNaira).toBe(97.5);
      expect(receipt.providerName).toBe('MONNIFY');
      expect(receipt.providerReference).toBe('MNFY_DATA_123456789');

      // Verify wallet balance decremented by 9,750 Kobo (200,000 - 9,750 = 190,250)
      const wallet = inMemoryDb.wallets.find((w) => w.id === mainWalletId);
      expect(wallet?.balance).toBe(190250n);

      // Verify Service Transaction row created with ServiceType.DATA
      expect(inMemoryDb.serviceTransactions).toHaveLength(1);
      const txn = inMemoryDb.serviceTransactions[0];
      expect(txn.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(txn.serviceType).toBe(ServiceType.DATA);
      expect(txn.recipient).toBe('08161437292');
      expect(txn.discount).toBe(250n);
      expect(txn.totalAmount).toBe(9750n);

      // Verify Zero-Sum Financial Ledger entries posted (Debit & Credit pair)
      expect(inMemoryDb.financialLedger).toHaveLength(2);
      const debitEntry = inMemoryDb.financialLedger.find((l) => l.direction === 'DEBIT');
      expect(debitEntry).toBeDefined();
      expect(debitEntry?.category).toBe('DATA_PURCHASE');
      expect(debitEntry?.amount).toBe(9750n);
      expect(debitEntry?.balanceAfter).toBe(190250n);
    });

    it('rolls back wallet debit when provider vending fails', async () => {
      // Configure router mock to fail
      (mockRouter.vendService as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: TransactionStatus.FAILED,
        providerName: 'MONNIFY',
        responseCode: '91',
        responseMessage: 'Telco upstream timeout',
      });

      await expect(
        service.purchaseDataBundle({
          businessId: testBizId,
          userId: testUserId,
          phone: '08161437292',
          planId: 'mtn_daily_100mb',
        }),
      ).rejects.toThrow(AppError);

      // Wallet balance must remain intact (refunded to 200,000 Kobo)
      const wallet = inMemoryDb.wallets.find((w) => w.id === mainWalletId);
      expect(wallet?.balance).toBe(200000n);

      // Service transaction marked FAILED
      expect(inMemoryDb.serviceTransactions).toHaveLength(1);
      expect(inMemoryDb.serviceTransactions[0].status).toBe(TransactionStatus.FAILED);

      // No ledger entry committed
      expect(inMemoryDb.financialLedger).toHaveLength(0);
    });

    it('handles idempotency replay without double-debiting wallet', async () => {
      const idempotencyKey = 'idem_data_replay_key_001';

      // First purchase
      const receipt1 = await service.purchaseDataBundle({
        businessId: testBizId,
        userId: testUserId,
        phone: '08161437292',
        planId: 'mtn_daily_100mb',
        idempotencyKey,
      });

      expect(receipt1.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(mockRouter.vendService).toHaveBeenCalledTimes(1);

      // Replay with identical idempotencyKey
      const receipt2 = await service.purchaseDataBundle({
        businessId: testBizId,
        userId: testUserId,
        phone: '08161437292',
        planId: 'mtn_daily_100mb',
        idempotencyKey,
      });

      // Returns exact same receipt without re-executing vend or second wallet debit
      expect(receipt2.transactionId).toBe(receipt1.transactionId);
      expect(mockRouter.vendService).toHaveBeenCalledTimes(1);

      // Wallet was debited only once (200,000 - 9,750 = 190,250)
      const wallet = inMemoryDb.wallets.find((w) => w.id === mainWalletId);
      expect(wallet?.balance).toBe(190250n);
    });

    it('retrieves paginated data bundle transaction history', async () => {
      await service.purchaseDataBundle({
        businessId: testBizId,
        userId: testUserId,
        phone: '08161437292',
        planId: 'mtn_daily_100mb',
      });

      const history = await service.getDataHistory(testBizId, 10, 0);
      expect(history.total).toBe(1);
      expect(history.transactions[0].planId).toBe('mtn_daily_100mb');
      expect(history.transactions[0].recipientPhone).toBe('08161437292');
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TelecomNetwork,
  ServiceType,
  ProviderName,
  TransactionStatus,
  WalletType,
  ValidationError,
  NotFoundError,
  AppError,
} from '@baxato/common';
import { DataService, DATA_PLANS } from '../../src/services/data.service';
import { inMemoryDb } from '../test-utils/mock-db';
import type { ProviderRouterService } from '../../src/services/providers';

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

    // Mock Provider Router (defaults to Monnify active for Data)
    mockRouter = {
      resolveDynamicRouting: vi.fn().mockResolvedValue({
        primaryName: ProviderName.MONNIFY,
        allowFailover: false,
      }),
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

  describe('Data Plan Catalog & Per-Provider Gating', () => {
    it('returns active Monnify data plans without SME or vendor internals leaked', async () => {
      const allPlans = await service.getDataPlans();
      expect(allPlans.length).toBeGreaterThanOrEqual(20);
      expect(allPlans.some((p) => p.category === 'SME' || p.dataType === 'SME')).toBe(false);

      // Security: verify no internal upstream vendor fields are present on public DTOs
      allPlans.forEach((p: any) => {
        expect(p.monnifyPlanCode).toBeUndefined();
        expect(p.vtpassVariationCode).toBeUndefined();
        expect(p.vtpassServiceId).toBeUndefined();
        expect(p.supportedProviders).toBeUndefined();
      });

      const availability = await service.getAvailableCategories();
      expect(availability.categories).not.toContain('SME');
      expect(availability.dataTypes).toEqual(['DIRECT']);
    });

    it('exposes SME category and Glo SME / MTN SME bundles when VTpass is activated', async () => {
      (mockRouter.resolveDynamicRouting as ReturnType<typeof vi.fn>).mockResolvedValue({
        primaryName: ProviderName.VTPASS,
        allowFailover: false,
      });

      const smePlans = await service.getDataPlans(undefined, 'SME');
      expect(smePlans.length).toBeGreaterThanOrEqual(10);
      expect(smePlans.some((p) => p.id === 'glo_sme_200mb' && p.priceNaira === 70)).toBe(true);
      expect(smePlans.some((p) => p.id === 'glo_sme_1gb' && p.priceNaira === 320)).toBe(true);
      expect(smePlans.some((p) => p.id === 'mtn_sme_25gb' && p.priceNaira === 10000)).toBe(true);

      const gloCategories = await service.getAvailableCategories(TelecomNetwork.GLO);
      expect(gloCategories.categories).toContain('DAILY');
      expect(gloCategories.categories).toContain('WEEKLY');
      expect(gloCategories.categories).toContain('SME');
      expect(gloCategories.dataTypes).toEqual(['DIRECT', 'SME']);
    });

    it('filters data plans by telecom network', async () => {
      const mtnPlans = await service.getDataPlans(TelecomNetwork.MTN);
      expect(mtnPlans.length).toBeGreaterThanOrEqual(5);
      mtnPlans.forEach((p) => expect(p.network).toBe(TelecomNetwork.MTN));

      const airtelPlans = await service.getDataPlans(TelecomNetwork.AIRTEL);
      expect(airtelPlans.length).toBeGreaterThanOrEqual(5);
      airtelPlans.forEach((p) => expect(p.network).toBe(TelecomNetwork.AIRTEL));
    });

    it('filters data plans by validity category', async () => {
      const monthlyPlans = await service.getDataPlans(undefined, 'MONTHLY');
      expect(monthlyPlans.length).toBeGreaterThanOrEqual(4);
      monthlyPlans.forEach((p) => expect(p.category).toBe('MONTHLY'));
    });

    it('finds data plan by ID with verified upstream code', () => {
      expect(DATA_PLANS.length).toBeGreaterThan(40);
      const plan = service.getPlanById('airtel_daily_110mb');
      expect(plan).toBeDefined();
      expect(plan.name).toBe('Airtel 110MB Daily Plan');
      expect(plan.dataAllowance).toBe('110MB');
      expect(plan.monnifyPlanCode).toBe('2044');
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
          planId: 'mtn_daily_110mb',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects purchase of inactive provider plan without leaking vendor names', async () => {
      // Active provider is MONNIFY; glo_sme_200mb is only supported on VTpass
      try {
        await service.purchaseDataBundle({
          businessId: testBizId,
          userId: testUserId,
          phone: '08051234567',
          planId: 'glo_sme_200mb',
        });
        expect.unreachable('Expected ValidationError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err.message).not.toMatch(/vtpass|monnify/i);
      }
      expect(mockRouter.vendService).not.toHaveBeenCalled();
    });
  });

  describe('Data Bundle Vending Execution Flow', () => {
    it('vends data bundle, calculates merchant discount, debits wallet, and posts ledger entries', async () => {
      // Purchase MTN 110MB Daily (₦100.00 / 10,000 Kobo) to 08161437292
      // MTN Discount: 2.5% = 250 Kobo (₦2.50)
      // Debit: 9,750 Kobo (₦97.50)
      const receipt = await service.purchaseDataBundle({
        businessId: testBizId,
        userId: testUserId,
        phone: '08161437292',
        planId: 'mtn_daily_110mb',
      });

      expect(receipt.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(receipt.network).toBe(TelecomNetwork.MTN);
      expect(receipt.planId).toBe('mtn_daily_110mb');
      expect(receipt.dataAllowance).toBe('110MB');
      expect(receipt.dataType).toBe('DIRECT');
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

    it('vends Glo SME data bundle via VTpass metadata when VTpass is activated', async () => {
      (mockRouter.resolveDynamicRouting as ReturnType<typeof vi.fn>).mockResolvedValue({
        primaryName: ProviderName.VTPASS,
        allowFailover: false,
      });
      (mockRouter.vendService as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: TransactionStatus.SUCCESSFUL,
        providerName: ProviderName.VTPASS,
        providerReference: 'VTP_GLO_SME_1GB_001',
        responseCode: '000',
        responseMessage: 'TRANSACTION SUCCESSFUL',
      });

      // Glo 1GB SME = ₦320 (32,000 Kobo), 2% discount = 640 Kobo, Debit = 31,360 Kobo
      const receipt = await service.purchaseDataBundle({
        businessId: testBizId,
        userId: testUserId,
        phone: '08051234567',
        planId: 'glo_sme_1gb',
      });

      expect(receipt.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(receipt.dataType).toBe('SME');
      expect(receipt.amountDebitedKobo).toBe('31360');
      expect(mockRouter.vendService).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceType: ServiceType.DATA,
          metadata: expect.objectContaining({
            network: TelecomNetwork.GLO,
            dataType: 'SME',
            vtpassServiceId: 'glo-sme-data',
            vtpassVariationCode: 'glo-dg-320',
          }),
        }),
        expect.any(String),
      );
    });

    it('keeps wallet debited and commits ledger when upstream returns PROCESSING', async () => {
      (mockRouter.vendService as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: TransactionStatus.PROCESSING,
        providerName: ProviderName.MONNIFY,
        providerReference: 'MNFY_PROC_999',
        responseCode: '099',
        responseMessage: 'Transaction Processing',
      });

      const receipt = await service.purchaseDataBundle({
        businessId: testBizId,
        userId: testUserId,
        phone: '08161437292',
        planId: 'mtn_daily_110mb',
      });

      expect(receipt.status).toBe(TransactionStatus.PROCESSING);
      const wallet = inMemoryDb.wallets.find((w) => w.id === mainWalletId);
      expect(wallet?.balance).toBe(190250n);
      expect(inMemoryDb.serviceTransactions[0].status).toBe(TransactionStatus.PROCESSING);
      expect(inMemoryDb.financialLedger).toHaveLength(2);
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
          planId: 'mtn_daily_110mb',
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
        planId: 'mtn_daily_110mb',
        idempotencyKey,
      });

      expect(receipt1.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(mockRouter.vendService).toHaveBeenCalledTimes(1);

      // Replay with identical idempotencyKey
      const receipt2 = await service.purchaseDataBundle({
        businessId: testBizId,
        userId: testUserId,
        phone: '08161437292',
        planId: 'mtn_daily_110mb',
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
        planId: 'mtn_daily_110mb',
      });

      const history = await service.getDataHistory(testBizId, 10, 0);
      expect(history.total).toBe(1);
      expect(history.transactions[0].planId).toBe('mtn_daily_110mb');
      expect(history.transactions[0].recipientPhone).toBe('08161437292');
    });
  });
});

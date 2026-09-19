import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CableOperator,
  ServiceType,
  TransactionStatus,
  WalletType,
  ValidationError,
  NotFoundError,
  AppError,
} from '@baxato/common';
import { CableService, CABLE_BOUQUETS } from './cable.service';
import { inMemoryDb } from '../test-utils/mock-db';
import type { ProviderRouterService } from './providers';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('CableService (Validation, Concurrency Locking & Multi-Provider Vending)', () => {
  const testBizId = 'biz_cable_unit_1';
  const testUserId = 'usr_cable_unit_1';
  const mainWalletId = 'wal_cable_main_1';

  let mockRouter: ProviderRouterService;
  let service: CableService;

  beforeEach(() => {
    inMemoryDb.reset();

    // Setup tenant business & main wallet with ₦50,000.00 (5,000,000 Kobo)
    inMemoryDb.businesses.push({
      id: testBizId,
      ownerId: testUserId,
      name: 'Apex Entertainment Ltd',
      slug: 'apex-entertainment-ltd',
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
      balance: 5000000n, // 5,000,000 Kobo = ₦50,000.00
      lockedBalance: 0n,
      version: 1,
    });

    // Mock Provider Router
    mockRouter = {
      validateCustomer: vi.fn().mockResolvedValue({
        isValid: true,
        customerId: '1041541234',
        customerName: 'ADEKUNLE OLAWALE SAMSON',
        responseCode: '90000',
        responseMessage: 'Customer Validated Successfully',
      }),
      vendService: vi.fn().mockResolvedValue({
        status: TransactionStatus.SUCCESSFUL,
        providerName: 'MONNIFY',
        providerReference: 'MNFY_CABLE_987654321',
        customerName: 'ADEKUNLE OLAWALE SAMSON',
        responseCode: '00',
        responseMessage: 'Bouquet Subscribed Successfully',
      }),
    } as unknown as ProviderRouterService;

    service = new CableService(mockRouter);
  });

  describe('Operator & Bouquet Catalog Lookups', () => {
    it('returns supported Cable TV operators (DSTV, GOTV, STARTIMES)', () => {
      const operators = service.getOperators();
      expect(operators).toHaveLength(3);
      expect(operators.map((o) => o.code)).toEqual([
        CableOperator.DSTV,
        CableOperator.GOTV,
        CableOperator.STARTIMES,
      ]);
    });

    it('returns all active bouquets', () => {
      const allBouquets = service.getBouquets();
      expect(allBouquets.length).toBe(17);
    });

    it('filters bouquets by operator', () => {
      const dstvBouquets = service.getBouquets(CableOperator.DSTV);
      expect(dstvBouquets.length).toBe(7);
      dstvBouquets.forEach((b) => expect(b.operator).toBe(CableOperator.DSTV));

      const gotvBouquets = service.getBouquets(CableOperator.GOTV);
      expect(gotvBouquets.length).toBe(6);
      gotvBouquets.forEach((b) => expect(b.operator).toBe(CableOperator.GOTV));

      const startimesBouquets = service.getBouquets(CableOperator.STARTIMES);
      expect(startimesBouquets.length).toBe(4);
      startimesBouquets.forEach((b) => expect(b.operator).toBe(CableOperator.STARTIMES));
    });

    it('finds bouquet by ID', () => {
      const bouquet = service.getBouquetById('dstv-confam');
      expect(bouquet).toBeDefined();
      expect(bouquet.name).toBe('DStv Confam');
      expect(bouquet.priceKobo).toBe(1100000n); // ₦11,000
      expect(bouquet.interswitchPaymentCode).toBe('104153');
      expect(bouquet.discountBps).toBe(150); // 1.5%
    });

    it('throws NotFoundError for non-existent bouquet ID', () => {
      expect(() => service.getBouquetById('invalid_bouquet')).toThrow(NotFoundError);
    });
  });

  describe('Smartcard Normalization & Validation', () => {
    it('normalizes smartcard numbers and strips spaces/hyphens', () => {
      expect(service.normalizeSmartcard('104-154-1234', CableOperator.DSTV)).toBe('1041541234');
      expect(service.normalizeSmartcard('459 137 9988', CableOperator.GOTV)).toBe('4591379988');
    });

    it('throws ValidationError for invalid smartcard lengths', () => {
      // DSTV expects 10 to 11 digits
      expect(() => service.normalizeSmartcard('12345', CableOperator.DSTV)).toThrow(ValidationError);
      // StarTimes expects 11 digits
      expect(() => service.normalizeSmartcard('123456789', CableOperator.STARTIMES)).toThrow(ValidationError);
    });

    it('validates smartcard via provider router and returns subscriber name', async () => {
      const result = await service.validateSmartcard(CableOperator.DSTV, '1041541234');

      expect(result.isValid).toBe(true);
      expect(result.smartcard).toBe('1041541234');
      expect(result.operator).toBe(CableOperator.DSTV);
      expect(result.customerName).toBe('ADEKUNLE OLAWALE SAMSON');
      expect(result.accountStatus).toBe('ACTIVE');
      expect(mockRouter.validateCustomer).toHaveBeenCalledTimes(1);
    });

    it('handles provider customer validation failure gracefully', async () => {
      (mockRouter.validateCustomer as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        isValid: false,
        customerId: '1041540000',
        responseCode: '70010',
        responseMessage: 'Smartcard not found on MultiChoice server',
      });

      const result = await service.validateSmartcard(CableOperator.DSTV, '1041540000');
      expect(result.isValid).toBe(false);
      expect(result.accountStatus).toBe('INACTIVE');
      expect(result.responseMessage).toBe('Smartcard not found on MultiChoice server');
    });
  });

  describe('Cable TV Subscription Vending Flow', () => {
    it('vends bouquet, calculates merchant discount, debits wallet, and posts ledger entries', async () => {
      // Purchase DStv Confam: ₦11,000 (1,100,000 Kobo)
      // Merchant Discount: 1.5% = 16,500 Kobo (₦165.00)
      // Amount to Debit: 1,083,500 Kobo (₦10,835.00)
      const receipt = await service.purchaseBouquet({
        businessId: testBizId,
        userId: testUserId,
        operator: CableOperator.DSTV,
        smartcard: '1041541234',
        bouquetId: 'dstv-confam',
        customerName: 'ADEKUNLE OLAWALE SAMSON',
      });

      expect(receipt.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(receipt.operator).toBe(CableOperator.DSTV);
      expect(receipt.smartcard).toBe('1041541234');
      expect(receipt.customerName).toBe('ADEKUNLE OLAWALE SAMSON');
      expect(receipt.bouquetId).toBe('dstv-confam');
      expect(receipt.bouquetName).toBe('DStv Confam');
      expect(receipt.faceAmountKobo).toBe('1100000');
      expect(receipt.faceAmountNaira).toBe(11000);
      expect(receipt.discountKobo).toBe('16500');
      expect(receipt.discountNaira).toBe(165);
      expect(receipt.amountDebitedKobo).toBe('1083500');
      expect(receipt.amountDebitedNaira).toBe(10835);
      expect(receipt.providerName).toBe('MONNIFY');
      expect(receipt.providerReference).toBe('MNFY_CABLE_987654321');

      // Verify wallet balance decremented by 1,083,500 Kobo (5,000,000 - 1,083,500 = 3,916,500)
      const wallet = inMemoryDb.wallets.find((w) => w.id === mainWalletId);
      expect(wallet?.balance).toBe(3916500n);

      // Verify Service Transaction row created with ServiceType.CABLE_TV
      expect(inMemoryDb.serviceTransactions).toHaveLength(1);
      const txn = inMemoryDb.serviceTransactions[0];
      expect(txn.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(txn.serviceType).toBe(ServiceType.CABLE_TV);
      expect(txn.recipient).toBe('1041541234');
      expect(txn.discount).toBe(16500n);
      expect(txn.totalAmount).toBe(1083500n);

      // Verify Zero-Sum Financial Ledger entries posted (Debit & Credit pair)
      expect(inMemoryDb.financialLedger).toHaveLength(2);
      const debitEntry = inMemoryDb.financialLedger.find((l) => l.direction === 'DEBIT');
      expect(debitEntry).toBeDefined();
      expect(debitEntry?.category).toBe('CABLE_TV_PURCHASE');
      expect(debitEntry?.amount).toBe(1083500n);
      expect(debitEntry?.balanceAfter).toBe(3916500n);
    });

    it('rejects bouquet purchase when operator mismatches selected bouquet', async () => {
      // Selected GOTV operator, but bouquet is DSTV Confam
      await expect(
        service.purchaseBouquet({
          businessId: testBizId,
          userId: testUserId,
          operator: CableOperator.GOTV,
          smartcard: '4591379988',
          bouquetId: 'dstv-confam',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rolls back wallet debit when provider vending fails', async () => {
      (mockRouter.vendService as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: TransactionStatus.FAILED,
        providerName: 'MONNIFY',
        responseCode: '91',
        responseMessage: 'Upstream pay-tv network failure',
      });

      await expect(
        service.purchaseBouquet({
          businessId: testBizId,
          userId: testUserId,
          operator: CableOperator.DSTV,
          smartcard: '1041541234',
          bouquetId: 'dstv-confam',
        }),
      ).rejects.toThrow(AppError);

      // Wallet balance must be refunded intact (5,000,000 Kobo)
      const wallet = inMemoryDb.wallets.find((w) => w.id === mainWalletId);
      expect(wallet?.balance).toBe(5000000n);

      // Service transaction marked FAILED
      expect(inMemoryDb.serviceTransactions).toHaveLength(1);
      expect(inMemoryDb.serviceTransactions[0].status).toBe(TransactionStatus.FAILED);

      // No ledger entries committed
      expect(inMemoryDb.financialLedger).toHaveLength(0);
    });

    it('handles idempotency replay without double-debiting wallet', async () => {
      const idempotencyKey = 'idem_cable_replay_key_001';

      // First purchase
      const receipt1 = await service.purchaseBouquet({
        businessId: testBizId,
        userId: testUserId,
        operator: CableOperator.DSTV,
        smartcard: '1041541234',
        bouquetId: 'dstv-confam',
        idempotencyKey,
      });

      expect(receipt1.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(mockRouter.vendService).toHaveBeenCalledTimes(1);

      // Replay with identical idempotencyKey
      const receipt2 = await service.purchaseBouquet({
        businessId: testBizId,
        userId: testUserId,
        operator: CableOperator.DSTV,
        smartcard: '1041541234',
        bouquetId: 'dstv-confam',
        idempotencyKey,
      });

      // Returns exact same receipt without second debit
      expect(receipt2.transactionId).toBe(receipt1.transactionId);
      expect(mockRouter.vendService).toHaveBeenCalledTimes(1);

      // Wallet debited only once
      const wallet = inMemoryDb.wallets.find((w) => w.id === mainWalletId);
      expect(wallet?.balance).toBe(3916500n);
    });

    it('retrieves paginated Cable TV transaction history', async () => {
      await service.purchaseBouquet({
        businessId: testBizId,
        userId: testUserId,
        operator: CableOperator.DSTV,
        smartcard: '1041541234',
        bouquetId: 'dstv-confam',
      });

      const history = await service.getCableHistory(testBizId, 10, 0);
      expect(history.total).toBe(1);
      expect(history.transactions[0].bouquetId).toBe('dstv-confam');
      expect(history.transactions[0].smartcard).toBe('1041541234');
      expect(history.transactions[0].operator).toBe(CableOperator.DSTV);
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TelecomNetwork,
  ServiceType,
  TransactionStatus,
  WalletType,
  ValidationError,
  AppError,
} from '@baxato/common';
import { AirtimeService, TELCO_CONFIGS } from '../../src/services/airtime.service';
import { inMemoryDb } from '../test-utils/mock-db';
import type { ProviderRouterService } from '../../src/services/providers';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('AirtimeService (Prefix Detection, Concurrency Locking & Multi-Provider Vending)', () => {
  const testBizId = 'biz_airtime_unit_1';
  const testUserId = 'usr_airtime_unit_1';
  const mainWalletId = 'wal_airtime_main_1';

  let mockRouter: ProviderRouterService;
  let service: AirtimeService;

  beforeEach(() => {
    inMemoryDb.reset();

    // Setup tenant business & main wallet with ₦1,000.00 (100,000 Kobo)
    inMemoryDb.businesses.push({
      id: testBizId,
      ownerId: testUserId,
      name: 'Airtime Test Enterprise',
      slug: 'airtime-test-enterprise',
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
      balance: 100000n, // 100,000 Kobo = ₦1,000.00
      lockedBalance: 0n,
      version: 1,
    });

    // Mock Provider Router
    mockRouter = {
      vendService: vi.fn().mockResolvedValue({
        status: TransactionStatus.SUCCESSFUL,
        providerName: 'MONNIFY',
        providerReference: 'MNFY_VAS_123456789',
        responseCode: '00',
        responseMessage: 'Transaction Successful',
      }),
    } as unknown as ProviderRouterService;

    service = new AirtimeService(mockRouter);
  });

  describe('Phone Normalization & Prefix Detection', () => {
    it('normalizes various Nigerian phone number formats to standard 11-digit format', () => {
      expect(service.normalizePhoneNumber('+2348031234567')).toBe('08031234567');
      expect(service.normalizePhoneNumber('2348161437292')).toBe('08161437292');
      expect(service.normalizePhoneNumber('0701-936-7464')).toBe('07019367464');
      expect(service.normalizePhoneNumber('0902 405 1958')).toBe('09024051958');
    });

    it('rejects invalid phone formats with ValidationError', () => {
      expect(() => service.normalizePhoneNumber('0803123')).toThrow(ValidationError);
      expect(() => service.normalizePhoneNumber('+123456789012')).toThrow(ValidationError);
      expect(() => service.normalizePhoneNumber('abcd1234567')).toThrow(ValidationError);
    });

    it('auto-detects MTN prefixes correctly', () => {
      expect(service.detectNetwork('08031234567')).toBe(TelecomNetwork.MTN);
      expect(service.detectNetwork('08161437292')).toBe(TelecomNetwork.MTN);
      expect(service.detectNetwork('09031234567')).toBe(TelecomNetwork.MTN);
      expect(service.detectNetwork('09131234567')).toBe(TelecomNetwork.MTN);
    });

    it('auto-detects Airtel prefixes correctly', () => {
      expect(service.detectNetwork('08021234567')).toBe(TelecomNetwork.AIRTEL);
      expect(service.detectNetwork('07019367464')).toBe(TelecomNetwork.AIRTEL);
      expect(service.detectNetwork('09024051958')).toBe(TelecomNetwork.AIRTEL);
      expect(service.detectNetwork('09121234567')).toBe(TelecomNetwork.AIRTEL);
    });

    it('auto-detects Globacom prefixes correctly', () => {
      expect(service.detectNetwork('08051234567')).toBe(TelecomNetwork.GLO);
      expect(service.detectNetwork('08151234567')).toBe(TelecomNetwork.GLO);
      expect(service.detectNetwork('09051234567')).toBe(TelecomNetwork.GLO);
    });

    it('auto-detects 9mobile prefixes correctly', () => {
      expect(service.detectNetwork('08091234567')).toBe(TelecomNetwork.NINEMOBILE);
      expect(service.detectNetwork('08181234567')).toBe(TelecomNetwork.NINEMOBILE);
      expect(service.detectNetwork('09081234567')).toBe(TelecomNetwork.NINEMOBILE);
    });

    it('throws ValidationError when prefix cannot be detected', () => {
      expect(() => service.detectNetwork('07001234567')).toThrow(ValidationError);
    });
  });

  describe('Network Options & Commercial Margins', () => {
    it('returns all 4 major Nigerian telecom networks with active discount rates and limits', () => {
      const options = service.getNetworkOptions();
      expect(options).toHaveLength(4);

      const mtn = options.find((o) => o.network === TelecomNetwork.MTN);
      expect(mtn).toBeDefined();
      expect(mtn?.discountPercent).toBe('2.5%');
      expect(mtn?.minAmountKobo).toBe('5000'); // ₦50
      expect(mtn?.maxAmountKobo).toBe('5000000'); // ₦50,000
      expect(mtn?.primaryColor).toBe('#FFCC00');

      const glo = options.find((o) => o.network === TelecomNetwork.GLO);
      expect(glo?.discountPercent).toBe('3.5%');
    });
  });

  describe('Airtime Vending Execution Flow', () => {
    it('vends airtime, calculates merchant discount, debits wallet, and posts ledger entries', async () => {
      // Purchase ₦100 airtime on MTN (08161437292)
      // Face Amount: 10,000 Kobo (₦100.00)
      // MTN Discount: 2.5% = 250 Kobo (₦2.50)
      // Debit: 9,750 Kobo (₦97.50)
      const receipt = await service.purchaseAirtime({
        businessId: testBizId,
        userId: testUserId,
        phone: '08161437292',
        amountKobo: 10000n,
      });

      expect(receipt.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(receipt.network).toBe(TelecomNetwork.MTN);
      expect(receipt.networkName).toBe('MTN Nigeria');
      expect(receipt.recipientPhone).toBe('08161437292');
      expect(receipt.faceAmountKobo).toBe('10000');
      expect(receipt.faceAmountNaira).toBe(100);
      expect(receipt.discountKobo).toBe('250');
      expect(receipt.discountNaira).toBe(2.5);
      expect(receipt.amountDebitedKobo).toBe('9750');
      expect(receipt.amountDebitedNaira).toBe(97.5);
      expect(receipt.providerName).toBe('MONNIFY');
      expect(receipt.providerReference).toBe('MNFY_VAS_123456789');

      // Verify wallet balance decremented by exactly 9,750 Kobo (100,000 - 9,750 = 90,250)
      const wallet = inMemoryDb.wallets.find((w) => w.id === mainWalletId);
      expect(wallet?.balance).toBe(90250n);

      // Verify Service Transaction row created
      expect(inMemoryDb.serviceTransactions).toHaveLength(1);
      const txn = inMemoryDb.serviceTransactions[0];
      expect(txn.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(txn.serviceType).toBe(ServiceType.AIRTIME);
      expect(txn.recipient).toBe('08161437292');
      expect(txn.discount).toBe(250n);
      expect(txn.totalAmount).toBe(9750n);

      // Verify Zero-Sum Financial Ledger entries posted (Debit + Credit pair)
      expect(inMemoryDb.financialLedger).toHaveLength(2);
      const debitEntry = inMemoryDb.financialLedger.find((l) => l.direction === 'DEBIT');
      expect(debitEntry).toBeDefined();
      expect(debitEntry?.category).toBe('AIRTIME_PURCHASE');
      expect(debitEntry?.amount).toBe(9750n);
      expect(debitEntry?.balanceAfter).toBe(90250n);
    });

    it('enforces min and max amount limits with ValidationError', async () => {
      // Below ₦50 (5,000 Kobo)
      await expect(
        service.purchaseAirtime({
          businessId: testBizId,
          userId: testUserId,
          phone: '08161437292',
          amountKobo: 4000n, // ₦40
        }),
      ).rejects.toThrow(ValidationError);

      // Above ₦50,000 (5,000,000 Kobo)
      await expect(
        service.purchaseAirtime({
          businessId: testBizId,
          userId: testUserId,
          phone: '08161437292',
          amountKobo: 6000000n, // ₦60,000
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rolls back wallet debit when provider vending fails', async () => {
      // Configure router mock to fail
      (mockRouter.vendService as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: TransactionStatus.FAILED,
        providerName: 'MONNIFY',
        responseCode: '99',
        responseMessage: 'Telco upstream timeout',
      });

      await expect(
        service.purchaseAirtime({
          businessId: testBizId,
          userId: testUserId,
          phone: '07019367464', // Airtel
          amountKobo: 10000n,
        }),
      ).rejects.toThrow(AppError);

      // Wallet balance must remain intact (refunded to 100,000 Kobo)
      const wallet = inMemoryDb.wallets.find((w) => w.id === mainWalletId);
      expect(wallet?.balance).toBe(100000n);

      // Service transaction marked FAILED
      expect(inMemoryDb.serviceTransactions).toHaveLength(1);
      expect(inMemoryDb.serviceTransactions[0].status).toBe(TransactionStatus.FAILED);

      // No ledger entry posted for failed transaction
      expect(inMemoryDb.financialLedger).toHaveLength(0);
    });

    it('handles idempotency replay without double-debiting wallet', async () => {
      const idempotencyKey = 'idem_airtime_replay_key_001';

      // First purchase
      const receipt1 = await service.purchaseAirtime({
        businessId: testBizId,
        userId: testUserId,
        phone: '08161437292',
        amountKobo: 10000n,
        idempotencyKey,
      });

      expect(receipt1.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(mockRouter.vendService).toHaveBeenCalledTimes(1);

      // Replay with identical idempotencyKey
      const receipt2 = await service.purchaseAirtime({
        businessId: testBizId,
        userId: testUserId,
        phone: '08161437292',
        amountKobo: 10000n,
        idempotencyKey,
      });

      // Returns exact same receipt without re-executing vend or second wallet debit
      expect(receipt2.transactionId).toBe(receipt1.transactionId);
      expect(mockRouter.vendService).toHaveBeenCalledTimes(1);

      // Wallet was debited only once (100,000 - 9,750 = 90,250)
      const wallet = inMemoryDb.wallets.find((w) => w.id === mainWalletId);
      expect(wallet?.balance).toBe(90250n);
    });

    it('retrieves paginated airtime transaction history', async () => {
      // Seed two airtime purchases
      await service.purchaseAirtime({
        businessId: testBizId,
        userId: testUserId,
        phone: '08161437292',
        amountKobo: 10000n,
      });

      await service.purchaseAirtime({
        businessId: testBizId,
        userId: testUserId,
        phone: '07019367464',
        amountKobo: 20000n,
      });

      const history = await service.getAirtimeHistory(testBizId, 10, 0);
      expect(history.total).toBe(2);
      expect(history.transactions).toHaveLength(2);
    });
  });
});

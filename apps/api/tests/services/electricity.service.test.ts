import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DiscoCode,
  ElectricityMeterType,
  ServiceType,
  TransactionStatus,
  WalletType,
  ValidationError,
  AppError,
} from '@baxato/common';
import { ElectricityService, DISCO_CONFIGS } from '../../src/services/electricity.service';
import { inMemoryDb } from '../test-utils/mock-db';
import type { ProviderRouterService } from '../../src/services/providers';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('ElectricityService (DISCOs, STS Token Dispensing & Ledger Accounting)', () => {
  const testBizId = 'biz_elec_unit_1';
  const testUserId = 'usr_elec_unit_1';
  const mainWalletId = 'wal_elec_main_1';

  let mockRouter: ProviderRouterService;
  let service: ElectricityService;

  beforeEach(() => {
    inMemoryDb.reset();

    // Setup tenant business & main wallet with ₦50,000.00 (5,000,000 Kobo)
    inMemoryDb.businesses.push({
      id: testBizId,
      ownerId: testUserId,
      name: 'Power Hub Nigeria Ltd',
      slug: 'power-hub-nigeria-ltd',
      country: 'NG',
      state: 'Oyo',
      lga: 'Ibadan North',
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
        customerId: '45077162324',
        customerName: 'Sogbein Olusola Samson Mr Flat 2 .',
        customerAddress: '9, ORI OSOKO COMMUNITY, OLOKUTA OYO',
        responseCode: '90000',
        responseMessage: 'Customer Validated Successfully',
      }),
      vendService: vi.fn().mockResolvedValue({
        status: TransactionStatus.SUCCESSFUL,
        providerName: 'INTERSWITCH',
        providerReference: 'XAT|Web|3XAT0001|IBDPR|090926070221|A78FKC7H3RP',
        token: '18173728177997242246',
        units: '14.3 kWh',
        unitsCostKobo: 46512n,
        vatKobo: 3488n,
        tariff: 'R2',
        feeder: 'ELEWERAN 33KV FEEDER',
        customerName: 'Sogbein Olusola Samson Mr Flat 2 .',
        customerAddress: '9, ORI OSOKO COMMUNITY, OLOKUTA OYO',
        responseCode: '90000',
        responseMessage: 'Transaction Successful',
      }),
    } as unknown as ProviderRouterService;

    service = new ElectricityService(mockRouter);
  });

  describe('DISCO Catalog & Configurations', () => {
    it('returns list of all 12 supported Nigerian DISCOs', () => {
      const discos = service.getDiscos();
      expect(discos).toHaveLength(12);
      expect(discos.map((d) => d.code)).toEqual([
        DiscoCode.IBEDC,
        DiscoCode.IKEDC,
        DiscoCode.EKEDC,
        DiscoCode.AEDC,
        DiscoCode.EEDC,
        DiscoCode.KEDCO,
        DiscoCode.JED,
        DiscoCode.PHED,
        DiscoCode.BEDC,
        DiscoCode.KAEDCO,
        DiscoCode.YEDC,
        DiscoCode.APLE,
      ]);
    });

    it('correctly maps payment codes for prepaid and postpaid meter types', () => {
      expect(service.getPaymentCode(DiscoCode.IBEDC, ElectricityMeterType.PREPAID)).toBe('053413501');
      expect(service.getPaymentCode(DiscoCode.IBEDC, ElectricityMeterType.POSTPOSTID as any || ElectricityMeterType.POSTPAID)).toBe('053413401');
    });

    it('formats 20-digit STS tokens into 4-digit groups', () => {
      expect(service.formatStsToken('18173728177997242246')).toBe('1817 3728 1779 9724 2246');
    });
  });

  describe('Meter Normalization & Validation', () => {
    it('normalizes meter numbers by removing spaces and hyphens', () => {
      expect(service.normalizeMeterNumber('450-7716-2324')).toBe('45077162324');
      expect(service.normalizeMeterNumber('450 7716 2324')).toBe('45077162324');
    });

    it('throws ValidationError for invalid meter number lengths', () => {
      expect(() => service.normalizeMeterNumber('12345')).toThrow(ValidationError);
      expect(() => service.normalizeMeterNumber('1234567890123456')).toThrow(ValidationError);
    });

    it('validates meter number via provider router and returns customer details', async () => {
      const result = await service.validateMeter({
        disco: DiscoCode.IBEDC,
        meterNumber: '45077162324',
        meterType: ElectricityMeterType.PREPAID,
      });

      expect(result.isValid).toBe(true);
      expect(result.meterNumber).toBe('45077162324');
      expect(result.disco).toBe(DiscoCode.IBEDC);
      expect(result.customerName).toBe('Sogbein Olusola Samson Mr Flat 2 .');
      expect(result.customerAddress).toBe('9, ORI OSOKO COMMUNITY, OLOKUTA OYO');
      expect(mockRouter.validateCustomer).toHaveBeenCalledTimes(1);
    });

    it('handles provider meter validation failure gracefully', async () => {
      (mockRouter.validateCustomer as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        isValid: false,
        customerId: '00000000000',
        responseCode: '70012',
        responseMessage: 'Meter number not found on IBEDC database',
      });

      const result = await service.validateMeter({
        disco: DiscoCode.IBEDC,
        meterNumber: '00000000000',
        meterType: ElectricityMeterType.PREPAID,
      });

      expect(result.isValid).toBe(false);
      expect(result.responseMessage).toBe('Meter number not found on IBEDC database');
    });
  });

  describe('Electricity Purchase Execution Flow', () => {
    it('vends prepaid electricity, debits wallet minus discount, extracts STS token, units & VAT, and posts ledger entries', async () => {
      // Purchase ₦500.00 (50,000 Kobo) IBEDC Prepaid
      // Discount: 1.2% = 600 Kobo (₦6.00)
      // Debit: 49,400 Kobo (₦494.00)
      const receipt = await service.purchaseElectricity({
        businessId: testBizId,
        userId: testUserId,
        disco: DiscoCode.IBEDC,
        meterNumber: '45077162324',
        meterType: ElectricityMeterType.PREPAID,
        amountKobo: 50000n,
        customerMobile: '09034804817',
      });

      expect(receipt.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(receipt.disco).toBe(DiscoCode.IBEDC);
      expect(receipt.meterNumber).toBe('45077162324');
      expect(receipt.token).toBe('1817 3728 1779 9724 2246');
      expect(receipt.units).toBe('14.3 kWh');
      expect(receipt.tariff).toBe('R2');
      expect(receipt.feeder).toBe('ELEWERAN 33KV FEEDER');
      expect(receipt.unitsCostKobo).toBe('46512');
      expect(receipt.unitsCostNaira).toBe(465.12);
      expect(receipt.vatKobo).toBe('3488');
      expect(receipt.vatNaira).toBe(34.88);
      expect(receipt.faceAmountKobo).toBe('50000');
      expect(receipt.faceAmountNaira).toBe(500);
      expect(receipt.discountKobo).toBe('600');
      expect(receipt.discountNaira).toBe(6);
      expect(receipt.amountDebitedKobo).toBe('49400');
      expect(receipt.amountDebitedNaira).toBe(494);
      expect(receipt.providerName).toBe('INTERSWITCH');

      // Verify wallet balance decremented by 49,400 Kobo (5,000,000 - 49,400 = 4,950,600)
      const wallet = inMemoryDb.wallets.find((w) => w.id === mainWalletId);
      expect(wallet?.balance).toBe(4950600n);

      // Verify Service Transaction row created with ServiceType.ELECTRICITY
      expect(inMemoryDb.serviceTransactions).toHaveLength(1);
      const txn = inMemoryDb.serviceTransactions[0];
      expect(txn.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(txn.serviceType).toBe(ServiceType.ELECTRICITY);
      expect(txn.recipient).toBe('45077162324');
      expect(txn.discount).toBe(600n);
      expect(txn.totalAmount).toBe(49400n);

      // Verify Zero-Sum Financial Ledger entries posted (Debit & Credit pair)
      expect(inMemoryDb.financialLedger).toHaveLength(2);
      const debitEntry = inMemoryDb.financialLedger.find((l) => l.direction === 'DEBIT');
      expect(debitEntry).toBeDefined();
      expect(debitEntry?.category).toBe('ELECTRICITY_PURCHASE');
      expect(debitEntry?.amount).toBe(49400n);
      expect(debitEntry?.balanceAfter).toBe(4950600n);
    });

    it('rejects purchase when amount is below minimum (₦500 / 50,000 Kobo)', async () => {
      await expect(
        service.purchaseElectricity({
          businessId: testBizId,
          userId: testUserId,
          disco: DiscoCode.IBEDC,
          meterNumber: '45077162324',
          meterType: ElectricityMeterType.PREPAID,
          amountKobo: 20000n, // ₦200 < ₦500
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects purchase when amount is above maximum (₦100,000 / 10,000,000 Kobo)', async () => {
      await expect(
        service.purchaseElectricity({
          businessId: testBizId,
          userId: testUserId,
          disco: DiscoCode.IBEDC,
          meterNumber: '45077162324',
          meterType: ElectricityMeterType.PREPAID,
          amountKobo: 20000000n, // ₦200,000 > ₦100,000
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rolls back wallet balance when provider vending fails', async () => {
      (mockRouter.vendService as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: TransactionStatus.FAILED,
        providerName: 'INTERSWITCH',
        responseCode: '91',
        responseMessage: 'DISCO STS generation server unavailable',
      });

      await expect(
        service.purchaseElectricity({
          businessId: testBizId,
          userId: testUserId,
          disco: DiscoCode.IBEDC,
          meterNumber: '45077162324',
          meterType: ElectricityMeterType.PREPAID,
          amountKobo: 50000n,
        }),
      ).rejects.toThrow(AppError);

      // Wallet balance must remain intact (5,000,000 Kobo)
      const wallet = inMemoryDb.wallets.find((w) => w.id === mainWalletId);
      expect(wallet?.balance).toBe(5000000n);

      // Service transaction marked FAILED
      expect(inMemoryDb.serviceTransactions).toHaveLength(1);
      expect(inMemoryDb.serviceTransactions[0].status).toBe(TransactionStatus.FAILED);

      // No ledger entries committed
      expect(inMemoryDb.financialLedger).toHaveLength(0);
    });

    it('handles idempotency replay without double-debiting wallet', async () => {
      const idempotencyKey = 'idem_elec_replay_key_001';

      // First purchase
      const receipt1 = await service.purchaseElectricity({
        businessId: testBizId,
        userId: testUserId,
        disco: DiscoCode.IBEDC,
        meterNumber: '45077162324',
        meterType: ElectricityMeterType.PREPAID,
        amountKobo: 50000n,
        idempotencyKey,
      });

      expect(receipt1.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(mockRouter.vendService).toHaveBeenCalledTimes(1);

      // Replay with identical idempotencyKey
      const receipt2 = await service.purchaseElectricity({
        businessId: testBizId,
        userId: testUserId,
        disco: DiscoCode.IBEDC,
        meterNumber: '45077162324',
        meterType: ElectricityMeterType.PREPAID,
        amountKobo: 50000n,
        idempotencyKey,
      });

      // Returns exact same receipt without second debit
      expect(receipt2.transactionId).toBe(receipt1.transactionId);
      expect(receipt2.token).toBe(receipt1.token);
      expect(mockRouter.vendService).toHaveBeenCalledTimes(1);

      // Wallet debited only once
      const wallet = inMemoryDb.wallets.find((w) => w.id === mainWalletId);
      expect(wallet?.balance).toBe(4950600n);
    });

    it('retrieves paginated electricity transaction history', async () => {
      await service.purchaseElectricity({
        businessId: testBizId,
        userId: testUserId,
        disco: DiscoCode.IBEDC,
        meterNumber: '45077162324',
        meterType: ElectricityMeterType.PREPAID,
        amountKobo: 50000n,
      });

      const history = await service.getElectricityHistory(testBizId, 10, 0);
      expect(history.total).toBe(1);
      expect(history.transactions[0].disco).toBe(DiscoCode.IBEDC);
      expect(history.transactions[0].meterNumber).toBe('45077162324');
      expect(history.transactions[0].token).toBe('1817 3728 1779 9724 2246');
    });
  });
});

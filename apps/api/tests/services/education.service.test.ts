import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ExamBody,
  ExamServiceType,
  ServiceType,
  TransactionStatus,
  WalletType,
  ValidationError,
  NotFoundError,
  encryptPin,
} from '@baxato/common';
import { EducationService, EXAM_PACKAGES } from '../../src/services/education.service';
import { inMemoryDb } from '../test-utils/mock-db';
import type { ProviderRouterService } from '../../src/services/providers';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('EducationService (WAEC, NECO, JAMB, NABTEB & Dynamic Pricing)', () => {
  const testBizId = 'biz_edu_unit_1';
  const testUserId = 'usr_edu_unit_1';
  const mainWalletId = 'wal_edu_main_1';

  let mockRouter: ProviderRouterService;
  let service: EducationService;

  beforeEach(() => {
    inMemoryDb.reset();

    // Setup tenant business & main wallet with ₦100,000.00 (10,000,000 Kobo)
    inMemoryDb.businesses.push({
      id: testBizId,
      ownerId: testUserId,
      name: 'BrainWave Academy & Edu Services Ltd',
      slug: 'brainwave-academy',
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
      balance: 10000000n, // 10,000,000 Kobo = ₦100,000.00
      lockedBalance: 0n,
      version: 1,
    });

    // Mock Provider Router
    mockRouter = {
      validateCustomer: vi.fn().mockResolvedValue({
        isValid: true,
        customerId: '1029384756',
        customerName: 'MUSA IBRAHIM CHUKWUEMEKA',
        responseCode: '90000',
        responseMessage: 'Customer validated successfully',
      }),
      vendService: vi.fn().mockResolvedValue({
        status: TransactionStatus.SUCCESSFUL,
        providerName: 'INTERSWITCH',
        providerReference: 'ISW_ORION_99214',
        requestReference: '241109283746',
        amountKobo: 570000n,
        responseCode: '90000',
        responseMessage: 'Transaction Successful',
        pinData: {
          pin: '8392-1029-4821',
          serialNumber: 'JAMB-2026-99214',
          instructions: 'Candidate should present profile code at any accredited CBT centre.',
        },
      }),
      requeryTransaction: vi.fn(),
      getHealth: vi.fn(),
    } as unknown as ProviderRouterService;

    service = new EducationService(mockRouter);
  });

  it('retrieves comprehensive catalog of education examination packages', () => {
    const packages = service.getPackages(testBizId);
    expect(packages.length).toBeGreaterThanOrEqual(8);

    const jambDE = packages.find((p) => p.packageCode === 'JAMB_DIRECT_ENTRY');
    expect(jambDE).toBeDefined();
    expect(jambDE?.examBody).toBe(ExamBody.JAMB);
    expect(jambDE?.serviceType).toBe(ExamServiceType.DIRECT_ENTRY);
    expect(jambDE?.baseCostKobo).toBe('570000'); // ₦5,700.00
    expect(jambDE?.baseCostNaira).toBe(5700);
    expect(jambDE?.requiresValidation).toBe(true);

    const waec = packages.find((p) => p.packageCode === 'WAEC_RESULT_CHECKER');
    expect(waec).toBeDefined();
    expect(waec?.examBody).toBe(ExamBody.WAEC);
    expect(waec?.baseCostKobo).toBe('350000'); // ₦3,500.00

    const neco = packages.find((p) => p.packageCode === 'NECO_RESULT_TOKEN');
    expect(neco).toBeDefined();
    expect(neco?.examBody).toBe(ExamBody.NECO);
    expect(neco?.baseCostKobo).toBe('120000'); // ₦1,200.00
  });

  it('STRICT COMPLIANCE: supports dynamic configurable markups without hardcoded margins', () => {
    // Business sets custom markup of ₦500.00 (50,000 Kobo) on JAMB Direct Entry
    service.setCustomMarkup(testBizId, 'JAMB_DIRECT_ENTRY', 50000n);

    const markup = service.getCustomMarkup(testBizId, 'JAMB_DIRECT_ENTRY');
    expect(markup).toBe(50000n);

    const packages = service.getPackages(testBizId);
    const jambDE = packages.find((p) => p.packageCode === 'JAMB_DIRECT_ENTRY')!;

    // Selling price = 570,000 (wholesale) + 50,000 (merchant markup) = 620,000 Kobo (₦6,200.00)
    expect(jambDE.merchantMarkupKobo).toBe('50000');
    expect(jambDE.merchantMarkupNaira).toBe(500);
    expect(jambDE.sellingPriceKobo).toBe('620000');
    expect(jambDE.sellingPriceNaira).toBe(6200);
  });

  it('validates 10-digit JAMB candidate Profile Code in real time', async () => {
    const res = await service.validateCandidate({
      examBody: ExamBody.JAMB,
      candidateId: '1029384756',
      packageCode: 'JAMB_DIRECT_ENTRY',
    });

    expect(res.isValid).toBe(true);
    expect(res.candidateId).toBe('1029384756');
    expect(res.candidateName).toBe('MUSA IBRAHIM CHUKWUEMEKA');
    expect(res.session).toContain('2026');
    expect(mockRouter.validateCustomer).toHaveBeenCalled();
  });

  it('rejects invalid JAMB Profile Codes not matching 10 digits', async () => {
    await expect(
      service.validateCandidate({
        examBody: ExamBody.JAMB,
        candidateId: '12345', // only 5 digits
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('validates candidate phone format for WAEC/NECO/NABTEB', async () => {
    const res = await service.validateCandidate({
      examBody: ExamBody.WAEC,
      candidateId: '08031234567',
      packageCode: 'WAEC_RESULT_CHECKER',
    });

    expect(res.isValid).toBe(true);
    expect(res.candidateId).toBe('08031234567');
  });

  it('successfully vends live JAMB 2026 Direct Entry PIN and debits exact wholesale cost', async () => {
    const initialWallet = inMemoryDb.wallets.find((w) => w.id === mainWalletId)!;
    const initialBal = initialWallet.balance;

    const receipt = await service.purchaseExamPin({
      businessId: testBizId,
      userId: testUserId,
      packageCode: 'JAMB_DIRECT_ENTRY',
      candidateId: '1029384756',
      candidateName: 'Musa Ibrahim Chukwuemeka',
      quantity: 1,
    });

    expect(receipt.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(receipt.packageCode).toBe('JAMB_DIRECT_ENTRY');
    expect(receipt.examBody).toBe(ExamBody.JAMB);
    expect(receipt.candidateId).toBe('1029384756');
    expect(receipt.pins).toHaveLength(1);
    expect(receipt.pins[0]?.pin).toBe('8392-1029-4821');
    expect(receipt.pins[0]?.serialNumber).toBe('JAMB-2026-99214');
    expect(receipt.amountDebitedKobo).toBe('570000'); // ₦5,700.00
    expect(receipt.amountDebitedNaira).toBe(5700);

    // Verify wallet debit
    const updatedWallet = inMemoryDb.wallets.find((w) => w.id === mainWalletId)!;
    expect(updatedWallet.balance).toBe(initialBal - 570000n);

    // Verify Zero-Sum double-entry ledger entries
    expect(inMemoryDb.financialLedger.length).toBeGreaterThanOrEqual(1);
    const ledgerEntry = inMemoryDb.financialLedger.find(
      (e) => e.reference === receipt.clientReference,
    );
    expect(ledgerEntry).toBeDefined();
    expect(ledgerEntry?.amount).toBe(570000n);
  });

  it('falls back to offline encrypted inventory (examPins table) when live provider fails', async () => {
    // Provider fails
    (mockRouter.vendService as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Interswitch Orion timeout'),
    );

    // Preload encrypted PIN into inventory
    const rawPin = '994820194827';
    const rawSerial = 'WAEC-2026-8839201';
    inMemoryDb.examPins.push({
      id: 'pin_waec_inventory_1',
      examBody: 'WAEC',
      pinEncrypted: encryptPin(rawPin),
      serialEncrypted: encryptPin(rawSerial),
      amount: 350000n,
      status: 'AVAILABLE',
      dispensedTransactionId: null,
      dispensedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const receipt = await service.purchaseExamPin({
      businessId: testBizId,
      userId: testUserId,
      packageCode: 'WAEC_RESULT_CHECKER',
      candidateId: '08023456789',
      quantity: 1,
    });

    expect(receipt.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(receipt.source).toBe('ENCRYPTED_INVENTORY');
    expect(receipt.pins).toHaveLength(1);
    expect(receipt.pins[0]?.pin).toBe(rawPin);
    expect(receipt.pins[0]?.serialNumber).toBe(rawSerial);

    // Verify inventory status updated to DISPENSED
    const inventoryItem = inMemoryDb.examPins.find((p) => p.id === 'pin_waec_inventory_1')!;
    expect(inventoryItem.status).toBe('DISPENSED');
    expect(inventoryItem.dispensedTransactionId).toBe(receipt.transactionId);
  });

  it('rejects purchase when merchant wallet balance is insufficient', async () => {
    const wallet = inMemoryDb.wallets.find((w) => w.id === mainWalletId)!;
    wallet.balance = 1000n; // Only ₦10.00

    await expect(
      service.purchaseExamPin({
        businessId: testBizId,
        userId: testUserId,
        packageCode: 'JAMB_DIRECT_ENTRY',
        candidateId: '1029384756',
        quantity: 1,
      }),
    ).rejects.toThrow();
  });

  it('prevents duplicate PIN vend on replay via IdempotencyKey', async () => {
    const idempotencyKey = 'idem_exam_test_key_001';

    const firstReceipt = await service.purchaseExamPin({
      businessId: testBizId,
      userId: testUserId,
      packageCode: 'WAEC_RESULT_CHECKER',
      candidateId: '08123456789',
      idempotencyKey,
    });

    const secondReceipt = await service.purchaseExamPin({
      businessId: testBizId,
      userId: testUserId,
      packageCode: 'WAEC_RESULT_CHECKER',
      candidateId: '08123456789',
      idempotencyKey,
    });

    expect(secondReceipt.transactionId).toBe(firstReceipt.transactionId);
    expect(secondReceipt.pins[0]?.pin).toBe(firstReceipt.pins[0]?.pin);
  });

  it('retrieves paginated transaction history for business', async () => {
    await service.purchaseExamPin({
      businessId: testBizId,
      userId: testUserId,
      packageCode: 'NECO_RESULT_TOKEN',
      candidateId: '09012345678',
    });

    const history = await service.getEducationHistory(testBizId, 10, 0);
    expect(history.transactions.length).toBeGreaterThanOrEqual(1);
    expect(history.transactions[0]?.examBody).toBe(ExamBody.NECO);
  });
});

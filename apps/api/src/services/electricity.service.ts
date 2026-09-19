import {
  DiscoCode,
  ElectricityMeterType,
  ServiceType,
  TransactionStatus,
  LedgerDirection,
  LedgerEntryType,
  WalletType,
  generateInterswitchReference,
  generateTransactionReference,
  ValidationError,
  NotFoundError,
  AppError,
  koboToNaira,
  formatNairaFromKobo,
  WebhookEventType,
} from '@baxato/common';
import {
  db,
  serviceTransactions,
  wallets,
  eq,
  and,
  desc,
} from '@baxato/database';
import { walletService } from './wallet.service';
import { ledgerService } from './ledger.service';
import { idempotencyService } from './idempotency.service';
import { webhookDispatcherService } from './webhook-dispatcher.service';
import {
  providerRouterService,
  ProviderRouterService,
} from './providers';

export interface DiscoInfo {
  code: DiscoCode;
  name: string;
  shortName: string;
  coverageRegion: string;
  prepaidPaymentCode: string;
  postpaidPaymentCode?: string;
  monnifyPrepaidCode: string;
  monnifyPostpaidCode?: string;
  discountBps: number; // 120 = 1.2%
  minKobo: bigint;     // 50,000 Kobo = ₦500
  maxKobo: bigint;     // 10,000,000 Kobo = ₦100,000
}

export const DISCO_CONFIGS: Record<DiscoCode, DiscoInfo> = {
  [DiscoCode.IBEDC]: {
    code: DiscoCode.IBEDC,
    name: 'Ibadan Electricity Distribution Co.',
    shortName: 'IBEDC',
    coverageRegion: 'Oyo, Ogun, Osun, Kwara, parts of Niger/Kogi',
    prepaidPaymentCode: '053413501',
    postpaidPaymentCode: '053413401',
    monnifyPrepaidCode: 'IBEDC_PREPAID',
    monnifyPostpaidCode: 'IBEDC_POSTPAID',
    discountBps: 120,
    minKobo: 50000n,
    maxKobo: 10000000n,
  },
  [DiscoCode.IKEDC]: {
    code: DiscoCode.IKEDC,
    name: 'Ikeja Electric',
    shortName: 'IKEDC',
    coverageRegion: 'Lagos Mainland, Ikorodu, Ikeja, Oshodi',
    prepaidPaymentCode: '053396201',
    postpaidPaymentCode: '053396301',
    monnifyPrepaidCode: 'IKEDC_PREPAID',
    monnifyPostpaidCode: 'IKEDC_POSTPAID',
    discountBps: 120,
    minKobo: 50000n,
    maxKobo: 10000000n,
  },
  [DiscoCode.EKEDC]: {
    code: DiscoCode.EKEDC,
    name: 'Eko Electricity Distribution Co.',
    shortName: 'EKEDC',
    coverageRegion: 'Lagos Island, Lekki, Victoria Island, Apapa, Festac',
    prepaidPaymentCode: '053396401',
    postpaidPaymentCode: '053396501',
    monnifyPrepaidCode: 'EKEDC_PREPAID',
    monnifyPostpaidCode: 'EKEDC_POSTPAID',
    discountBps: 120,
    minKobo: 50000n,
    maxKobo: 10000000n,
  },
  [DiscoCode.AEDC]: {
    code: DiscoCode.AEDC,
    name: 'Abuja Electricity Distribution Co.',
    shortName: 'AEDC',
    coverageRegion: 'FCT Abuja, Nasarawa, Kogi, Niger',
    prepaidPaymentCode: '053394801',
    postpaidPaymentCode: '053394901',
    monnifyPrepaidCode: 'AEDC_PREPAID',
    monnifyPostpaidCode: 'AEDC_POSTPAID',
    discountBps: 120,
    minKobo: 50000n,
    maxKobo: 10000000n,
  },
  [DiscoCode.EEDC]: {
    code: DiscoCode.EEDC,
    name: 'Enugu Electricity Distribution Co.',
    shortName: 'EEDC',
    coverageRegion: 'Enugu, Abia, Imo, Anambra, Ebonyi',
    prepaidPaymentCode: '053395101',
    postpaidPaymentCode: '0578501',
    monnifyPrepaidCode: 'EEDC_PREPAID',
    monnifyPostpaidCode: 'EEDC_POSTPAID',
    discountBps: 120,
    minKobo: 50000n,
    maxKobo: 10000000n,
  },
  [DiscoCode.KEDCO]: {
    code: DiscoCode.KEDCO,
    name: 'Kano Electricity Distribution Co.',
    shortName: 'KEDCO',
    coverageRegion: 'Kano, Katsina, Jigawa',
    prepaidPaymentCode: '053396701',
    postpaidPaymentCode: '053396801',
    monnifyPrepaidCode: 'KEDCO_PREPAID',
    monnifyPostpaidCode: 'KEDCO_POSTPAID',
    discountBps: 120,
    minKobo: 50000n,
    maxKobo: 10000000n,
  },
  [DiscoCode.JED]: {
    code: DiscoCode.JED,
    name: 'Jos Electricity Distribution Co.',
    shortName: 'JED',
    coverageRegion: 'Plateau, Bauchi, Benue, Gombe',
    prepaidPaymentCode: '053396101',
    postpaidPaymentCode: '053396001',
    monnifyPrepaidCode: 'JED_PREPAID',
    monnifyPostpaidCode: 'JED_POSTPAID',
    discountBps: 120,
    minKobo: 50000n,
    maxKobo: 10000000n,
  },
  [DiscoCode.PHED]: {
    code: DiscoCode.PHED,
    name: 'Port Harcourt Electricity Distribution Co.',
    shortName: 'PHED',
    coverageRegion: 'Rivers, Bayelsa, Cross River, Akwa Ibom',
    prepaidPaymentCode: '053394401',
    postpaidPaymentCode: '0586001',
    monnifyPrepaidCode: 'PHED_PREPAID',
    monnifyPostpaidCode: 'PHED_POSTPAID',
    discountBps: 120,
    minKobo: 50000n,
    maxKobo: 10000000n,
  },
  [DiscoCode.BEDC]: {
    code: DiscoCode.BEDC,
    name: 'Benin Electricity Distribution Co.',
    shortName: 'BEDC',
    coverageRegion: 'Edo, Delta, Ondo, Ekiti',
    prepaidPaymentCode: '0576701',
    postpaidPaymentCode: '0564601',
    monnifyPrepaidCode: 'BEDC_PREPAID',
    monnifyPostpaidCode: 'BEDC_POSTPAID',
    discountBps: 120,
    minKobo: 50000n,
    maxKobo: 10000000n,
  },
  [DiscoCode.KAEDCO]: {
    code: DiscoCode.KAEDCO,
    name: 'Kaduna Electric',
    shortName: 'KAEDCO',
    coverageRegion: 'Kaduna, Sokoto, Kebbi, Zamfara',
    prepaidPaymentCode: '053394501',
    postpaidPaymentCode: '053394601',
    monnifyPrepaidCode: 'KAEDCO_PREPAID',
    monnifyPostpaidCode: 'KAEDCO_POSTPAID',
    discountBps: 120,
    minKobo: 50000n,
    maxKobo: 10000000n,
  },
  [DiscoCode.YEDC]: {
    code: DiscoCode.YEDC,
    name: 'Yola Electricity Distribution Co.',
    shortName: 'YEDC',
    coverageRegion: 'Adamawa, Borno, Taraba, Yobe',
    prepaidPaymentCode: '053406301',
    postpaidPaymentCode: '053406401',
    monnifyPrepaidCode: 'YEDC_PREPAID',
    monnifyPostpaidCode: 'YEDC_POSTPAID',
    discountBps: 120,
    minKobo: 50000n,
    maxKobo: 10000000n,
  },
  [DiscoCode.APLE]: {
    code: DiscoCode.APLE,
    name: 'Aba Power Electric',
    shortName: 'APLE',
    coverageRegion: 'Aba, Abia State Ring-fence Area',
    prepaidPaymentCode: '053403501',
    postpaidPaymentCode: '053403401',
    monnifyPrepaidCode: 'APLE_PREPAID',
    monnifyPostpaidCode: 'APLE_POSTPAID',
    discountBps: 120,
    minKobo: 50000n,
    maxKobo: 10000000n,
  },
};

export interface ElectricityValidationDto {
  isValid: boolean;
  meterNumber: string;
  disco: DiscoCode;
  discoName: string;
  meterType: ElectricityMeterType;
  customerName?: string;
  customerAddress?: string;
  accountNumber?: string;
  feeder?: string;
  tariff?: string;
  outstandingBalanceKobo?: string;
  outstandingBalanceNaira?: number;
  minimumAmountKobo: string;
  minimumAmountNaira: number;
  responseCode: string;
  responseMessage: string;
}

export interface PurchaseElectricityInput {
  businessId: string;
  userId: string;
  disco: DiscoCode;
  meterNumber: string;
  meterType: ElectricityMeterType;
  amountKobo: bigint;
  customerMobile?: string;
  customerName?: string;
  clientReference?: string;
  idempotencyKey?: string;
}

export interface ElectricityReceiptDto {
  transactionId: string;
  status: TransactionStatus;
  disco: DiscoCode;
  discoName: string;
  meterNumber: string;
  meterType: ElectricityMeterType;
  customerName?: string;
  customerAddress?: string;
  token?: string;            // 20-digit STS PIN for Prepaid (e.g. 1817 3728 1779 9724 2246)
  units?: string;            // e.g. 14.3 kWh
  unitsCostKobo?: string;    // e.g. 46512
  unitsCostNaira?: number;   // e.g. 465.12
  vatKobo?: string;          // e.g. 3488
  vatNaira?: number;         // e.g. 34.88
  tariff?: string;           // e.g. R2
  feeder?: string;           // e.g. ELEWERAN 33KV FEEDER
  faceAmountKobo: string;
  faceAmountNaira: number;
  formattedFaceAmount: string;
  discountKobo: string;
  discountNaira: number;
  formattedDiscount: string;
  amountDebitedKobo: string;
  amountDebitedNaira: number;
  formattedAmountDebited: string;
  reference: string;
  clientReference?: string;
  providerReference?: string;
  providerName: string;
  createdAt: Date;
}

export class ElectricityService {
  private readonly router: ProviderRouterService;

  constructor(router: ProviderRouterService = providerRouterService) {
    this.router = router;
  }

  /**
   * Normalizes meter number by stripping non-digit characters.
   */
  public normalizeMeterNumber(meterNumber: string): string {
    const clean = meterNumber.replace(/[\s\-()]/g, '');

    if (!/^\d{9,14}$/.test(clean)) {
      throw new ValidationError(
        `Invalid meter number format: '${meterNumber}'. Must be between 9 and 14 numeric digits.`,
      );
    }

    return clean;
  }

  /**
   * Formats a 20-digit STS PIN token into 4-digit groups (XXXX XXXX XXXX XXXX XXXX).
   */
  public formatStsToken(token: string): string {
    const clean = token.replace(/[\s\-]/g, '');
    if (clean.length === 20) {
      return clean.match(/.{1,4}/g)?.join(' ') || clean;
    }
    return token;
  }

  /**
   * Retrieves list of all supported DISCOs.
   */
  public getDiscos() {
    return Object.values(DISCO_CONFIGS).map((d) => ({
      code: d.code,
      name: d.name,
      shortName: d.shortName,
      coverageRegion: d.coverageRegion,
      supportsPrepaid: !!d.prepaidPaymentCode,
      supportsPostpaid: !!d.postpaidPaymentCode,
      discountBps: d.discountBps,
      discountPercent: (d.discountBps / 100).toFixed(1) + '%',
      minimumAmountKobo: d.minKobo.toString(),
      minimumAmountNaira: koboToNaira(d.minKobo),
      maximumAmountKobo: d.maxKobo.toString(),
      maximumAmountNaira: koboToNaira(d.maxKobo),
    }));
  }

  /**
   * Resolves payment code for a DISCO and meter type.
   */
  public getPaymentCode(disco: DiscoCode, meterType: ElectricityMeterType): string {
    const config = DISCO_CONFIGS[disco];
    if (!config) {
      throw new ValidationError(`Unsupported electricity distribution company: '${disco}'.`);
    }

    if (meterType === ElectricityMeterType.PREPAID) {
      return config.prepaidPaymentCode;
    }

    if (!config.postpaidPaymentCode) {
      throw new ValidationError(`${config.name} does not support postpaid meter payments.`);
    }

    return config.postpaidPaymentCode;
  }

  /**
   * Real-time Customer & Meter Validation:
   * Queries provider gateway to confirm consumer identity, address, meter validity, and balance.
   */
  public async validateMeter(input: {
    disco: DiscoCode;
    meterNumber: string;
    meterType: ElectricityMeterType;
    amountKobo?: bigint;
  }): Promise<ElectricityValidationDto> {
    const cleanMeter = this.normalizeMeterNumber(input.meterNumber);
    const config = DISCO_CONFIGS[input.disco];
    if (!config) {
      throw new ValidationError(`Unsupported DISCO: '${input.disco}'.`);
    }

    const paymentCode = this.getPaymentCode(input.disco, input.meterType);

    try {
      const result = await this.router.validateCustomer({
        serviceType: ServiceType.ELECTRICITY,
        paymentCode,
        customerId: cleanMeter,
        amountKobo: input.amountKobo,
      });

      return {
        isValid: result.isValid,
        meterNumber: cleanMeter,
        disco: input.disco,
        discoName: config.name,
        meterType: input.meterType,
        customerName: result.customerName || undefined,
        customerAddress: result.customerAddress || undefined,
        accountNumber: cleanMeter,
        outstandingBalanceKobo: result.outstandingBalanceKobo
          ? result.outstandingBalanceKobo.toString()
          : undefined,
        outstandingBalanceNaira: result.outstandingBalanceKobo
          ? koboToNaira(result.outstandingBalanceKobo)
          : undefined,
        minimumAmountKobo: config.minKobo.toString(),
        minimumAmountNaira: koboToNaira(config.minKobo),
        responseCode: result.responseCode,
        responseMessage: result.responseMessage,
      };
    } catch (err) {
      return {
        isValid: false,
        meterNumber: cleanMeter,
        disco: input.disco,
        discoName: config.name,
        meterType: input.meterType,
        minimumAmountKobo: config.minKobo.toString(),
        minimumAmountNaira: koboToNaira(config.minKobo),
        responseCode: 'VALIDATION_FAILED',
        responseMessage: (err as Error).message || 'Meter verification failed.',
      };
    }
  }

  /**
   * End-to-end Electricity Token Vending / Bill Payment:
   * 1. Meter & Amount Range Validation (min ₦500, max ₦100,000)
   * 2. Idempotency Lock Check
   * 3. Concurrency-safe Wallet Balance Debit (with 1.2% merchant discount)
   * 4. Multi-provider Vending with Automatic Failover
   * 5. 20-digit STS PIN Token Extraction, Energy Units & VAT Breakdown
   * 6. Double-Entry Ledger Commitment (Zero-Sum Invariant)
   * 7. Automatic Rollback & Refund if provider vending fails
   */
  public async purchaseElectricity(input: PurchaseElectricityInput): Promise<ElectricityReceiptDto> {
    const cleanMeter = this.normalizeMeterNumber(input.meterNumber);
    const config = DISCO_CONFIGS[input.disco];
    if (!config) {
      throw new ValidationError(`Unsupported DISCO: '${input.disco}'.`);
    }

    if (input.amountKobo < config.minKobo) {
      throw new ValidationError(
        `Minimum electricity purchase amount for ${config.name} is ${formatNairaFromKobo(config.minKobo)}. Got ${formatNairaFromKobo(input.amountKobo)}.`,
      );
    }

    if (input.amountKobo > config.maxKobo) {
      throw new ValidationError(
        `Maximum electricity purchase amount for ${config.name} is ${formatNairaFromKobo(config.maxKobo)}. Got ${formatNairaFromKobo(input.amountKobo)}.`,
      );
    }

    const paymentCode = this.getPaymentCode(input.disco, input.meterType);

    // 1. Check Idempotency Lock
    if (input.idempotencyKey) {
      const lock = await idempotencyService.acquireLock(
        input.idempotencyKey,
        input.businessId,
        `ELEC_${input.disco}_${cleanMeter}_${input.amountKobo.toString()}`,
      );

      if (lock.isCompleted && lock.responseBody) {
        return lock.responseBody as ElectricityReceiptDto;
      }
    }

    // 2. Compute Pricing & Merchant Discount
    const faceAmountKobo = input.amountKobo;
    const discountKobo = (faceAmountKobo * BigInt(config.discountBps)) / 10000n;
    const amountToDebitKobo = faceAmountKobo - discountKobo;

    // 3. Resolve Business Wallets
    const mainWallet = await walletService.getBusinessWallet(input.businessId, WalletType.MAIN);
    const balanceBeforeKobo = BigInt(mainWallet.balanceKobo);

    // Concurrency-safe wallet debit (locks and decrements balance)
    await walletService.debitWallet(mainWallet.id, amountToDebitKobo);
    const balanceAfterKobo = balanceBeforeKobo - amountToDebitKobo;

    // 4. Generate references & initialize service transaction row
    const requestReference = generateInterswitchReference('2411', 12);
    const clientRef = input.clientReference || generateTransactionReference('ELEC');

    const [txnRow] = await db
      .insert(serviceTransactions)
      .values({
        businessId: input.businessId,
        userId: input.userId,
        serviceType: ServiceType.ELECTRICITY,
        amount: faceAmountKobo,
        fee: 0n,
        discount: discountKobo,
        totalAmount: amountToDebitKobo,
        status: TransactionStatus.PROCESSING,
        recipient: cleanMeter,
        providerName: 'MONNIFY' as any,
        clientReference: clientRef,
        requestReference,
        metadata: {
          disco: input.disco,
          discoName: config.name,
          meterType: input.meterType,
          customerName: input.customerName || null,
          customerMobile: input.customerMobile || null,
          faceAmountKobo: faceAmountKobo.toString(),
          discountKobo: discountKobo.toString(),
          amountToDebitKobo: amountToDebitKobo.toString(),
        },
      })
      .returning();

    if (!txnRow) {
      throw new Error('Failed to create transaction record');
    }

    // 5. Dispatch to Multi-Provider Router (with circuit breaker & failover)
    try {
      const vendResult = await this.router.vendService(
        {
          serviceType: ServiceType.ELECTRICITY,
          paymentCode,
          customerId: cleanMeter,
          customerMobile: input.customerMobile,
          amountKobo: faceAmountKobo,
          requestReference,
        },
        txnRow.id,
      );

      if (vendResult.status !== TransactionStatus.SUCCESSFUL) {
        throw new AppError(
          `Electricity vending failed with response code ${vendResult.responseCode}: ${vendResult.responseMessage}`,
          502,
          'PROVIDER_VEND_FAILED',
        );
      }

      // Format 20-digit STS PIN token for prepaid meters
      const rawToken = vendResult.token || vendResult.pinData?.pin;
      const formattedToken = rawToken ? this.formatStsToken(rawToken) : undefined;

      // 6. Update transaction to SUCCESSFUL with token and provider details
      await db
        .update(serviceTransactions)
        .set({
          status: TransactionStatus.SUCCESSFUL,
          providerName: vendResult.providerName,
          providerReference: vendResult.providerReference || requestReference,
          metadata: {
            disco: input.disco,
            discoName: config.name,
            meterType: input.meterType,
            token: formattedToken,
            units: vendResult.units,
            tariff: vendResult.tariff,
            feeder: vendResult.feeder,
            customerName: input.customerName || vendResult.customerName,
            customerAddress: vendResult.customerAddress,
            unitsCostKobo: vendResult.unitsCostKobo?.toString(),
            vatKobo: vendResult.vatKobo?.toString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(serviceTransactions.id, txnRow.id));

      // 7. Post balanced Zero-Sum Financial Ledger entry
      await ledgerService.recordDoubleEntry({
        businessId: input.businessId,
        reference: clientRef,
        type: LedgerEntryType.SERVICE_PAYMENT,
        category: 'ELECTRICITY_PURCHASE',
        description: `Electricity purchase: ${formatNairaFromKobo(faceAmountKobo)} for ${config.name} (${input.meterType}) meter ${cleanMeter}`,
        transactionId: txnRow.id,
        debit: {
          walletId: mainWallet.id,
          amountKobo: amountToDebitKobo,
          balanceBeforeKobo,
          balanceAfterKobo,
        },
        credit: {
          walletId: mainWallet.id, // Platform clearing balance
          amountKobo: amountToDebitKobo,
          balanceBeforeKobo: 0n,
          balanceAfterKobo: amountToDebitKobo,
        },
      });

      const receipt: ElectricityReceiptDto = {
        transactionId: txnRow.id,
        status: TransactionStatus.SUCCESSFUL,
        disco: input.disco,
        discoName: config.name,
        meterNumber: cleanMeter,
        meterType: input.meterType,
        customerName: input.customerName || vendResult.customerName,
        customerAddress: vendResult.customerAddress,
        token: formattedToken,
        units: vendResult.units,
        unitsCostKobo: vendResult.unitsCostKobo ? vendResult.unitsCostKobo.toString() : undefined,
        unitsCostNaira: vendResult.unitsCostKobo ? koboToNaira(vendResult.unitsCostKobo) : undefined,
        vatKobo: vendResult.vatKobo ? vendResult.vatKobo.toString() : undefined,
        vatNaira: vendResult.vatKobo ? koboToNaira(vendResult.vatKobo) : undefined,
        tariff: vendResult.tariff,
        feeder: vendResult.feeder,
        faceAmountKobo: faceAmountKobo.toString(),
        faceAmountNaira: koboToNaira(faceAmountKobo),
        formattedFaceAmount: formatNairaFromKobo(faceAmountKobo),
        discountKobo: discountKobo.toString(),
        discountNaira: koboToNaira(discountKobo),
        formattedDiscount: formatNairaFromKobo(discountKobo),
        amountDebitedKobo: amountToDebitKobo.toString(),
        amountDebitedNaira: koboToNaira(amountToDebitKobo),
        formattedAmountDebited: formatNairaFromKobo(amountToDebitKobo),
        reference: requestReference,
        clientReference: clientRef,
        providerReference: vendResult.providerReference,
        providerName: vendResult.providerName,
        createdAt: new Date(),
      };

      // Save idempotency response if key provided
      if (input.idempotencyKey) {
        await idempotencyService.completeLock(input.idempotencyKey, input.businessId, 201, receipt);
      }

      // Outbound Webhook Dispatch (fire-and-forget / non-blocking)
      webhookDispatcherService
        .dispatch(input.businessId, WebhookEventType.TRANSACTION_SUCCESSFUL, receipt)
        .catch((err) => {
          console.error('[ElectricityService] Webhook dispatch failed:', err);
        });

      return receipt;
    } catch (error) {
      // 8. Unrecoverable Failure: Rollback wallet deduction & record reversal
      await walletService.creditWallet(mainWallet.id, amountToDebitKobo);

      await db
        .update(serviceTransactions)
        .set({
          status: TransactionStatus.FAILED,
          errorMessage: (error as Error).message,
          updatedAt: new Date(),
        })
        .where(eq(serviceTransactions.id, txnRow.id));

      if (input.idempotencyKey) {
        await idempotencyService.releaseLock(input.idempotencyKey, input.businessId);
      }

      // Outbound Webhook Dispatch for Failure (fire-and-forget / non-blocking)
      webhookDispatcherService
        .dispatch(input.businessId, WebhookEventType.TRANSACTION_FAILED, {
          transactionId: txnRow.id,
          status: TransactionStatus.FAILED,
          serviceType: ServiceType.ELECTRICITY,
          errorMessage: (error as Error).message,
          meterNumber: cleanMeter,
          disco: input.disco,
          reference: requestReference,
          clientReference: clientRef,
          timestamp: new Date().toISOString(),
        })
        .catch((err) => {
          console.error('[ElectricityService] Failure webhook dispatch failed:', err);
        });

      throw error;
    }
  }

  /**
   * Retrieves paginated Electricity transaction history for a business tenant.
   */
  public async getElectricityHistory(
    businessId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ transactions: ElectricityReceiptDto[]; total: number }> {
    const rows = await db
      .select()
      .from(serviceTransactions)
      .where(
        and(
          eq(serviceTransactions.businessId, businessId),
          eq(serviceTransactions.serviceType, ServiceType.ELECTRICITY),
        ),
      )
      .orderBy(desc(serviceTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    const transactions: ElectricityReceiptDto[] = rows.map((r) => {
      const meta = (r.metadata || {}) as Record<string, string>;
      const disco = (meta.disco || DiscoCode.IBEDC) as DiscoCode;
      const config = DISCO_CONFIGS[disco] || DISCO_CONFIGS[DiscoCode.IBEDC];
      const meterType = (meta.meterType || ElectricityMeterType.PREPAID) as ElectricityMeterType;

      return {
        transactionId: r.id,
        status: r.status as TransactionStatus,
        disco,
        discoName: config.name,
        meterNumber: r.recipient,
        meterType,
        customerName: meta.customerName || undefined,
        customerAddress: meta.customerAddress || undefined,
        token: meta.token || undefined,
        units: meta.units || undefined,
        unitsCostKobo: meta.unitsCostKobo || undefined,
        unitsCostNaira: meta.unitsCostKobo ? koboToNaira(BigInt(meta.unitsCostKobo)) : undefined,
        vatKobo: meta.vatKobo || undefined,
        vatNaira: meta.vatKobo ? koboToNaira(BigInt(meta.vatKobo)) : undefined,
        tariff: meta.tariff || undefined,
        feeder: meta.feeder || undefined,
        faceAmountKobo: r.amount.toString(),
        faceAmountNaira: koboToNaira(r.amount),
        formattedFaceAmount: formatNairaFromKobo(r.amount),
        discountKobo: r.discount.toString(),
        discountNaira: koboToNaira(r.discount),
        formattedDiscount: formatNairaFromKobo(r.discount),
        amountDebitedKobo: r.totalAmount.toString(),
        amountDebitedNaira: koboToNaira(r.totalAmount),
        formattedAmountDebited: formatNairaFromKobo(r.totalAmount),
        reference: r.requestReference || r.id,
        clientReference: r.clientReference || undefined,
        providerReference: r.providerReference || undefined,
        providerName: r.providerName,
        createdAt: r.createdAt,
      };
    });

    return {
      transactions,
      total: transactions.length,
    };
  }
}

export const electricityService = new ElectricityService();

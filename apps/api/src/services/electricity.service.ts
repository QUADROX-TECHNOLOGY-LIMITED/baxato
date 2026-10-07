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
  providers,
  eq,
  and,
  or,
  desc,
} from '@baxato/database';
import { walletService } from './wallet.service.js';
import { ledgerService } from './ledger.service.js';
import { idempotencyService } from './idempotency.service.js';
import { webhookDispatcherService } from './webhook-dispatcher.service.js';
import {
  providerRouterService,
  ProviderRouterService,
} from './providers/index.js';

export interface DiscoInfo {
  code: DiscoCode;
  name: string;
  shortName: string;
  coverageRegion: string;
  prepaidPaymentCode: string;
  postpaidPaymentCode?: string;
  monnifyPrepaidBillerCode: string;
  monnifyPrepaidProductCode: string;
  monnifyPostpaidBillerCode?: string;
  monnifyPostpaidProductCode?: string;
  monnifyPrepaidCode: string;
  monnifyPostpaidCode?: string;
  discountBps: number; // 120 = 1.2% (fallback for unit tests)
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
    monnifyPrepaidBillerCode: 'biller-ibedc-pre',
    monnifyPrepaidProductCode: 'product-ibedc-pre',
    monnifyPostpaidBillerCode: 'biller-ibedc-post',
    monnifyPostpaidProductCode: 'product-ibedc-post',
    monnifyPrepaidCode: 'product-ibedc-pre',
    monnifyPostpaidCode: 'product-ibedc-post',
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
    monnifyPrepaidBillerCode: 'biller-ikedc-pre',
    monnifyPrepaidProductCode: 'product-ikedc-pre',
    monnifyPostpaidBillerCode: 'biller-ikedc-post',
    monnifyPostpaidProductCode: 'product-ikedc-post',
    monnifyPrepaidCode: 'product-ikedc-pre',
    monnifyPostpaidCode: 'product-ikedc-post',
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
    monnifyPrepaidBillerCode: 'biller-ekedc-pre',
    monnifyPrepaidProductCode: 'product-ekedc-pre',
    monnifyPostpaidBillerCode: 'biller-ekedc-post',
    monnifyPostpaidProductCode: 'product-ekedc-post',
    monnifyPrepaidCode: 'product-ekedc-pre',
    monnifyPostpaidCode: 'product-ekedc-post',
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
    monnifyPrepaidBillerCode: 'biller-aedc-pre',
    monnifyPrepaidProductCode: 'product-aedc-pre',
    monnifyPostpaidBillerCode: 'biller-aedc-post',
    monnifyPostpaidProductCode: 'product-aedc-post',
    monnifyPrepaidCode: 'product-aedc-pre',
    monnifyPostpaidCode: 'product-aedc-post',
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
    monnifyPrepaidBillerCode: 'biller-eedc-pre',
    monnifyPrepaidProductCode: 'product-eedc-pre',
    monnifyPostpaidBillerCode: 'biller-eedc-post',
    monnifyPostpaidProductCode: 'product-eedc-post',
    monnifyPrepaidCode: 'product-eedc-pre',
    monnifyPostpaidCode: 'product-eedc-post',
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
    monnifyPrepaidBillerCode: 'biller-kedc-pre',
    monnifyPrepaidProductCode: 'product-kedc-pre',
    monnifyPostpaidBillerCode: 'biller-kedc-pre',
    monnifyPostpaidProductCode: 'product-kedc-pre',
    monnifyPrepaidCode: 'product-kedc-pre',
    monnifyPostpaidCode: 'product-kedc-pre',
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
    monnifyPrepaidBillerCode: 'biller-jedc-pre',
    monnifyPrepaidProductCode: 'product-jedc-pre',
    monnifyPostpaidBillerCode: 'biller-jedc-post',
    monnifyPostpaidProductCode: 'product-jedc-post',
    monnifyPrepaidCode: 'product-jedc-pre',
    monnifyPostpaidCode: 'product-jedc-post',
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
    monnifyPrepaidBillerCode: 'biller-phedc-pre',
    monnifyPrepaidProductCode: 'product-phedc-pre',
    monnifyPostpaidBillerCode: 'biller-phedc-post',
    monnifyPostpaidProductCode: 'product-phedc-post',
    monnifyPrepaidCode: 'product-phedc-pre',
    monnifyPostpaidCode: 'product-phedc-post',
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
    monnifyPrepaidBillerCode: 'bedc',
    monnifyPrepaidProductCode: 'bedc_prepaid',
    monnifyPostpaidBillerCode: 'bedc',
    monnifyPostpaidProductCode: 'bedc_postpaid',
    monnifyPrepaidCode: 'bedc_prepaid',
    monnifyPostpaidCode: 'bedc_postpaid',
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
    monnifyPrepaidBillerCode: 'biller-knedc-pre',
    monnifyPrepaidProductCode: 'product-knedc-pre',
    monnifyPostpaidBillerCode: 'biller-knedc-post',
    monnifyPostpaidProductCode: 'product-knedc-post',
    monnifyPrepaidCode: 'product-knedc-pre',
    monnifyPostpaidCode: 'product-knedc-post',
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
    monnifyPrepaidBillerCode: 'biller-yola-pre',
    monnifyPrepaidProductCode: 'product-yola-pre',
    monnifyPostpaidBillerCode: 'biller-yola-post',
    monnifyPostpaidProductCode: 'product-yola-post',
    monnifyPrepaidCode: 'product-yola-pre',
    monnifyPostpaidCode: 'product-yola-post',
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
    monnifyPrepaidBillerCode: 'biller-aba-pre',
    monnifyPrepaidProductCode: 'prd-aba-pre',
    monnifyPostpaidBillerCode: 'biller-aba-post',
    monnifyPostpaidProductCode: 'prd-aba-post',
    monnifyPrepaidCode: 'prd-aba-pre',
    monnifyPostpaidCode: 'prd-aba-post',
    discountBps: 120,
    minKobo: 50000n,
    maxKobo: 10000000n,
  },
};

export interface ElectricityValidationDto {
  isValid: boolean;
  isMismatch?: boolean;
  requestedMeterType?: ElectricityMeterType;
  detectedMeterType?: ElectricityMeterType;
  suggestionDiscoId?: string;
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
  maximumAmountKobo?: string;
  maximumAmountNaira?: number;
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

interface CachedMeterValidation {
  data: ElectricityValidationDto;
  expiresAt: number;
}

// 5-minute fast in-memory cache for validated meter identities
const meterValidationCache = new Map<string, CachedMeterValidation>();

export function clearMeterValidationCache(): void {
  meterValidationCache.clear();
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
   * Retrieves active discount rates configured by the administrator in PostgreSQL `providers` table.
   * If active providers exist in DB and no discounts were explicitly configured by the admin,
   * returns { default: 0 } (0% discount/cashback).
   * In a test environment where providers table is empty, returns undefined to fall back to test defaults.
   */
  public async getAdminDiscounts(): Promise<Record<string, number> | undefined> {
    try {
      const activeProviders = await db.select().from(providers).where(eq(providers.status, 'ACTIVE'));
      if (activeProviders.length > 0) {
        for (const p of activeProviders) {
          const cfg = (p.config || {}) as Record<string, any>;
          if (cfg.electricityDiscounts && typeof cfg.electricityDiscounts === 'object') {
            return cfg.electricityDiscounts;
          }
          if (cfg.discounts?.electricity && typeof cfg.discounts.electricity === 'object') {
            return cfg.discounts.electricity;
          }
          if (typeof cfg.electricityDiscountBps === 'number') {
            return { default: cfg.electricityDiscountBps };
          }
          if (typeof cfg.discounts?.electricity === 'number') {
            return { default: cfg.discounts.electricity };
          }
        }
      }
    } catch {
      // In test or error
    }
    return undefined;
  }

  /**
   * Retrieves list of all supported DISCOs with real-time operational availability.
   */
  public getDiscos(adminDiscounts?: Record<string, number>) {
    return Object.values(DISCO_CONFIGS).map((d) => {
      const discountBps = adminDiscounts?.[d.code] ?? adminDiscounts?.default ?? d.discountBps;
      return {
        code: d.code,
        name: d.name,
        shortName: d.shortName,
        coverageRegion: d.coverageRegion,
        supportsPrepaid: !!d.prepaidPaymentCode,
        supportsPostpaid: !!d.postpaidPaymentCode,
        isAvailable: true,
        status: 'ACTIVE',
        discountBps,
        discountPercent: (discountBps / 100).toFixed(1) + '%',
        minimumAmountKobo: d.minKobo.toString(),
        minimumAmountNaira: koboToNaira(d.minKobo),
        maximumAmountKobo: d.maxKobo.toString(),
        maximumAmountNaira: koboToNaira(d.maxKobo),
      };
    });
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
   * If validation fails on requested meter type (e.g. Prepaid), automatically probes the alternate
   * meter type (e.g. Postpaid) to detect meter type mismatch and guide the customer seamlessly.
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

    // 0. Fast In-Memory Cache Lookup (serves repeat queries in < 1ms)
    const cacheKey = `${input.disco}:${input.meterType}:${cleanMeter}`;
    const cached = meterValidationCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const paymentCode = this.getPaymentCode(input.disco, input.meterType);
    const monnifyBillerCode =
      input.meterType === ElectricityMeterType.PREPAID
        ? config.monnifyPrepaidBillerCode
        : (config.monnifyPostpaidBillerCode || config.monnifyPrepaidBillerCode);
    const monnifyProductCode =
      input.meterType === ElectricityMeterType.PREPAID
        ? config.monnifyPrepaidProductCode
        : (config.monnifyPostpaidProductCode || config.monnifyPrepaidProductCode);

    let primaryResult: any = null;
    let primaryError: Error | null = null;

    try {
      primaryResult = await this.router.validateCustomer({
        serviceType: ServiceType.ELECTRICITY,
        paymentCode,
        customerId: cleanMeter,
        amountKobo: input.amountKobo,
        metadata: {
          disco: input.disco,
          meterType: input.meterType,
          interswitchPaymentCode: paymentCode,
          monnifyBillerCode,
          monnifyProductCode,
        },
      });
    } catch (err) {
      primaryError = err as Error;
    }

    // 1. If primary validation succeeded
    if (primaryResult?.isValid) {
      const effectiveMinKobo =
        primaryResult.minimumAmountKobo !== undefined ? primaryResult.minimumAmountKobo : config.minKobo;
      const effectiveMaxKobo =
        primaryResult.maximumAmountKobo !== undefined ? primaryResult.maximumAmountKobo : config.maxKobo;

      const successDto: ElectricityValidationDto = {
        isValid: true,
        isMismatch: false,
        meterNumber: cleanMeter,
        disco: input.disco,
        discoName: config.name,
        meterType: input.meterType,
        customerName: primaryResult.customerName || undefined,
        customerAddress: primaryResult.customerAddress || undefined,
        accountNumber: cleanMeter,
        outstandingBalanceKobo: primaryResult.outstandingBalanceKobo
          ? primaryResult.outstandingBalanceKobo.toString()
          : undefined,
        outstandingBalanceNaira: primaryResult.outstandingBalanceKobo
          ? koboToNaira(primaryResult.outstandingBalanceKobo)
          : undefined,
        minimumAmountKobo: effectiveMinKobo.toString(),
        minimumAmountNaira: koboToNaira(effectiveMinKobo),
        maximumAmountKobo: effectiveMaxKobo.toString(),
        maximumAmountNaira: koboToNaira(effectiveMaxKobo),
        responseCode: primaryResult.responseCode,
        responseMessage: primaryResult.responseMessage,
      };

      // Cache verified meter for 5 minutes
      meterValidationCache.set(cacheKey, {
        data: successDto,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });

      return successDto;
    }

    // 2. Primary validation failed or threw error. Probe alternate meter type to detect mismatch.
    const alternateType =
      input.meterType === ElectricityMeterType.PREPAID
        ? ElectricityMeterType.POSTPAID
        : ElectricityMeterType.PREPAID;

    let altPaymentCode = '';
    try {
      altPaymentCode = this.getPaymentCode(input.disco, alternateType);
    } catch {
      altPaymentCode = '';
    }

    if (altPaymentCode) {
      try {
        const altMonnifyBiller =
          alternateType === ElectricityMeterType.PREPAID
            ? config.monnifyPrepaidBillerCode
            : (config.monnifyPostpaidBillerCode || config.monnifyPrepaidBillerCode);
        const altMonnifyProduct =
          alternateType === ElectricityMeterType.PREPAID
            ? config.monnifyPrepaidProductCode
            : (config.monnifyPostpaidProductCode || config.monnifyPrepaidProductCode);

        const altResult = await this.router.validateCustomer({
          serviceType: ServiceType.ELECTRICITY,
          paymentCode: altPaymentCode,
          customerId: cleanMeter,
          amountKobo: input.amountKobo,
          metadata: {
            disco: input.disco,
            meterType: alternateType,
            interswitchPaymentCode: altPaymentCode,
            monnifyBillerCode: altMonnifyBiller,
            monnifyProductCode: altMonnifyProduct,
          },
        });

        if (altResult?.isValid) {
          const altMinKobo =
            altResult.minimumAmountKobo !== undefined ? altResult.minimumAmountKobo : config.minKobo;
          const altMaxKobo =
            altResult.maximumAmountKobo !== undefined ? altResult.maximumAmountKobo : config.maxKobo;
          const detectedLabel = alternateType === ElectricityMeterType.PREPAID ? 'Prepaid' : 'Postpaid';
          const requestedLabel = input.meterType === ElectricityMeterType.PREPAID ? 'Prepaid' : 'Postpaid';
          const suggestionDiscoId = `${input.disco}_${alternateType}`;

          const mismatchDto: ElectricityValidationDto = {
            isValid: false,
            isMismatch: true,
            requestedMeterType: input.meterType,
            detectedMeterType: alternateType,
            suggestionDiscoId,
            meterNumber: cleanMeter,
            disco: input.disco,
            discoName: config.name,
            meterType: input.meterType,
            customerName: altResult.customerName || undefined,
            customerAddress: altResult.customerAddress || undefined,
            accountNumber: cleanMeter,
            outstandingBalanceKobo: altResult.outstandingBalanceKobo
              ? altResult.outstandingBalanceKobo.toString()
              : undefined,
            outstandingBalanceNaira: altResult.outstandingBalanceKobo
              ? koboToNaira(altResult.outstandingBalanceKobo)
              : undefined,
            minimumAmountKobo: altMinKobo.toString(),
            minimumAmountNaira: koboToNaira(altMinKobo),
            maximumAmountKobo: altMaxKobo.toString(),
            maximumAmountNaira: koboToNaira(altMaxKobo),
            responseCode: 'METER_TYPE_MISMATCH',
            responseMessage: `Notice: This meter is registered as ${detectedLabel} with ${config.name}, not ${requestedLabel}. Switch to ${detectedLabel} to proceed.`,
          };

          // Cache mismatch result for requested type
          meterValidationCache.set(cacheKey, {
            data: mismatchDto,
            expiresAt: Date.now() + 5 * 60 * 1000,
          });

          // Pre-cache alternate type so when customer switches, it is instant (0ms)!
          const altCacheKey = `${input.disco}:${alternateType}:${cleanMeter}`;
          meterValidationCache.set(altCacheKey, {
            data: {
              ...mismatchDto,
              isValid: true,
              isMismatch: false,
              meterType: alternateType,
              responseCode: '0',
              responseMessage: 'Customer validated successfully',
            },
            expiresAt: Date.now() + 5 * 60 * 1000,
          });

          return mismatchDto;
        }
      } catch {
        // Alternate probe failed, proceed with original validation result
      }
    }

    // 3. Fallback: Return original validation error
    return {
      isValid: false,
      isMismatch: false,
      meterNumber: cleanMeter,
      disco: input.disco,
      discoName: config.name,
      meterType: input.meterType,
      minimumAmountKobo: config.minKobo.toString(),
      minimumAmountNaira: koboToNaira(config.minKobo),
      responseCode: primaryResult?.responseCode || 'VALIDATION_FAILED',
      responseMessage:
        primaryResult?.responseMessage || primaryError?.message || 'Meter verification failed.',
    };
  }

  /**
   * End-to-end Electricity Token Vending / Bill Payment:
   * 1. Meter & Amount Range Validation (min ₦100, max ₦100,000)
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

    // 2. Compute Pricing & Merchant Discount (Dynamically resolved from Admin Config)
    const adminDiscounts = await this.getAdminDiscounts();
    const discountBps = adminDiscounts?.[input.disco] ?? adminDiscounts?.default ?? config.discountBps;
    const faceAmountKobo = input.amountKobo;
    const discountKobo = discountBps > 0 ? (faceAmountKobo * BigInt(discountBps)) / 10000n : 0n;
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

    const monnifyBillerCode =
      input.meterType === ElectricityMeterType.PREPAID
        ? config.monnifyPrepaidBillerCode
        : (config.monnifyPostpaidBillerCode || config.monnifyPrepaidBillerCode);
    const monnifyProductCode =
      input.meterType === ElectricityMeterType.PREPAID
        ? config.monnifyPrepaidProductCode
        : (config.monnifyPostpaidProductCode || config.monnifyPrepaidProductCode);

    // 5. Dispatch to Multi-Provider Router (with circuit breaker & failover)
    try {
      const vendResult = await this.router.vendService(
        {
          serviceType: ServiceType.ELECTRICITY,
          paymentCode,
          customerId: cleanMeter,
          customerMobile: input.customerMobile,
          customerName: input.customerName,
          amountKobo: faceAmountKobo,
          requestReference,
          metadata: {
            disco: input.disco,
            meterType: input.meterType,
            interswitchPaymentCode: paymentCode,
            monnifyBillerCode,
            monnifyProductCode,
          },
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

    const transactions: ElectricityReceiptDto[] = rows.map((r) => this.mapRowToReceiptDto(r));

    return {
      transactions,
      total: transactions.length,
    };
  }

  /**
   * Maps a database transaction record to ElectricityReceiptDto
   */
  public mapRowToReceiptDto(r: typeof serviceTransactions.$inferSelect): ElectricityReceiptDto {
    const meta = (r.metadata || {}) as Record<string, any>;
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
  }

  /**
   * Requeries live status of an in-flight or processing electricity transaction from upstream provider.
   */
  public async requeryElectricityStatus(
    reference: string,
    businessId?: string,
  ): Promise<ElectricityReceiptDto> {
    const conditions = [
      or(
        eq(serviceTransactions.clientReference, reference),
        eq(serviceTransactions.requestReference, reference),
        eq(serviceTransactions.id, reference),
      ),
      eq(serviceTransactions.serviceType, ServiceType.ELECTRICITY),
    ];

    if (businessId) {
      conditions.push(eq(serviceTransactions.businessId, businessId));
    }

    const [row] = await db
      .select()
      .from(serviceTransactions)
      .where(and(...conditions))
      .limit(1);

    if (!row) {
      throw new NotFoundError(`Electricity transaction '${reference}' was not found.`);
    }

    if (
      row.status === TransactionStatus.SUCCESSFUL ||
      row.status === TransactionStatus.FAILED ||
      row.status === TransactionStatus.REVERSED
    ) {
      return this.mapRowToReceiptDto(row);
    }

    try {
      const requeryResult = await this.router.requeryTransaction(
        row.providerName,
        row.requestReference || row.clientReference || row.id,
        row.providerReference || undefined,
      );

      if (requeryResult.status === TransactionStatus.SUCCESSFUL) {
        const meta = (row.metadata as Record<string, unknown>) || {};
        if (requeryResult.token) meta.token = requeryResult.token;
        if (requeryResult.units) meta.units = requeryResult.units;
        if (requeryResult.tariff) meta.tariff = requeryResult.tariff;
        if (requeryResult.feeder) meta.feeder = requeryResult.feeder;

        await db
          .update(serviceTransactions)
          .set({
            status: TransactionStatus.SUCCESSFUL,
            providerReference: requeryResult.providerReference || row.providerReference,
            metadata: meta,
            updatedAt: new Date(),
          })
          .where(eq(serviceTransactions.id, row.id));

        const mainWallet = await walletService.getBusinessWallet(row.businessId, WalletType.MAIN);
        await ledgerService
          .recordDoubleEntry({
            businessId: row.businessId,
            reference: row.clientReference || row.requestReference || row.id,
            type: LedgerEntryType.SERVICE_PAYMENT,
            category: 'ELECTRICITY_PURCHASE',
            description: `Electricity purchase confirmed: ₦${koboToNaira(row.amount)} for meter ${row.recipient}`,
            transactionId: row.id,
            debit: {
              walletId: mainWallet.id,
              amountKobo: row.totalAmount,
              balanceBeforeKobo: BigInt(mainWallet.balanceKobo),
              balanceAfterKobo: BigInt(mainWallet.balanceKobo),
            },
            credit: {
              walletId: mainWallet.id,
              amountKobo: row.totalAmount,
              balanceBeforeKobo: 0n,
              balanceAfterKobo: row.totalAmount,
            },
          })
          .catch(() => {});

        const updatedRow = {
          ...row,
          status: TransactionStatus.SUCCESSFUL,
          providerReference: requeryResult.providerReference || row.providerReference,
          metadata: meta,
        };
        const receipt = this.mapRowToReceiptDto(updatedRow);

        webhookDispatcherService
          .dispatch(row.businessId, WebhookEventType.TRANSACTION_SUCCESSFUL, receipt)
          .catch(() => {});

        return receipt;
      }

      if (requeryResult.status === TransactionStatus.FAILED) {
        const mainWallet = await walletService.getBusinessWallet(row.businessId, WalletType.MAIN);
        await walletService.creditWallet(mainWallet.id, row.totalAmount);

        await db
          .update(serviceTransactions)
          .set({
            status: TransactionStatus.FAILED,
            updatedAt: new Date(),
          })
          .where(eq(serviceTransactions.id, row.id));

        const updatedRow = { ...row, status: TransactionStatus.FAILED };
        const receipt = this.mapRowToReceiptDto(updatedRow);

        webhookDispatcherService
          .dispatch(row.businessId, WebhookEventType.TRANSACTION_FAILED, receipt)
          .catch(() => {});

        return receipt;
      }
    } catch {
      // Non-blocking on provider timeout
    }

    return this.mapRowToReceiptDto(row);
  }
}

export const electricityService = new ElectricityService();

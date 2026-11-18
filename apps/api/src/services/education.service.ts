import crypto from 'node:crypto';
import {
  ExamBody,
  ExamServiceType,
  ServiceType,
  TransactionStatus,
  LedgerDirection,
  LedgerEntryType,
  WalletType,
  generateBaxatoReference,
  generateTransactionReference,
  ValidationError,
  NotFoundError,
  AppError,
  koboToNaira,
  formatNairaFromKobo,
  decryptPin,
  WebhookEventType,
} from '@baxato/common';
import {
  db,
  serviceTransactions,
  examPins,
  wallets,
  eq,
  and,
  desc,
  sql,
} from '@baxato/database';
import { walletService } from './wallet.service.js';
import { ledgerService } from './ledger.service.js';
import { idempotencyService } from './idempotency.service.js';
import { webhookDispatcherService } from './webhook-dispatcher.service.js';
import {
  serviceControlsService,
  type SystemSettingsState,
} from './service-controls.service.js';
import {
  providerRouterService,
  ProviderRouterService,
} from './providers/index.js';

export interface ExamPackageConfig {
  packageCode: string;
  examBody: ExamBody;
  serviceType: ExamServiceType;
  name: string;
  description: string;
  billerId: string;
  paymentCode: string;
  baseCostKobo: bigint;          // Provider wholesale cost
  suggestedPriceKobo: bigint;    // Council recommended retail price
  defaultMarkupKobo: bigint;     // Configurable merchant markup (NO hardcoded margins!)
  requiresValidation: boolean;   // Profile Code lookup (JAMB)
  identifierType: 'PROFILE_CODE' | 'PHONE';
  instructions: string;
  portalUrl: string;
}

export const EXAM_PACKAGES: Record<string, ExamPackageConfig> = {
  JAMB_DIRECT_ENTRY: {
    packageCode: 'JAMB_DIRECT_ENTRY',
    examBody: ExamBody.JAMB,
    serviceType: ExamServiceType.DIRECT_ENTRY,
    name: 'JAMB 2026 Direct Entry PIN',
    description: '10-digit profile code required. Direct Entry candidate pin vending for 2026 admissions.',
    billerId: '3588',
    paymentCode: '04358802',
    baseCostKobo: 570000n, // ₦5,700.00 exact Orion face cost
    suggestedPriceKobo: 600000n, // ₦6,000.00 suggested retail
    defaultMarkupKobo: 30000n, // ₦300.00 configurable markup
    requiresValidation: true,
    identifierType: 'PROFILE_CODE',
    instructions: 'Candidate should present profile code at any accredited CBT centre for registration.',
    portalUrl: 'https://www.jamb.gov.ng',
  },
  JAMB_UTME_NO_MOCK: {
    packageCode: 'JAMB_UTME_NO_MOCK',
    examBody: ExamBody.JAMB,
    serviceType: ExamServiceType.UTME_NO_MOCK,
    name: 'JAMB 2026 UTME PIN (Without Mock)',
    description: '10-digit profile code required. Standard UTME registration PIN without Mock examination.',
    billerId: '3573',
    paymentCode: '04357305',
    baseCostKobo: 720000n, // ₦7,200.00 exact Orion face cost
    suggestedPriceKobo: 750000n, // ₦7,500.00 suggested retail
    defaultMarkupKobo: 30000n, // ₦300.00 configurable markup
    requiresValidation: true,
    identifierType: 'PROFILE_CODE',
    instructions: 'Proceed to any accredited JAMB CBT centre to complete registration & biometric capture.',
    portalUrl: 'https://www.jamb.gov.ng',
  },
  JAMB_UTME_WITH_MOCK: {
    packageCode: 'JAMB_UTME_WITH_MOCK',
    examBody: ExamBody.JAMB,
    serviceType: ExamServiceType.UTME_WITH_MOCK,
    name: 'JAMB 2026 UTME PIN (With Mock)',
    description: '10-digit profile code required. Comprehensive UTME registration PIN with Mock exam.',
    billerId: '3588',
    paymentCode: '04358803',
    baseCostKobo: 920000n, // ₦9,200.00 wholesale
    suggestedPriceKobo: 950000n, // ₦9,500.00 suggested retail
    defaultMarkupKobo: 30000n, // ₦300.00 configurable markup
    requiresValidation: true,
    identifierType: 'PROFILE_CODE',
    instructions: 'Includes access to the official JAMB Mock examination at designated CBT centre.',
    portalUrl: 'https://www.jamb.gov.ng',
  },
  WAEC_RESULT_CHECKER: {
    packageCode: 'WAEC_RESULT_CHECKER',
    examBody: ExamBody.WAEC,
    serviceType: ExamServiceType.RESULT_CHECKER,
    name: 'WAEC Result Checker e-PIN',
    description: 'Valid for checking WASSCE / GCE exam results up to 5 times on the WAEC Direct portal.',
    billerId: '4307',
    paymentCode: '04307601',
    baseCostKobo: 350000n, // ₦3,500.00 wholesale
    suggestedPriceKobo: 380000n, // ₦3,800.00 suggested retail
    defaultMarkupKobo: 30000n, // ₦300.00 configurable markup
    requiresValidation: false,
    identifierType: 'PHONE',
    instructions: 'Visit www.waecdirect.org and enter your 10-digit Examination Number, Year, Serial and PIN.',
    portalUrl: 'https://www.waecdirect.org',
  },
  WAEC_REGISTRATION: {
    packageCode: 'WAEC_REGISTRATION',
    examBody: ExamBody.WAEC,
    serviceType: ExamServiceType.REGISTRATION,
    name: 'WAEC WASSCE Registration e-PIN',
    description: 'Official registration token for WASSCE Private / External candidates.',
    billerId: '4307',
    paymentCode: '04307602',
    baseCostKobo: 2700000n, // ₦27,000.00 wholesale
    suggestedPriceKobo: 2800000n, // ₦28,000.00 suggested retail
    defaultMarkupKobo: 100000n, // ₦1,000.00 configurable markup
    requiresValidation: false,
    identifierType: 'PHONE',
    instructions: 'Visit registration.waecdirect.org to capture biometrics and register examination subjects.',
    portalUrl: 'https://registration.waecdirect.org',
  },
  NECO_RESULT_TOKEN: {
    packageCode: 'NECO_RESULT_TOKEN',
    examBody: ExamBody.NECO,
    serviceType: ExamServiceType.RESULT_CHECKER,
    name: 'NECO Result Token (5 Views)',
    description: 'Official 12-digit token for checking SSCE, BECE and NCEE examination results.',
    billerId: '4312',
    paymentCode: '04312001',
    baseCostKobo: 120000n, // ₦1,200.00 wholesale
    suggestedPriceKobo: 140000n, // ₦1,400.00 suggested retail
    defaultMarkupKobo: 20000n, // ₦200.00 configurable markup
    requiresValidation: false,
    identifierType: 'PHONE',
    instructions: 'Visit result.neco.gov.ng, select exam year and type, enter registration number and Token.',
    portalUrl: 'https://result.neco.gov.ng',
  },
  NECO_REGISTRATION: {
    packageCode: 'NECO_REGISTRATION',
    examBody: ExamBody.NECO,
    serviceType: ExamServiceType.REGISTRATION,
    name: 'NECO SSCE (External) Registration',
    description: 'Official token for NECO Senior Secondary Certificate Examination registration.',
    billerId: '4312',
    paymentCode: '04312002',
    baseCostKobo: 1950000n, // ₦19,500.00 wholesale
    suggestedPriceKobo: 2050000n, // ₦20,500.00 suggested retail
    defaultMarkupKobo: 100000n, // ₦1,000.00 configurable markup
    requiresValidation: false,
    identifierType: 'PHONE',
    instructions: 'Visit neco.gov.ng/ssce-external to complete registration.',
    portalUrl: 'https://neco.gov.ng',
  },
  NABTEB_RESULT_CHECKER: {
    packageCode: 'NABTEB_RESULT_CHECKER',
    examBody: ExamBody.NABTEB,
    serviceType: ExamServiceType.RESULT_CHECKER,
    name: 'NABTEB Result Checker e-PIN',
    description: 'Scratch card e-PIN for checking NBC / NTC and modular examination results.',
    billerId: '4313',
    paymentCode: '04313001',
    baseCostKobo: 150000n, // ₦1,500.00 wholesale
    suggestedPriceKobo: 170000n, // ₦1,700.00 suggested retail
    defaultMarkupKobo: 20000n, // ₦200.00 configurable markup
    requiresValidation: false,
    identifierType: 'PHONE',
    instructions: 'Visit eworld.nabteb.gov.ng and enter Candidate ID, Exam Type, Year, Serial and PIN.',
    portalUrl: 'https://eworld.nabteb.gov.ng',
  },
};

export interface CandidateValidationDto {
  isValid: boolean;
  examBody: ExamBody;
  candidateId: string;
  candidateName?: string;
  session?: string;
  packageCode?: string;
  responseCode: string;
  responseMessage: string;
}

export interface PurchaseExamPinInput {
  businessId: string;
  userId: string;
  packageCode: string;
  candidateId: string;            // 10-digit profile code (JAMB) or recipient phone
  candidateName?: string;
  candidateEmail?: string;
  quantity?: number;              // Defaults to 1 (max 5)
  customMarkupKobo?: bigint;      // Dynamic custom markup (NO hardcoded margins!)
  clientReference?: string;
  idempotencyKey?: string;
}

export interface ExamPinReceiptDto {
  transactionId: string;
  status: TransactionStatus;
  packageCode: string;
  packageName: string;
  examBody: ExamBody;
  serviceType: ExamServiceType;
  candidateId: string;
  candidateName?: string;
  pins: Array<{
    pin: string;
    serialNumber?: string;
    instructions?: string;
  }>;
  quantity: number;
  baseCostKobo: string;
  baseCostNaira: number;
  formattedBaseCost: string;
  merchantMarkupKobo: string;
  merchantMarkupNaira: number;
  formattedMerchantMarkup: string;
  amountDebitedKobo: string;
  amountDebitedNaira: number;
  formattedAmountDebited: string;
  reference: string;
  clientReference?: string;
  providerReference?: string;
  providerName: string;
  portalUrl: string;
  instructions: string;
  source: 'LIVE_PROVIDER' | 'ENCRYPTED_INVENTORY';
  createdAt: Date;
}

export class EducationService {
  private readonly router: ProviderRouterService;
  // In-memory tenant markup registry (key: `${businessId}:${packageCode}`)
  private readonly tenantCustomMarkups: Map<string, bigint> = new Map();

  constructor(router: ProviderRouterService = providerRouterService) {
    this.router = router;
  }

  /**
   * Sets custom dynamic markup for a business tenant on a specific package.
   * Ensures STRICT compliance with "NO HARDCODED MARGINS".
   */
  public setCustomMarkup(businessId: string, packageCode: string, markupKobo: bigint): void {
    if (markupKobo < 0n) {
      throw new ValidationError('Markup cannot be negative.');
    }
    if (markupKobo > 5000000n) {
      throw new ValidationError('Markup cannot exceed 5,000,000 Kobo (₦50,000).');
    }
    this.tenantCustomMarkups.set(`${businessId}:${packageCode}`, markupKobo);
  }

  /**
   * Retrieves configured markup for a tenant package.
   */
  public getCustomMarkup(businessId: string, packageCode: string): bigint | undefined {
    return this.tenantCustomMarkups.get(`${businessId}:${packageCode}`);
  }

  /**
   * Retrieves catalog of all education examination packages with dynamic pricing.
   */
  public getPackages(businessId?: string, controls?: SystemSettingsState) {
    return Object.values(EXAM_PACKAGES).map((p) => {
      const customMarkup = businessId
        ? this.tenantCustomMarkups.get(`${businessId}:${p.packageCode}`)
        : undefined;
      const effectiveMarkupKobo = customMarkup !== undefined ? customMarkup : p.defaultMarkupKobo;
      const effectivePriceKobo = p.baseCostKobo + effectiveMarkupKobo;
      const enabled = controls
        ? !serviceControlsService.isEducationPackageDisabled(controls, p.packageCode, p.examBody)
        : true;

      return {
        packageCode: p.packageCode,
        examBody: p.examBody,
        serviceType: p.serviceType,
        name: p.name,
        description: p.description,
        billerId: p.billerId,
        paymentCode: p.paymentCode,
        baseCostKobo: p.baseCostKobo.toString(),
        baseCostNaira: koboToNaira(p.baseCostKobo),
        formattedBaseCost: formatNairaFromKobo(p.baseCostKobo),
        suggestedPriceKobo: p.suggestedPriceKobo.toString(),
        suggestedPriceNaira: koboToNaira(p.suggestedPriceKobo),
        formattedSuggestedPrice: formatNairaFromKobo(p.suggestedPriceKobo),
        merchantMarkupKobo: effectiveMarkupKobo.toString(),
        merchantMarkupNaira: koboToNaira(effectiveMarkupKobo),
        formattedMerchantMarkup: formatNairaFromKobo(effectiveMarkupKobo),
        sellingPriceKobo: effectivePriceKobo.toString(),
        sellingPriceNaira: koboToNaira(effectivePriceKobo),
        formattedSellingPrice: formatNairaFromKobo(effectivePriceKobo),
        requiresValidation: p.requiresValidation,
        identifierType: p.identifierType,
        instructions: p.instructions,
        portalUrl: p.portalUrl,
        enabled,
      };
    });
  }

  /**
   * Retrieves unfiltered package catalog for admin settings toggles.
   */
  public getAdminCatalogPackages() {
    return Object.values(EXAM_PACKAGES).map((p) => ({
      packageCode: p.packageCode,
      examBody: p.examBody,
      serviceType: p.serviceType,
      name: p.name,
      baseCostNaira: koboToNaira(p.baseCostKobo),
    }));
  }

  /**
   * Validates Candidate Profile Code or Registration ID.
   * For JAMB, performs real-time validation via upstream provider.
   */
  public async validateCandidate(input: {
    examBody: ExamBody;
    candidateId: string;
    packageCode?: string;
  }): Promise<CandidateValidationDto> {
    const cleanId = input.candidateId.replace(/[\s\-]/g, '');

    const controls = await serviceControlsService.getSettings();
    if (controls.maintenanceMode || controls.killSwitches.EDUCATION) {
      throw new ValidationError('Exam PIN service is currently unavailable. Please try again later.');
    }
    const targetPackageCode = input.packageCode || (input.examBody === ExamBody.JAMB ? 'JAMB_DIRECT_ENTRY' : input.examBody);
    const targetPkg = input.packageCode ? EXAM_PACKAGES[input.packageCode] : undefined;
    if (serviceControlsService.isEducationPackageDisabled(controls, targetPackageCode, input.examBody)) {
      throw new ValidationError(`${targetPkg?.name || input.examBody} is currently unavailable.`);
    }

    if (input.examBody === ExamBody.JAMB) {
      if (!/^\d{10}$/.test(cleanId)) {
        throw new ValidationError(
          `Invalid JAMB Profile Code: '${input.candidateId}'. Must be exactly 10 numeric digits.`,
        );
      }

      const pkg = input.packageCode
        ? EXAM_PACKAGES[input.packageCode]
        : EXAM_PACKAGES.JAMB_DIRECT_ENTRY;
      const paymentCode = pkg?.paymentCode || '04358802';

      const result = await this.router.validateCustomer({
        serviceType: ServiceType.EXAM_PIN,
        paymentCode,
        customerId: cleanId,
      });

      return {
        isValid: result.isValid,
        examBody: ExamBody.JAMB,
        candidateId: cleanId,
        candidateName: result.isValid ? (result.customerName || undefined) : undefined,
        session: '2026/2027 Academic Session',
        packageCode: pkg?.packageCode || 'JAMB_DIRECT_ENTRY',
        responseCode: result.responseCode,
        responseMessage: result.responseMessage,
      };
    }

    // WAEC, NECO, NABTEB: Validate candidate phone number
    if (!/^\d{11}$/.test(cleanId)) {
      throw new ValidationError(
        `Invalid candidate phone number: '${input.candidateId}'. Must be 11 numeric digits.`,
      );
    }

    return {
      isValid: true,
      examBody: input.examBody,
      candidateId: cleanId,
      session: '2026 Diet',
      packageCode: input.packageCode,
      responseCode: '90000',
      responseMessage: 'Candidate identifier format verified.',
    };
  }

  /**
   * Purchases and dispenses Examination PIN(s).
   * Supports live provider vending with automatic encrypted offline inventory fallback.
   * Enforces optimistic concurrency wallet debit and Zero-Sum financial ledger bookkeeping.
   */
  public async purchaseExamPin(input: PurchaseExamPinInput): Promise<ExamPinReceiptDto> {
    const pkg = EXAM_PACKAGES[input.packageCode];
    if (!pkg) {
      throw new NotFoundError(`Education exam package '${input.packageCode}' not found.`);
    }

    const controls = await serviceControlsService.getSettings();
    if (controls.maintenanceMode || controls.killSwitches.EDUCATION) {
      throw new ValidationError('Exam PIN service is currently unavailable. Please try again later.');
    }
    if (serviceControlsService.isEducationPackageDisabled(controls, pkg.packageCode, pkg.examBody)) {
      throw new ValidationError(`${pkg.name} is currently unavailable.`);
    }

    const cleanCandidateId = input.candidateId.replace(/[\s\-]/g, '');
    const quantity = Math.max(1, Math.min(input.quantity || 1, 5));

    // Validate identifier format
    if (pkg.identifierType === 'PROFILE_CODE') {
      if (!/^\d{10}$/.test(cleanCandidateId)) {
        throw new ValidationError(
          `Invalid JAMB Profile Code: '${input.candidateId}'. Must be exactly 10 numeric digits.`,
        );
      }
      if (quantity > 1) {
        throw new ValidationError(
          'JAMB examination PINs are bound to a single candidate profile code (maximum quantity: 1).',
        );
      }
    } else {
      if (!/^\d{11}$/.test(cleanCandidateId)) {
        throw new ValidationError(
          `Invalid recipient phone number: '${input.candidateId}'. Must be 11 numeric digits.`,
        );
      }
    }

    if (input.customMarkupKobo !== undefined) {
      if (input.customMarkupKobo < 0n) {
        throw new ValidationError('Markup cannot be negative.');
      }
      if (input.customMarkupKobo > 5000000n) {
        throw new ValidationError('Markup cannot exceed 5,000,000 Kobo (₦50,000).');
      }
    }

    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const lock = await idempotencyService.acquireLock(
        input.idempotencyKey,
        input.businessId,
        `EXAM_${pkg.packageCode}_${cleanCandidateId}_${quantity}`,
      );

      if (lock.isCompleted && lock.responseBody) {
        return lock.responseBody as ExamPinReceiptDto;
      }
    }

    // 2. Compute Dynamic Pricing (Wholesale Base Cost + Dynamic Markup)
    const customMarkup =
      input.customMarkupKobo !== undefined
        ? input.customMarkupKobo
        : this.tenantCustomMarkups.get(`${input.businessId}:${pkg.packageCode}`) ??
          pkg.defaultMarkupKobo;

    let baseCostKobo = pkg.baseCostKobo * BigInt(quantity);
    let markupKobo = customMarkup * BigInt(quantity);
    let amountToDebitKobo = baseCostKobo; // Merchant is debited wholesale cost for inventory

    // 3. Resolve Business Wallets & Debit Balance with Concurrency Lock
    const mainWallet = await walletService.getBusinessWallet(input.businessId, WalletType.MAIN);
    const balanceBeforeKobo = BigInt(mainWallet.balanceKobo);

    await walletService.debitWallet(mainWallet.id, amountToDebitKobo);
    let balanceAfterKobo = balanceBeforeKobo - amountToDebitKobo;

    // 4. Generate references & initialize service transaction row (refund wallet if DB insert fails)
    const requestReference = generateBaxatoReference();
    const clientRef = input.clientReference || generateTransactionReference('EPN');
    const initialRoute =
      typeof this.router.resolveDynamicRouting === 'function'
        ? await this.router.resolveDynamicRouting(ServiceType.EXAM_PIN)
        : { primaryName: 'MONNIFY' };

    let txnRow: typeof serviceTransactions.$inferSelect | undefined;
    try {
      [txnRow] = await db
        .insert(serviceTransactions)
        .values({
          businessId: input.businessId,
          userId: input.userId,
          serviceType: ServiceType.EXAM_PIN,
          amount: baseCostKobo + markupKobo,
          fee: markupKobo,
          discount: 0n,
          totalAmount: amountToDebitKobo,
          status: TransactionStatus.PROCESSING,
          recipient: cleanCandidateId,
          providerName: initialRoute.primaryName as any,
          clientReference: clientRef,
          requestReference,
          metadata: {
            packageCode: pkg.packageCode,
            packageName: pkg.name,
            examBody: pkg.examBody,
            serviceType: pkg.serviceType,
            quantity,
            candidateId: cleanCandidateId,
            candidateName: input.candidateName || null,
            baseCostKobo: baseCostKobo.toString(),
            markupKobo: markupKobo.toString(),
            amountToDebitKobo: amountToDebitKobo.toString(),
          },
        })
        .returning();

      if (!txnRow) {
        throw new Error('Failed to create transaction record');
      }
    } catch (insertError) {
      await walletService.creditWallet(mainWallet.id, amountToDebitKobo);
      if (input.idempotencyKey) {
        await idempotencyService.releaseLock(input.idempotencyKey, input.businessId);
      }
      throw insertError;
    }

    // 5. Dual-Fulfillment Engine: Live Provider with Encrypted Inventory Fallback
    let fulfilledCount = 0;
    try {
      const dispensedPins: Array<{ pin: string; serialNumber?: string; instructions?: string }> = [];
      let fulfillmentSource: 'LIVE_PROVIDER' | 'ENCRYPTED_INVENTORY' = 'LIVE_PROVIDER';
      let providerReference = requestReference;
      let providerName: string = initialRoute.primaryName;

      // Attempt 1: Live Provider Vending (exact quantity loop)
      let upstreamInFlight = false;
      try {
        for (let i = 0; i < quantity; i++) {
          const subRef = i === 0 ? requestReference : `${requestReference}${i + 1}`;
          const vendResult = await this.router.vendService(
            {
              serviceType: ServiceType.EXAM_PIN,
              paymentCode: pkg.paymentCode,
              customerId: cleanCandidateId,
              customerMobile: input.candidateEmail || cleanCandidateId,
              amountKobo: pkg.baseCostKobo,
              requestReference: subRef,
            },
            txnRow.id,
          );

          if (
            (vendResult.status === TransactionStatus.PROCESSING ||
              vendResult.status === TransactionStatus.PENDING) &&
            dispensedPins.length === 0
          ) {
            upstreamInFlight = true;
            providerReference = vendResult.providerReference || subRef;
            providerName = vendResult.providerName;
            break;
          }

          if (vendResult.status !== TransactionStatus.SUCCESSFUL) {
            break;
          }

          const pin = vendResult.pinData?.pin || vendResult.token;
          if (!pin) {
            break;
          }

          dispensedPins.push({
            pin,
            serialNumber:
              vendResult.pinData?.serialNumber ||
              `${pkg.examBody}-${new Date().getFullYear()}-${crypto.randomInt(100000, 1000000)}`,
            instructions: vendResult.pinData?.instructions || pkg.instructions,
          });
          providerReference = vendResult.providerReference || subRef;
          providerName = vendResult.providerName;
        }
      } catch {
        // Live provider failed; continue to Encrypted Inventory Fallback for remaining PINs
      }

      if (upstreamInFlight) {
        await db
          .update(serviceTransactions)
          .set({
            status: TransactionStatus.PROCESSING,
            providerName: providerName as any,
            providerReference,
            updatedAt: new Date(),
          })
          .where(eq(serviceTransactions.id, txnRow.id));

        await ledgerService
          .recordDoubleEntry({
            businessId: input.businessId,
            reference: clientRef,
            type: LedgerEntryType.SERVICE_PAYMENT,
            category: 'EXAM_PIN_PURCHASE',
            description: `Education PIN vend (Processing): ${quantity}x ${pkg.name} for ${cleanCandidateId}`,
            transactionId: txnRow.id,
            debit: {
              walletId: mainWallet.id,
              amountKobo: amountToDebitKobo,
              balanceBeforeKobo,
              balanceAfterKobo,
            },
            credit: {
              walletId: mainWallet.id,
              amountKobo: amountToDebitKobo,
              balanceBeforeKobo: 0n,
              balanceAfterKobo: amountToDebitKobo,
            },
          })
          .catch((err) => {
            console.error('[EducationService] Processing ledger recording warning:', err);
          });

        const processingReceipt: ExamPinReceiptDto = {
          transactionId: txnRow.id,
          status: TransactionStatus.PROCESSING,
          packageCode: pkg.packageCode,
          packageName: pkg.name,
          examBody: pkg.examBody,
          serviceType: pkg.serviceType,
          candidateId: cleanCandidateId,
          candidateName: input.candidateName,
          pins: [],
          quantity,
          baseCostKobo: baseCostKobo.toString(),
          baseCostNaira: koboToNaira(baseCostKobo),
          formattedBaseCost: formatNairaFromKobo(baseCostKobo),
          merchantMarkupKobo: markupKobo.toString(),
          merchantMarkupNaira: koboToNaira(markupKobo),
          formattedMerchantMarkup: formatNairaFromKobo(markupKobo),
          amountDebitedKobo: amountToDebitKobo.toString(),
          amountDebitedNaira: koboToNaira(amountToDebitKobo),
          formattedAmountDebited: formatNairaFromKobo(amountToDebitKobo),
          reference: requestReference,
          clientReference: clientRef,
          providerReference,
          providerName,
          portalUrl: pkg.portalUrl,
          instructions: pkg.instructions,
          source: fulfillmentSource,
          createdAt: new Date(),
        };

        if (input.idempotencyKey) {
          await idempotencyService.completeLock(
            input.idempotencyKey,
            input.businessId,
            201,
            processingReceipt,
          );
        }

        return processingReceipt;
      }

      // Attempt 2: Fallback to Encrypted Offline Inventory for any remaining unfulfilled PINs
      const remainingNeeded = quantity - dispensedPins.length;
      if (remainingNeeded > 0) {
        const availablePins = await db
          .select()
          .from(examPins)
          .where(
            and(
              eq(examPins.examBody, pkg.examBody),
              eq(examPins.status, 'AVAILABLE'),
            ),
          )
          .limit(remainingNeeded * 2);

        if (availablePins.length > 0) {
          for (const item of availablePins) {
            if (dispensedPins.length >= quantity) break;

            // Atomically claim AVAILABLE PIN so two concurrent requests cannot dispense the same PIN
            const [claimedPin] = await db
              .update(examPins)
              .set({
                status: 'DISPENSED',
                dispensedTransactionId: txnRow.id,
                dispensedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(examPins.id, item.id),
                  eq(examPins.status, 'AVAILABLE'),
                ),
              )
              .returning();

            if (!claimedPin) {
              continue;
            }

            if (dispensedPins.length === 0) {
              fulfillmentSource = 'ENCRYPTED_INVENTORY';
              providerName = 'INTERNAL_MOCK';
            }

            const decryptedPin = decryptPin(claimedPin.pinEncrypted);
            const decryptedSerial = decryptPin(claimedPin.serialEncrypted);

            dispensedPins.push({
              pin: decryptedPin,
              serialNumber: decryptedSerial,
              instructions: pkg.instructions,
            });
          }
        }
      }

      fulfilledCount = dispensedPins.length;

      // Never fabricate fake PINs: if 0 PINs could be vended/dispensed, abort and refund full wallet debit
      if (fulfilledCount === 0) {
        throw new AppError(
          'Examination PINs are temporarily out of stock. Your wallet has not been charged.',
          503,
          'PIN_OUT_OF_STOCK',
        );
      }

      // If partial quantity was fulfilled (e.g. quantity > 1 and upstream/inventory ran out mid-batch),
      // immediately refund the unfulfilled portion so the merchant only pays for delivered PINs.
      let finalQuantity = quantity;
      if (fulfilledCount < quantity) {
        const unfulfilledCount = BigInt(quantity - fulfilledCount);
        const refundPortionKobo = pkg.baseCostKobo * unfulfilledCount;
        await walletService.creditWallet(mainWallet.id, refundPortionKobo);
        finalQuantity = fulfilledCount;
        baseCostKobo = pkg.baseCostKobo * BigInt(finalQuantity);
        markupKobo = customMarkup * BigInt(finalQuantity);
        amountToDebitKobo = baseCostKobo;
        balanceAfterKobo = balanceBeforeKobo - amountToDebitKobo;
      }

      // 6. Update Transaction to SUCCESSFUL
      await db
        .update(serviceTransactions)
        .set({
          status: TransactionStatus.SUCCESSFUL,
          amount: baseCostKobo + markupKobo,
          fee: markupKobo,
          totalAmount: amountToDebitKobo,
          providerName: providerName as any,
          providerReference,
          metadata: {
            packageCode: pkg.packageCode,
            packageName: pkg.name,
            examBody: pkg.examBody,
            serviceType: pkg.serviceType,
            quantity: finalQuantity,
            candidateId: cleanCandidateId,
            candidateName: input.candidateName || null,
            pins: dispensedPins,
            source: fulfillmentSource,
            baseCostKobo: baseCostKobo.toString(),
            markupKobo: markupKobo.toString(),
            amountToDebitKobo: amountToDebitKobo.toString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(serviceTransactions.id, txnRow.id));

      // 7. Record balanced Zero-Sum Financial Ledger entry
      await ledgerService
        .recordDoubleEntry({
          businessId: input.businessId,
          reference: clientRef,
          type: LedgerEntryType.SERVICE_PAYMENT,
          category: 'EXAM_PIN_PURCHASE',
          description: `Education PIN vend: ${finalQuantity}x ${pkg.name} for ${cleanCandidateId}`,
          transactionId: txnRow.id,
          debit: {
            walletId: mainWallet.id,
            amountKobo: amountToDebitKobo,
            balanceBeforeKobo,
            balanceAfterKobo,
          },
          credit: {
            walletId: mainWallet.id, // Platform clearing
            amountKobo: amountToDebitKobo,
            balanceBeforeKobo: 0n,
            balanceAfterKobo: amountToDebitKobo,
          },
        })
        .catch((err) => {
          console.error('[EducationService] Ledger recording warning after successful vend:', err);
        });

      const receipt: ExamPinReceiptDto = {
        transactionId: txnRow.id,
        status: TransactionStatus.SUCCESSFUL,
        packageCode: pkg.packageCode,
        packageName: pkg.name,
        examBody: pkg.examBody,
        serviceType: pkg.serviceType,
        candidateId: cleanCandidateId,
        candidateName: input.candidateName,
        pins: dispensedPins,
        quantity: finalQuantity,
        baseCostKobo: baseCostKobo.toString(),
        baseCostNaira: koboToNaira(baseCostKobo),
        formattedBaseCost: formatNairaFromKobo(baseCostKobo),
        merchantMarkupKobo: markupKobo.toString(),
        merchantMarkupNaira: koboToNaira(markupKobo),
        formattedMerchantMarkup: formatNairaFromKobo(markupKobo),
        amountDebitedKobo: amountToDebitKobo.toString(),
        amountDebitedNaira: koboToNaira(amountToDebitKobo),
        formattedAmountDebited: formatNairaFromKobo(amountToDebitKobo),
        reference: requestReference,
        clientReference: clientRef,
        providerReference,
        providerName,
        portalUrl: pkg.portalUrl,
        instructions: pkg.instructions,
        source: fulfillmentSource,
        createdAt: new Date(),
      };

      if (input.idempotencyKey) {
        await idempotencyService.completeLock(input.idempotencyKey, input.businessId, 201, receipt);
      }

      // Outbound Webhook Dispatch (fire-and-forget / non-blocking)
      webhookDispatcherService
        .dispatch(input.businessId, WebhookEventType.TRANSACTION_SUCCESSFUL, receipt)
        .catch((err) => {
          console.error('[EducationService] Webhook dispatch failed:', err);
        });

      return receipt;
    } catch (error) {
      // 8. Rollback on failure: Refund wallet and update transaction to FAILED
      await walletService.creditWallet(mainWallet.id, amountToDebitKobo);

      try {
        await db
          .update(serviceTransactions)
          .set({
            status: TransactionStatus.FAILED,
            errorMessage: (error as Error).message,
            updatedAt: new Date(),
          })
          .where(eq(serviceTransactions.id, txnRow.id));
      } catch (dbErr) {
        console.error('[EducationService] Failed to persist FAILED rollback state:', dbErr);
      }

      if (input.idempotencyKey) {
        await idempotencyService.releaseLock(input.idempotencyKey, input.businessId).catch(() => {});
      }

      // Outbound Webhook Dispatch for Failure (fire-and-forget / non-blocking)
      webhookDispatcherService
        .dispatch(input.businessId, WebhookEventType.TRANSACTION_FAILED, {
          transactionId: txnRow.id,
          status: TransactionStatus.FAILED,
          serviceType: ServiceType.EDUCATION,
          errorMessage: (error as Error).message,
          packageCode: pkg.packageCode,
          quantity,
          reference: requestReference,
          clientReference: clientRef,
          timestamp: new Date().toISOString(),
        })
        .catch((err) => {
          console.error('[EducationService] Failure webhook dispatch failed:', err);
        });

      throw error;
    }
  }

  /**
   * Retrieves paginated Education PIN transaction history for a business tenant.
   */
  public async getEducationHistory(
    businessId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ transactions: ExamPinReceiptDto[]; total: number }> {
    const rows = await db
      .select()
      .from(serviceTransactions)
      .where(
        and(
          eq(serviceTransactions.businessId, businessId),
          eq(serviceTransactions.serviceType, ServiceType.EXAM_PIN),
        ),
      )
      .orderBy(desc(serviceTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(serviceTransactions)
      .where(
        and(
          eq(serviceTransactions.businessId, businessId),
          eq(serviceTransactions.serviceType, ServiceType.EXAM_PIN),
        ),
      );

    const count = countRow?.count ?? 0;

    const transactions: ExamPinReceiptDto[] = rows.map((r) => {
      const meta = (r.metadata || {}) as Record<string, any>;
      const pkg = EXAM_PACKAGES[meta.packageCode] || EXAM_PACKAGES.JAMB_DIRECT_ENTRY!;
      const baseCost = BigInt(meta.baseCostKobo || r.amount.toString());
      const markup = BigInt(meta.markupKobo || r.fee.toString());
      const debited = BigInt(meta.amountToDebitKobo || r.totalAmount.toString());

      return {
        transactionId: r.id,
        status: r.status as TransactionStatus,
        packageCode: meta.packageCode || pkg.packageCode,
        packageName: meta.packageName || pkg.name,
        examBody: (meta.examBody as ExamBody) || pkg.examBody,
        serviceType: (meta.serviceType as ExamServiceType) || pkg.serviceType,
        candidateId: meta.candidateId || r.recipient,
        candidateName: meta.candidateName || undefined,
        pins: meta.pins || [],
        quantity: meta.quantity || 1,
        baseCostKobo: baseCost.toString(),
        baseCostNaira: koboToNaira(baseCost),
        formattedBaseCost: formatNairaFromKobo(baseCost),
        merchantMarkupKobo: markup.toString(),
        merchantMarkupNaira: koboToNaira(markup),
        formattedMerchantMarkup: formatNairaFromKobo(markup),
        amountDebitedKobo: debited.toString(),
        amountDebitedNaira: koboToNaira(debited),
        formattedAmountDebited: formatNairaFromKobo(debited),
        reference: r.requestReference || r.id,
        clientReference: r.clientReference || undefined,
        providerReference: r.providerReference || undefined,
        providerName: r.providerName,
        portalUrl: pkg.portalUrl,
        instructions: pkg.instructions,
        source: meta.source || 'LIVE_PROVIDER',
        createdAt: r.createdAt,
      };
    });

    return { transactions, total: count || 0 };
  }
}

export const educationService = new EducationService();

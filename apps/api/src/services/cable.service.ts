import {
  CableOperator,
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

export interface CableOperatorInfo {
  code: CableOperator;
  name: string;
  shortName: string;
  billerId: number;
  customerField: string;
  defaultPaymentCode: string;
  minSmartcardDigits: number;
  maxSmartcardDigits: number;
  defaultDiscountBps: number;
}

export const CABLE_OPERATORS: Record<CableOperator, CableOperatorInfo> = {
  [CableOperator.DSTV]: {
    code: CableOperator.DSTV,
    name: 'DStv (MultiChoice)',
    shortName: 'DSTV',
    billerId: 104,
    customerField: 'Smartcard Number',
    defaultPaymentCode: '104154', // DStv Padi base code
    minSmartcardDigits: 10,
    maxSmartcardDigits: 11,
    defaultDiscountBps: 150, // 1.5%
  },
  [CableOperator.GOTV]: {
    code: CableOperator.GOTV,
    name: 'GOtv (MultiChoice)',
    shortName: 'GOTV',
    billerId: 459,
    customerField: 'IUC / Decoder Number',
    defaultPaymentCode: '459137', // GOtv Smallie base code
    minSmartcardDigits: 10,
    maxSmartcardDigits: 11,
    defaultDiscountBps: 150, // 1.5%
  },
  [CableOperator.STARTIMES]: {
    code: CableOperator.STARTIMES,
    name: 'StarTimes Nigeria',
    shortName: 'STARTIMES',
    billerId: 240,
    customerField: 'Smartcard / e-Wallet Number',
    defaultPaymentCode: '24019', // StarTimes Nova base code
    minSmartcardDigits: 11,
    maxSmartcardDigits: 11,
    defaultDiscountBps: 200, // 2.0%
  },
};

export interface CableBouquet {
  id: string;
  operator: CableOperator;
  operatorName: string;
  name: string;
  code: string;
  validity: string;
  priceKobo: bigint;
  priceNaira: number;
  discountBps: number;
  interswitchPaymentCode: string;
  monnifyPlanCode: string;
  description: string;
}

export const CABLE_BOUQUETS: CableBouquet[] = [
  // --- DSTV (Biller 104) ---
  {
    id: 'dstv-padi',
    operator: CableOperator.DSTV,
    operatorName: 'DStv (MultiChoice)',
    name: 'DStv Padi',
    code: 'DStv Padi Bouquet E36',
    validity: '30 Days',
    priceKobo: 440000n, // ₦4,400
    priceNaira: 4400,
    discountBps: 150,
    interswitchPaymentCode: '104154',
    monnifyPlanCode: 'DSTV_PADI',
    description: 'Entry-level local entertainment, news, and kids channels',
  },
  {
    id: 'dstv-yanga',
    operator: CableOperator.DSTV,
    operatorName: 'DStv (MultiChoice)',
    name: 'DStv Yanga',
    code: 'DStv Yanga Bouquet E36',
    validity: '30 Days',
    priceKobo: 600000n, // ₦6,000
    priceNaira: 6000,
    discountBps: 150,
    interswitchPaymentCode: '104152',
    monnifyPlanCode: 'DSTV_YANGA',
    description: 'Expanded movie, family entertainment, and music bouquet',
  },
  {
    id: 'dstv-confam',
    operator: CableOperator.DSTV,
    operatorName: 'DStv (MultiChoice)',
    name: 'DStv Confam',
    code: 'DStv Confam Bouquet E36',
    validity: '30 Days',
    priceKobo: 1100000n, // ₦11,000
    priceNaira: 11000,
    discountBps: 150,
    interswitchPaymentCode: '104153',
    monnifyPlanCode: 'DSTV_CONFAM',
    description: 'Over 120 channels including sports, movies, and documentary',
  },
  {
    id: 'dstv-compact',
    operator: CableOperator.DSTV,
    operatorName: 'DStv (MultiChoice)',
    name: 'DStv Compact',
    code: 'Compact',
    validity: '30 Days',
    priceKobo: 1900000n, // ₦19,000
    priceNaira: 19000,
    discountBps: 150,
    interswitchPaymentCode: '10403',
    monnifyPlanCode: 'DSTV_COMPACT',
    description: 'Premier League football, international movies, and drama series',
  },
  {
    id: 'dstv-compact-plus',
    operator: CableOperator.DSTV,
    operatorName: 'DStv (MultiChoice)',
    name: 'DStv Compact Plus',
    code: 'Compact Plus',
    validity: '30 Days',
    priceKobo: 3000000n, // ₦30,000
    priceNaira: 30000,
    discountBps: 150,
    interswitchPaymentCode: '10430',
    monnifyPlanCode: 'DSTV_COMPACT_PLUS',
    description: 'Champions League, UFC, motorsport, and premium entertainment',
  },
  {
    id: 'dstv-premium',
    operator: CableOperator.DSTV,
    operatorName: 'DStv (MultiChoice)',
    name: 'DStv Premium',
    code: 'Premium',
    validity: '30 Days',
    priceKobo: 4450000n, // ₦44,500
    priceNaira: 44500,
    discountBps: 150,
    interswitchPaymentCode: '10401',
    monnifyPlanCode: 'DSTV_PREMIUM',
    description: 'All DStv channels, all sports, Showmax included and 4K Ultra HD',
  },
  {
    id: 'dstv-extraview',
    operator: CableOperator.DSTV,
    operatorName: 'DStv (MultiChoice)',
    name: 'DStv ExtraView Add-on',
    code: 'HDPVR Access/Extraview',
    validity: '30 Days',
    priceKobo: 600000n, // ₦6,000
    priceNaira: 6000,
    discountBps: 150,
    interswitchPaymentCode: '10436',
    monnifyPlanCode: 'DSTV_EXTRAVIEW',
    description: 'Link up to 3 decoders under one primary subscription',
  },

  // --- GOTV (Biller 459) ---
  {
    id: 'gotv-smallie',
    operator: CableOperator.GOTV,
    operatorName: 'GOtv (MultiChoice)',
    name: 'GOtv Smallie',
    code: 'GOtv Smallie',
    validity: '30 Days',
    priceKobo: 190000n, // ₦1,900
    priceNaira: 1900,
    discountBps: 150,
    interswitchPaymentCode: '459137',
    monnifyPlanCode: 'GOTV_SMALLIE',
    description: 'Essential local news, music, and religious channels',
  },
  {
    id: 'gotv-jinja',
    operator: CableOperator.GOTV,
    operatorName: 'GOtv (MultiChoice)',
    name: 'GOtv Jinja',
    code: 'GOtv Jinja Bouquet',
    validity: '30 Days',
    priceKobo: 390000n, // ₦3,900
    priceNaira: 3900,
    discountBps: 150,
    interswitchPaymentCode: '459120',
    monnifyPlanCode: 'GOTV_JINJA',
    description: 'Over 45 family channels with Nollywood movies and cartoons',
  },
  {
    id: 'gotv-jolli',
    operator: CableOperator.GOTV,
    operatorName: 'GOtv (MultiChoice)',
    name: 'GOtv Jolli',
    code: 'GOtv Jolli Bouquet',
    validity: '30 Days',
    priceKobo: 580000n, // ₦5,800
    priceNaira: 5800,
    discountBps: 150,
    interswitchPaymentCode: '459121',
    monnifyPlanCode: 'GOTV_JOLLI',
    description: 'Over 65 channels, telenovelas, movies, and youth entertainment',
  },
  {
    id: 'gotv-max',
    operator: CableOperator.GOTV,
    operatorName: 'GOtv (MultiChoice)',
    name: 'GOtv Max',
    code: 'GOtv Max',
    validity: '30 Days',
    priceKobo: 850000n, // ₦8,500
    priceNaira: 8500,
    discountBps: 150,
    interswitchPaymentCode: '459119',
    monnifyPlanCode: 'GOTV_MAX',
    description: 'La Liga, Serie A, WWE, international movies, and kids TV',
  },
  {
    id: 'gotv-supa',
    operator: CableOperator.GOTV,
    operatorName: 'GOtv (MultiChoice)',
    name: 'GOtv Supa',
    code: 'SUPA',
    validity: '30 Days',
    priceKobo: 1140000n, // ₦11,400
    priceNaira: 11400,
    discountBps: 150,
    interswitchPaymentCode: '459133',
    monnifyPlanCode: 'GOTV_SUPA',
    description: 'Over 80 channels including Nick Jr, Africa Magic Urban, and sports',
  },
  {
    id: 'gotv-supa-plus',
    operator: CableOperator.GOTV,
    operatorName: 'GOtv (MultiChoice)',
    name: 'GOtv Supa Plus',
    code: 'GOTV Supa Plus',
    validity: '30 Days',
    priceKobo: 1680000n, // ₦16,800
    priceNaira: 16800,
    discountBps: 150,
    interswitchPaymentCode: '459134',
    monnifyPlanCode: 'GOTV_SUPA_PLUS',
    description: 'All Premier League football matches and complete GOtv package',
  },

  // --- STARTIMES (Biller 240) ---
  {
    id: 'startimes-nova',
    operator: CableOperator.STARTIMES,
    operatorName: 'StarTimes Nigeria',
    name: 'StarTimes Nova',
    code: 'DTT_Nova Monthly',
    validity: '30 Days',
    priceKobo: 210000n, // ₦2,100
    priceNaira: 2100,
    discountBps: 200,
    interswitchPaymentCode: '24019',
    monnifyPlanCode: 'STARTIMES_NOVA',
    description: 'Affordable digital TV package with 30+ local channels',
  },
  {
    id: 'startimes-basic',
    operator: CableOperator.STARTIMES,
    operatorName: 'StarTimes Nigeria',
    name: 'StarTimes Basic',
    code: 'DTT_Basic Monthly',
    validity: '30 Days',
    priceKobo: 400000n, // ₦4,000
    priceNaira: 4000,
    discountBps: 200,
    interswitchPaymentCode: '24017',
    monnifyPlanCode: 'STARTIMES_BASIC',
    description: 'Over 45 digital channels including movies, kids, and news',
  },
  {
    id: 'startimes-classic',
    operator: CableOperator.STARTIMES,
    operatorName: 'StarTimes Nigeria',
    name: 'StarTimes Classic',
    code: 'DTT_Classic Monthly',
    validity: '30 Days',
    priceKobo: 600000n, // ₦6,000
    priceNaira: 6000,
    discountBps: 200,
    interswitchPaymentCode: '24013',
    monnifyPlanCode: 'STARTIMES_CLASSIC',
    description: 'Comprehensive bouquet with Bundesliga football and entertainment',
  },
  {
    id: 'startimes-super',
    operator: CableOperator.STARTIMES,
    operatorName: 'StarTimes Nigeria',
    name: 'StarTimes Super',
    code: 'DTT_Super Monthly',
    validity: '30 Days',
    priceKobo: 950000n, // ₦9,500
    priceNaira: 9500,
    discountBps: 200,
    interswitchPaymentCode: '24025',
    monnifyPlanCode: 'STARTIMES_SUPER',
    description: 'Full HD access to all StarTimes sports, movie, and global channels',
  },
];

export interface CableValidationDto {
  isValid: boolean;
  smartcard: string;
  operator: CableOperator;
  operatorName: string;
  customerName?: string;
  customerNumber?: string;
  accountStatus?: string;
  outstandingBalanceKobo?: string;
  outstandingBalanceNaira?: number;
  responseCode: string;
  responseMessage: string;
}

export interface PurchaseCableInput {
  businessId: string;
  userId: string;
  operator: CableOperator;
  smartcard: string;
  bouquetId: string;
  customerMobile?: string;
  customerName?: string;
  clientReference?: string;
  idempotencyKey?: string;
}

export interface CableReceiptDto {
  transactionId: string;
  status: TransactionStatus;
  operator: CableOperator;
  operatorName: string;
  smartcard: string;
  customerName?: string;
  bouquetId: string;
  bouquetName: string;
  validity: string;
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

export class CableService {
  private readonly router: ProviderRouterService;

  constructor(router: ProviderRouterService = providerRouterService) {
    this.router = router;
  }

  /**
   * Normalizes smartcard or IUC number by stripping non-digit characters.
   */
  public normalizeSmartcard(smartcard: string, operator?: CableOperator): string {
    const clean = smartcard.replace(/[\s\-()]/g, '');

    if (!/^\d{10,12}$/.test(clean)) {
      throw new ValidationError(
        `Invalid decoder / smartcard number format: '${smartcard}'. Must be between 10 and 12 numeric digits.`,
      );
    }

    if (operator) {
      const opInfo = CABLE_OPERATORS[operator];
      if (clean.length < opInfo.minSmartcardDigits || clean.length > opInfo.maxSmartcardDigits) {
        throw new ValidationError(
          `${opInfo.name} ${opInfo.customerField} must be between ${opInfo.minSmartcardDigits} and ${opInfo.maxSmartcardDigits} digits. Got ${clean.length} digits ('${smartcard}').`,
        );
      }
    }

    return clean;
  }

  /**
   * Retrieves list of supported Cable TV operators.
   */
  public getOperators() {
    return Object.values(CABLE_OPERATORS).map((op) => ({
      code: op.code,
      name: op.name,
      shortName: op.shortName,
      billerId: op.billerId,
      customerField: op.customerField,
      defaultDiscountBps: op.defaultDiscountBps,
      defaultDiscountPercent: (op.defaultDiscountBps / 100).toFixed(1) + '%',
    }));
  }

  /**
   * Retrieves cable bouquets, optionally filtered by operator.
   */
  public getBouquets(operator?: CableOperator) {
    return CABLE_BOUQUETS.filter((b) => {
      if (operator && b.operator !== operator) return false;
      return true;
    }).map((b) => ({
      id: b.id,
      operator: b.operator,
      operatorName: b.operatorName,
      name: b.name,
      code: b.code,
      validity: b.validity,
      priceKobo: b.priceKobo.toString(),
      priceNaira: b.priceNaira,
      formattedPrice: formatNairaFromKobo(b.priceKobo),
      discountBps: b.discountBps,
      discountPercent: (b.discountBps / 100).toFixed(1) + '%',
      description: b.description,
    }));
  }

  /**
   * Finds a single bouquet by its ID.
   */
  public getBouquetById(bouquetId: string): CableBouquet {
    const bouquet = CABLE_BOUQUETS.find((b) => b.id === bouquetId);
    if (!bouquet) {
      throw new NotFoundError(`Cable bouquet with ID '${bouquetId}' was not found.`);
    }
    return bouquet;
  }

  /**
   * Real-time Customer & Smartcard Validation:
   * Queries provider gateway to confirm subscriber identity, status, and smartcard validity.
   */
  public async validateSmartcard(
    operator: CableOperator,
    smartcard: string,
  ): Promise<CableValidationDto> {
    const cleanSmartcard = this.normalizeSmartcard(smartcard, operator);
    const opInfo = CABLE_OPERATORS[operator];
    if (!opInfo) {
      throw new ValidationError(`Unsupported cable operator: '${operator}'.`);
    }

    try {
      const result = await this.router.validateCustomer({
        serviceType: ServiceType.CABLE_TV,
        paymentCode: opInfo.defaultPaymentCode,
        customerId: cleanSmartcard,
      });

      return {
        isValid: result.isValid,
        smartcard: cleanSmartcard,
        operator,
        operatorName: opInfo.name,
        customerName: result.customerName || undefined,
        customerNumber: cleanSmartcard,
        accountStatus: result.isValid ? 'ACTIVE' : 'INACTIVE',
        outstandingBalanceKobo: result.outstandingBalanceKobo
          ? result.outstandingBalanceKobo.toString()
          : undefined,
        outstandingBalanceNaira: result.outstandingBalanceKobo
          ? koboToNaira(result.outstandingBalanceKobo)
          : undefined,
        responseCode: result.responseCode,
        responseMessage: result.responseMessage,
      };
    } catch (err) {
      // Graceful fallback response if customer validation encounters network issues
      return {
        isValid: false,
        smartcard: cleanSmartcard,
        operator,
        operatorName: opInfo.name,
        responseCode: 'VALIDATION_FAILED',
        responseMessage: (err as Error).message || 'Decoder validation failed.',
      };
    }
  }

  /**
   * End-to-end Cable TV Subscription Purchase workflow:
   * 1. Smartcard & Bouquet Validation
   * 2. Idempotency Lock Check
   * 3. Concurrency-safe Wallet Debit (with merchant discount)
   * 4. Multi-provider Vending with Automatic Failover
   * 5. Double-Entry Ledger Commitment
   * 6. Automatic Rollback & Refund if provider vending fails
   */
  public async purchaseBouquet(input: PurchaseCableInput): Promise<CableReceiptDto> {
    const cleanSmartcard = this.normalizeSmartcard(input.smartcard, input.operator);
    const bouquet = this.getBouquetById(input.bouquetId);

    if (input.operator !== bouquet.operator) {
      throw new ValidationError(
        `Selected bouquet '${bouquet.name}' belongs to ${bouquet.operatorName}, but requested operator is ${input.operator}.`,
      );
    }

    // 1. Check Idempotency Lock
    if (input.idempotencyKey) {
      const lock = await idempotencyService.acquireLock(
        input.idempotencyKey,
        input.businessId,
        `CABLE_${input.operator}_${cleanSmartcard}_${bouquet.id}`,
      );

      if (lock.isCompleted && lock.responseBody) {
        return lock.responseBody as CableReceiptDto;
      }
    }

    // 2. Compute Pricing & Merchant Discount
    const faceAmountKobo = bouquet.priceKobo;
    const discountKobo = (faceAmountKobo * BigInt(bouquet.discountBps)) / 10000n;
    const amountToDebitKobo = faceAmountKobo - discountKobo;

    // 3. Resolve Business Wallets
    const mainWallet = await walletService.getBusinessWallet(input.businessId, WalletType.MAIN);
    const balanceBeforeKobo = BigInt(mainWallet.balanceKobo);

    // Concurrency-safe wallet debit (locks and decrements balance)
    await walletService.debitWallet(mainWallet.id, amountToDebitKobo);
    const balanceAfterKobo = balanceBeforeKobo - amountToDebitKobo;

    // 4. Generate references & initialize service transaction row
    const requestReference = generateInterswitchReference('2411', 12);
    const clientRef = input.clientReference || generateTransactionReference('CABLE');

    const [txnRow] = await db
      .insert(serviceTransactions)
      .values({
        businessId: input.businessId,
        userId: input.userId,
        serviceType: ServiceType.CABLE_TV,
        amount: faceAmountKobo,
        fee: 0n,
        discount: discountKobo,
        totalAmount: amountToDebitKobo,
        status: TransactionStatus.PROCESSING,
        recipient: cleanSmartcard,
        providerName: 'MONNIFY' as any,
        clientReference: clientRef,
        requestReference,
        metadata: {
          operator: bouquet.operator,
          operatorName: bouquet.operatorName,
          bouquetId: bouquet.id,
          bouquetName: bouquet.name,
          validity: bouquet.validity,
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
          serviceType: ServiceType.CABLE_TV,
          paymentCode: bouquet.interswitchPaymentCode,
          customerId: cleanSmartcard,
          customerMobile: input.customerMobile,
          amountKobo: faceAmountKobo,
          requestReference,
        },
        txnRow.id,
      );

      if (vendResult.status !== TransactionStatus.SUCCESSFUL) {
        throw new AppError(
          `Cable TV vending failed with response code ${vendResult.responseCode}: ${vendResult.responseMessage}`,
          502,
          'PROVIDER_VEND_FAILED',
        );
      }

      // 6. Update transaction to SUCCESSFUL
      await db
        .update(serviceTransactions)
        .set({
          status: TransactionStatus.SUCCESSFUL,
          providerName: vendResult.providerName,
          providerReference: vendResult.providerReference || requestReference,
          updatedAt: new Date(),
        })
        .where(eq(serviceTransactions.id, txnRow.id));

      // 7. Post balanced Zero-Sum Financial Ledger entry
      await ledgerService.recordDoubleEntry({
        businessId: input.businessId,
        reference: clientRef,
        type: LedgerEntryType.SERVICE_PAYMENT,
        category: 'CABLE_TV_PURCHASE',
        description: `Cable TV subscription: ${bouquet.name} on ${bouquet.operatorName} to smartcard ${cleanSmartcard}`,
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

      const receipt: CableReceiptDto = {
        transactionId: txnRow.id,
        status: TransactionStatus.SUCCESSFUL,
        operator: bouquet.operator,
        operatorName: bouquet.operatorName,
        smartcard: cleanSmartcard,
        customerName: input.customerName || vendResult.customerName,
        bouquetId: bouquet.id,
        bouquetName: bouquet.name,
        validity: bouquet.validity,
        faceAmountKobo: faceAmountKobo.toString(),
        faceAmountNaira: bouquet.priceNaira,
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
          console.error('[CableService] Webhook dispatch failed:', err);
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
          serviceType: ServiceType.CABLE,
          errorMessage: (error as Error).message,
          smartcard: cleanSmartcard,
          operator: bouquet.operator,
          reference: requestReference,
          clientReference: clientRef,
          timestamp: new Date().toISOString(),
        })
        .catch((err) => {
          console.error('[CableService] Failure webhook dispatch failed:', err);
        });

      throw error;
    }
  }

  /**
   * Retrieves Cable TV transaction history for a business tenant.
   */
  public async getCableHistory(
    businessId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ transactions: CableReceiptDto[]; total: number }> {
    const rows = await db
      .select()
      .from(serviceTransactions)
      .where(
        and(
          eq(serviceTransactions.businessId, businessId),
          eq(serviceTransactions.serviceType, ServiceType.CABLE_TV),
        ),
      )
      .orderBy(desc(serviceTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    const transactions: CableReceiptDto[] = rows.map((r) => {
      const meta = (r.metadata || {}) as Record<string, string>;
      const operator = (meta.operator || CableOperator.DSTV) as CableOperator;
      const bouquet = CABLE_BOUQUETS.find((b) => b.id === meta.bouquetId) || CABLE_BOUQUETS[0]!;

      return {
        transactionId: r.id,
        status: r.status as TransactionStatus,
        operator,
        operatorName: bouquet.operatorName,
        smartcard: r.recipient,
        customerName: meta.customerName || undefined,
        bouquetId: bouquet.id,
        bouquetName: meta.bouquetName || bouquet.name,
        validity: meta.validity || bouquet.validity,
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

export const cableService = new CableService();

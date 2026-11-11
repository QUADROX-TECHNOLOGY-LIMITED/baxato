import {
  TelecomNetwork,
  ServiceType,
  ProviderName,
  TransactionStatus,
  LedgerDirection,
  LedgerEntryType,
  WalletType,
  generateNumericReference,
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
import { walletService } from './wallet.service.js';
import { ledgerService } from './ledger.service.js';
import { idempotencyService } from './idempotency.service.js';
import { webhookDispatcherService } from './webhook-dispatcher.service.js';
import {
  providerRouterService,
  ProviderRouterService,
} from './providers/index.js';
import { TELCO_PREFIXES } from './airtime.service.js';
import {
  DATA_PLANS,
  filterCatalogForProvider,
  getAvailableCategoriesForPlans,
  toPublicDataPlanDto,
  type DataPlan,
  type DataPlanCategory,
  type DataDeliveryType,
  type PublicDataPlanDto,
} from './data-catalog.js';

export {
  DATA_PLANS,
  type DataPlan,
  type DataPlanCategory,
  type DataDeliveryType,
  type PublicDataPlanDto,
};

export interface PurchaseDataInput {
  businessId: string;
  userId: string;
  phone: string;
  planId: string;
  network?: TelecomNetwork;
  clientReference?: string;
  idempotencyKey?: string;
}

export interface DataReceiptDto {
  transactionId: string;
  status: TransactionStatus;
  recipientPhone: string;
  network: TelecomNetwork;
  networkName: string;
  planId: string;
  planName: string;
  dataAllowance: string;
  dataType?: DataDeliveryType;
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

export class DataService {
  private readonly router: ProviderRouterService;

  constructor(router: ProviderRouterService = providerRouterService) {
    this.router = router;
  }

  /**
   * Normalizes Nigerian phone number to 11-digit local format.
   */
  public normalizePhoneNumber(phone: string): string {
    let clean = phone.replace(/[\s\-()]/g, '');
    if (clean.startsWith('+234')) {
      clean = '0' + clean.slice(4);
    } else if (clean.startsWith('234')) {
      clean = '0' + clean.slice(3);
    }

    if (!/^0[789][01]\d{8}$/.test(clean)) {
      throw new ValidationError(
        `Invalid Nigerian phone number format: '${phone}'. Must be an 11-digit number.`,
      );
    }

    return clean;
  }

  /**
   * Auto-detects telecom operator from Nigerian phone prefix.
   */
  public detectNetwork(phone: string): TelecomNetwork {
    const normalized = this.normalizePhoneNumber(phone);
    const prefix = normalized.slice(0, 4);

    for (const [network, prefixes] of Object.entries(TELCO_PREFIXES)) {
      if (prefixes.includes(prefix)) {
        return network as TelecomNetwork;
      }
    }

    throw new ValidationError(
      `Could not auto-detect telecom operator for prefix '${prefix}'. Please select network manually.`,
    );
  }

  /**
   * Resolves the currently activated primary provider for Data Bundles without exposing
   * vendor details externally. Falls back to MONNIFY when a test router stub omits resolveDynamicRouting.
   */
  private async resolveActivePrimaryProvider(): Promise<ProviderName> {
    if (typeof this.router.resolveDynamicRouting === 'function') {
      const routing = await this.router.resolveDynamicRouting(ServiceType.DATA);
      return routing.primaryName;
    }
    return ProviderName.MONNIFY;
  }

  /**
   * Builds a standardized data bundle receipt payload.
   */
  private buildReceipt(params: {
    transactionId: string;
    status: TransactionStatus;
    recipientPhone: string;
    plan: DataPlan;
    faceAmountKobo: bigint;
    discountKobo: bigint;
    amountToDebitKobo: bigint;
    reference: string;
    clientReference?: string;
    providerReference?: string;
    providerName: string;
    createdAt: Date;
  }): DataReceiptDto {
    const {
      transactionId,
      status,
      recipientPhone,
      plan,
      faceAmountKobo,
      discountKobo,
      amountToDebitKobo,
      reference,
      clientReference,
      providerReference,
      providerName,
      createdAt,
    } = params;

    return {
      transactionId,
      status,
      recipientPhone,
      network: plan.network,
      networkName: plan.networkName,
      planId: plan.id,
      planName: plan.name,
      dataAllowance: plan.dataAllowance,
      dataType: plan.dataType,
      validity: plan.validity,
      faceAmountKobo: faceAmountKobo.toString(),
      faceAmountNaira: plan.priceNaira,
      formattedFaceAmount: formatNairaFromKobo(faceAmountKobo),
      discountKobo: discountKobo.toString(),
      discountNaira: koboToNaira(discountKobo),
      formattedDiscount: formatNairaFromKobo(discountKobo),
      amountDebitedKobo: amountToDebitKobo.toString(),
      amountDebitedNaira: koboToNaira(amountToDebitKobo),
      formattedAmountDebited: formatNairaFromKobo(amountToDebitKobo),
      reference,
      clientReference,
      providerReference,
      providerName,
      createdAt,
    };
  }

  /**
   * Retrieves data plans supported by the currently activated provider,
   * optionally filtered by network, category, and delivery type (DIRECT vs SME).
   */
  public async getDataPlans(
    network?: TelecomNetwork,
    category?: DataPlanCategory,
    dataType?: DataDeliveryType,
  ): Promise<PublicDataPlanDto[]> {
    const primaryProvider = await this.resolveActivePrimaryProvider();
    const filtered = filterCatalogForProvider(DATA_PLANS, primaryProvider, {
      network,
      category,
      dataType,
    });
    return filtered.map(toPublicDataPlanDto);
  }

  /**
   * Returns categories and delivery types available for the currently activated provider.
   */
  public async getAvailableCategories(network?: TelecomNetwork): Promise<{
    categories: DataPlanCategory[];
    dataTypes: DataDeliveryType[];
  }> {
    const primaryProvider = await this.resolveActivePrimaryProvider();
    const plans = filterCatalogForProvider(DATA_PLANS, primaryProvider, { network });
    const categories = getAvailableCategoriesForPlans(plans);
    const dataTypes: DataDeliveryType[] = [];
    if (plans.some((p) => p.dataType === 'DIRECT')) dataTypes.push('DIRECT');
    if (plans.some((p) => p.dataType === 'SME')) dataTypes.push('SME');
    return { categories, dataTypes };
  }

  /**
   * Finds a single plan by its ID.
   */
  public getPlanById(planId: string): DataPlan {
    const plan = DATA_PLANS.find((p) => p.id === planId);
    if (!plan) {
      throw new NotFoundError(`Data plan with ID '${planId}' was not found.`);
    }
    return plan;
  }

  /**
   * End-to-end Data Bundle Purchase workflow:
   * 1. Active Provider Eligibility, Phone & Plan Validation
   * 2. Idempotency Lock Check
   * 3. Concurrency-safe Wallet Debit (with merchant discount)
   * 4. Multi-provider Vending with Automatic Failover
   * 5. Double-Entry Ledger Commitment
   * 6. Automatic Rollback & Refund if provider vending fails
   */
  public async purchaseDataBundle(input: PurchaseDataInput): Promise<DataReceiptDto> {
    const normalizedPhone = this.normalizePhoneNumber(input.phone);
    const plan = this.getPlanById(input.planId);
    const primaryProvider = await this.resolveActivePrimaryProvider();

    if (!plan.supportedProviders.includes(primaryProvider)) {
      throw new ValidationError(
        `The selected data plan '${plan.name}' is not currently available. Please refresh available data plans and try again.`,
      );
    }

    // Verify phone prefix matches selected plan network
    const detectedNet = this.detectNetwork(normalizedPhone);
    if (input.network && input.network !== plan.network) {
      throw new ValidationError(
        `Selected plan '${plan.name}' belongs to ${plan.networkName}, but network specified is ${input.network}.`,
      );
    }
    if (detectedNet !== plan.network) {
      throw new ValidationError(
        `Phone number '${normalizedPhone}' is on ${detectedNet}, but selected plan '${plan.name}' is for ${plan.networkName}.`,
      );
    }

    // 1. Check Idempotency Lock
    if (input.idempotencyKey) {
      const lock = await idempotencyService.acquireLock(
        input.idempotencyKey,
        input.businessId,
        `DATA_${normalizedPhone}_${plan.id}`,
      );

      if (lock.isCompleted && lock.responseBody) {
        return lock.responseBody as DataReceiptDto;
      }
    }

    // 2. Compute Pricing & Merchant Discount
    const faceAmountKobo = plan.priceKobo;
    const discountKobo = (faceAmountKobo * BigInt(plan.discountBps)) / 10000n;
    const amountToDebitKobo = faceAmountKobo - discountKobo;

    // 3. Resolve Business Wallets
    const mainWallet = await walletService.getBusinessWallet(input.businessId, WalletType.MAIN);
    const balanceBeforeKobo = BigInt(mainWallet.balanceKobo);

    // Concurrency-safe wallet debit (locks and decrements balance)
    await walletService.debitWallet(mainWallet.id, amountToDebitKobo);
    const balanceAfterKobo = balanceBeforeKobo - amountToDebitKobo;

    // 4. Generate references & initialize service transaction row
    const requestReference = generateNumericReference('2411', 12);
    const clientRef = input.clientReference || generateTransactionReference('DATA');

    const [txnRow] = await db
      .insert(serviceTransactions)
      .values({
        businessId: input.businessId,
        userId: input.userId,
        serviceType: ServiceType.DATA,
        amount: faceAmountKobo,
        fee: 0n,
        discount: discountKobo,
        totalAmount: amountToDebitKobo,
        status: TransactionStatus.PROCESSING,
        recipient: normalizedPhone,
        providerName: primaryProvider as any,
        clientReference: clientRef,
        requestReference,
        metadata: {
          planId: plan.id,
          planName: plan.name,
          dataAllowance: plan.dataAllowance,
          dataType: plan.dataType,
          category: plan.category,
          validity: plan.validity,
          network: plan.network,
          networkName: plan.networkName,
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
          serviceType: ServiceType.DATA,
          paymentCode: plan.monnifyPlanCode || plan.vtpassVariationCode || plan.id,
          customerId: normalizedPhone,
          customerMobile: normalizedPhone,
          amountKobo: faceAmountKobo,
          requestReference,
          metadata: {
            network: plan.network,
            dataType: plan.dataType,
            monnifyPlanCode: plan.monnifyPlanCode || undefined,
            productCode: plan.monnifyPlanCode || undefined,
            vtpassServiceId: plan.vtpassServiceId,
            vtpassVariationCode: plan.vtpassVariationCode,
          },
        },
        txnRow.id,
      );

      if (
        vendResult.status === TransactionStatus.PROCESSING ||
        vendResult.status === TransactionStatus.PENDING
      ) {
        await db
          .update(serviceTransactions)
          .set({
            status: TransactionStatus.PROCESSING,
            providerName: vendResult.providerName,
            providerReference: vendResult.providerReference || requestReference,
            updatedAt: new Date(),
          })
          .where(eq(serviceTransactions.id, txnRow.id));

        await ledgerService.recordDoubleEntry({
          businessId: input.businessId,
          reference: clientRef,
          type: LedgerEntryType.SERVICE_PAYMENT,
          category: 'DATA_PURCHASE',
          description: `Data bundle purchase (Processing): ${plan.name} (${plan.dataAllowance}) to ${normalizedPhone}`,
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
        });

        const processingReceipt = this.buildReceipt({
          transactionId: txnRow.id,
          status: TransactionStatus.PROCESSING,
          recipientPhone: normalizedPhone,
          plan,
          faceAmountKobo,
          discountKobo,
          amountToDebitKobo,
          reference: requestReference,
          clientReference: clientRef,
          providerReference: vendResult.providerReference,
          providerName: vendResult.providerName,
          createdAt: new Date(),
        });

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

      if (vendResult.status !== TransactionStatus.SUCCESSFUL) {
        throw new AppError(
          `Data bundle vending failed with response code ${vendResult.responseCode}: ${vendResult.responseMessage}`,
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
        category: 'DATA_PURCHASE',
        description: `Data bundle purchase: ${plan.name} (${plan.dataAllowance}) to ${normalizedPhone}`,
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

      const receipt = this.buildReceipt({
        transactionId: txnRow.id,
        status: TransactionStatus.SUCCESSFUL,
        recipientPhone: normalizedPhone,
        plan,
        faceAmountKobo,
        discountKobo,
        amountToDebitKobo,
        reference: requestReference,
        clientReference: clientRef,
        providerReference: vendResult.providerReference,
        providerName: vendResult.providerName,
        createdAt: new Date(),
      });

      // Save idempotency response if key provided
      if (input.idempotencyKey) {
        await idempotencyService.completeLock(input.idempotencyKey, input.businessId, 201, receipt);
      }

      // Outbound Webhook Dispatch (fire-and-forget / non-blocking)
      webhookDispatcherService
        .dispatch(input.businessId, WebhookEventType.TRANSACTION_SUCCESSFUL, receipt)
        .catch((err) => {
          console.error('[DataService] Webhook dispatch failed:', err);
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
          serviceType: ServiceType.DATA,
          errorMessage: (error as Error).message,
          recipient: normalizedPhone,
          planId: plan.id,
          reference: requestReference,
          clientReference: clientRef,
          timestamp: new Date().toISOString(),
        })
        .catch((err) => {
          console.error('[DataService] Failure webhook dispatch failed:', err);
        });

      throw error;
    }
  }

  /**
   * Retrieves paginated data bundle purchase history for a business.
   */
  public async getDataHistory(
    businessId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ transactions: DataReceiptDto[]; total: number }> {
    const rows = await db
      .select()
      .from(serviceTransactions)
      .where(
        and(
          eq(serviceTransactions.businessId, businessId),
          eq(serviceTransactions.serviceType, ServiceType.DATA),
        ),
      )
      .orderBy(desc(serviceTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    const transactions: DataReceiptDto[] = rows.map((r) => {
      const meta = (r.metadata || {}) as Record<string, string>;
      const network = (meta.network || TelecomNetwork.MTN) as TelecomNetwork;
      const plan = DATA_PLANS.find((p) => p.id === meta.planId);

      return {
        transactionId: r.id,
        status: r.status as TransactionStatus,
        recipientPhone: r.recipient,
        network,
        networkName: meta.networkName || plan?.networkName || network,
        planId: meta.planId || plan?.id || 'unknown',
        planName: meta.planName || plan?.name || 'Mobile Data Bundle',
        dataAllowance: meta.dataAllowance || plan?.dataAllowance || '',
        dataType: (meta.dataType as DataDeliveryType | undefined) || plan?.dataType,
        validity: meta.validity || plan?.validity || '',
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

export const dataService = new DataService();

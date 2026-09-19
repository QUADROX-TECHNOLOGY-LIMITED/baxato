import {
  TelecomNetwork,
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
import { TELCO_PREFIXES } from './airtime.service';

export type DataPlanCategory = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MEGA';

export interface DataPlan {
  id: string;
  network: TelecomNetwork;
  networkName: string;
  name: string;
  dataAllowance: string;
  category: DataPlanCategory;
  validity: string;
  priceKobo: bigint;
  priceNaira: number;
  discountBps: number; // e.g. 250 = 2.5%
  interswitchPaymentCode: string;
  monnifyPlanCode: string;
}

export const DATA_PLANS: DataPlan[] = [
  // MTN
  {
    id: 'mtn_daily_100mb',
    network: TelecomNetwork.MTN,
    networkName: 'MTN Nigeria',
    name: 'MTN 100MB Daily Plan',
    dataAllowance: '100MB',
    category: 'DAILY',
    validity: '1 Day',
    priceKobo: 10000n, // ₦100 (Verified Pilot: 34814470)
    priceNaira: 100,
    discountBps: 250,
    interswitchPaymentCode: '34814470',
    monnifyPlanCode: 'MTN_100MB_1D',
  },
  {
    id: 'mtn_2day_1gb',
    network: TelecomNetwork.MTN,
    networkName: 'MTN Nigeria',
    name: 'MTN 1GB 2-Day Plan',
    dataAllowance: '1GB',
    category: 'DAILY',
    validity: '2 Days',
    priceKobo: 50000n, // ₦500
    priceNaira: 500,
    discountBps: 250,
    interswitchPaymentCode: '34814471',
    monnifyPlanCode: 'MTN_1GB_2D',
  },
  {
    id: 'mtn_weekly_1_5gb',
    network: TelecomNetwork.MTN,
    networkName: 'MTN Nigeria',
    name: 'MTN 1.5GB Weekly Plan',
    dataAllowance: '1.5GB',
    category: 'WEEKLY',
    validity: '7 Days',
    priceKobo: 100000n, // ₦1,000
    priceNaira: 1000,
    discountBps: 250,
    interswitchPaymentCode: '34814472',
    monnifyPlanCode: 'MTN_1.5GB_7D',
  },
  {
    id: 'mtn_monthly_2_5gb',
    network: TelecomNetwork.MTN,
    networkName: 'MTN Nigeria',
    name: 'MTN 2.5GB Monthly Plan',
    dataAllowance: '2.5GB',
    category: 'MONTHLY',
    validity: '30 Days',
    priceKobo: 150000n, // ₦1,500
    priceNaira: 1500,
    discountBps: 250,
    interswitchPaymentCode: '34814473',
    monnifyPlanCode: 'MTN_2.5GB_30D',
  },
  {
    id: 'mtn_monthly_10gb',
    network: TelecomNetwork.MTN,
    networkName: 'MTN Nigeria',
    name: 'MTN 10GB Monthly Pro Plan',
    dataAllowance: '10GB',
    category: 'MONTHLY',
    validity: '30 Days',
    priceKobo: 500000n, // ₦5,000
    priceNaira: 5000,
    discountBps: 250,
    interswitchPaymentCode: '34814474',
    monnifyPlanCode: 'MTN_10GB_30D',
  },

  // Airtel
  {
    id: 'airtel_daily_100mb',
    network: TelecomNetwork.AIRTEL,
    networkName: 'Airtel Nigeria',
    name: 'Airtel 100MB Daily Plan',
    dataAllowance: '100MB',
    category: 'DAILY',
    validity: '1 Day',
    priceKobo: 10000n, // ₦100 (Verified Pilot: 04277538)
    priceNaira: 100,
    discountBps: 250,
    interswitchPaymentCode: '04277538',
    monnifyPlanCode: 'AIRTEL_100MB_1D',
  },
  {
    id: 'airtel_2day_1gb',
    network: TelecomNetwork.AIRTEL,
    networkName: 'Airtel Nigeria',
    name: 'Airtel 1GB 2-Day Plan',
    dataAllowance: '1GB',
    category: 'DAILY',
    validity: '2 Days',
    priceKobo: 50000n, // ₦500
    priceNaira: 500,
    discountBps: 250,
    interswitchPaymentCode: '04277539',
    monnifyPlanCode: 'AIRTEL_1GB_2D',
  },
  {
    id: 'airtel_weekly_1_5gb',
    network: TelecomNetwork.AIRTEL,
    networkName: 'Airtel Nigeria',
    name: 'Airtel 1.5GB Weekly Plan',
    dataAllowance: '1.5GB',
    category: 'WEEKLY',
    validity: '7 Days',
    priceKobo: 100000n, // ₦1,000
    priceNaira: 1000,
    discountBps: 250,
    interswitchPaymentCode: '04277540',
    monnifyPlanCode: 'AIRTEL_1.5GB_7D',
  },
  {
    id: 'airtel_monthly_3gb',
    network: TelecomNetwork.AIRTEL,
    networkName: 'Airtel Nigeria',
    name: 'Airtel 3GB Monthly Plan',
    dataAllowance: '3GB',
    category: 'MONTHLY',
    validity: '30 Days',
    priceKobo: 150000n, // ₦1,500
    priceNaira: 1500,
    discountBps: 250,
    interswitchPaymentCode: '04277541',
    monnifyPlanCode: 'AIRTEL_3GB_30D',
  },
  {
    id: 'airtel_monthly_10gb',
    network: TelecomNetwork.AIRTEL,
    networkName: 'Airtel Nigeria',
    name: 'Airtel 10GB Monthly Pro Plan',
    dataAllowance: '10GB',
    category: 'MONTHLY',
    validity: '30 Days',
    priceKobo: 500000n, // ₦5,000
    priceNaira: 5000,
    discountBps: 250,
    interswitchPaymentCode: '04277542',
    monnifyPlanCode: 'AIRTEL_10GB_30D',
  },

  // Glo
  {
    id: 'glo_daily_150mb',
    network: TelecomNetwork.GLO,
    networkName: 'Globacom',
    name: 'Glo 150MB Daily Plan',
    dataAllowance: '150MB',
    category: 'DAILY',
    validity: '1 Day',
    priceKobo: 10000n, // ₦100
    priceNaira: 100,
    discountBps: 350, // 3.5%
    interswitchPaymentCode: '4020101',
    monnifyPlanCode: 'GLO_150MB_1D',
  },
  {
    id: 'glo_weekly_1_25gb',
    network: TelecomNetwork.GLO,
    networkName: 'Globacom',
    name: 'Glo 1.25GB Weekly Plan',
    dataAllowance: '1.25GB',
    category: 'WEEKLY',
    validity: '7 Days',
    priceKobo: 50000n, // ₦500
    priceNaira: 500,
    discountBps: 350,
    interswitchPaymentCode: '4020102',
    monnifyPlanCode: 'GLO_1.25GB_7D',
  },
  {
    id: 'glo_monthly_2_5gb',
    network: TelecomNetwork.GLO,
    networkName: 'Globacom',
    name: 'Glo 2.5GB Monthly Plan',
    dataAllowance: '2.5GB',
    category: 'MONTHLY',
    validity: '30 Days',
    priceKobo: 100000n, // ₦1,000
    priceNaira: 1000,
    discountBps: 350,
    interswitchPaymentCode: '4020103',
    monnifyPlanCode: 'GLO_2.5GB_30D',
  },
  {
    id: 'glo_monthly_7_5gb',
    network: TelecomNetwork.GLO,
    networkName: 'Globacom',
    name: 'Glo 7.5GB Monthly Mega Plan',
    dataAllowance: '7.5GB',
    category: 'MONTHLY',
    validity: '30 Days',
    priceKobo: 250000n, // ₦2,500
    priceNaira: 2500,
    discountBps: 350,
    interswitchPaymentCode: '4020104',
    monnifyPlanCode: 'GLO_7.5GB_30D',
  },

  // 9mobile
  {
    id: '9mob_daily_100mb',
    network: TelecomNetwork.NINEMOBILE,
    networkName: '9mobile',
    name: '9mobile 100MB Daily Plan',
    dataAllowance: '100MB',
    category: 'DAILY',
    validity: '1 Day',
    priceKobo: 10000n, // ₦100
    priceNaira: 100,
    discountBps: 300, // 3.0%
    interswitchPaymentCode: '1080101',
    monnifyPlanCode: '9MOB_100MB_1D',
  },
  {
    id: '9mob_weekly_1gb',
    network: TelecomNetwork.NINEMOBILE,
    networkName: '9mobile',
    name: '9mobile 1GB Weekly Plan',
    dataAllowance: '1GB',
    category: 'WEEKLY',
    validity: '7 Days',
    priceKobo: 50000n, // ₦500
    priceNaira: 500,
    discountBps: 300,
    interswitchPaymentCode: '1080102',
    monnifyPlanCode: '9MOB_1GB_7D',
  },
  {
    id: '9mob_monthly_2_5gb',
    network: TelecomNetwork.NINEMOBILE,
    networkName: '9mobile',
    name: '9mobile 2.5GB Monthly Plan',
    dataAllowance: '2.5GB',
    category: 'MONTHLY',
    validity: '30 Days',
    priceKobo: 120000n, // ₦1,200
    priceNaira: 1200,
    discountBps: 300,
    interswitchPaymentCode: '1080103',
    monnifyPlanCode: '9MOB_2.5GB_30D',
  },
  {
    id: '9mob_monthly_11gb',
    network: TelecomNetwork.NINEMOBILE,
    networkName: '9mobile',
    name: '9mobile 11GB Monthly Pro Plan',
    dataAllowance: '11GB',
    category: 'MONTHLY',
    validity: '30 Days',
    priceKobo: 400000n, // ₦4,000
    priceNaira: 4000,
    discountBps: 300,
    interswitchPaymentCode: '1080104',
    monnifyPlanCode: '9MOB_11GB_30D',
  },
];

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
   * Retrieves data plans, optionally filtered by network and validity category.
   */
  public getDataPlans(network?: TelecomNetwork, category?: DataPlanCategory) {
    return DATA_PLANS.filter((p) => {
      if (network && p.network !== network) return false;
      if (category && p.category !== category) return false;
      return true;
    }).map((p) => ({
      id: p.id,
      network: p.network,
      networkName: p.networkName,
      name: p.name,
      dataAllowance: p.dataAllowance,
      category: p.category,
      validity: p.validity,
      priceKobo: p.priceKobo.toString(),
      priceNaira: p.priceNaira,
      formattedPrice: formatNairaFromKobo(p.priceKobo),
      discountBps: p.discountBps,
      discountPercent: (p.discountBps / 100).toFixed(1) + '%',
    }));
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
   * 1. Phone & Plan Validation
   * 2. Idempotency Lock Check
   * 3. Concurrency-safe Wallet Debit (with merchant discount)
   * 4. Multi-provider Vending with Automatic Failover
   * 5. Double-Entry Ledger Commitment
   * 6. Automatic Rollback & Refund if provider vending fails
   */
  public async purchaseDataBundle(input: PurchaseDataInput): Promise<DataReceiptDto> {
    const normalizedPhone = this.normalizePhoneNumber(input.phone);
    const plan = this.getPlanById(input.planId);

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
    const requestReference = generateInterswitchReference('2411', 12);
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
        providerName: 'MONNIFY' as any,
        clientReference: clientRef,
        requestReference,
        metadata: {
          planId: plan.id,
          planName: plan.name,
          dataAllowance: plan.dataAllowance,
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
          paymentCode: plan.interswitchPaymentCode,
          customerId: normalizedPhone,
          amountKobo: faceAmountKobo,
          requestReference,
        },
        txnRow.id,
      );

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

      const receipt: DataReceiptDto = {
        transactionId: txnRow.id,
        status: TransactionStatus.SUCCESSFUL,
        recipientPhone: normalizedPhone,
        network: plan.network,
        networkName: plan.networkName,
        planId: plan.id,
        planName: plan.name,
        dataAllowance: plan.dataAllowance,
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
      const plan = DATA_PLANS.find((p) => p.id === meta.planId) || DATA_PLANS[0]!;

      return {
        transactionId: r.id,
        status: r.status as TransactionStatus,
        recipientPhone: r.recipient,
        network,
        networkName: plan.networkName,
        planId: plan.id,
        planName: meta.planName || plan.name,
        dataAllowance: meta.dataAllowance || plan.dataAllowance,
        validity: meta.validity || plan.validity,
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

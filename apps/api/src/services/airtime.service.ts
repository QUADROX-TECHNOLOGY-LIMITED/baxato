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

export interface TelcoNetworkConfig {
  network: TelecomNetwork;
  name: string;
  interswitchPaymentCode: string;
  monnifyNetworkCode: string;
  discountBps: number; // Basis points: 250 = 2.5%
  minAmountKobo: bigint;
  maxAmountKobo: bigint;
  primaryColor: string;
}

export const TELCO_CONFIGS: Record<TelecomNetwork, TelcoNetworkConfig> = {
  [TelecomNetwork.MTN]: {
    network: TelecomNetwork.MTN,
    name: 'MTN Nigeria',
    interswitchPaymentCode: '10901',
    monnifyNetworkCode: 'MTN',
    discountBps: 250, // 2.5% discount
    minAmountKobo: 5000n, // ₦50
    maxAmountKobo: 5000000n, // ₦50,000
    primaryColor: '#FFCC00',
  },
  [TelecomNetwork.AIRTEL]: {
    network: TelecomNetwork.AIRTEL,
    name: 'Airtel Nigeria',
    interswitchPaymentCode: '90102',
    monnifyNetworkCode: 'AIRTEL',
    discountBps: 250, // 2.5% discount
    minAmountKobo: 5000n, // ₦50
    maxAmountKobo: 5000000n, // ₦50,000
    primaryColor: '#FF0000',
  },
  [TelecomNetwork.GLO]: {
    network: TelecomNetwork.GLO,
    name: 'Globacom',
    interswitchPaymentCode: '40201',
    monnifyNetworkCode: 'GLO',
    discountBps: 350, // 3.5% discount
    minAmountKobo: 5000n, // ₦50
    maxAmountKobo: 5000000n, // ₦50,000
    primaryColor: '#28A745',
  },
  [TelecomNetwork.NINEMOBILE]: {
    network: TelecomNetwork.NINEMOBILE,
    name: '9mobile',
    interswitchPaymentCode: '10801',
    monnifyNetworkCode: '9MOBILE',
    discountBps: 300, // 3.0% discount
    minAmountKobo: 5000n, // ₦50
    maxAmountKobo: 5000000n, // ₦50,000
    primaryColor: '#006633',
  },
};

export const TELCO_PREFIXES: Record<TelecomNetwork, string[]> = {
  [TelecomNetwork.MTN]: [
    '0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916',
  ],
  [TelecomNetwork.AIRTEL]: [
    '0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912',
  ],
  [TelecomNetwork.GLO]: [
    '0805', '0807', '0705', '0815', '0811', '0905', '0915',
  ],
  [TelecomNetwork.NINEMOBILE]: [
    '0809', '0817', '0818', '0909', '0908',
  ],
};

export interface PurchaseAirtimeInput {
  businessId: string;
  userId: string;
  phone: string;
  network?: TelecomNetwork;
  amountKobo: bigint;
  clientReference?: string;
  idempotencyKey?: string;
}

export interface AirtimeReceiptDto {
  transactionId: string;
  status: TransactionStatus;
  recipientPhone: string;
  network: TelecomNetwork;
  networkName: string;
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

export class AirtimeService {
  private readonly router: ProviderRouterService;

  constructor(router: ProviderRouterService = providerRouterService) {
    this.router = router;
  }

  /**
   * Normalizes Nigerian phone number to standard 11-digit local format (e.g. 08031234567).
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
   * Auto-detects the telecom network from the phone number prefix.
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
   * Returns list of supported networks and active commercial parameters.
   */
  public getNetworkOptions() {
    return Object.values(TELCO_CONFIGS).map((config) => ({
      network: config.network,
      name: config.name,
      discountPercent: (config.discountBps / 100).toFixed(1) + '%',
      minAmountKobo: config.minAmountKobo.toString(),
      minAmountNaira: koboToNaira(config.minAmountKobo),
      maxAmountKobo: config.maxAmountKobo.toString(),
      maxAmountNaira: koboToNaira(config.maxAmountKobo),
      primaryColor: config.primaryColor,
      supportedPrefixes: TELCO_PREFIXES[config.network],
    }));
  }

  /**
   * End-to-end Airtime Purchase workflow:
   * 1. Phone & Limit Validations
   * 2. Idempotency Lock Check
   * 3. Concurrency-safe Wallet Debit (with merchant discount)
   * 4. Multi-provider Vending with Automatic Failover
   * 5. Double-Entry Ledger Commitment
   * 6. Automatic Rollback & Refund if provider vending fails
   */
  public async purchaseAirtime(input: PurchaseAirtimeInput): Promise<AirtimeReceiptDto> {
    const normalizedPhone = this.normalizePhoneNumber(input.phone);
    const network = input.network || this.detectNetwork(normalizedPhone);
    const config = TELCO_CONFIGS[network];

    if (!config) {
      throw new ValidationError(`Unsupported telecom network: ${network}`);
    }

    // Validate amount boundaries
    if (input.amountKobo < config.minAmountKobo) {
      throw new ValidationError(
        `Minimum airtime purchase for ${config.name} is ${formatNairaFromKobo(config.minAmountKobo)}.`,
      );
    }
    if (input.amountKobo > config.maxAmountKobo) {
      throw new ValidationError(
        `Maximum airtime purchase for ${config.name} is ${formatNairaFromKobo(config.maxAmountKobo)}.`,
      );
    }

    // 1. Check Idempotency Lock
    if (input.idempotencyKey) {
      const lock = await idempotencyService.acquireLock(
        input.idempotencyKey,
        input.businessId,
        `AIRTIME_${normalizedPhone}_${input.amountKobo.toString()}`,
      );

      if (lock.isCompleted && lock.responseBody) {
        return lock.responseBody as AirtimeReceiptDto;
      }
    }

    // 2. Compute Pricing & Discount
    const faceAmountKobo = input.amountKobo;
    const discountKobo = (faceAmountKobo * BigInt(config.discountBps)) / 10000n;
    const amountToDebitKobo = faceAmountKobo - discountKobo;

    // 3. Resolve Business Wallets
    const mainWallet = await walletService.getBusinessWallet(input.businessId, WalletType.MAIN);
    const balanceBeforeKobo = BigInt(mainWallet.balanceKobo);

    // Concurrency-safe wallet debit (locks and decrements balance)
    await walletService.debitWallet(mainWallet.id, amountToDebitKobo);
    const balanceAfterKobo = balanceBeforeKobo - amountToDebitKobo;

    // 4. Generate reference & initialize service transaction row
    const requestReference = generateInterswitchReference('2411', 12);
    const clientRef = input.clientReference || generateTransactionReference('AIRTIME');

    const [txnRow] = await db
      .insert(serviceTransactions)
      .values({
        businessId: input.businessId,
        userId: input.userId,
        serviceType: ServiceType.AIRTIME,
        amount: faceAmountKobo,
        fee: 0n,
        discount: discountKobo,
        totalAmount: amountToDebitKobo,
        status: TransactionStatus.PROCESSING,
        recipient: normalizedPhone,
        providerName: 'MONNIFY' as any, // initial provider
        clientReference: clientRef,
        requestReference,
        metadata: {
          network,
          networkName: config.name,
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
          serviceType: ServiceType.AIRTIME,
          paymentCode: config.interswitchPaymentCode, // ProviderRouter maps to correct biller code
          customerId: normalizedPhone,
          amountKobo: faceAmountKobo,
          requestReference,
        },
        txnRow.id,
      );

      if (vendResult.status !== TransactionStatus.SUCCESSFUL) {
        throw new AppError(
          `Airtime vending failed with response code ${vendResult.responseCode}: ${vendResult.responseMessage}`,
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
        category: 'AIRTIME_PURCHASE',
        description: `Airtime purchase: ${config.name} ₦${koboToNaira(faceAmountKobo)} to ${normalizedPhone}`,
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

      const receipt: AirtimeReceiptDto = {
        transactionId: txnRow.id,
        status: TransactionStatus.SUCCESSFUL,
        recipientPhone: normalizedPhone,
        network,
        networkName: config.name,
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
          console.error('[AirtimeService] Webhook dispatch failed:', err);
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
          serviceType: ServiceType.AIRTIME,
          errorMessage: (error as Error).message,
          recipient: normalizedPhone,
          faceAmountKobo: faceAmountKobo.toString(),
          reference: requestReference,
          clientReference: clientRef,
          timestamp: new Date().toISOString(),
        })
        .catch((err) => {
          console.error('[AirtimeService] Failure webhook dispatch failed:', err);
        });

      throw error;
    }
  }

  /**
   * Retrieves paginated airtime purchase history for a business.
   */
  public async getAirtimeHistory(
    businessId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ transactions: AirtimeReceiptDto[]; total: number }> {
    const rows = await db
      .select()
      .from(serviceTransactions)
      .where(
        and(
          eq(serviceTransactions.businessId, businessId),
          eq(serviceTransactions.serviceType, ServiceType.AIRTIME),
        ),
      )
      .orderBy(desc(serviceTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    const transactions: AirtimeReceiptDto[] = rows.map((r) => {
      const meta = (r.metadata || {}) as Record<string, string>;
      const network = (meta.network || TelecomNetwork.MTN) as TelecomNetwork;
      const config = TELCO_CONFIGS[network] || TELCO_CONFIGS[TelecomNetwork.MTN];

      return {
        transactionId: r.id,
        status: r.status as TransactionStatus,
        recipientPhone: r.recipient,
        network,
        networkName: config.name,
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

export const airtimeService = new AirtimeService();

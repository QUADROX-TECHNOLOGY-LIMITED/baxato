import { ProviderName, ServiceType, TransactionStatus } from '@baxato/common';

/**
 * Standard Customer Validation Request
 */
export interface CustomerValidationRequest {
  serviceType: ServiceType;
  paymentCode: string;
  customerId: string; // phone number, meter number, smartcard number
  amountKobo?: bigint;
}

/**
 * Standard Customer Validation Result
 */
export interface CustomerValidationResult {
  isValid: boolean;
  customerId: string;
  customerName?: string;
  customerAddress?: string;
  outstandingBalanceKobo?: bigint;
  surchargeKobo?: bigint;
  minimumAmountKobo?: bigint;
  maximumAmountKobo?: bigint;
  responseCode: string;
  responseMessage: string;
  rawResponse?: Record<string, unknown>;
}

/**
 * Standard Service Vending Request
 */
export interface ServiceVendingRequest {
  serviceType: ServiceType;
  paymentCode: string;
  customerId: string;      // recipient phone, meter, or smartcard
  customerMobile?: string;  // purchaser / notification phone
  customerEmail?: string;
  amountKobo: bigint;
  requestReference: string; // 12-to-20 alphanumeric reference
  metadata?: Record<string, unknown>;
}

/**
 * Standard Service Vending Result
 */
export interface ServiceVendingResult {
  status: TransactionStatus;
  providerName: ProviderName;
  providerReference?: string;
  requestReference: string;
  amountKobo: bigint;
  responseCode: string;
  responseMessage: string;
  // Specific service vending outputs
  token?: string;          // Electricity prepaid 20-digit STS PIN or Exam PIN
  units?: string;          // Electricity kWh units
  unitsCostKobo?: bigint;
  vatKobo?: bigint;
  tariff?: string;
  feeder?: string;
  customerAddress?: string;
  customerName?: string;
  pinData?: {
    pin: string;
    serialNumber?: string;
    instructions?: string;
  };
  rawResponse?: Record<string, unknown>;
}

/**
 * Standard Transaction Status Query Result
 */
export interface TransactionStatusResult {
  status: TransactionStatus;
  providerName: ProviderName;
  providerReference?: string;
  requestReference: string;
  amountKobo?: bigint;
  responseCode: string;
  responseMessage: string;
  rawResponse?: Record<string, unknown>;
}

/**
 * Provider Health Status
 */
export interface ProviderHealthStatus {
  providerName: ProviderName;
  isHealthy: boolean;
  latencyMs: number;
  message: string;
  checkedAt: Date;
}

/**
 * Unified Provider Adapter Interface
 * All bill payment providers (Interswitch, Monnify, etc.) implement this contract.
 */
export interface ProviderAdapter {
  readonly providerName: ProviderName;

  /**
   * Validate a customer ID (meter number, smartcard, phone number) before payment.
   */
  validateCustomer(request: CustomerValidationRequest): Promise<CustomerValidationResult>;

  /**
   * Vend the service (Airtime, Data, Cable TV, Electricity, Exam PIN).
   */
  vendService(request: ServiceVendingRequest): Promise<ServiceVendingResult>;

  /**
   * Re-query the transaction status from the provider.
   */
  requeryTransaction(requestReference: string, providerReference?: string): Promise<TransactionStatusResult>;

  /**
   * Health check probe for the provider.
   */
  getHealth(): Promise<ProviderHealthStatus>;
}

/**
 * Dynamic Provider Routing Strategies
 */
export enum ProviderRoutingStrategy {
  MONNIFY_PRIMARY_INTERSWITCH_FALLBACK = 'MONNIFY_PRIMARY_INTERSWITCH_FALLBACK',
  INTERSWITCH_PRIMARY_MONNIFY_FALLBACK = 'INTERSWITCH_PRIMARY_MONNIFY_FALLBACK',
  MONNIFY_ONLY = 'MONNIFY_ONLY',
  INTERSWITCH_ONLY = 'INTERSWITCH_ONLY',
}

/**
 * Category-specific routing configuration
 */
export interface ServiceRoutingConfig {
  serviceType: ServiceType;
  strategy: ProviderRoutingStrategy;
  primaryProvider: ProviderName;
  fallbackProvider?: ProviderName;
  allowFailover: boolean;
}

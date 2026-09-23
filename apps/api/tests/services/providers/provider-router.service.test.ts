import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ServiceType,
  TransactionStatus,
  ProviderName,
} from '@baxato/common';
import { env } from '@baxato/config';
import {
  ProviderRouterService,
} from '../../../src/services/providers/provider-router.service';
import {
  ProviderAdapter,
  ProviderRoutingStrategy,
  CustomerValidationResult,
  ServiceVendingResult,
} from '../../../src/services/providers/provider.interface';

describe('ProviderRouterService (Dynamic Routing & Failover)', () => {
  let router: ProviderRouterService;
  let mockInterswitch: ProviderAdapter;
  let mockMonnify: ProviderAdapter;

  beforeEach(() => {
    mockInterswitch = {
      providerName: ProviderName.INTERSWITCH,
      validateCustomer: vi.fn().mockResolvedValue({
        isValid: true,
        customerId: '08012345678',
        responseCode: '90000',
        responseMessage: 'ISW Validated',
      } as CustomerValidationResult),
      vendService: vi.fn().mockResolvedValue({
        status: TransactionStatus.SUCCESSFUL,
        providerName: ProviderName.INTERSWITCH,
        providerReference: 'ISW_TXN_001',
        requestReference: 'REF_001',
        amountKobo: 10000n,
        responseCode: '90000',
        responseMessage: 'ISW Vended',
      } as ServiceVendingResult),
      requeryTransaction: vi.fn(),
      getHealth: vi.fn().mockResolvedValue({
        providerName: ProviderName.INTERSWITCH,
        isHealthy: true,
        latencyMs: 45,
        message: 'Healthy',
        checkedAt: new Date(),
      }),
    };

    mockMonnify = {
      providerName: ProviderName.MONNIFY,
      validateCustomer: vi.fn().mockResolvedValue({
        isValid: true,
        customerId: '08012345678',
        responseCode: '0',
        responseMessage: 'MNFY Validated',
      } as CustomerValidationResult),
      vendService: vi.fn().mockResolvedValue({
        status: TransactionStatus.SUCCESSFUL,
        providerName: ProviderName.MONNIFY,
        providerReference: 'MNFY_TXN_001',
        requestReference: 'REF_001',
        amountKobo: 10000n,
        responseCode: '0',
        responseMessage: 'MNFY Vended',
      } as ServiceVendingResult),
      requeryTransaction: vi.fn(),
      getHealth: vi.fn().mockResolvedValue({
        providerName: ProviderName.MONNIFY,
        isHealthy: true,
        latencyMs: 35,
        message: 'Healthy',
        checkedAt: new Date(),
      }),
    };

    router = new ProviderRouterService({
      env,
      interswitchProvider: mockInterswitch,
      monnifyProvider: mockMonnify,
    });
  });

  it('initializes default routing rules correctly', () => {
    const examConfig = router.getRoutingConfig(ServiceType.EXAM_PIN)[0];
    expect(examConfig.primaryProvider).toBe(ProviderName.INTERSWITCH);
    expect(examConfig.strategy).toBe(ProviderRoutingStrategy.INTERSWITCH_ONLY);
    expect(examConfig.allowFailover).toBe(false);

    const airtimeConfig = router.getRoutingConfig(ServiceType.AIRTIME)[0];
    expect(airtimeConfig.primaryProvider).toBe(ProviderName.MONNIFY);
    expect(airtimeConfig.fallbackProvider).toBe(ProviderName.INTERSWITCH);
    expect(airtimeConfig.allowFailover).toBe(true);
  });

  it('updates routing strategy when requested by admin', () => {
    const updated = router.updateRoutingConfig(
      ServiceType.AIRTIME,
      ProviderRoutingStrategy.INTERSWITCH_PRIMARY_MONNIFY_FALLBACK,
      true,
    );

    expect(updated.primaryProvider).toBe(ProviderName.INTERSWITCH);
    expect(updated.fallbackProvider).toBe(ProviderName.MONNIFY);

    const current = router.getRoutingConfig(ServiceType.AIRTIME)[0];
    expect(current.strategy).toBe(
      ProviderRoutingStrategy.INTERSWITCH_PRIMARY_MONNIFY_FALLBACK,
    );
  });

  it('routes service vending to primary provider when healthy', async () => {
    const result = await router.vendService({
      serviceType: ServiceType.AIRTIME,
      paymentCode: 'AIRTEL',
      customerId: '07019367464',
      amountKobo: 10000n,
      requestReference: 'REF_TEST_1',
    });

    // Default primary is Monnify
    expect(mockMonnify.vendService).toHaveBeenCalledTimes(1);
    expect(mockInterswitch.vendService).not.toHaveBeenCalled();
    expect(result.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(result.providerName).toBe(ProviderName.MONNIFY);
  });

  it('automatically fails over to secondary provider when primary fails', async () => {
    // Monnify (primary) throws network failure
    vi.mocked(mockMonnify.vendService).mockRejectedValueOnce(
      new Error('Monnify gateway timeout'),
    );

    const result = await router.vendService({
      serviceType: ServiceType.AIRTIME,
      paymentCode: 'AIRTEL',
      customerId: '07019367464',
      amountKobo: 10000n,
      requestReference: 'REF_TEST_FAILOVER',
    });

    // Both called: Monnify failed, Interswitch succeeded
    expect(mockMonnify.vendService).toHaveBeenCalledTimes(1);
    expect(mockInterswitch.vendService).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(result.providerName).toBe(ProviderName.INTERSWITCH);
  });

  it('skips primary provider immediately when primary circuit breaker is OPEN', async () => {
    const monnifyBreaker = router.getCircuitBreaker(ProviderName.MONNIFY);

    // Trip Monnify circuit breaker to OPEN
    monnifyBreaker.recordFailure();
    monnifyBreaker.recordFailure();
    monnifyBreaker.recordFailure();
    expect(monnifyBreaker.isAvailable()).toBe(false);

    const result = await router.vendService({
      serviceType: ServiceType.DATA,
      paymentCode: 'DATA_100',
      customerId: '08161437292',
      amountKobo: 10000n,
      requestReference: 'REF_CB_OPEN',
    });

    // Monnify was skipped completely due to OPEN circuit breaker
    expect(mockMonnify.vendService).not.toHaveBeenCalled();
    // Interswitch handled request directly
    expect(mockInterswitch.vendService).toHaveBeenCalledTimes(1);
    expect(result.providerName).toBe(ProviderName.INTERSWITCH);
  });

  it('routes Exam PINs exclusively to Interswitch without failover', async () => {
    const result = await router.vendService({
      serviceType: ServiceType.EXAM_PIN,
      paymentCode: 'WAEC_PIN',
      customerId: '08012345678',
      amountKobo: 350000n,
      requestReference: 'REF_EXAM',
    });

    expect(mockInterswitch.vendService).toHaveBeenCalledTimes(1);
    expect(mockMonnify.vendService).not.toHaveBeenCalled();
    expect(result.providerName).toBe(ProviderName.INTERSWITCH);
  });

  it('validates customer with failover if primary validation throws', async () => {
    vi.mocked(mockMonnify.validateCustomer).mockRejectedValueOnce(
      new Error('Monnify VAS validation 500'),
    );

    const result = await router.validateCustomer({
      serviceType: ServiceType.ELECTRICITY,
      paymentCode: 'IBEDC',
      customerId: '45077162324',
    });

    expect(mockMonnify.validateCustomer).toHaveBeenCalledTimes(1);
    expect(mockInterswitch.validateCustomer).toHaveBeenCalledTimes(1);
    expect(result.isValid).toBe(true);
    expect(result.responseMessage).toBe('ISW Validated');
  });

  it('aggregates health status and circuit breaker metrics across all providers', async () => {
    const summaries = await router.getAllProviderHealth();
    expect(summaries).toHaveLength(2);

    const isw = summaries.find((s) => s.providerName === ProviderName.INTERSWITCH);
    expect(isw?.health.isHealthy).toBe(true);
    expect(isw?.circuitBreaker.state).toBe('CLOSED');

    const mon = summaries.find((s) => s.providerName === ProviderName.MONNIFY);
    expect(mon?.health.isHealthy).toBe(true);
    expect(mon?.circuitBreaker.state).toBe('CLOSED');
  });
});

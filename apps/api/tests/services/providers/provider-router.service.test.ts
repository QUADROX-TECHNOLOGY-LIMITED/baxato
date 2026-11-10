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
import { CircuitBreakerTimeoutError } from '../../../src/services/providers/circuit-breaker';

describe('ProviderRouterService (Dynamic Routing & Circuit Breaking)', () => {
  let router: ProviderRouterService;
  let mockMonnify: ProviderAdapter;
  let mockVtpass: ProviderAdapter;

  beforeEach(() => {
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

    mockVtpass = {
      providerName: ProviderName.VTPASS,
      validateCustomer: vi.fn().mockResolvedValue({
        isValid: true,
        customerId: '08012345678',
        responseCode: '000',
        responseMessage: 'VTPASS Validated',
      } as CustomerValidationResult),
      vendService: vi.fn().mockResolvedValue({
        status: TransactionStatus.SUCCESSFUL,
        providerName: ProviderName.VTPASS,
        providerReference: 'VTP_TXN_001',
        requestReference: 'REF_001',
        amountKobo: 10000n,
        responseCode: '000',
        responseMessage: 'VTPASS Vended',
      } as ServiceVendingResult),
      requeryTransaction: vi.fn(),
      getHealth: vi.fn().mockResolvedValue({
        providerName: ProviderName.VTPASS,
        isHealthy: true,
        latencyMs: 40,
        message: 'Healthy',
        checkedAt: new Date(),
      }),
    };

    router = new ProviderRouterService({
      env,
      monnifyProvider: mockMonnify,
      vtpassProvider: mockVtpass,
    });
  });

  it('initializes default routing rules correctly', () => {
    const examConfig = router.getRoutingConfig(ServiceType.EXAM_PIN)[0];
    expect(examConfig.primaryProvider).toBe(ProviderName.MONNIFY);
    expect(examConfig.strategy).toBe(ProviderRoutingStrategy.MONNIFY_ONLY);
    expect(examConfig.allowFailover).toBe(false);

    const airtimeConfig = router.getRoutingConfig(ServiceType.AIRTIME)[0];
    expect(airtimeConfig.primaryProvider).toBe(ProviderName.MONNIFY);
    expect(airtimeConfig.strategy).toBe(ProviderRoutingStrategy.MONNIFY_ONLY);
    expect(airtimeConfig.allowFailover).toBe(false);
  });

  it('updates routing strategy when requested by admin', () => {
    const updated = router.updateRoutingConfig(
      ServiceType.AIRTIME,
      ProviderRoutingStrategy.VTPASS_ONLY,
      false,
    );

    expect(updated.primaryProvider).toBe(ProviderName.VTPASS);
    expect(updated.strategy).toBe(ProviderRoutingStrategy.VTPASS_ONLY);

    const current = router.getRoutingConfig(ServiceType.AIRTIME)[0];
    expect(current.strategy).toBe(ProviderRoutingStrategy.VTPASS_ONLY);
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
    expect(result.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(result.providerName).toBe(ProviderName.MONNIFY);
  });

  it('routes service vending to VTpass when strategy is VTPASS_ONLY', async () => {
    router.updateRoutingConfig(
      ServiceType.AIRTIME,
      ProviderRoutingStrategy.VTPASS_ONLY,
      false,
    );

    const result = await router.vendService({
      serviceType: ServiceType.AIRTIME,
      paymentCode: 'MTN',
      customerId: '08031234567',
      amountKobo: 20000n,
      requestReference: 'REF_VT_1',
    });

    expect(mockVtpass.vendService).toHaveBeenCalledTimes(1);
    expect(mockMonnify.vendService).not.toHaveBeenCalled();
    expect(result.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(result.providerName).toBe(ProviderName.VTPASS);
  });

  it('fails over to VTpass when primary Monnify fails with PRIMARY_FALLBACK strategy', async () => {
    router.updateRoutingConfig(
      ServiceType.ELECTRICITY,
      ProviderRoutingStrategy.PRIMARY_FALLBACK,
      true,
    );

    // Make Monnify reject
    (mockMonnify.vendService as any).mockRejectedValueOnce(new Error('Monnify gateway timeout'));

    const result = await router.vendService({
      serviceType: ServiceType.ELECTRICITY,
      paymentCode: '053396201',
      customerId: '01234567890',
      amountKobo: 500000n,
      requestReference: 'REF_FAILOVER_1',
    });

    expect(mockMonnify.vendService).toHaveBeenCalledTimes(1);
    expect(mockVtpass.vendService).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(result.providerName).toBe(ProviderName.VTPASS);
  });

  it('blocks failover and returns PROCESSING when primary times out and requery confirms PROCESSING', async () => {
    router.updateRoutingConfig(
      ServiceType.ELECTRICITY,
      ProviderRoutingStrategy.PRIMARY_FALLBACK,
      true,
    );

    // Primary Monnify times out
    (mockMonnify.vendService as any).mockRejectedValueOnce(
      new CircuitBreakerTimeoutError('MONNIFY', 15000),
    );

    // Monnify requery reports transaction is in-flight (PROCESSING)
    (mockMonnify.requeryTransaction as any).mockResolvedValueOnce({
      status: TransactionStatus.PROCESSING,
      providerReference: 'MNFY_IN_FLIGHT_99',
      responseCode: '099',
      responseMessage: 'Order received and processing downstream',
    });

    const result = await router.vendService({
      serviceType: ServiceType.ELECTRICITY,
      paymentCode: '053396201',
      customerId: '01234567890',
      amountKobo: 500000n,
      requestReference: 'REF_TIMEOUT_GUARD_1',
    });

    // Primary was called and queried
    expect(mockMonnify.vendService).toHaveBeenCalledTimes(1);
    expect(mockMonnify.requeryTransaction).toHaveBeenCalledWith('REF_TIMEOUT_GUARD_1');

    // Crucial: Fallback was NOT called to prevent double-charging/double-vending
    expect(mockVtpass.vendService).not.toHaveBeenCalled();

    expect(result.status).toBe(TransactionStatus.PROCESSING);
    expect(result.providerName).toBe(ProviderName.MONNIFY);
    expect(result.providerReference).toBe('MNFY_IN_FLIGHT_99');
  });

  it('resolves transaction as SUCCESSFUL when primary times out and requery confirms SUCCESSFUL', async () => {
    router.updateRoutingConfig(
      ServiceType.ELECTRICITY,
      ProviderRoutingStrategy.PRIMARY_FALLBACK,
      true,
    );

    // Primary Monnify times out
    (mockMonnify.vendService as any).mockRejectedValueOnce(
      new CircuitBreakerTimeoutError('MONNIFY', 15000),
    );

    // Monnify requery reveals it actually went through successfully
    (mockMonnify.requeryTransaction as any).mockResolvedValueOnce({
      status: TransactionStatus.SUCCESSFUL,
      providerReference: 'MNFY_RESOLVED_100',
      token: '1234 5678 9012 3456 7890',
      units: '45 kWh',
      responseCode: '0',
      responseMessage: 'Token generated successfully',
    });

    const result = await router.vendService({
      serviceType: ServiceType.ELECTRICITY,
      paymentCode: '053396201',
      customerId: '01234567890',
      amountKobo: 500000n,
      requestReference: 'REF_TIMEOUT_GUARD_2',
    });

    expect(mockMonnify.vendService).toHaveBeenCalledTimes(1);
    expect(mockMonnify.requeryTransaction).toHaveBeenCalledWith('REF_TIMEOUT_GUARD_2');
    expect(mockVtpass.vendService).not.toHaveBeenCalled();

    expect(result.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(result.providerName).toBe(ProviderName.MONNIFY);
    expect(result.providerReference).toBe('MNFY_RESOLVED_100');
    expect(result.token).toBe('1234 5678 9012 3456 7890');
    expect(result.units).toBe('45 kWh');
  });

  it('aborts failover and throws timeout error when primary times out and requery is indeterminate', async () => {
    router.updateRoutingConfig(
      ServiceType.ELECTRICITY,
      ProviderRoutingStrategy.PRIMARY_FALLBACK,
      true,
    );

    // Primary times out
    (mockMonnify.vendService as any).mockRejectedValueOnce(
      new CircuitBreakerTimeoutError('MONNIFY', 15000),
    );

    // Requery also fails / is indeterminate
    (mockMonnify.requeryTransaction as any).mockRejectedValueOnce(
      new Error('Requery service unreachable'),
    );

    await expect(
      router.vendService({
        serviceType: ServiceType.ELECTRICITY,
        paymentCode: '053396201',
        customerId: '01234567890',
        amountKobo: 500000n,
        requestReference: 'REF_TIMEOUT_GUARD_3',
      }),
    ).rejects.toThrow(CircuitBreakerTimeoutError);

    // Secondary provider must NOT be invoked when state is indeterminate
    expect(mockVtpass.vendService).not.toHaveBeenCalled();
  });

  it('throws error when primary circuit breaker is OPEN and no fallback is enabled', async () => {
    const monnifyBreaker = router.getCircuitBreaker(ProviderName.MONNIFY);

    // Trip Monnify circuit breaker to OPEN
    monnifyBreaker.recordFailure();
    monnifyBreaker.recordFailure();
    monnifyBreaker.recordFailure();
    expect(monnifyBreaker.isAvailable()).toBe(false);

    await expect(
      router.vendService({
        serviceType: ServiceType.DATA,
        paymentCode: 'DATA_100',
        customerId: '08161437292',
        amountKobo: 10000n,
        requestReference: 'REF_CB_OPEN',
      }),
    ).rejects.toThrow();

    expect(mockMonnify.vendService).not.toHaveBeenCalled();
  });

  it('routes Exam PINs to Monnify', async () => {
    const result = await router.vendService({
      serviceType: ServiceType.EXAM_PIN,
      paymentCode: 'WAEC_PIN',
      customerId: '08012345678',
      amountKobo: 350000n,
      requestReference: 'REF_EXAM',
    });

    expect(mockMonnify.vendService).toHaveBeenCalledTimes(1);
    expect(result.providerName).toBe(ProviderName.MONNIFY);
  });

  it('validates customer via Monnify', async () => {
    const result = await router.validateCustomer({
      serviceType: ServiceType.ELECTRICITY,
      paymentCode: 'IBEDC',
      customerId: '45077162324',
    });

    expect(mockMonnify.validateCustomer).toHaveBeenCalledTimes(1);
    expect(result.isValid).toBe(true);
    expect(result.responseMessage).toBe('MNFY Validated');
  });

  it('aggregates health status and circuit breaker metrics across registered providers', async () => {
    const summaries = await router.getAllProviderHealth();
    expect(summaries).toHaveLength(2);

    const mon = summaries.find((s) => s.providerName === ProviderName.MONNIFY);
    expect(mon?.health.isHealthy).toBe(true);
    expect(mon?.circuitBreaker.state).toBe('CLOSED');

    const vt = summaries.find((s) => s.providerName === ProviderName.VTPASS);
    expect(vt?.health.isHealthy).toBe(true);
    expect(vt?.circuitBreaker.state).toBe('CLOSED');
  });
});

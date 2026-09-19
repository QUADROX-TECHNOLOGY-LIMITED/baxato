import {
  ProviderName,
  ServiceType,
  TransactionStatus,
  AppError,
} from '@baxato/common';
import { Env, env } from '@baxato/config';
import { Database, providerTransactions, db } from '@baxato/database';
import {
  ProviderAdapter,
  CustomerValidationRequest,
  CustomerValidationResult,
  ServiceVendingRequest,
  ServiceVendingResult,
  TransactionStatusResult,
  ProviderHealthStatus,
  ProviderRoutingStrategy,
  ServiceRoutingConfig,
} from './provider.interface';
import { InterswitchProvider } from './interswitch.provider';
import { MonnifyProvider } from './monnify.provider';
import { CircuitBreaker, CircuitBreakerMetrics } from './circuit-breaker';

export interface ProviderRouterOptions {
  env: Env;
  db?: Database;
  interswitchProvider?: ProviderAdapter;
  monnifyProvider?: ProviderAdapter;
}

export interface ProviderStatusSummary {
  providerName: ProviderName;
  health: ProviderHealthStatus;
  circuitBreaker: CircuitBreakerMetrics;
}

export class ProviderRouterService {
  private readonly db?: Database;
  private readonly providers: Map<ProviderName, ProviderAdapter> = new Map();
  private readonly circuitBreakers: Map<ProviderName, CircuitBreaker> = new Map();
  private readonly routingConfigs: Map<ServiceType, ServiceRoutingConfig> = new Map();

  constructor(options: ProviderRouterOptions) {
    this.db = options.db;

    // 1. Initialize or inject providers
    const isw = options.interswitchProvider ?? new InterswitchProvider(options.env);
    const mon = options.monnifyProvider ?? new MonnifyProvider(options.env);

    this.providers.set(ProviderName.INTERSWITCH, isw);
    this.providers.set(ProviderName.MONNIFY, mon);

    // 2. Initialize circuit breakers with 3-failure threshold, 30s cooldown
    this.circuitBreakers.set(
      ProviderName.INTERSWITCH,
      new CircuitBreaker({
        name: ProviderName.INTERSWITCH,
        failureThreshold: 3,
        resetTimeoutMs: 30000,
        successThreshold: 2,
        timeoutMs: 25000,
      }),
    );

    this.circuitBreakers.set(
      ProviderName.MONNIFY,
      new CircuitBreaker({
        name: ProviderName.MONNIFY,
        failureThreshold: 3,
        resetTimeoutMs: 30000,
        successThreshold: 2,
        timeoutMs: 25000,
      }),
    );

    // 3. Set default routing rules per service category
    this.initDefaultRoutingConfigs();
  }

  private initDefaultRoutingConfigs(): void {
    // Exam PINs are direct national distribution on Interswitch
    this.routingConfigs.set(ServiceType.EXAM_PIN, {
      serviceType: ServiceType.EXAM_PIN,
      strategy: ProviderRoutingStrategy.INTERSWITCH_ONLY,
      primaryProvider: ProviderName.INTERSWITCH,
      allowFailover: false,
    });

    // Telecom & Utilities default: Monnify primary, Interswitch fallback
    const dualServices: ServiceType[] = [
      ServiceType.AIRTIME,
      ServiceType.DATA,
      ServiceType.CABLE_TV,
      ServiceType.ELECTRICITY,
    ];

    for (const service of dualServices) {
      this.routingConfigs.set(service, {
        serviceType: service,
        strategy: ProviderRoutingStrategy.MONNIFY_PRIMARY_INTERSWITCH_FALLBACK,
        primaryProvider: ProviderName.MONNIFY,
        fallbackProvider: ProviderName.INTERSWITCH,
        allowFailover: true,
      });
    }
  }

  public getProvider(name: ProviderName): ProviderAdapter {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new AppError(
        `Provider '${name}' is not registered`,
        404,
        'NOT_FOUND',
        true,
      );
    }
    return provider;
  }

  public getCircuitBreaker(name: ProviderName): CircuitBreaker {
    const cb = this.circuitBreakers.get(name);
    if (!cb) {
      throw new AppError(
        `Circuit breaker for '${name}' not found`,
        404,
        'NOT_FOUND',
        true,
      );
    }
    return cb;
  }

  public getRoutingConfig(serviceType?: ServiceType): ServiceRoutingConfig[] {
    if (serviceType) {
      const config = this.routingConfigs.get(serviceType);
      return config ? [config] : [];
    }
    return Array.from(this.routingConfigs.values());
  }

  public updateRoutingConfig(
    serviceType: ServiceType,
    strategy: ProviderRoutingStrategy,
    allowFailover: boolean = true,
  ): ServiceRoutingConfig {
    let primary: ProviderName;
    let fallback: ProviderName | undefined;

    switch (strategy) {
      case ProviderRoutingStrategy.MONNIFY_ONLY:
        primary = ProviderName.MONNIFY;
        fallback = undefined;
        allowFailover = false;
        break;
      case ProviderRoutingStrategy.INTERSWITCH_ONLY:
        primary = ProviderName.INTERSWITCH;
        fallback = undefined;
        allowFailover = false;
        break;
      case ProviderRoutingStrategy.INTERSWITCH_PRIMARY_MONNIFY_FALLBACK:
        primary = ProviderName.INTERSWITCH;
        fallback = ProviderName.MONNIFY;
        break;
      case ProviderRoutingStrategy.MONNIFY_PRIMARY_INTERSWITCH_FALLBACK:
      default:
        primary = ProviderName.MONNIFY;
        fallback = ProviderName.INTERSWITCH;
        break;
    }

    const updated: ServiceRoutingConfig = {
      serviceType,
      strategy,
      primaryProvider: primary,
      fallbackProvider: fallback,
      allowFailover,
    };

    this.routingConfigs.set(serviceType, updated);
    return updated;
  }

  /**
   * Validate customer with automatic failover support
   */
  public async validateCustomer(
    request: CustomerValidationRequest,
  ): Promise<CustomerValidationResult> {
    const config = this.getRoutingConfig(request.serviceType)[0];
    const primaryName = config?.primaryProvider ?? ProviderName.INTERSWITCH;
    const fallbackName = config?.fallbackProvider;

    const primaryBreaker = this.getCircuitBreaker(primaryName);
    const primaryProvider = this.getProvider(primaryName);

    // If primary is available, try it
    if (primaryBreaker.isAvailable()) {
      try {
        const result = await primaryBreaker.execute(() =>
          primaryProvider.validateCustomer(request),
        );
        if (result.isValid) return result;
      } catch (_error) {
        // If failover is disabled or no fallback, throw error
        if (!config?.allowFailover || !fallbackName) {
          throw _error;
        }
      }
    }

    // Failover to secondary provider if configured
    if (config?.allowFailover && fallbackName) {
      const fallbackBreaker = this.getCircuitBreaker(fallbackName);
      const fallbackProvider = this.getProvider(fallbackName);

      return fallbackBreaker.execute(() =>
        fallbackProvider.validateCustomer(request),
      );
    }

    throw new AppError(
      `Customer validation failed on primary provider '${primaryName}' and no healthy fallback available.`,
      502,
      'EXTERNAL_SERVICE_ERROR',
      true,
    );
  }

  /**
   * Vend service with automatic failover and transaction audit logging
   */
  public async vendService(
    request: ServiceVendingRequest,
    transactionId?: string,
  ): Promise<ServiceVendingResult> {
    const config = this.getRoutingConfig(request.serviceType)[0];
    const primaryName = config?.primaryProvider ?? ProviderName.INTERSWITCH;
    const fallbackName = config?.fallbackProvider;

    const primaryBreaker = this.getCircuitBreaker(primaryName);
    const primaryProvider = this.getProvider(primaryName);

    let executedProvider = primaryName;
    let result: ServiceVendingResult | null = null;
    let caughtError: Error | null = null;

    const startTime = Date.now();

    // 1. Try Primary Provider if Circuit Breaker is available
    if (primaryBreaker.isAvailable()) {
      try {
        result = await primaryBreaker.execute(() =>
          primaryProvider.vendService(request),
        );

        if (result.status === TransactionStatus.SUCCESSFUL) {
          await this.auditProviderTransaction(
            transactionId,
            primaryName,
            request,
            result,
            result.responseCode,
            Date.now() - startTime,
          );
          return result;
        }
      } catch (err) {
        caughtError = err as Error;
      }
    }

    // 2. Automatic Failover to Fallback Provider
    if (config?.allowFailover && fallbackName) {
      executedProvider = fallbackName;
      const fallbackBreaker = this.getCircuitBreaker(fallbackName);
      const fallbackProvider = this.getProvider(fallbackName);

      const fallbackStart = Date.now();
      try {
        result = await fallbackBreaker.execute(() =>
          fallbackProvider.vendService(request),
        );

        await this.auditProviderTransaction(
          transactionId,
          fallbackName,
          request,
          result,
          result.responseCode,
          Date.now() - fallbackStart,
        );

        return result;
      } catch (fallbackErr) {
        await this.auditProviderTransaction(
          transactionId,
          fallbackName,
          request,
          { error: (fallbackErr as Error).message },
          'FAILED',
          Date.now() - fallbackStart,
        );
        throw fallbackErr;
      }
    }

    // If no fallback was possible, audit failure and re-throw
    if (caughtError) {
      await this.auditProviderTransaction(
        transactionId,
        executedProvider,
        request,
        { error: caughtError.message },
        'FAILED',
        Date.now() - startTime,
      );
      throw caughtError;
    }

    if (result) {
      await this.auditProviderTransaction(
        transactionId,
        executedProvider,
        request,
        result,
        result.responseCode,
        Date.now() - startTime,
      );
      return result;
    }

    throw new AppError(
      `Service vending failed across all active providers for ${request.serviceType}`,
      502,
      'EXTERNAL_SERVICE_ERROR',
      true,
    );
  }

  /**
   * Re-query transaction status
   */
  public async requeryTransaction(
    providerName: ProviderName,
    requestReference: string,
    providerReference?: string,
  ): Promise<TransactionStatusResult> {
    const provider = this.getProvider(providerName);
    const breaker = this.getCircuitBreaker(providerName);

    return breaker.execute(() =>
      provider.requeryTransaction(requestReference, providerReference),
    );
  }

  /**
   * Health and metrics summary across all providers
   */
  public async getAllProviderHealth(): Promise<ProviderStatusSummary[]> {
    const summaries: ProviderStatusSummary[] = [];

    for (const [name, provider] of this.providers.entries()) {
      const breaker = this.getCircuitBreaker(name);
      const health = await provider.getHealth();
      const cbMetrics = breaker.getMetrics();

      summaries.push({
        providerName: name,
        health,
        circuitBreaker: cbMetrics,
      });
    }

    return summaries;
  }

  /**
   * Record raw request/response audit payload in database
   */
  private async auditProviderTransaction(
    transactionId: string | undefined,
    providerName: ProviderName,
    request: unknown,
    response: unknown,
    statusCode: string,
    durationMs: number,
  ): Promise<void> {
    if (!this.db || !transactionId) return;

    try {
      await this.db.insert(providerTransactions).values({
        transactionId,
        providerName,
        requestPayload: (request ?? {}) as Record<string, unknown>,
        responsePayload: (response ?? {}) as Record<string, unknown>,
        statusCode,
        durationMs,
      });
    } catch (_err) {
      // Non-blocking logging failure to avoid rolling back transaction
    }
  }
}

export const providerRouterService = new ProviderRouterService({ env, db });


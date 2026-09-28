import {
  ProviderName,
  ServiceType,
  TransactionStatus,
  AppError,
} from '@baxato/common';
import { Env, env } from '@baxato/config';
import { Database, providerTransactions, providers, db } from '@baxato/database';
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
   * Dynamically resolves the active provider for a service from PostgreSQL `providers` table.
   * Allows live hot-switching via TablePlus or DB admin tools.
   */
  public async resolveDynamicRouting(
    serviceType: ServiceType,
  ): Promise<{ primaryName: ProviderName; fallbackName?: ProviderName; allowFailover: boolean }> {
    const config = this.getRoutingConfig(serviceType)[0];
    let primaryName = config?.primaryProvider ?? ProviderName.INTERSWITCH;
    let fallbackName = config?.fallbackProvider;
    let allowFailover = config?.allowFailover ?? true;
    let source = 'In-Memory Configuration';

    if (this.db) {
      try {
        const dbProviders = await this.db.select().from(providers);

        // 1. Check if any provider has service-specific flag in its JSON config (e.g. { "airtime": true })
        let matchedServiceConfig = false;
        for (const p of dbProviders) {
          if (p.status === 'ACTIVE' && p.config && typeof p.config === 'object') {
            const cfg = p.config as Record<string, unknown>;
            const serviceKey = serviceType.toLowerCase();
            const isMatch =
              cfg[serviceKey] === true ||
              cfg[serviceType] === true ||
              (Array.isArray(cfg.services) &&
                (cfg.services.includes(serviceType) || cfg.services.includes(serviceKey)));

            if (isMatch) {
              primaryName = p.name as ProviderName;
              matchedServiceConfig = true;
              source = `PostgreSQL "providers" table (config.${serviceKey}=true on ${p.name})`;
              const fallbackCandidate = dbProviders.find(
                (o) => o.name !== primaryName && o.status === 'ACTIVE',
              );
              fallbackName = fallbackCandidate ? (fallbackCandidate.name as ProviderName) : undefined;
              break;
            }
          }
        }

        // 2. If no service-specific config, check isPrimary = true on active providers
        if (!matchedServiceConfig) {
          const primaryFromDb = dbProviders.find(
            (p) => p.isPrimary && p.status === 'ACTIVE',
          );
          if (primaryFromDb) {
            primaryName = primaryFromDb.name as ProviderName;
            source = `PostgreSQL "providers" table (is_primary=true on ${primaryFromDb.name})`;
            const fallbackCandidate = dbProviders.find(
              (o) => o.name !== primaryName && o.status === 'ACTIVE',
            );
            fallbackName = fallbackCandidate ? (fallbackCandidate.name as ProviderName) : undefined;
          }
        }
      } catch (err) {
        // Fall back gracefully if DB query error
      }
    }

    console.log('\n================================================================');
    console.log(`[PROVIDER ROUTING DEBUG] Dynamic Resolution for ${serviceType}`);
    console.log(`-> Active Provider : ${primaryName}`);
    console.log(`-> Fallback Provider: ${fallbackName || 'None'}`);
    console.log(`-> Routing Source   : ${source}`);
    console.log('================================================================\n');

    return { primaryName, fallbackName, allowFailover };
  }

  /**
   * Validate customer with automatic failover support
   */
  public async validateCustomer(
    request: CustomerValidationRequest,
  ): Promise<CustomerValidationResult> {
    const { primaryName, fallbackName, allowFailover } = await this.resolveDynamicRouting(request.serviceType);

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
        if (!allowFailover || !fallbackName) {
          throw _error;
        }
      }
    }

    // Failover to secondary provider if configured
    if (allowFailover && fallbackName) {
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
    const { primaryName, fallbackName, allowFailover } = await this.resolveDynamicRouting(request.serviceType);

    const primaryBreaker = this.getCircuitBreaker(primaryName);
    const primaryProvider = this.getProvider(primaryName);

    let executedProvider = primaryName;
    let result: ServiceVendingResult | null = null;
    let caughtError: Error | null = null;

    const startTime = Date.now();

    console.log(`[PROVIDER DISPATCH] Dispatching ${request.serviceType} via ${primaryName}... (Customer: ${request.customerId}, Amount: ₦${(Number(request.amountKobo) / 100).toFixed(2)}, Ref: ${request.requestReference})`);

    // 1. Try Primary Provider if Circuit Breaker is available
    if (primaryBreaker.isAvailable()) {
      try {
        result = await primaryBreaker.execute(() =>
          primaryProvider.vendService(request),
        );

        if (result.status === TransactionStatus.SUCCESSFUL) {
          console.log(`[PROVIDER VEND SUCCESS] ${primaryName} completed successfully. (Ref: ${result.providerReference || request.requestReference}, Code: ${result.responseCode})`);
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
        console.warn(`[PROVIDER VEND ATTEMPT FAILED] ${primaryName} failed: ${(err as Error).message}`);
      }
    }

    // 2. Automatic Failover to Fallback Provider
    if (allowFailover && fallbackName) {
      console.log(`[PROVIDER FAILOVER] Attempting failover to secondary provider: ${fallbackName}...`);
      executedProvider = fallbackName;
      const fallbackBreaker = this.getCircuitBreaker(fallbackName);
      const fallbackProvider = this.getProvider(fallbackName);

      const fallbackStart = Date.now();
      try {
        result = await fallbackBreaker.execute(() =>
          fallbackProvider.vendService(request),
        );

        console.log(`[PROVIDER FAILOVER SUCCESS] Fallback ${fallbackName} completed successfully. (Ref: ${result.providerReference || request.requestReference}, Code: ${result.responseCode})`);

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
        console.error(`[PROVIDER FAILOVER FAILED] Fallback ${fallbackName} also failed: ${(fallbackErr as Error).message}`);
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


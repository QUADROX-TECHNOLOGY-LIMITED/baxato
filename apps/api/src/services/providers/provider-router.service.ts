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
} from './provider.interface.js';
import { MonnifyProvider } from './monnify.provider.js';
import { VtpassProvider } from './vtpass.provider.js';
import {
  CircuitBreaker,
  CircuitBreakerMetrics,
  CircuitBreakerTimeoutError,
} from './circuit-breaker.js';
import { sanitizeForJson } from '../audit.service.js';

export interface ProviderRouterOptions {
  env: Env;
  db?: Database;
  monnifyProvider?: ProviderAdapter;
  vtpassProvider?: ProviderAdapter;
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
    const mon = options.monnifyProvider ?? new MonnifyProvider(options.env);
    const vt = options.vtpassProvider ?? new VtpassProvider(options.env);

    this.providers.set(ProviderName.MONNIFY, mon);
    this.providers.set(ProviderName.VTPASS, vt);

    // 2. Initialize circuit breakers with 3-failure threshold, 30s cooldown
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
    this.circuitBreakers.set(
      ProviderName.VTPASS,
      new CircuitBreaker({
        name: ProviderName.VTPASS,
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
    const allServices: ServiceType[] = [
      ServiceType.AIRTIME,
      ServiceType.DATA,
      ServiceType.CABLE_TV,
      ServiceType.ELECTRICITY,
      ServiceType.EXAM_PIN,
    ];

    for (const service of allServices) {
      this.routingConfigs.set(service, {
        serviceType: service,
        strategy: ProviderRoutingStrategy.MONNIFY_ONLY,
        primaryProvider: ProviderName.MONNIFY,
        allowFailover: false,
      });
    }
  }

  public getRegisteredProviders(): ProviderName[] {
    return Array.from(this.providers.keys());
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
    allowFailover: boolean = false,
  ): ServiceRoutingConfig {
    let primary: ProviderName = ProviderName.MONNIFY;
    let fallback: ProviderName | undefined = undefined;

    switch (strategy) {
      case ProviderRoutingStrategy.MONNIFY_ONLY:
        primary = ProviderName.MONNIFY;
        fallback = undefined;
        allowFailover = false;
        break;
      case ProviderRoutingStrategy.VTPASS_ONLY:
        primary = ProviderName.VTPASS;
        fallback = undefined;
        allowFailover = false;
        break;
      case ProviderRoutingStrategy.PRIMARY_FALLBACK:
        primary = ProviderName.MONNIFY;
        fallback = ProviderName.VTPASS;
        allowFailover = true;
        break;
      default:
        primary = ProviderName.MONNIFY;
        fallback = undefined;
        allowFailover = false;
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
    let primaryName = config?.primaryProvider ?? ProviderName.MONNIFY;
    let fallbackName = config?.fallbackProvider;
    let allowFailover = config?.allowFailover ?? false;
    let source = 'In-Memory Configuration';

    if (this.db) {
      try {
        const dbProviders = await this.db.select().from(providers);
        const serviceKey = serviceType.toLowerCase();

        // 1. Only consider providers whose status is 'ACTIVE' in TablePlus
        const activeDbProviders = dbProviders.filter((p) => p.status === 'ACTIVE');

        // 2. Providers explicitly disabled for this service by admin in TablePlus (config.<service> = false)
        const disabledProviderNames = new Set(
          activeDbProviders
            .filter((p) => {
              if (!p.config || typeof p.config !== 'object') return false;
              const cfg = p.config as Record<string, unknown>;
              return cfg[serviceKey] === false || cfg[serviceType] === false;
            })
            .map((p) => p.name),
        );

        // 3. Eligible providers: Active and not explicitly turned off for this service
        const eligibleProviders = activeDbProviders.filter((p) => !disabledProviderNames.has(p.name));

        // 4. Providers explicitly turned ON for this service (config.<service> = true)
        const explicitlyEnabled = eligibleProviders.filter((p) => {
          if (!p.config || typeof p.config !== 'object') return false;
          const cfg = p.config as Record<string, unknown>;
          return (
            cfg[serviceKey] === true ||
            cfg[serviceType] === true ||
            (Array.isArray(cfg.services) &&
              (cfg.services.includes(serviceType) || cfg.services.includes(serviceKey)))
          );
        });

        const pool = explicitlyEnabled.length > 0 ? explicitlyEnabled : eligibleProviders;

        if (pool.length > 0) {
          // If in-memory strategy specifically designates a primaryProvider,
          // prioritize it if it exists in the active eligible pool.
          const primaryCandidate =
            pool.find((p) => p.name === config?.primaryProvider && p.isPrimary) ||
            pool.find((p) => p.name === config?.primaryProvider) ||
            pool.find((p) => p.isPrimary) ||
            pool[0]!;
          primaryName = primaryCandidate.name as ProviderName;

          // Fallback provider is another eligible provider in pool (or eligibleProviders)
          const fallbackCandidate =
            pool.find((p) => p.name !== primaryName) ||
            eligibleProviders.find((p) => p.name !== primaryName);

          fallbackName = fallbackCandidate ? (fallbackCandidate.name as ProviderName) : undefined;
          source = `PostgreSQL "providers" table (${primaryName}${fallbackName ? ` -> ${fallbackName}` : ''})`;
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
    let lastResult: CustomerValidationResult | null = null;

    // 1. If primary is available, try it
    if (primaryBreaker.isAvailable()) {
      try {
        const result = await primaryBreaker.execute(() =>
          primaryProvider.validateCustomer(request),
        );
        // If primary succeeded and validated customer, return directly
        if (result.isValid) {
          return result;
        }
        // Save result in case fallback also fails or isn't available
        lastResult = result;
      } catch (_error) {
        // Only if primary threw an error (timeout, network down, 5xx) do we fall back
        if (!allowFailover || !fallbackName) {
          throw _error;
        }
      }
    }

    // 2. Failover to secondary provider if primary threw an error, breaker is OPEN, or returned isValid === false
    if (allowFailover && fallbackName) {
      const fallbackBreaker = this.getCircuitBreaker(fallbackName);
      const fallbackProvider = this.getProvider(fallbackName);

      try {
        const fallbackResult = await fallbackBreaker.execute(() =>
          fallbackProvider.validateCustomer(request),
        );
        return fallbackResult;
      } catch (fallbackError) {
        if (lastResult) {
          return lastResult;
        }
        throw fallbackError;
      }
    }

    if (lastResult) {
      return lastResult;
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

        if (
          result.status === TransactionStatus.SUCCESSFUL ||
          result.status === TransactionStatus.PROCESSING ||
          result.status === TransactionStatus.PENDING
        ) {
          console.log(`[PROVIDER VEND ${result.status}] ${primaryName} processed successfully. (Ref: ${result.providerReference || request.requestReference}, Code: ${result.responseCode})`);
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
    // SAFETY GUARD: If primary timed out, it may still be executing downstream with the telco/biller.
    // Blindly falling over to a secondary provider causes duplicate vending (double-charging).
    const isTimeout =
      caughtError instanceof CircuitBreakerTimeoutError ||
      (caughtError as any)?.code === 'TIMEOUT';

    if (isTimeout && allowFailover && fallbackName) {
      console.warn(
        `[PROVIDER FAILOVER GUARD] Primary ${primaryName} timed out. Requerying before considering failover to prevent duplicate transaction...`,
      );
      try {
        const requery = await primaryProvider.requeryTransaction(request.requestReference);
        if (requery && requery.status === TransactionStatus.SUCCESSFUL) {
          console.log(`[PROVIDER REQUERY RESOLVED] Primary ${primaryName} succeeded on requery.`);
          const resolved: ServiceVendingResult = {
            status: TransactionStatus.SUCCESSFUL,
            providerName: primaryName,
            providerReference: requery.providerReference || request.requestReference,
            requestReference: request.requestReference,
            amountKobo: request.amountKobo,
            responseCode: requery.responseCode || '000',
            responseMessage: requery.responseMessage || 'Delivered on requery',
            token: requery.token,
            units: requery.units,
            tariff: requery.tariff,
            feeder: requery.feeder,
            rawResponse: requery.rawResponse,
          };
          await this.auditProviderTransaction(
            transactionId,
            primaryName,
            request,
            resolved,
            resolved.responseCode,
            Date.now() - startTime,
          );
          return resolved;
        } else if (
          requery &&
          (requery.status === TransactionStatus.PROCESSING ||
            requery.status === TransactionStatus.PENDING)
        ) {
          console.log(
            `[PROVIDER REQUERY IN-FLIGHT] Primary ${primaryName} is still processing. Marking as PROCESSING (failover blocked to prevent double-vend).`,
          );
          const processingResult: ServiceVendingResult = {
            status: TransactionStatus.PROCESSING,
            providerName: primaryName,
            providerReference: requery.providerReference || request.requestReference,
            requestReference: request.requestReference,
            amountKobo: request.amountKobo,
            responseCode: requery.responseCode || '099',
            responseMessage: requery.responseMessage || 'Processing with provider',
            rawResponse: requery.rawResponse,
          };
          await this.auditProviderTransaction(
            transactionId,
            primaryName,
            request,
            processingResult,
            processingResult.responseCode,
            Date.now() - startTime,
          );
          return processingResult;
        }
      } catch (_reqErr) {
        // If requery is indeterminate, do not blindly double vend on secondary!
        console.warn(
          `[PROVIDER FAILOVER BLOCKED] Primary ${primaryName} is indeterminate after timeout. Aborting failover to prevent double-charge.`,
        );
        throw caughtError;
      }
    }

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

        if (
          result.status === TransactionStatus.SUCCESSFUL ||
          result.status === TransactionStatus.PROCESSING ||
          result.status === TransactionStatus.PENDING
        ) {
          console.log(`[PROVIDER FAILOVER ${result.status}] Fallback ${fallbackName} completed successfully. (Ref: ${result.providerReference || request.requestReference}, Code: ${result.responseCode})`);

          await this.auditProviderTransaction(
            transactionId,
            fallbackName,
            request,
            result,
            result.responseCode,
            Date.now() - fallbackStart,
          );

          return result;
        }
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
        requestPayload: sanitizeForJson(request),
        responsePayload: sanitizeForJson(response),
        statusCode: statusCode ? String(statusCode) : 'UNKNOWN',
        durationMs,
      });
    } catch (err) {
      console.error('[ProviderRouterService] Failed to record provider transaction audit:', err);
    }
  }
}

export const providerRouterService = new ProviderRouterService({ env, db });


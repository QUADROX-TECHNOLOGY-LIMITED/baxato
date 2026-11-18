import {
  ProviderName,
  ServiceType,
  TransactionStatus,
  AppError,
} from '@baxato/common';
import { Env, env } from '@baxato/config';
import { Database, providerTransactions, providers, db, eq } from '@baxato/database';
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
import { serviceControlsService } from '../service-controls.service.js';

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
  private readonly explicitlyConfiguredServices: Set<ServiceType> = new Set();

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
        timeoutMs: 15000,
      }),
    );
    this.circuitBreakers.set(
      ProviderName.VTPASS,
      new CircuitBreaker({
        name: ProviderName.VTPASS,
        failureThreshold: 3,
        resetTimeoutMs: 30000,
        successThreshold: 2,
        timeoutMs: 15000,
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
      case ProviderRoutingStrategy.VTPASS_FALLBACK:
        primary = ProviderName.VTPASS;
        fallback = ProviderName.MONNIFY;
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
    this.explicitlyConfiguredServices.add(serviceType);
    return updated;
  }

  private getProviderConfigKey(serviceType: ServiceType): string {
    if (serviceType === ServiceType.CABLE_TV) return 'cable';
    return serviceType.toLowerCase();
  }

  private inferStrategyFromDbProviders(
    serviceType: ServiceType,
    dbProviders: Array<typeof providers.$inferSelect>,
  ): { strategy: ProviderRoutingStrategy; allowFailover: boolean } | null {
    const serviceKey = this.getProviderConfigKey(serviceType);
    const active = dbProviders.filter((p) => p.status === 'ACTIVE');
    if (active.length === 0) return null;

    const isDisabledForService = (p: typeof providers.$inferSelect) => {
      if (!p.config || typeof p.config !== 'object') return false;
      const cfg = p.config as Record<string, unknown>;
      return cfg[serviceKey] === false || cfg[serviceType] === false;
    };

    const eligible = active.filter((p) => !isDisabledForService(p));
    if (eligible.length === 0) return null;

    const primary = eligible.find((p) => p.isPrimary) || eligible[0]!;
    const hasVtpass = eligible.some((p) => p.name === ProviderName.VTPASS);
    const hasMonnify = eligible.some((p) => p.name === ProviderName.MONNIFY);

    if (primary.name === ProviderName.VTPASS) {
      if (hasMonnify && eligible.find((p) => p.name === ProviderName.MONNIFY && p.config && (p.config as Record<string, unknown>)[serviceKey] === true)) {
        return { strategy: ProviderRoutingStrategy.VTPASS_FALLBACK, allowFailover: true };
      }
      return { strategy: ProviderRoutingStrategy.VTPASS_ONLY, allowFailover: false };
    }

    if (hasVtpass && eligible.find((p) => p.name === ProviderName.VTPASS && p.config && (p.config as Record<string, unknown>)[serviceKey] === true)) {
      return { strategy: ProviderRoutingStrategy.PRIMARY_FALLBACK, allowFailover: true };
    }

    return { strategy: ProviderRoutingStrategy.MONNIFY_ONLY, allowFailover: false };
  }

  public async syncDatabaseProvidersForRouting(
    serviceType: ServiceType,
    strategy: ProviderRoutingStrategy,
  ): Promise<void> {
    if (!this.db) return;
    try {
      const rows = await this.db.select().from(providers);
      if (rows.length === 0) return;

      const serviceKey = this.getProviderConfigKey(serviceType);
      const monnifyEnabled =
        strategy === ProviderRoutingStrategy.MONNIFY_ONLY ||
        strategy === ProviderRoutingStrategy.PRIMARY_FALLBACK ||
        strategy === ProviderRoutingStrategy.VTPASS_FALLBACK;
      const vtpassEnabled =
        strategy === ProviderRoutingStrategy.VTPASS_ONLY ||
        strategy === ProviderRoutingStrategy.VTPASS_FALLBACK ||
        strategy === ProviderRoutingStrategy.PRIMARY_FALLBACK;

      const desiredPrimary =
        strategy === ProviderRoutingStrategy.VTPASS_ONLY ||
        strategy === ProviderRoutingStrategy.VTPASS_FALLBACK
          ? ProviderName.VTPASS
          : ProviderName.MONNIFY;

      const allConfigs = Array.from(this.routingConfigs.values());
      const vtpassPrimaryCount = allConfigs.filter(
        (c) => c.primaryProvider === ProviderName.VTPASS,
      ).length;
      const monnifyPrimaryCount = allConfigs.filter(
        (c) => c.primaryProvider === ProviderName.MONNIFY,
      ).length;
      const overallPrimary =
        vtpassPrimaryCount > monnifyPrimaryCount
          ? ProviderName.VTPASS
          : monnifyPrimaryCount > vtpassPrimaryCount
            ? ProviderName.MONNIFY
            : desiredPrimary;

      for (const row of rows) {
        const cfg = { ...((row.config || {}) as Record<string, unknown>) };
        if (row.name === ProviderName.MONNIFY) {
          cfg[serviceKey] = monnifyEnabled;
          await this.db
            .update(providers)
            .set({
              isPrimary: overallPrimary === ProviderName.MONNIFY,
              config: cfg,
              updatedAt: new Date(),
            })
            .where(eq(providers.id, row.id));
        } else if (row.name === ProviderName.VTPASS) {
          cfg[serviceKey] = vtpassEnabled;
          await this.db
            .update(providers)
            .set({
              isPrimary: overallPrimary === ProviderName.VTPASS,
              config: cfg,
              updatedAt: new Date(),
            })
            .where(eq(providers.id, row.id));
        }
      }
    } catch (err) {
      console.warn('[ProviderRouterService] Failed to sync providers table:', err);
    }
  }

  /**
   * Updates routing for a service, persists the full per-service routing snapshot
   * to PostgreSQL `system_settings`, and synchronizes the `providers` table.
   */
  public async persistRoutingUpdate(
    serviceType: ServiceType,
    strategy: ProviderRoutingStrategy,
    allowFailover: boolean = false,
    updatedById?: string,
  ): Promise<ServiceRoutingConfig> {
    await this.hydratePersistedRouting();
    const updated = this.updateRoutingConfig(serviceType, strategy, allowFailover);

    if (this.db) {
      const fullServiceRouting = Object.fromEntries(
        this.getRoutingConfig().map((cfg) => [cfg.serviceType, cfg.strategy]),
      );

      await Promise.all([
        serviceControlsService
          .updateSettings({ serviceRouting: fullServiceRouting }, updatedById)
          .catch((err) => {
            console.error('[ProviderRouterService] Failed to persist service routing setting:', err);
          }),
        this.syncDatabaseProvidersForRouting(serviceType, strategy),
      ]);
    }

    return updated;
  }

  public async hydratePersistedRouting(): Promise<ServiceRoutingConfig[]> {
    if (!this.db) {
      return this.getRoutingConfig();
    }
    try {
      const [settings, dbProviders] = await Promise.all([
        serviceControlsService.getSettings(),
        this.db.select().from(providers).catch(() => []),
      ]);

      const persisted = settings.serviceRouting || {};
      const validStrategies = new Set<string>(Object.values(ProviderRoutingStrategy));
      const allServices: ServiceType[] = [
        ServiceType.AIRTIME,
        ServiceType.DATA,
        ServiceType.CABLE_TV,
        ServiceType.ELECTRICITY,
        ServiceType.EXAM_PIN,
      ];

      for (const svc of allServices) {
        const strat = persisted[svc];
        if (strat && validStrategies.has(strat)) {
          this.updateRoutingConfig(
            svc,
            strat as ProviderRoutingStrategy,
            strat === ProviderRoutingStrategy.PRIMARY_FALLBACK ||
              strat === ProviderRoutingStrategy.VTPASS_FALLBACK,
          );
        } else if (!this.explicitlyConfiguredServices.has(svc) && dbProviders.length > 0) {
          const inferred = this.inferStrategyFromDbProviders(svc, dbProviders);
          if (inferred) {
            this.updateRoutingConfig(svc, inferred.strategy, inferred.allowFailover);
            // Keep unpersisted inference out of explicitlyConfiguredServices unless system_settings saved it
            this.explicitlyConfiguredServices.delete(svc);
          }
        }
      }
    } catch {
      // Non-fatal fallback to current in-memory configuration
    }
    return this.getRoutingConfig();
  }

  /**
   * Dynamically resolves the active provider for a service from PostgreSQL `system_settings` and `providers` table.
   * Allows live hot-switching via Staff Routing or TablePlus DB admin tools across server restarts.
   */
  public async resolveDynamicRouting(
    serviceType: ServiceType,
  ): Promise<{ primaryName: ProviderName; fallbackName?: ProviderName; allowFailover: boolean }> {
    await this.hydratePersistedRouting();
    const config = this.getRoutingConfig(serviceType)[0];
    let primaryName = config?.primaryProvider ?? ProviderName.MONNIFY;
    let fallbackName = config?.fallbackProvider;
    let allowFailover = config?.allowFailover ?? false;
    let source = 'In-Memory Configuration';

    if (this.db) {
      try {
        const dbProviders = await this.db.select().from(providers);
        const serviceKey = this.getProviderConfigKey(serviceType);

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

        if (this.explicitlyConfiguredServices.has(serviceType) && config) {
          // Staff/Admin explicitly switched strategy at runtime — honor selected primary & fallback
          // unless explicitly disabled in PostgreSQL `providers.config`.
          if (!disabledProviderNames.has(config.primaryProvider)) {
            primaryName = config.primaryProvider;
          }
          fallbackName =
            config.allowFailover &&
            config.fallbackProvider &&
            !disabledProviderNames.has(config.fallbackProvider)
              ? config.fallbackProvider
              : undefined;
          allowFailover = Boolean(config.allowFailover && fallbackName);
          source = `Runtime Routing Override (${primaryName}${fallbackName ? ` -> ${fallbackName}` : ''})`;
        } else if (pool.length > 0) {
          // If in-memory strategy specifically designates a primaryProvider,
          // prioritize it if it exists in the active eligible pool.
          const primaryCandidate =
            pool.find((p) => p.name === config?.primaryProvider && p.isPrimary) ||
            pool.find((p) => p.isPrimary) ||
            pool.find((p) => p.name === config?.primaryProvider) ||
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

    // 2. Timeout & Indeterminate In-Flight Guard
    // SAFETY GUARD: If primary timed out after receiving the vend request, it may still be executing
    // downstream with the telco/biller. Never throw a fatal error (which triggers premature refund)
    // and never blindly fail over unless requery confirms explicit terminal failure.
    const isTimeout =
      caughtError instanceof CircuitBreakerTimeoutError ||
      (caughtError as any)?.code === 'TIMEOUT' ||
      (caughtError as any)?.name === 'AbortError' ||
      /timed?\s*out/i.test(String(caughtError?.message || ''));

    if (isTimeout) {
      console.warn(
        `[PROVIDER TIMEOUT GUARD] Primary ${primaryName} timed out. Requerying status before settling...`,
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
        }

        if (requery && requery.status === TransactionStatus.FAILED) {
          // Confirmed terminal failure on primary — safe to attempt fallback if enabled, or return FAILED
          caughtError = null;
          result = {
            status: TransactionStatus.FAILED,
            providerName: primaryName,
            providerReference: requery.providerReference || request.requestReference,
            requestReference: request.requestReference,
            amountKobo: request.amountKobo,
            responseCode: requery.responseCode || 'FAILED',
            responseMessage: requery.responseMessage || 'Transaction failed on gateway',
            rawResponse: requery.rawResponse,
          };
        } else {
          console.log(
            `[PROVIDER REQUERY IN-FLIGHT] Primary ${primaryName} is still processing after timeout. Returning PROCESSING.`,
          );
          const processingResult: ServiceVendingResult = {
            status: TransactionStatus.PROCESSING,
            providerName: primaryName,
            providerReference: requery?.providerReference || request.requestReference,
            requestReference: request.requestReference,
            amountKobo: request.amountKobo,
            responseCode: requery?.responseCode || '099',
            responseMessage: requery?.responseMessage || 'Processing with provider',
            rawResponse: requery?.rawResponse,
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
        // Requery itself was unreachable after timeout: keep order in PROCESSING so funds stay held safely
        // until status can be confirmed via subsequent requery (never double-vend or prematurely refund!).
        console.warn(
          `[PROVIDER TIMEOUT INDETERMINATE] Primary ${primaryName} requery unreachable after timeout. Holding as PROCESSING.`,
        );
        const indeterminateResult: ServiceVendingResult = {
          status: TransactionStatus.PROCESSING,
          providerName: primaryName,
          providerReference: request.requestReference,
          requestReference: request.requestReference,
          amountKobo: request.amountKobo,
          responseCode: '099',
          responseMessage: 'Processing — awaiting confirmation from provider',
        };
        await this.auditProviderTransaction(
          transactionId,
          primaryName,
          request,
          indeterminateResult,
          '099',
          Date.now() - startTime,
        );
        return indeterminateResult;
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
        const fbTimeout =
          fallbackErr instanceof CircuitBreakerTimeoutError ||
          (fallbackErr as any)?.code === 'TIMEOUT' ||
          (fallbackErr as any)?.name === 'AbortError' ||
          /timed?\s*out/i.test(String((fallbackErr as Error)?.message || ''));

        if (fbTimeout) {
          const fbProcessing: ServiceVendingResult = {
            status: TransactionStatus.PROCESSING,
            providerName: fallbackName,
            providerReference: request.requestReference,
            requestReference: request.requestReference,
            amountKobo: request.amountKobo,
            responseCode: '099',
            responseMessage: 'Processing — awaiting confirmation from provider',
          };
          await this.auditProviderTransaction(
            transactionId,
            fallbackName,
            request,
            fbProcessing,
            '099',
            Date.now() - fallbackStart,
          );
          return fbProcessing;
        }

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


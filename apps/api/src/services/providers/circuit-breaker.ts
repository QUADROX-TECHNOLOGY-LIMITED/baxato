import { AppError } from '@baxato/common';

export enum CircuitState {
  CLOSED = 'CLOSED',       // Normal operation
  OPEN = 'OPEN',           // Tripped, traffic blocked / routed to fallback
  HALF_OPEN = 'HALF_OPEN', // Probing recovery with canary requests
}

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;   // Number of consecutive failures to trip (default: 3)
  resetTimeoutMs?: number;     // Cooldown duration before HALF_OPEN probe (default: 30,000ms)
  successThreshold?: number;   // Consecutive successes in HALF_OPEN to reset to CLOSED (default: 2)
  timeoutMs?: number;          // Request execution timeout (default: 15,000ms)
}

export interface CircuitBreakerMetrics {
  name: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  consecutiveSuccesses: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  lastStateChange: Date;
}

export class CircuitBreakerOpenError extends AppError {
  constructor(breakerName: string) {
    super(
      `Circuit breaker for provider '${breakerName}' is OPEN. Provider temporarily degraded.`,
      503,
      'SERVICE_UNAVAILABLE',
      true,
      { breakerName },
    );
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitBreakerTimeoutError extends AppError {
  constructor(breakerName: string, timeoutMs: number) {
    super(
      `Request to provider '${breakerName}' timed out after ${timeoutMs}ms.`,
      504,
      'TIMEOUT',
      true,
      { breakerName, timeoutMs },
    );
    this.name = 'CircuitBreakerTimeoutError';
  }
}

export class CircuitBreaker {
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly successThreshold: number;
  private readonly timeoutMs: number;

  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private consecutiveSuccesses: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private lastStateChange: Date = new Date();

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 3;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30000;
    this.successThreshold = options.successThreshold ?? 2;
    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  public getState(): CircuitState {
    this.checkCooldown();
    return this.state;
  }

  public isAvailable(): boolean {
    const currentState = this.getState();
    return currentState === CircuitState.CLOSED || currentState === CircuitState.HALF_OPEN;
  }

  public getMetrics(): CircuitBreakerMetrics {
    this.checkCooldown();
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      lastStateChange: this.lastStateChange,
    };
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.checkCooldown();

    if (this.state === CircuitState.OPEN) {
      throw new CircuitBreakerOpenError(this.name);
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error as Error);
      throw error;
    }
  }

  public recordSuccess(): void {
    this.lastSuccessTime = new Date();
    this.successCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        this.failureCount = 0;
        this.consecutiveSuccesses = 0;
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Soft decay: decrease failure count on success
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  public recordFailure(_error?: Error): void {
    this.lastFailureTime = new Date();
    this.failureCount++;
    this.consecutiveSuccesses = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN immediately trips back to OPEN
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failureCount >= this.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  public reset(): void {
    this.transitionTo(CircuitState.CLOSED);
    this.failureCount = 0;
    this.consecutiveSuccesses = 0;
    this.successCount = 0;
  }

  private checkCooldown(): void {
    if (this.state === CircuitState.OPEN && this.lastFailureTime) {
      const elapsed = Date.now() - this.lastFailureTime.getTime();
      if (elapsed >= this.resetTimeoutMs) {
        this.transitionTo(CircuitState.HALF_OPEN);
        this.consecutiveSuccesses = 0;
      }
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.lastStateChange = new Date();
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    if (this.timeoutMs <= 0) {
      return fn();
    }

    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new CircuitBreakerTimeoutError(this.name, this.timeoutMs));
      }, this.timeoutMs);
    });

    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}

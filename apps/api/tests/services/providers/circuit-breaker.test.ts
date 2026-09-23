import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerOpenError,
  CircuitBreakerTimeoutError,
} from '../../../src/services/providers/circuit-breaker';

describe('CircuitBreaker State Machine & Resilience', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'TEST_PROVIDER',
      failureThreshold: 3,
      resetTimeoutMs: 100, // Short timeout for test
      successThreshold: 2,
      timeoutMs: 50,
    });
  });

  it('starts in CLOSED state with clean metrics', () => {
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    expect(breaker.isAvailable()).toBe(true);

    const metrics = breaker.getMetrics();
    expect(metrics.failureCount).toBe(0);
    expect(metrics.successCount).toBe(0);
    expect(metrics.state).toBe(CircuitState.CLOSED);
  });

  it('executes successful functions and maintains CLOSED state', async () => {
    const result = await breaker.execute(async () => 'OK');
    expect(result).toBe('OK');
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    const metrics = breaker.getMetrics();
    expect(metrics.successCount).toBe(1);
    expect(metrics.failureCount).toBe(0);
  });

  it('trips from CLOSED to OPEN after reaching failureThreshold consecutive failures', async () => {
    const failingFn = async () => {
      throw new Error('Connection refused');
    };

    // 1st failure
    await expect(breaker.execute(failingFn)).rejects.toThrow('Connection refused');
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    // 2nd failure
    await expect(breaker.execute(failingFn)).rejects.toThrow('Connection refused');
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    // 3rd failure -> trips to OPEN
    await expect(breaker.execute(failingFn)).rejects.toThrow('Connection refused');
    expect(breaker.getState()).toBe(CircuitState.OPEN);
    expect(breaker.isAvailable()).toBe(false);

    // 4th call: immediately rejected with CircuitBreakerOpenError without executing fn
    const spy = vi.fn();
    await expect(breaker.execute(spy)).rejects.toThrow(CircuitBreakerOpenError);
    expect(spy).not.toHaveBeenCalled();
  });

  it('transitions from OPEN to HALF_OPEN after resetTimeoutMs cooldown expires', async () => {
    const failingFn = async () => {
      throw new Error('Failed');
    };

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failingFn)).rejects.toThrow();
    }
    expect(breaker.getState()).toBe(CircuitState.OPEN);

    // Wait for cooldown
    await new Promise((resolve) => setTimeout(resolve, 110));

    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    expect(breaker.isAvailable()).toBe(true);
  });

  it('re-trips to OPEN if canary request fails during HALF_OPEN', async () => {
    const failingFn = async () => {
      throw new Error('Failed');
    };

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failingFn)).rejects.toThrow();
    }

    // Wait for cooldown to enter HALF_OPEN
    await new Promise((resolve) => setTimeout(resolve, 110));
    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

    // Canary request fails
    await expect(breaker.execute(failingFn)).rejects.toThrow();
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('resets back to CLOSED after successThreshold consecutive successes in HALF_OPEN', async () => {
    const failingFn = async () => {
      throw new Error('Failed');
    };

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failingFn)).rejects.toThrow();
    }

    // Wait for cooldown to enter HALF_OPEN
    await new Promise((resolve) => setTimeout(resolve, 110));
    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

    // 1st canary success
    await breaker.execute(async () => 'CANARY_1');
    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

    // 2nd canary success -> should reset to CLOSED
    await breaker.execute(async () => 'CANARY_2');
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    expect(breaker.getMetrics().failureCount).toBe(0);
  });

  it('throws CircuitBreakerTimeoutError when request exceeds timeoutMs', async () => {
    const slowFn = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'LATE';
    };

    await expect(breaker.execute(slowFn)).rejects.toThrow(CircuitBreakerTimeoutError);
    expect(breaker.getMetrics().failureCount).toBe(1);
  });

  it('manually resets to CLOSED when reset() is called', async () => {
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(async () => { throw new Error('Err'); })).rejects.toThrow();
    }
    expect(breaker.getState()).toBe(CircuitState.OPEN);

    breaker.reset();
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    expect(breaker.isAvailable()).toBe(true);
    expect(breaker.getMetrics().failureCount).toBe(0);
  });
});

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { IdempotencyConflictError } from '@baxato/common';
import { idempotencyService } from '../../src/services/idempotency.service';
import { inMemoryDb } from '../test-utils/mock-db';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('IdempotencyService (In-Flight Locking & Replay Protection)', () => {
  const testBizId = 'biz_idempotent_100';
  const testKey = 'idemp_key_unique_12345';
  const requestHash = 'sha256_hash_payload_123';

  beforeAll(() => {
    inMemoryDb.reset();
  });

  it('acquireLock returns isCompleted: false on first attempt and creates PROCESSING lock', async () => {
    const res = await idempotencyService.acquireLock(testKey, testBizId, requestHash);
    expect(res.isCompleted).toBe(false);
  });

  it('acquireLock rejects concurrent duplicate key in PROCESSING state with IdempotencyConflictError', async () => {
    await expect(
      idempotencyService.acquireLock(testKey, testBizId, requestHash),
    ).rejects.toThrow(IdempotencyConflictError);
  });

  it('completeLock transitions key to COMPLETED and stores cached response', async () => {
    const mockResponseBody = { success: true, transactionId: 'tx_airtime_999', status: 'SUCCESS' };
    await idempotencyService.completeLock(testKey, testBizId, 200, mockResponseBody);

    const res = await idempotencyService.acquireLock(testKey, testBizId, requestHash);
    expect(res.isCompleted).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.responseBody).toEqual(mockResponseBody);
  });

  it('releaseLock deletes lock allowing safe retry upon failure', async () => {
    const retryKey = 'idemp_key_retry_99999';
    await idempotencyService.acquireLock(retryKey, testBizId, requestHash);
    // Release
    await idempotencyService.releaseLock(retryKey, testBizId);

    // Can acquire again
    const res = await idempotencyService.acquireLock(retryKey, testBizId, requestHash);
    expect(res.isCompleted).toBe(false);
  });
});

import { IdempotencyConflictError, ValidationError } from '@baxato/common';
import { db, idempotencyKeys, eq, and } from '@baxato/database';

export interface IdempotencyLockResult {
  isCompleted: boolean;
  statusCode?: number;
  responseBody?: unknown;
}

export class IdempotencyService {
  /**
   * Attempts to acquire an atomic in-flight lock for an idempotency key.
   * If already completed, returns the cached response.
   * If currently processing, throws IdempotencyConflictError (409).
   */
  public async acquireLock(
    key: string,
    businessId: string,
    requestHash: string,
  ): Promise<IdempotencyLockResult> {
    if (!key || key.trim().length < 8) {
      throw new ValidationError('Idempotency key must be at least 8 characters long.');
    }

    const trimmedKey = key.trim();

    // Check if key already exists
    const [existing] = await db
      .select()
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.key, trimmedKey),
          eq(idempotencyKeys.businessId, businessId),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.responseStatus !== null && existing.responseStatus !== undefined) {
        return {
          isCompleted: true,
          statusCode: existing.responseStatus,
          responseBody: existing.responseBody,
        };
      }

      // If lockedUntil is in the future, it's actively processing
      const now = new Date();
      if (existing.lockedUntil && existing.lockedUntil > now) {
        throw new IdempotencyConflictError(
          'A transaction with this idempotency key is currently being processed. Please wait for completion.',
        );
      }
    }

    const lockedUntil = new Date(Date.now() + 60 * 1000); // 60s in-flight lock

    // Insert new lock
    await db.insert(idempotencyKeys).values({
      key: trimmedKey,
      businessId,
      requestHash,
      lockedUntil,
    });

    return { isCompleted: false };
  }

  /**
   * Marks the idempotency key as COMPLETED and persists the exact response payload for replays.
   */
  public async completeLock(
    key: string,
    businessId: string,
    statusCode: number,
    responseBody: unknown,
  ): Promise<void> {
    const trimmedKey = key.trim();

    await db
      .update(idempotencyKeys)
      .set({
        responseStatus: statusCode,
        responseBody,
        lockedUntil: null,
      })
      .where(
        and(
          eq(idempotencyKeys.key, trimmedKey),
          eq(idempotencyKeys.businessId, businessId),
        ),
      );
  }

  /**
   * Releases an in-flight lock on failure to allow retry.
   */
  public async releaseLock(key: string, businessId: string): Promise<void> {
    const trimmedKey = key.trim();

    await db
      .delete(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.key, trimmedKey),
          eq(idempotencyKeys.businessId, businessId),
        ),
      );
  }
}

export const idempotencyService = new IdempotencyService();

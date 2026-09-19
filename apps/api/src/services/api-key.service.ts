import crypto from 'node:crypto';
import {
  generateEntityId,
  ValidationError,
  NotFoundError,
  ApiKeyStatus,
  ApiKeyEnvironment,
  type ApiKeyDto,
  type ApiKeyGeneratedResponse,
} from '@baxato/common';
import { db, apiKeys, businesses, eq, and, desc } from '@baxato/database';

export interface GenerateApiKeyInput {
  businessId: string;
  name: string;
  environment?: ApiKeyEnvironment;
  expiresAt?: Date | null;
}

export interface ValidateApiKeyResult {
  isValid: boolean;
  apiKey?: ApiKeyDto;
  businessId?: string;
  environment?: ApiKeyEnvironment;
}

export class ApiKeyService {
  /**
   * Hashes a raw secret API key using SHA-256 for secure database storage.
   */
  public hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Generates a new cryptographically random 256-bit API key.
   * Format: bx_live_<64_hex_chars> or bx_test_<64_hex_chars>
   * Only the SHA-256 hash and masked prefix are stored in the database.
   * The plaintext secret key is returned ONLY once.
   */
  public async generateApiKey(input: GenerateApiKeyInput): Promise<ApiKeyGeneratedResponse> {
    const { businessId, name, environment = ApiKeyEnvironment.TEST, expiresAt = null } = input;

    if (!businessId) {
      throw new ValidationError('Business ID is required to generate an API key');
    }

    if (!name || name.trim().length < 2) {
      throw new ValidationError('API key name must be at least 2 characters long');
    }

    // Verify target business exists
    const [biz] = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz) {
      throw new NotFoundError(`Business with ID [${businessId}] not found`);
    }

    // 32 cryptographically secure random bytes = 256 bits of entropy
    const randomHex = crypto.randomBytes(32).toString('hex');
    const envPrefix = environment === ApiKeyEnvironment.LIVE ? 'bx_live' : 'bx_test';
    const secretKey = `${envPrefix}_${randomHex}`;
    const keyHash = this.hashKey(secretKey);
    const keyPrefix = `${secretKey.slice(0, 14)}...`;

    const keyId = generateEntityId('key');

    const [created] = await db
      .insert(apiKeys)
      .values({
        id: keyId,
        businessId,
        name: name.trim(),
        keyHash,
        keyPrefix,
        environment,
        status: ApiKeyStatus.ACTIVE,
        expiresAt: expiresAt ?? null,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create API key');
    }

    const apiKeyDto: ApiKeyDto = {
      id: created.id,
      businessId: created.businessId,
      name: created.name,
      keyPrefix: created.keyPrefix,
      environment: created.environment as ApiKeyEnvironment,
      status: created.status as ApiKeyStatus,
      lastUsedAt: created.lastUsedAt ?? null,
      expiresAt: created.expiresAt ?? null,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };

    return {
      apiKey: apiKeyDto,
      secretKey,
    };
  }

  /**
   * Validates a raw API key against stored SHA-256 hashes.
   * Checks status (ACTIVE) and expiration date.
   * Updates lastUsedAt asynchronously upon successful authentication.
   */
  public async validateApiKey(rawKey: string): Promise<ValidateApiKeyResult> {
    if (!rawKey || typeof rawKey !== 'string' || !rawKey.startsWith('bx_')) {
      return { isValid: false };
    }

    const keyHash = this.hashKey(rawKey.trim());

    const [keyRecord] = await db
      .select({
        id: apiKeys.id,
        businessId: apiKeys.businessId,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        environment: apiKeys.environment,
        status: apiKeys.status,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash))
      .limit(1);

    if (!keyRecord) {
      return { isValid: false };
    }

    // Check status
    if (keyRecord.status !== ApiKeyStatus.ACTIVE) {
      return { isValid: false };
    }

    // Check expiration
    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt).getTime() < Date.now()) {
      try {
        await db
          .update(apiKeys)
          .set({ status: ApiKeyStatus.EXPIRED, updatedAt: new Date() })
          .where(eq(apiKeys.id, keyRecord.id));
      } catch {
        // Non-blocking
      }

      return { isValid: false };
    }

    // Update lastUsedAt
    try {
      await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, keyRecord.id));
    } catch {
      // Non-blocking
    }

    const apiKeyDto: ApiKeyDto = {
      id: keyRecord.id,
      businessId: keyRecord.businessId,
      name: keyRecord.name,
      keyPrefix: keyRecord.keyPrefix,
      environment: keyRecord.environment as ApiKeyEnvironment,
      status: keyRecord.status as ApiKeyStatus,
      lastUsedAt: keyRecord.lastUsedAt ?? null,
      expiresAt: keyRecord.expiresAt ?? null,
      createdAt: keyRecord.createdAt,
      updatedAt: keyRecord.updatedAt,
    };

    return {
      isValid: true,
      apiKey: apiKeyDto,
      businessId: keyRecord.businessId,
      environment: keyRecord.environment as ApiKeyEnvironment,
    };
  }

  /**
   * Retrieves all API keys for a given business, sorted by creation date descending.
   */
  public async listApiKeys(businessId: string): Promise<ApiKeyDto[]> {
    if (!businessId) {
      throw new ValidationError('Business ID is required to list API keys');
    }

    const records = await db
      .select({
        id: apiKeys.id,
        businessId: apiKeys.businessId,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        environment: apiKeys.environment,
        status: apiKeys.status,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.businessId, businessId))
      .orderBy(desc(apiKeys.createdAt));

    return records.map((r) => ({
      id: r.id,
      businessId: r.businessId,
      name: r.name,
      keyPrefix: r.keyPrefix,
      environment: r.environment as ApiKeyEnvironment,
      status: r.status as ApiKeyStatus,
      lastUsedAt: r.lastUsedAt ?? null,
      expiresAt: r.expiresAt ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Retrieves a single API key by ID within business context.
   */
  public async getApiKey(keyId: string, businessId: string): Promise<ApiKeyDto> {
    const [keyRecord] = await db
      .select({
        id: apiKeys.id,
        businessId: apiKeys.businessId,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        environment: apiKeys.environment,
        status: apiKeys.status,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
      })
      .from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.businessId, businessId)))
      .limit(1);

    if (!keyRecord) {
      throw new NotFoundError(`API key with ID [${keyId}] not found`);
    }

    return {
      id: keyRecord.id,
      businessId: keyRecord.businessId,
      name: keyRecord.name,
      keyPrefix: keyRecord.keyPrefix,
      environment: keyRecord.environment as ApiKeyEnvironment,
      status: keyRecord.status as ApiKeyStatus,
      lastUsedAt: keyRecord.lastUsedAt ?? null,
      expiresAt: keyRecord.expiresAt ?? null,
      createdAt: keyRecord.createdAt,
      updatedAt: keyRecord.updatedAt,
    };
  }

  /**
   * Revokes an existing API key immediately.
   */
  public async revokeApiKey(keyId: string, businessId: string): Promise<ApiKeyDto> {
    const existing = await this.getApiKey(keyId, businessId);

    if (existing.status === ApiKeyStatus.REVOKED) {
      return existing;
    }

    const [updated] = await db
      .update(apiKeys)
      .set({
        status: ApiKeyStatus.REVOKED,
        updatedAt: new Date(),
      })
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.businessId, businessId)))
      .returning();

    if (!updated) {
      throw new NotFoundError('API Key');
    }

    return {
      id: updated.id,
      businessId: updated.businessId,
      name: updated.name,
      keyPrefix: updated.keyPrefix,
      environment: updated.environment as ApiKeyEnvironment,
      status: updated.status as ApiKeyStatus,
      lastUsedAt: updated.lastUsedAt ?? null,
      expiresAt: updated.expiresAt ?? null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Rotates an API key: revokes the old key and issues a new active key.
   */
  public async rotateApiKey(keyId: string, businessId: string): Promise<ApiKeyGeneratedResponse> {
    const existing = await this.getApiKey(keyId, businessId);

    // Revoke old key
    await this.revokeApiKey(keyId, businessId);

    // Generate new key with the same name and environment
    return this.generateApiKey({
      businessId,
      name: existing.name,
      environment: existing.environment,
      expiresAt: existing.expiresAt,
    });
  }
}

export const apiKeyService = new ApiKeyService();

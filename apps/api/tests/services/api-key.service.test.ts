import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiKeyEnvironment, ApiKeyStatus, ValidationError, NotFoundError } from '@baxato/common';
import { ApiKeyService } from '../../src/services/api-key.service';
import { inMemoryDb } from '../test-utils/mock-db';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('ApiKeyService (Developer Platform Key Management)', () => {
  const testBizId = 'biz_dev_unit_1';
  const testUserId = 'usr_dev_unit_1';

  let service: ApiKeyService;

  beforeEach(() => {
    inMemoryDb.reset();

    // Create test business
    inMemoryDb.businesses.push({
      id: testBizId,
      ownerId: testUserId,
      name: 'PayFintech Global Ltd',
      slug: 'payfintech-global',
      country: 'NG',
      state: 'Lagos',
      lga: 'Ikeja',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    service = new ApiKeyService();
  });

  describe('hashKey', () => {
    it('produces deterministic 64-character hex SHA-256 hash', () => {
      const hash1 = service.hashKey('bx_live_secret123');
      const hash2 = service.hashKey('bx_live_secret123');
      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(service.hashKey('bx_test_secret123'));
    });
  });

  describe('generateApiKey', () => {
    it('rejects missing businessId', async () => {
      await expect(
        service.generateApiKey({ businessId: '', name: 'Test Key' }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects invalid key name', async () => {
      await expect(
        service.generateApiKey({ businessId: testBizId, name: 'a' }),
      ).rejects.toThrow(ValidationError);
    });

    it('throws NotFoundError if business does not exist', async () => {
      await expect(
        service.generateApiKey({ businessId: 'biz_nonexistent', name: 'Valid Key' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('generates a TEST API key by default with bx_test_ prefix and 256-bit entropy', async () => {
      const res = await service.generateApiKey({
        businessId: testBizId,
        name: 'Sandbox Integration Key',
      });

      expect(res.secretKey).toMatch(/^bx_test_[0-9a-f]{64}$/);
      expect(res.apiKey.name).toBe('Sandbox Integration Key');
      expect(res.apiKey.environment).toBe(ApiKeyEnvironment.TEST);
      expect(res.apiKey.status).toBe(ApiKeyStatus.ACTIVE);
      expect(res.apiKey.keyPrefix).toBe(`${res.secretKey.slice(0, 14)}...`);
      expect(res.apiKey.businessId).toBe(testBizId);

      // Verify stored in DB
      const stored = inMemoryDb.apiKeys.find((k) => k.id === res.apiKey.id);
      expect(stored).toBeDefined();
      expect(stored?.keyHash).toBe(service.hashKey(res.secretKey));
    });

    it('generates a LIVE API key with bx_live_ prefix', async () => {
      const res = await service.generateApiKey({
        businessId: testBizId,
        name: 'Production Vending Key',
        environment: ApiKeyEnvironment.LIVE,
      });

      expect(res.secretKey).toMatch(/^bx_live_[0-9a-f]{64}$/);
      expect(res.apiKey.environment).toBe(ApiKeyEnvironment.LIVE);
    });

    it('persists optional expiration date', async () => {
      const expiresAt = new Date(Date.now() + 30 * 86400000); // 30 days
      const res = await service.generateApiKey({
        businessId: testBizId,
        name: 'Expiring Key',
        expiresAt,
      });

      expect(res.apiKey.expiresAt).toEqual(expiresAt);
    });
  });

  describe('validateApiKey', () => {
    it('returns isValid: false for malformed or empty keys', async () => {
      expect(await service.validateApiKey('')).toEqual({ isValid: false });
      expect(await service.validateApiKey('invalid_prefix_12345')).toEqual({ isValid: false });
    });

    it('returns isValid: false for unregistered key', async () => {
      const fakeKey = 'bx_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      expect(await service.validateApiKey(fakeKey)).toEqual({ isValid: false });
    });

    it('validates active key successfully and updates lastUsedAt', async () => {
      const { secretKey, apiKey } = await service.generateApiKey({
        businessId: testBizId,
        name: 'Active Key',
        environment: ApiKeyEnvironment.LIVE,
      });

      const valResult = await service.validateApiKey(secretKey);
      expect(valResult.isValid).toBe(true);
      expect(valResult.apiKey?.id).toBe(apiKey.id);
      expect(valResult.businessId).toBe(testBizId);
      expect(valResult.environment).toBe(ApiKeyEnvironment.LIVE);
    });

    it('returns isValid: false for revoked key', async () => {
      const { secretKey, apiKey } = await service.generateApiKey({
        businessId: testBizId,
        name: 'To be revoked',
      });

      await service.revokeApiKey(apiKey.id, testBizId);

      const valResult = await service.validateApiKey(secretKey);
      expect(valResult.isValid).toBe(false);
    });

    it('returns isValid: false and marks key as expired when expiresAt is in the past', async () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hr ago
      const { secretKey, apiKey } = await service.generateApiKey({
        businessId: testBizId,
        name: 'Expired Key',
        expiresAt: pastDate,
      });

      const valResult = await service.validateApiKey(secretKey);
      expect(valResult.isValid).toBe(false);
    });
  });

  describe('listApiKeys & getApiKey', () => {
    it('lists all keys for a business and never leaks keyHash', async () => {
      await service.generateApiKey({ businessId: testBizId, name: 'Key 1' });
      await service.generateApiKey({ businessId: testBizId, name: 'Key 2' });

      const keys = await service.listApiKeys(testBizId);
      expect(keys).toHaveLength(2);
      expect((keys[0] as unknown as { keyHash?: string }).keyHash).toBeUndefined();
    });

    it('retrieves single key by ID', async () => {
      const { apiKey } = await service.generateApiKey({ businessId: testBizId, name: 'Key Single' });
      const fetched = await service.getApiKey(apiKey.id, testBizId);
      expect(fetched.id).toBe(apiKey.id);
      expect(fetched.name).toBe('Key Single');
    });

    it('throws NotFoundError for mismatched businessId', async () => {
      const { apiKey } = await service.generateApiKey({ businessId: testBizId, name: 'Key Mismatch' });
      await expect(service.getApiKey(apiKey.id, 'biz_other')).rejects.toThrow(NotFoundError);
    });
  });

  describe('revokeApiKey & rotateApiKey', () => {
    it('revokes an active API key', async () => {
      const { apiKey } = await service.generateApiKey({ businessId: testBizId, name: 'Key to Revoke' });
      const revoked = await service.revokeApiKey(apiKey.id, testBizId);

      expect(revoked.status).toBe(ApiKeyStatus.REVOKED);
    });

    it('rotates an API key: revokes old and returns brand new key', async () => {
      const { secretKey: oldSecret, apiKey: oldKey } = await service.generateApiKey({
        businessId: testBizId,
        name: 'Rotatable Key',
        environment: ApiKeyEnvironment.LIVE,
      });

      const rotated = await service.rotateApiKey(oldKey.id, testBizId);

      // Old key revoked
      const oldCheck = await service.getApiKey(oldKey.id, testBizId);
      expect(oldCheck.status).toBe(ApiKeyStatus.REVOKED);

      // New key is active and has new secret
      expect(rotated.apiKey.id).not.toBe(oldKey.id);
      expect(rotated.apiKey.status).toBe(ApiKeyStatus.ACTIVE);
      expect(rotated.apiKey.environment).toBe(ApiKeyEnvironment.LIVE);
      expect(rotated.apiKey.name).toBe('Rotatable Key');
      expect(rotated.secretKey).not.toBe(oldSecret);

      // Old secret key fails validation
      expect(await service.validateApiKey(oldSecret)).toEqual({ isValid: false });

      // New secret key passes validation
      const newValidation = await service.validateApiKey(rotated.secretKey);
      expect(newValidation.isValid).toBe(true);
    });
  });
});

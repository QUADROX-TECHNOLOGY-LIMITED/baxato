import { describe, it, expect } from 'vitest';
import { parseEnv, getSanitizedEnv } from '../src/env.schema.js';

describe('Environment Configuration Schema (Zod)', () => {
  it('successfully parses valid environment configuration without fallbacks', () => {
    const parsed = parseEnv({
      NODE_ENV: 'test',
      PORT: '5000',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/baxato_test',
      JWT_SECRET: 'super_secret_jwt_key_at_least_16_chars',
      CLERK_PUBLISHABLE_KEY: 'pk_test_baxato_sample_key',
      CLERK_SECRET_KEY: 'sk_test_baxato_sample_secret',
    });

    expect(parsed.NODE_ENV).toBe('test');
    expect(parsed.PORT).toBe(5000);
    expect(parsed.API_PREFIX).toBe('/v1');
  });

  it('throws informative error when required variables are missing or invalid', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'not-a-valid-url',
      }),
    ).toThrowError(/Environment configuration validation failed/);

    expect(() =>
      parseEnv({
        NODE_ENV: 'production',
      }),
    ).toThrowError(/DATABASE_URL: Required/);
  });

  it('redacts sensitive secrets in sanitized environment copy', () => {
    const parsed = parseEnv({
      DATABASE_URL: 'postgresql://db_user:secret_password@db.example.com:5432/prod',
      JWT_SECRET: 'super_secret_jwt_key_at_least_16_chars',
      CLERK_PUBLISHABLE_KEY: 'pk_test_baxato_sample_key',
      CLERK_SECRET_KEY: 'sk_live_very_secret_clerk_key',
      MONNIFY_SECRET_KEY: 'super_secret_monnify_secret',
      VTPASS_SECRET_KEY: 'SK_super_secret_vtpass_secret',
      VTPASS_API_KEY: 'vtpass_api_key_sample',
    });

    const sanitized = getSanitizedEnv(parsed);
    expect(sanitized.DATABASE_URL).toBe('postgresql://db_user:****@db.example.com:5432/prod');
    expect(sanitized.CLERK_SECRET_KEY).toBe('****');
    expect(sanitized.MONNIFY_SECRET_KEY).toBe('****');
    expect(sanitized.VTPASS_SECRET_KEY).toBe('****');
    expect(sanitized.VTPASS_API_KEY).toBe('****');
  });
});

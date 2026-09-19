import { describe, it, expect } from 'vitest';
import { parseEnv, getSanitizedEnv } from './env.schema.js';

describe('Environment Configuration Schema (Zod)', () => {
  it('successfully parses valid environment configuration with defaults', () => {
    const parsed = parseEnv({
      NODE_ENV: 'test',
      PORT: '5000',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/baxato_test',
    });

    expect(parsed.NODE_ENV).toBe('test');
    expect(parsed.PORT).toBe(5000);
    expect(parsed.API_PREFIX).toBe('/v1');
    expect(parsed.INTERSWITCH_TERMINAL_ID).toBe('3XAT0001');
    expect(parsed.INTERSWITCH_TRANSFER_CODE_PREFIX).toBe('2411');
  });

  it('throws informative error on invalid URL or missing required types', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'not-a-valid-url',
      }),
    ).toThrowError(/Environment configuration validation failed/);
  });

  it('redacts sensitive secrets in sanitized environment copy', () => {
    const parsed = parseEnv({
      DATABASE_URL: 'postgresql://db_user:secret_password@db.example.com:5432/prod',
      CLERK_SECRET_KEY: 'sk_live_very_secret_clerk_key',
      INTERSWITCH_CLIENT_SECRET: 'super_secret_interswitch_secret',
      MONNIFY_SECRET_KEY: 'super_secret_monnify_secret',
    });

    const sanitized = getSanitizedEnv(parsed);
    expect(sanitized.DATABASE_URL).toBe('postgresql://db_user:****@db.example.com:5432/prod');
    expect(sanitized.CLERK_SECRET_KEY).toBe('****');
    expect(sanitized.INTERSWITCH_CLIENT_SECRET).toBe('****');
    expect(sanitized.MONNIFY_SECRET_KEY).toBe('****');
  });
});

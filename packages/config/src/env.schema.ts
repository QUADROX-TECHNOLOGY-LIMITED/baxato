import { z } from 'zod';

export const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'test', 'staging', 'production'])
    .default('development'),
  PORT: z.coerce.number().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  API_PREFIX: z.string().default('/v1'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:4000'),
  DASHBOARD_URL: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  // Database (PostgreSQL)
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://baxato_user:baxato_password@localhost:5432/baxato_dev'),
  DATABASE_POOL_MIN: z.coerce.number().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().min(5).default(20),

  // Redis / Key-Value Store
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // Authentication & Identity (Clerk & JWT)
  JWT_SECRET: z.string().default('baxato_super_secret_jwt_key_development_32bytes'),
  CLERK_PUBLISHABLE_KEY: z.string().default('pk_test_baxato_dummy_key'),
  CLERK_SECRET_KEY: z.string().default('sk_test_baxato_dummy_secret'),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // WhatsApp Cloud API (Phone OTP Verification)
  WHATSAPP_API_TOKEN: z.string().default('EAAB_DUMMY_WHATSAPP_TOKEN'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default('123456789012345'),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().default('987654321098765'),

  // Identity & KYC Provider (NIMC / NIN Verification via Monnify / Optional)
  IDENTITY_API_KEY: z.string().default('identity_pass_test_api_key').optional(),
  IDENTITY_API_BASE_URL: z.string().url().default('https://api.myidentitypass.com/api/v2').optional(),
  IDENTITY_APP_ID: z.string().default('baxato_identity_app_id').optional(),

  // Interswitch Orion SVA v5
  INTERSWITCH_CLIENT_ID: z.string().default('IKIA_DUMMY_CLIENT_ID'),
  INTERSWITCH_CLIENT_SECRET: z.string().default('DUMMY_CLIENT_SECRET'),
  INTERSWITCH_PASSPORT_URL: z
    .string()
    .url()
    .default('https://passport.interswitchng.com/passport/oauth/token'),
  INTERSWITCH_BASE_URL: z
    .string()
    .url()
    .default('https://orion.interswitchng.com'),
  INTERSWITCH_TERMINAL_ID: z.string().default('3XAT0001'),
  INTERSWITCH_TRANSFER_CODE_PREFIX: z.string().default('2411'),

  // Monnify Provider (Dual Provider / Wallet Funding)
  MONNIFY_API_KEY: z.string().default('MK_TEST_DUMMY_API_KEY'),
  MONNIFY_SECRET_KEY: z.string().default('MS_TEST_DUMMY_SECRET_KEY'),
  MONNIFY_BASE_URL: z
    .string()
    .url()
    .default('https://sandbox.monnify.com'),
  MONNIFY_CONTRACT_CODE: z.string().default('0000000000'),
  MONNIFY_WALLET_ACCOUNT_NUMBER: z.string().default('0000000000').optional(),

  // Webhooks & Security
  WEBHOOK_SIGNING_SECRET: z.string().default('baxato_whsec_dummy_local_secret_key_32bytes'),
  ENCRYPTION_MASTER_KEY: z.string().default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),

  // ZeptoMail Email Infrastructure
  ZEPTOMAIL_API_KEY: z.string().default(''),
  ZEPTOMAIL_BOUNCE_ADDRESS: z.string().default('bounce@bounce-zem.quadroxtech.cloud'),
  ZEPTOMAIL_FROM_ADDRESS: z.string().default('dev@quadroxtech.cloud'),
  ZEPTOMAIL_FROM_NAME: z.string().default('BAXATO'),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(rawEnv: Record<string, unknown> = process.env): Env {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    throw new Error(`[FATAL] BAXATO Environment configuration validation failed:\n${errorDetails}`);
  }

  return result.data;
}

export function getSanitizedEnv(env: Env): Record<string, unknown> {
  return {
    ...env,
    DATABASE_URL: env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'),
    REDIS_URL: env.REDIS_URL.replace(/:[^:@]+@/, ':****@'),
    JWT_SECRET: '****',
    CLERK_SECRET_KEY: '****',
    WHATSAPP_API_TOKEN: '****',
    IDENTITY_API_KEY: '****',
    INTERSWITCH_CLIENT_SECRET: '****',
    MONNIFY_SECRET_KEY: '****',
    WEBHOOK_SIGNING_SECRET: '****',
    ENCRYPTION_MASTER_KEY: '****',
    ZEPTOMAIL_API_KEY: '****',
  };
}

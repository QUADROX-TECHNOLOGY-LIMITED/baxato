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

  // Database (PostgreSQL) — STRICTLY REQUIRED, NO FALLBACK
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MIN: z.coerce.number().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().min(5).default(20),

  // Redis / Key-Value Store
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // Authentication & Identity (Clerk & JWT) — STRICTLY REQUIRED, NO FALLBACK
  JWT_SECRET: z.string().min(16),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // WhatsApp Cloud API (Phone OTP Verification & Message Templates)
  WHATSAPP_API_TOKEN: z.string().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().default(''),
  WHATSAPP_APP_ID: z.string().default('').optional(),
  WHATSAPP_TEMPLATE_NAME: z.string().default('registration_otp'),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().default('en_GB'),

  // Identity & KYC Provider (NIMC / NIN Verification via Monnify / Optional)
  IDENTITY_API_KEY: z.string().default('').optional(),
  IDENTITY_API_BASE_URL: z.string().url().optional(),
  IDENTITY_APP_ID: z.string().default('').optional(),

  // Interswitch Orion SVA v5
  INTERSWITCH_CLIENT_ID: z.string().default(''),
  INTERSWITCH_CLIENT_SECRET: z.string().default(''),
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
  MONNIFY_API_KEY: z.string().default(''),
  MONNIFY_SECRET_KEY: z.string().default(''),
  MONNIFY_BASE_URL: z
    .string()
    .url()
    .default('https://sandbox.monnify.com'),
  MONNIFY_CONTRACT_CODE: z.string().default(''),
  MONNIFY_WALLET_ACCOUNT_NUMBER: z.string().default('').optional(),

  // Webhooks & Security
  WEBHOOK_SIGNING_SECRET: z.string().default(''),
  ENCRYPTION_MASTER_KEY: z.string().default(''),

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
    DATABASE_URL: env.DATABASE_URL ? env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : undefined,
    REDIS_URL: env.REDIS_URL ? env.REDIS_URL.replace(/:[^:@]+@/, ':****@') : undefined,
    JWT_SECRET: env.JWT_SECRET ? '****' : undefined,
    CLERK_SECRET_KEY: env.CLERK_SECRET_KEY ? '****' : undefined,
    WHATSAPP_API_TOKEN: env.WHATSAPP_API_TOKEN ? '****' : undefined,
    IDENTITY_API_KEY: env.IDENTITY_API_KEY ? '****' : undefined,
    INTERSWITCH_CLIENT_SECRET: env.INTERSWITCH_CLIENT_SECRET ? '****' : undefined,
    MONNIFY_SECRET_KEY: env.MONNIFY_SECRET_KEY ? '****' : undefined,
    WEBHOOK_SIGNING_SECRET: env.WEBHOOK_SIGNING_SECRET ? '****' : undefined,
    ENCRYPTION_MASTER_KEY: env.ENCRYPTION_MASTER_KEY ? '****' : undefined,
    ZEPTOMAIL_API_KEY: env.ZEPTOMAIL_API_KEY ? '****' : undefined,
  };
}

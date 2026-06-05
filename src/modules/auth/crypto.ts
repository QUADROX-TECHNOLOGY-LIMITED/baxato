import * as argon2 from 'argon2';
import crypto from 'crypto';

/**
 * Standardized Argon2id configuration for BAXATO.
 */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
};

/**
 * Hashes passwords, API keys, and refresh tokens.
 */
export async function hashData(data: string): Promise<string> {
  return await argon2.hash(data, ARGON2_OPTIONS);
}

/**
 * Verifies raw input against an Argon2id hash.
 */
export async function verifyHash(hash: string, data: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, data);
  } catch (error) {
    return false;
  }
}

/**
 * Generates a secure API Key.
 * Format: bax_live_[64-char hex]
 */
export function generateApiKey(): { rawKey: string } {
  const buffer = crypto.randomBytes(32);
  const rawKey = `bax_live_${buffer.toString('hex')}`;
  return { rawKey };
}

/**
 * Generates a secure Refresh Token for stateful sessions.
 * Format: baxtk_[64-char hex]
 */
export function generateRefreshToken(): { rawToken: string } {
  const buffer = crypto.randomBytes(32);
  const rawToken = `baxtk_${buffer.toString('hex')}`;
  return { rawToken };
}

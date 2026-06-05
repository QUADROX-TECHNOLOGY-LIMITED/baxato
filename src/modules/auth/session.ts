import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hashData, generateRefreshToken } from './crypto';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_must_change_in_production'
);

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

type AccessTokenPayload = {
  userId: string;
  role: string;
};

/**
 * Generates a short-lived Access Token (Stateless JWT).
 * Safe to be verified in Next.js Edge Middleware.
 */
export async function createAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Verifies the Access Token.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as AccessTokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Establishes a completely new dashboard session.
 * 1. Generates Access Token.
 * 2. Generates raw Refresh Token.
 * 3. Hashes and stores Refresh Token in PostgreSQL.
 * 4. Sets HTTP-Only cookies.
 */
export async function establishDashboardSession(userId: string, role: string) {
  // 1. Create stateless access token
  const accessToken = await createAccessToken({ userId, role });

  // 2. Create stateful refresh token
  const { rawToken } = generateRefreshToken();
  const tokenHash = await hashData(rawToken);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  // 3. Store hash in PostgreSQL
  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  // 4. Set secure cookies
  const cookieStore = cookies();
  
  cookieStore.set('baxato_access', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 minutes
  });

  cookieStore.set('baxato_refresh', rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
  });
}

/**
 * Revokes all sessions for a user (Remote Logout / Compromise Response).
 */
export async function revokeAllUserSessions(userId: string) {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

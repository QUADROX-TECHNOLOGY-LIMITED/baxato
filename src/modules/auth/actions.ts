'use server'

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hashData, verifyHash } from './crypto';
import { establishDashboardSession, revokeAllUserSessions } from './session';

// --- Types ---
export type AuthState = {
  error?: string;
  success?: boolean;
};

/**
 * Handles User Registration via Server Action.
 * Guarantees atomic creation of User and Wallet.
 */
export async function registerUser(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get('email')?.toString().toLowerCase().trim();
  const password = formData.get('password')?.toString();

  if (!email || !password || password.length < 8) {
    return { error: 'Valid email and a password of at least 8 characters are required.' };
  }

  try {
    // 1. Check for existing user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: 'An account with this email already exists.' };
    }

    // 2. Hash the password using Argon2id
    const passwordHash = await hashData(password);

    // 3. Atomic Database Transaction
    // Ensures a User is NEVER created without a corresponding Wallet
    const user = await prisma.$transaction(async (tx) => {
      return await tx.user.create({
        data: {
          email,
          passwordHash,
          role: 'USER', // Default role
          wallet: {
            create: {
              balance: 0,
            },
          },
        },
      });
    });

    // 4. Establish the Access/Refresh token session
    await establishDashboardSession(user.id, user.role);

    return { success: true };
  } catch (error) {
    console.error('Registration Error:', error);
    return { error: 'An unexpected error occurred during registration.' };
  }
}

/**
 * Handles User Login via Server Action.
 */
export async function loginUser(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get('email')?.toString().toLowerCase().trim();
  const password = formData.get('password')?.toString();

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    // 1. Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: 'Invalid credentials.' }; // Generic message prevents email enumeration
    }

    // 2. Verify Argon2id hash
    const isValid = await verifyHash(user.passwordHash, password);

    if (!isValid) {
      return { error: 'Invalid credentials.' };
    }

    // 3. Establish fresh session
    await establishDashboardSession(user.id, user.role);

    return { success: true };
  } catch (error) {
    console.error('Login Error:', error);
    return { error: 'An unexpected error occurred during login.' };
  }
}

/**
 * Handles User Logout via Server Action.
 */
export async function logoutUser() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('baxato_access')?.value;

  // If we had a mechanism to extract userId from the access token here,
  // we would call revokeAllUserSessions(userId) to clear the DB.
  // For now, we strictly destroy the cookies to kill the session.

  cookieStore.delete('baxato_access');
  cookieStore.delete('baxato_refresh');
}

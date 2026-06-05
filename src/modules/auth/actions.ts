'use server'

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hashData, verifyHash } from './crypto';
import { establishDashboardSession, revokeAllUserSessions } from './session';

export type AuthState = {
  error?: string;
  success?: boolean;
};

export async function registerUser(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get('email')?.toString().toLowerCase().trim();
  const password = formData.get('password')?.toString();

  if (!email || !password || password.length < 8) {
    return { error: 'Valid email and a password of at least 8 characters are required.' };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: 'An account with this email already exists.' };
    }

    const passwordHash = await hashData(password);

    const user = await prisma.$transaction(async (tx) => {
      return await tx.user.create({
        data: {
          email,
          passwordHash,
          role: 'USER',
          wallet: {
            create: {
              balance: 0,
            },
          },
        },
      });
    });

    await establishDashboardSession(user.id, user.role);

    return { success: true };
  } catch (error) {
    console.error('Registration Error:', error);
    return { error: 'An unexpected error occurred during registration.' };
  }
}

export async function loginUser(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get('email')?.toString().toLowerCase().trim();
  const password = formData.get('password')?.toString();

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: 'Invalid credentials.' }; 
    }

    const isValid = await verifyHash(user.passwordHash, password);

    if (!isValid) {
      return { error: 'Invalid credentials.' };
    }

    await establishDashboardSession(user.id, user.role);

    return { success: true };
  } catch (error) {
    console.error('Login Error:', error);
    return { error: 'An unexpected error occurred during login.' };
  }
}

export async function logoutUser() {
  const cookieStore = await cookies(); // Added await here
  const accessToken = cookieStore.get('baxato_access')?.value;

  cookieStore.delete('baxato_access');
  cookieStore.delete('baxato_refresh');
}

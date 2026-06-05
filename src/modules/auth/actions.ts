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
  // Extract all fields
  const email = formData.get('email')?.toString().toLowerCase().trim();
  const password = formData.get('password')?.toString();
  
  // KYC Fields
  const firstName = formData.get('firstName')?.toString().trim();
  const lastName = formData.get('lastName')?.toString().trim();
  const middleName = formData.get('middleName')?.toString().trim() || null;
  const phoneNumber = formData.get('phoneNumber')?.toString().trim();
  const country = formData.get('country')?.toString().trim() || 'Nigeria';
  const state = formData.get('state')?.toString().trim();
  const lga = formData.get('lga')?.toString().trim();
  const businessName = formData.get('businessName')?.toString().trim();
  let website = formData.get('website')?.toString().trim() || null;

  // Basic validation for required fields
  if (!email || !password || password.length < 8) {
    return { error: 'Valid email and a password of at least 8 characters are required.' };
  }
  if (!firstName || !lastName || !phoneNumber || !state || !lga || !businessName) {
    return { error: 'Please fill in all required personal and business information.' };
  }

  // Auto-format website
  if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
    website = `https://${website}`;
  }

  try {
    // Check for existing user by email or phone
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phoneNumber }
        ]
      },
    });

    if (existingUser) {
      if (existingUser.email === email) return { error: 'An account with this email already exists.' };
      if (existingUser.phoneNumber === phoneNumber) return { error: 'An account with this phone number already exists.' };
    }

    const passwordHash = await hashData(password);

    // Atomic Database Transaction including KYC data
    const user = await prisma.$transaction(async (tx) => {
      return await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          middleName,
          phoneNumber,
          country,
          state,
          lga,
          businessName,
          website,
          role: 'USER',
          // Note: isVerified and isPhoneVerified will be set to true by a separate flow
          // after the OTPs are confirmed and the form is submitted.
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
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('baxato_access')?.value;

  cookieStore.delete('baxato_access');
  cookieStore.delete('baxato_refresh');
}

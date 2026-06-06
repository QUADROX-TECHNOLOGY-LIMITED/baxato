'use server'

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/modules/auth/session';
import { verifyEnhancedNin } from './payvessel';
import { fetchBanks, resolveBankAccount } from './paystack';
import { uploadBase64ProfilePicture } from './cloudinary';

// Define the expected input from the frontend
export type KycFormData = {
  nin: string;
  dob: string; // YYYY-MM-DD
  accountNumber: string;
  bankCode: string;
};

export type KycState = {
  error?: string;
  success?: boolean;
};

/**
 * Validates the user's session from the edge middleware cookies
 */
async function getSessionUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('baxato_access')?.value;
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  return payload?.userId || null;
}

/**
 * Handles the complete KYC submission pipeline
 */
export async function submitKycData(prevState: KycState, formData: FormData): Promise<KycState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: 'Unauthorized. Please log in again.' };

  const nin = formData.get('nin')?.toString().trim();
  const dob = formData.get('dob')?.toString().trim();
  const accountNumber = formData.get('accountNumber')?.toString().trim();
  const bankCode = formData.get('bankCode')?.toString().trim();

  if (!nin || !dob || !accountNumber || !bankCode) {
    return { error: 'All fields are required to complete KYC.' };
  }

  try {
    // 1. Verify NIN with Payvessel
    const ninData = await verifyEnhancedNin(nin);

    // 2. Validate Date of Birth strictly against the ID
    if (ninData.birth_date !== dob) {
      return { error: 'The Date of Birth provided does not match the NIMC database.' };
    }

    // 3. Resolve the Bank Account with Paystack
    const accountName = await resolveBankAccount(accountNumber, bankCode);

    // 4. Fetch the bank name so we can save it nicely in the DB
    const banks = await fetchBanks();
    const selectedBank = banks.find(b => b.code === bankCode);
    if (!selectedBank) {
      return { error: 'Invalid bank selected.' };
    }

    // 5. Upload the Base64 Photo to Cloudinary (if available)
    let profilePictureUrl = null;
    if (ninData.photo) {
      profilePictureUrl = await uploadBase64ProfilePicture(ninData.photo, userId);
    }

    // 6. Update the User Profile in PostgreSQL
    // We override their initial name with the legally verified name from NIMC
    await prisma.user.update({
      where: { id: userId },
      data: {
        isKycCompleted: true,
        nin: ninData.nin,
        dob: ninData.birth_date,
        firstName: ninData.first_name,
        lastName: ninData.surname,
        middleName: ninData.middle_name,
        profilePicture: profilePictureUrl,
        bankCode: bankCode,
        bankName: selectedBank.name,
        accountNumber: accountNumber,
        accountName: accountName,
      },
    });

    return { success: true };

  } catch (error: any) {
    // Return the exact error message from the modular APIs 
    // (e.g., "Invalid account details" or "NIN Verification failed")
    return { error: error.message || 'An unexpected error occurred during verification.' };
  }
}

/**
 * Helper function for the frontend to fetch the bank list securely
 */
export async function getBankList() {
  try {
    return await fetchBanks();
  } catch (error) {
    return [];
  }
}

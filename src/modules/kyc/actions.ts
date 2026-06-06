'use server'

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/modules/auth/session';
import { verifyEnhancedNin } from './payvessel';
import { fetchBanks, resolveBankAccount } from './paystack';
import { uploadBase64ProfilePicture } from './cloudinary';

async function getSessionUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('baxato_access')?.value;
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  return payload?.userId || null;
}

// STEP 1: Verify NIN with Payvessel
export async function verifyNinAction(nin: string, dob: string) {
  const userId = await getSessionUserId();
  if (!userId) return { error: 'Unauthorized. Please log in again.' };

  try {
    const ninData = await verifyEnhancedNin(nin);

    if (ninData.birth_date !== dob) {
      return { error: 'The Date of Birth provided does not match the NIMC database.' };
    }

    // Upload photo to Cloudinary immediately so we don't pass massive Base64 strings to the client
    let photoUrl = null;
    if (ninData.photo) {
      photoUrl = await uploadBase64ProfilePicture(ninData.photo, userId);
    }

    return { 
      success: true, 
      data: {
        nin: ninData.nin,
        dob: ninData.birth_date,
        firstName: ninData.first_name,
        lastName: ninData.surname,
        middleName: ninData.middle_name,
        photoUrl
      }
    };
  } catch (error: any) {
    return { error: error.message || 'NIN Verification failed.' };
  }
}

// STEP 2: Resolve Bank Account with Paystack
export async function resolveBankAction(accountNumber: string, bankCode: string) {
  const userId = await getSessionUserId();
  if (!userId) return { error: 'Unauthorized.' };

  try {
    const accountName = await resolveBankAccount(accountNumber, bankCode);
    return { success: true, accountName };
  } catch (error: any) {
    return { error: error.message || 'Could not verify this bank account.' };
  }
}

// STEP 3: Finalize and Save to Database
export async function finalizeKycAction(payload: any) {
  const userId = await getSessionUserId();
  if (!userId) return { error: 'Unauthorized.' };

  try {
    const banks = await fetchBanks();
    const selectedBank = banks.find(b => b.code === payload.bankCode);

    await prisma.user.update({
      where: { id: userId },
      data: {
        isKycCompleted: true,
        nin: payload.nin,
        dob: payload.dob,
        firstName: payload.firstName,
        lastName: payload.lastName,
        middleName: payload.middleName,
        profilePicture: payload.photoUrl,
        bankCode: payload.bankCode,
        bankName: selectedBank?.name || 'Unknown Bank',
        accountNumber: payload.accountNumber,
        accountName: payload.accountName,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Finalize KYC Error:', error);
    return { error: 'An unexpected error occurred while saving your profile.' };
  }
}

export async function getBankList() {
  try {
    return await fetchBanks();
  } catch (error) {
    return [];
  }
}

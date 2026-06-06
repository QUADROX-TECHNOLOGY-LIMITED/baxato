// src/modules/kyc/payvessel.ts

export type PayvesselKycData = {
  nin: string;
  first_name: string;
  middle_name: string;
  surname: string;
  gender: string;
  birth_date: string; // YYYY-MM-DD
  photo: string; // Base64
  telephone_no: string;
};

export async function verifyEnhancedNin(nin: string): Promise<PayvesselKycData> {
  const url = process.env.PAYVESSEL_API_URL || 'https://sandbox.payvessel.com/kyc/api/v1/merchant/nin/enhanced';

  if (!process.env.PAYVESSEL_API_KEY || !process.env.PAYVESSEL_API_SECRET) {
    throw new Error('Missing Payvessel API credentials.');
  }

  console.log(`[PAYVESSEL] Initiating Enhanced NIN Verification for: ${nin}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.PAYVESSEL_API_KEY,
        'api-secret': process.env.PAYVESSEL_API_SECRET,
      },
      body: JSON.stringify({ nin }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('[PAYVESSEL_ERROR]', data);
      // Catch the specific insufficient balance error
      if (data.message?.toLowerCase().includes('insufficient')) {
        throw new Error('KYC Service temporarily unavailable. Please try again later.'); 
        // We mask the balance error from the user for security, but log it above.
      }
      throw new Error(data.message || 'NIN Verification failed.');
    }

    console.log('[PAYVESSEL_SUCCESS] NIN Verified successfully.');
    return data.data as PayvesselKycData;

  } catch (error: any) {
    console.error('[PAYVESSEL_CATCH_ERROR]', error.message || error);
    throw error;
  }
}

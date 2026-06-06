// src/modules/kyc/paystack.ts

export type PaystackBank = {
  name: string;
  code: string;
};

export async function fetchBanks(): Promise<PaystackBank[]> {
  const url = 'https://api.paystack.co/bank?currency=NGN';

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
      // Cache this request for 24 hours since banks rarely change
      next: { revalidate: 86400 } 
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to fetch banks');
    }

    return data.data.map((bank: any) => ({
      name: bank.name,
      code: bank.code,
    }));
  } catch (error: any) {
    console.error('[PAYSTACK_BANK_FETCH_ERROR]', error);
    throw new Error('Unable to load bank list.');
  }
}

export async function resolveBankAccount(accountNumber: string, bankCode: string): Promise<string> {
  const url = `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`;

  console.log(`[PAYSTACK] Resolving account: ${accountNumber} at bank: ${bankCode}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Invalid account details.');
    }

    console.log('[PAYSTACK_SUCCESS] Account resolved:', data.data.account_name);
    return data.data.account_name; // Returns the exact name registered on the bank account
  } catch (error: any) {
    console.error('[PAYSTACK_RESOLVE_ERROR]', error.message || error);
    throw error;
  }
}

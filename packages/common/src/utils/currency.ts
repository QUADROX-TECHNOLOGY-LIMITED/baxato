export function nairaToKobo(naira: number | string): bigint {
  const parsed = typeof naira === 'string' ? parseFloat(naira) : naira;
  if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid Naira amount: ${naira}`);
  }
  return BigInt(Math.round(parsed * 100));
}

export function koboToNaira(kobo: bigint | number | string): number {
  const koboBigInt = typeof kobo === 'bigint' ? kobo : BigInt(kobo);
  if (koboBigInt < 0n) {
    throw new Error(`Invalid Kobo amount (cannot be negative): ${kobo}`);
  }
  return Number(koboBigInt) / 100;
}

export function formatNairaFromKobo(kobo: bigint | number | string): string {
  const naira = koboToNaira(kobo);
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(naira);
}

export function safeAddKobo(a: bigint | number | string, b: bigint | number | string): bigint {
  return BigInt(a) + BigInt(b);
}

export function safeSubtractKobo(
  balance: bigint | number | string,
  debit: bigint | number | string,
): bigint {
  const bal = BigInt(balance);
  const deb = BigInt(debit);
  if (deb < 0n) {
    throw new Error('Debit amount cannot be negative');
  }
  if (bal < deb) {
    throw new Error(`Insufficient funds: balance (${bal}) is less than debit (${deb})`);
  }
  return bal - deb;
}

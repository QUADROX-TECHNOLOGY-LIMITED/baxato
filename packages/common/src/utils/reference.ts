import { customAlphabet } from 'nanoid';

const numericAlphabet = '0123456789';
const alphanumericAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const generateNumeric = (len: number) => customAlphabet(numericAlphabet, len)();
const generateAlphanumeric16 = customAlphabet(alphanumericAlphabet, 16);

/**
 * Generates an Interswitch-compliant numeric transaction reference.
 * Defaults to 20 digits total length, beginning with the assigned 4-digit prefix (e.g., '2411').
 */
export function generateInterswitchReference(prefix: string = '2411', totalLength: number = 20): string {
  const cleanPrefix = prefix.replace(/\D/g, '');
  if (cleanPrefix.length !== 4) {
    throw new Error(`Interswitch reference prefix must be exactly 4 digits. Got: '${prefix}'`);
  }
  const suffixLength = Math.max(8, totalLength - cleanPrefix.length);
  const suffix = generateNumeric(suffixLength);
  return `${cleanPrefix}${suffix}`;
}

export function generateTransactionReference(prefix: string = 'TXN'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateAlphanumeric16();
  return `BAX_${prefix.toUpperCase()}_${timestamp}_${random}`;
}

export function generateEntityId(prefix: string): string {
  const random = generateAlphanumeric16();
  return `${prefix}_${random}`;
}

import { customAlphabet } from 'nanoid';

const numericAlphabet = '0123456789';
const alphanumericAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const crockfordUppercaseAlphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const generateNumeric = (len: number) => customAlphabet(numericAlphabet, len)();
const generateAlphanumeric16 = customAlphabet(alphanumericAlphabet, 16);
const generateRefCode10 = customAlphabet(crockfordUppercaseAlphabet, 10);

/**
 * Generates a branded BAXATO transaction request reference (e.g. 'BX-20261118-8F3K9M2P4Q').
 */
export function generateBaxatoReference(date: Date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `BX-${yyyy}${mm}${dd}-${generateRefCode10()}`;
}

/**
 * Generates a numeric transaction reference.
 * Defaults to 20 digits total length, beginning with the assigned 4-digit prefix (e.g., '2411').
 */
export function generateNumericReference(prefix: string = '2411', totalLength: number = 20): string {
  const cleanPrefix = prefix.replace(/\D/g, '');
  if (cleanPrefix.length !== 4) {
    throw new Error(`Numeric reference prefix must be exactly 4 digits. Got: '${prefix}'`);
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

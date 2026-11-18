import { customAlphabet } from 'nanoid';

const numericAlphabet = '0123456789';
const alphanumericAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const crockfordUppercaseAlphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const generateNumeric = (len: number) => customAlphabet(numericAlphabet, len)();
const generateAlphanumeric16 = customAlphabet(alphanumericAlphabet, 16);
const generateRefCode8 = customAlphabet(crockfordUppercaseAlphabet, 8);

/**
 * Generates a branded BAXATO transaction request reference in Africa/Lagos (WAT) time
 * (e.g. '202611181135BX8F3K9M2P').
 * Natively compatible with BAXATO ledger tracking, Monnify `reference`/`vendReference`,
 * and VTPass `request_id` (YYYYMMDDHHII in Africa/Lagos + alphanumeric suffix).
 */
export function generateBaxatoReference(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const pick = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const hourRaw = pick('hour');
  const hh = hourRaw === '24' ? '00' : hourRaw;
  return `${pick('year')}${pick('month')}${pick('day')}${hh}${pick('minute')}BX${generateRefCode8()}`;
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

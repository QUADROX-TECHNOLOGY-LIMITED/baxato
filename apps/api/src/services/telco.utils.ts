import { TelecomNetwork, ValidationError } from '@baxato/common';

export const TELCO_PREFIXES: Record<TelecomNetwork, string[]> = {
  [TelecomNetwork.MTN]: [
    '0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916',
  ],
  [TelecomNetwork.AIRTEL]: [
    '0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912',
  ],
  [TelecomNetwork.GLO]: [
    '0805', '0807', '0705', '0815', '0811', '0905', '0915',
  ],
  [TelecomNetwork.NINEMOBILE]: [
    '0809', '0817', '0818', '0909', '0908',
  ],
};

/**
 * Normalizes Nigerian phone number to standard 11-digit local format (e.g. 08031234567).
 */
export function normalizeNigerianPhone(phone: string): string {
  let clean = phone.replace(/[\s\-()]/g, '');
  if (clean.startsWith('+234')) {
    clean = '0' + clean.slice(4);
  } else if (clean.startsWith('234')) {
    clean = '0' + clean.slice(3);
  }

  if (!/^0[789][01]\d{8}$/.test(clean)) {
    throw new ValidationError(
      `Invalid Nigerian phone number format: '${phone}'. Must be an 11-digit number.`,
    );
  }

  return clean;
}

/**
 * Auto-detects the telecom network from a Nigerian phone number prefix.
 */
export function detectTelcoNetwork(phone: string): TelecomNetwork {
  const normalized = normalizeNigerianPhone(phone);
  const prefix = normalized.slice(0, 4);

  for (const [network, prefixes] of Object.entries(TELCO_PREFIXES)) {
    if (prefixes.includes(prefix)) {
      return network as TelecomNetwork;
    }
  }

  throw new ValidationError(
    `Could not auto-detect telecom operator for prefix '${prefix}'. Please select network manually.`,
  );
}


import crypto from 'crypto';

const DEFAULT_MASTER_KEY =
  process.env.ENCRYPTION_MASTER_KEY ||
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

/**
 * Derives a 32-byte Buffer from a hex or string key.
 */
function getKeyBuffer(keyHex?: string): Buffer {
  const key = keyHex || DEFAULT_MASTER_KEY;
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypts a plaintext string (e.g. scratch card PIN or serial number)
 * using AES-256-GCM authenticated encryption.
 *
 * @returns Hex-encoded string in format: `<ivHex>:<authTagHex>:<ciphertextHex>`
 */
export function encryptPin(plaintext: string, masterKeyHex?: string): string {
  if (!plaintext) {
    throw new Error('Plaintext cannot be empty');
  }

  const key = getKeyBuffer(masterKeyHex);
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 *
 * @param encryptedString Format: `<ivHex>:<authTagHex>:<ciphertextHex>`
 * @returns Decrypted plaintext UTF-8 string
 */
export function decryptPin(encryptedString: string, masterKeyHex?: string): string {
  if (!encryptedString) {
    throw new Error('Encrypted string cannot be empty');
  }

  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted string format. Expected iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getKeyBuffer(masterKeyHex);
  const iv = Buffer.from(ivHex!, 'hex');
  const authTag = Buffer.from(authTagHex!, 'hex');
  const ciphertext = Buffer.from(ciphertextHex!, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

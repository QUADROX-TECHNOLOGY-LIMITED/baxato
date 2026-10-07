import crypto from 'crypto';
import QRCode from 'qrcode';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer into RFC 4648 Base32 string (unpadded).
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i] ?? 0;
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31] ?? '';
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31] ?? '';
  }

  return output;
}

/**
 * Decodes an RFC 4648 Base32 string into a Buffer.
 */
export function base32Decode(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i] ?? '';
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${char}`);
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export class TwoFactorService {
  /**
   * Generates a cryptographically secure Base32 secret for Google Authenticator (160 bits).
   */
  public generateSecret(length = 20): string {
    const randomBytes = crypto.randomBytes(length);
    return base32Encode(randomBytes);
  }

  /**
   * Generates a 6-digit TOTP code according to RFC 6238 (HMAC-SHA1, 30s period).
   */
  public generateTotp(secret: string, offsetSteps = 0): string {
    const key = base32Decode(secret);
    const timeStep = 30;
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / timeStep) + offsetSteps;

    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    const lastByte = digest[digest.length - 1] ?? 0;
    const offset = lastByte & 0x0f;
    const b0 = digest[offset] ?? 0;
    const b1 = digest[offset + 1] ?? 0;
    const b2 = digest[offset + 2] ?? 0;
    const b3 = digest[offset + 3] ?? 0;

    const binary =
      ((b0 & 0x7f) << 24) |
      ((b1 & 0xff) << 16) |
      ((b2 & 0xff) << 8) |
      (b3 & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * Validates a TOTP code against a secret with clock drift tolerance (±1 time step).
   */
  public verifyTotp(secret: string, token: string, window = 1): boolean {
    const cleanToken = token.trim();
    if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
      return false;
    }

    try {
      for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
        const expected = this.generateTotp(secret, errorWindow);
        if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expected))) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Generates standard otpauth URI recognized by Google Authenticator, 1Password, and Authy.
   */
  public generateOtpAuthUri(accountEmail: string, secret: string, issuer = 'BAXATO'): string {
    const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountEmail.trim().toLowerCase())}`;
    return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Generates high-contrast QR Code Data URL (Base64 PNG) for instant camera scanning.
   */
  public async generateQrCodeDataUrl(otpAuthUri: string): Promise<string> {
    return QRCode.toDataURL(otpAuthUri, {
      margin: 1,
      width: 240,
      color: {
        dark: '#0B1220',
        light: '#FFFFFF',
      },
    });
  }

  /**
   * Generates 6 emergency backup recovery codes in XXXX-XXXX format.
   */
  public generateBackupRecoveryCodes(count = 6): { codes: string[]; hashedCodes: string[] } {
    const codes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < count; i++) {
      const part1 = Math.floor(1000 + Math.random() * 9000);
      const part2 = Math.floor(1000 + Math.random() * 9000);
      const code = `${part1}-${part2}`;
      codes.push(code);

      const hash = crypto.createHash('sha256').update(code).digest('hex');
      hashedCodes.push(hash);
    }

    return { codes, hashedCodes };
  }
}

export const twoFactorService = new TwoFactorService();

import { describe, it, expect } from 'vitest';
import { encryptPin, decryptPin } from './crypto';

describe('AES-256-GCM Crypto Utility', () => {
  it('successfully encrypts and decrypts a scratch card PIN', () => {
    const pin = '839210294821';
    const encrypted = encryptPin(pin);

    expect(encrypted).toBeDefined();
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = decryptPin(encrypted);
    expect(decrypted).toBe(pin);
  });

  it('successfully encrypts and decrypts an alphanumeric serial number', () => {
    const serial = 'WAEC-2026-NGR-8839201';
    const encrypted = encryptPin(serial);
    const decrypted = decryptPin(encrypted);

    expect(decrypted).toBe(serial);
  });

  it('produces different ciphertexts for identical plaintext due to random IV', () => {
    const text = 'SAME_PIN_1234';
    const enc1 = encryptPin(text);
    const enc2 = encryptPin(text);

    expect(enc1).not.toBe(enc2);
    expect(decryptPin(enc1)).toBe(text);
    expect(decryptPin(enc2)).toBe(text);
  });

  it('fails decryption if auth tag or ciphertext is tampered', () => {
    const text = 'SENSITIVE_PIN';
    const encrypted = encryptPin(text);
    const [iv, tag, cipher] = encrypted.split(':');

    // Tamper ciphertext
    const tamperedCipher = cipher!.slice(0, -2) + (cipher!.endsWith('0') ? '1' : '0');
    const tamperedPayload = `${iv}:${tag}:${tamperedCipher}`;

    expect(() => decryptPin(tamperedPayload)).toThrow();
  });

  it('throws error when plaintext is empty', () => {
    expect(() => encryptPin('')).toThrow('Plaintext cannot be empty');
  });

  it('throws error when encrypted string is invalid format', () => {
    expect(() => decryptPin('invalid_format')).toThrow('Invalid encrypted string format');
  });
});

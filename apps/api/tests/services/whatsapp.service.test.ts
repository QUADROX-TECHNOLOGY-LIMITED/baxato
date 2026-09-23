import { describe, it, expect } from 'vitest';
import { whatsAppService } from '../../src/services/whatsapp.service';

describe('WhatsAppService', () => {
  it('normalizes local Nigerian phone number to international E.164 without plus', () => {
    expect(whatsAppService.normalizePhoneNumber('08161437292')).toBe('2348161437292');
    expect(whatsAppService.normalizePhoneNumber('+2348161437292')).toBe('2348161437292');
    expect(whatsAppService.normalizePhoneNumber('2348161437292')).toBe('2348161437292');
    expect(whatsAppService.normalizePhoneNumber('8161437292')).toBe('2348161437292');
  });

  it('generates a 6-digit numeric OTP and successfully verifies it', async () => {
    const phone = '08161437292';
    const result = await whatsAppService.sendOtp(phone);
    expect(result.success).toBe(true);

    const code = whatsAppService.getActiveOtpForTesting(phone);
    expect(code).toBeDefined();
    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code!)).toBe(true);

    const invalidResult = whatsAppService.verifyOtp(phone, '000000');
    expect(invalidResult.valid).toBe(false);

    const validResult = whatsAppService.verifyOtp(phone, code!);
    expect(validResult.valid).toBe(true);

    // After success, OTP is consumed
    const consumedResult = whatsAppService.verifyOtp(phone, code!);
    expect(consumedResult.valid).toBe(false);
  });
});

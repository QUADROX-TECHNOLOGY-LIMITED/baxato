import { describe, it, expect } from 'vitest';
import { kycService } from '../../src/services/kyc.service';

describe('KycService (NIMC & NIN Verification)', () => {
  it('rejects invalid NIN length', async () => {
    const res = await kycService.verifyNin('12345', '1995-05-12');
    expect(res.success).toBe(false);
    expect(res.failureReason).toMatch(/11 digits/);
  });

  it('successfully verifies valid 11-digit NIN and extracts photo and official details', async () => {
    const res = await kycService.verifyNin('12345678901', '1995-05-12', 'Mukhtar', 'Aliyu');
    expect(res.success).toBe(true);
    expect(res.matchScore).toBe(100);
    expect(res.photoExtracted).toBe(true);
    expect(res.avatarUrl).toBeDefined();
    expect(res.officialData?.firstName).toBe('Mukhtar');
    expect(res.officialData?.lastName).toBe('Aliyu');
  });

  it('detects and rejects name mismatch when user name does not match official NIMC record', async () => {
    const cachedNimcRecord = {
      responseBody: {
        firstName: 'Chinedu',
        lastName: 'Okonkwo',
        middleName: 'Emeka',
        dateOfBirth: '1990-08-20',
      },
    };

    const res = await kycService.verifyNin(
      '22233344455',
      '1990-08-20',
      'Adebayo',
      'Tunde',
      cachedNimcRecord,
    );

    expect(res.success).toBe(false);
    expect(res.isNameMismatch).toBe(true);
    expect(res.failureReason).toMatch(/Name Mismatch/);
    expect(res.cached).toBe(true);
  });

  it('uses cached official NIMC data to verify identity without external API calls', async () => {
    const cachedNimcRecord = {
      responseBody: {
        firstName: 'Mukhtar',
        lastName: 'Aliyu',
        middleName: 'Sani',
        dateOfBirth: '1995-05-12',
        photo: 'https://cdn.baxato.com/avatars/mukhtar.jpg',
      },
    };

    const res = await kycService.verifyNin(
      '12345678901',
      '1995-05-12',
      'Mukhtar',
      'Aliyu',
      cachedNimcRecord,
    );

    expect(res.success).toBe(true);
    expect(res.cached).toBe(true);
    expect(res.matchScore).toBe(100);
    expect(res.officialData?.firstName).toBe('Mukhtar');
    expect(res.officialData?.middleName).toBe('Sani');
  });
});


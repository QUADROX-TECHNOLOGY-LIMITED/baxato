import { describe, it, expect } from 'vitest';
import { kycService } from './kyc.service';

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
});

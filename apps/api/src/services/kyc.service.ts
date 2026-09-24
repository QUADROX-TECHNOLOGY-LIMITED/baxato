import { env } from '@baxato/config';

export interface NinVerificationResult {
  success: boolean;
  matchScore: number;
  photoExtracted: boolean;
  avatarUrl?: string;
  officialData?: {
    firstName: string;
    lastName: string;
    middleName?: string;
    dob: string;
    gender?: string;
    phoneNumber?: string;
    photoBase64?: string;
  };
  failureReason?: string;
  rawResponse?: Record<string, unknown>;
}

export class KycService {
  private tokenCache: { accessToken: string; expiresAt: number } | null = null;

  /**
   * Acquires or returns a cached Monnify Bearer Access Token.
   */
  private async getMonnifyToken(): Promise<string | null> {
    if (!env.MONNIFY_API_KEY || !env.MONNIFY_SECRET_KEY) {
      return null;
    }

    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60000) {
      return this.tokenCache.accessToken;
    }

    // Monnify VAS NIN details is a live-only endpoint; use live URL for live keys or default
    const isLive = env.MONNIFY_API_KEY.startsWith('MK_PROD_') || env.NODE_ENV === 'production';
    const baseUrl = isLive
      ? 'https://api.monnify.com'
      : (env.MONNIFY_BASE_URL || 'https://api.monnify.com').replace(/\/+$/, '');

    const basicAuth = Buffer.from(
      `${env.MONNIFY_API_KEY}:${env.MONNIFY_SECRET_KEY}`,
    ).toString('base64');

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Monnify KYC Auth Failed] Status ${res.status}: ${errText}`);
      return null;
    }

    const data = (await res.json()) as any;
    if (data?.requestSuccessful && data?.responseBody?.accessToken) {
      this.tokenCache = {
        accessToken: data.responseBody.accessToken,
        expiresAt: now + (data.responseBody.expiresIn || 3600) * 1000,
      };
      return this.tokenCache.accessToken;
    }

    return null;
  }

  /**
   * Normalizes multiple date string representations into YYYY-MM-DD
   */
  private normalizeDate(dateStr?: string): string {
    if (!dateStr) return '';
    const cleaned = dateStr.trim().replace(/\//g, '-');
    const parts = cleaned.split('-');
    const p0 = parts[0];
    const p1 = parts[1];
    const p2 = parts[2];

    if (parts.length === 3 && p0 && p1 && p2) {
      if (p0.length === 4) {
        // YYYY-MM-DD
        return `${p0}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
      } else if (p2.length === 4) {
        // DD-MM-YYYY -> YYYY-MM-DD
        return `${p2}-${p1.padStart(2, '0')}-${p0.padStart(2, '0')}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const iso = d.toISOString().split('T')[0];
      if (iso) return iso;
    }
    return cleaned;
  }

  /**
   * Verifies NIN and DOB against Monnify's official NIMC identity verification endpoint.
   */
  public async verifyNin(
    nin: string,
    dob: string,
    userProvidedFirstName?: string,
    userProvidedLastName?: string,
  ): Promise<NinVerificationResult> {
    if (!/^\d{11}$/.test(nin)) {
      return {
        success: false,
        matchScore: 0,
        photoExtracted: false,
        failureReason: 'NIN must be exactly 11 digits numeric.',
      };
    }

    const isDummyKey =
      !env.MONNIFY_API_KEY ||
      env.MONNIFY_API_KEY === 'monnify_test_api_key' ||
      env.MONNIFY_API_KEY.includes('DUMMY') ||
      env.MONNIFY_SECRET_KEY.includes('DUMMY');

    // In unit test runner or when placeholder dummy keys are configured in dev, return simulated response
    if (env.NODE_ENV === 'test' || isDummyKey) {
      const mockPhoto = `https://images.baxato.com/avatars/verified_nin_${nin.slice(-4)}.jpg`;
      const officialFirst = userProvidedFirstName || 'Mukhtar';
      const officialLast = userProvidedLastName || 'Aliyu';

      return {
        success: true,
        matchScore: 100,
        photoExtracted: true,
        avatarUrl: mockPhoto,
        officialData: {
          firstName: officialFirst,
          lastName: officialLast,
          middleName: '',
          dob,
          phoneNumber: '08161437292',
        },
        rawResponse: {
          provider: 'MONNIFY_SIMULATED',
          status: true,
          nin,
          photo: mockPhoto,
        },
      };
    }

    // 1. Acquire Monnify Access Token
    const token = await this.getMonnifyToken();
    if (!token) {
      return {
        success: false,
        matchScore: 0,
        photoExtracted: false,
        failureReason:
          'Monnify authentication failed. Please check MONNIFY_API_KEY and MONNIFY_SECRET_KEY in your environment.',
      };
    }

    // 2. Call Monnify NIN Details Endpoint (POST /api/v1/vas/nin-details)
    const isLive = env.MONNIFY_API_KEY.startsWith('MK_PROD_') || env.NODE_ENV === 'production';
    const baseUrl = isLive
      ? 'https://api.monnify.com'
      : (env.MONNIFY_BASE_URL || 'https://api.monnify.com').replace(/\/+$/, '');
    const endpoint = `${baseUrl}/api/v1/vas/nin-details`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nin }),
      });

      const data = (await response.json()) as any;

      if (!response.ok || !data.requestSuccessful || !data.responseBody) {
        const failureReason =
          data.responseMessage ||
          'Customer identity records not found for this NIN. Please check your 11-digit NIN.';
        return {
          success: false,
          matchScore: 0,
          photoExtracted: false,
          failureReason,
          rawResponse: data,
        };
      }

      const body = data.responseBody;
      const officialFirst = body.firstName || body.firstname || '';
      const officialLast = body.lastName || body.surname || '';
      const officialMiddle = body.middleName || body.middlename || '';
      const officialDob = body.dateOfBirth || body.dob || body.birthdate || '';
      const officialPhone = body.phone || body.phoneNumber || body.mobile || '';
      const photo = body.photo || body.image || '';

      // Validate Date of Birth match if returned by Monnify
      if (officialDob && dob) {
        const normUserDob = this.normalizeDate(dob);
        const normOfficialDob = this.normalizeDate(officialDob);

        if (normUserDob && normOfficialDob && normUserDob !== normOfficialDob) {
          return {
            success: false,
            matchScore: 0,
            photoExtracted: false,
            failureReason: `Date of Birth (${dob}) does not match NIMC records.`,
            rawResponse: data,
          };
        }
      }

      // Check Name match
      let matchScore = 100;
      if (userProvidedFirstName && officialFirst) {
        const uFirst = userProvidedFirstName.toLowerCase().trim();
        const oFirst = officialFirst.toLowerCase().trim();
        const oMiddle = officialMiddle.toLowerCase().trim();
        const oLast = officialLast.toLowerCase().trim();

        if (uFirst !== oFirst && uFirst !== oMiddle && uFirst !== oLast) {
          matchScore -= 30;
        }
      }

      if (userProvidedLastName && officialLast) {
        const uLast = userProvidedLastName.toLowerCase().trim();
        const oFirst = officialFirst.toLowerCase().trim();
        const oLast = officialLast.toLowerCase().trim();

        if (uLast !== oLast && uLast !== oFirst) {
          matchScore -= 30;
        }
      }

      if (matchScore < 40) {
        return {
          success: false,
          matchScore,
          photoExtracted: Boolean(photo),
          failureReason: `Registered name (${userProvidedFirstName} ${userProvidedLastName}) does not match NIMC records (${officialFirst} ${officialLast}).`,
          rawResponse: data,
        };
      }

      const avatarUrl = photo?.startsWith('http')
        ? photo
        : photo
          ? `data:image/jpeg;base64,${photo}`
          : undefined;

      return {
        success: true,
        matchScore,
        photoExtracted: Boolean(photo),
        avatarUrl,
        officialData: {
          firstName: officialFirst || userProvidedFirstName || '',
          lastName: officialLast || userProvidedLastName || '',
          middleName: officialMiddle || '',
          dob: officialDob || dob,
          phoneNumber: officialPhone,
        },
        rawResponse: data,
      };
    } catch (err: unknown) {
      console.error('[Monnify KYC Verification Error]', err);
      return {
        success: false,
        matchScore: 0,
        photoExtracted: false,
        failureReason:
          'Connection to Monnify identity verification gateway timed out. Please try again.',
      };
    }
  }
}

export const kycService = new KycService();

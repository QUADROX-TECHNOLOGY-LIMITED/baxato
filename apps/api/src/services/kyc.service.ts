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
  /**
   * Verifies NIN and DOB against the national identity verification provider.
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

    // In test or development without active third-party KYC key, simulate verified NIMC response
    if (env.NODE_ENV === 'test' || env.IDENTITY_API_KEY === 'identity_pass_test_api_key') {
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
          middleName: 'Babangida',
          dob,
          gender: 'MALE',
          phoneNumber: '08161437292',
          photoBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        },
        rawResponse: {
          status: true,
          response_code: '00',
          message: 'NIN Details successfully retrieved',
          nin,
          photo: mockPhoto,
        },
      };
    }

    const endpoint = `${env.IDENTITY_API_BASE_URL}/biometrics/merchant/data/verification/nin`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': env.IDENTITY_API_KEY,
          'app-id': env.IDENTITY_APP_ID,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: nin,
          dob,
        }),
      });

      const data = (await response.json()) as {
        status?: boolean;
        nin_data?: {
          firstname?: string;
          surname?: string;
          middlename?: string;
          birthdate?: string;
          photo?: string;
          gender?: string;
          telephoneno?: string;
        };
        message?: string;
      };

      if (!response.ok || !data.status || !data.nin_data) {
        return {
          success: false,
          matchScore: 0,
          photoExtracted: false,
          failureReason: data.message || 'NIN verification failed or data mismatch.',
          rawResponse: data as Record<string, unknown>,
        };
      }

      const nimc = data.nin_data;
      const avatarUrl = nimc.photo?.startsWith('http')
        ? nimc.photo
        : nimc.photo
          ? `data:image/jpeg;base64,${nimc.photo}`
          : undefined;

      // Calculate name match score
      let matchScore = 100;
      if (userProvidedFirstName && nimc.firstname) {
        const match = userProvidedFirstName.toLowerCase() === nimc.firstname.toLowerCase();
        if (!match) matchScore -= 20;
      }
      if (userProvidedLastName && nimc.surname) {
        const match = userProvidedLastName.toLowerCase() === nimc.surname.toLowerCase();
        if (!match) matchScore -= 20;
      }

      return {
        success: true,
        matchScore,
        photoExtracted: !!avatarUrl,
        avatarUrl,
        officialData: {
          firstName: nimc.firstname || '',
          lastName: nimc.surname || '',
          middleName: nimc.middlename,
          dob: nimc.birthdate || dob,
          gender: nimc.gender,
          phoneNumber: nimc.telephoneno,
          photoBase64: nimc.photo,
        },
        rawResponse: data as Record<string, unknown>,
      };
    } catch (err) {
      console.error('[KycService] Identity API request failed:', err);
      return {
        success: false,
        matchScore: 0,
        photoExtracted: false,
        failureReason: 'Internal error contacting national identity registry.',
      };
    }
  }
}

export const kycService = new KycService();

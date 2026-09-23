import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { ApiResponse } from '@baxato/common';
import { inMemoryDb, createMockDatabase } from '../test-utils/mock-db';

vi.mock('@baxato/database', () => createMockDatabase());

describe('NIN KYC Verification & User Profile Endpoints (/kyc/* & /users/*)', () => {
  let app: FastifyInstance;
  let authToken: string;

  const testEmail = `kyc_merchant_${Date.now()}@example.com`;

  beforeAll(async () => {
    inMemoryDb.reset();
    const { buildServer } = await import('../../src/server');
    app = buildServer();
    await app.ready();

    // Register user to obtain auth token
    const regRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        firstName: 'Mukhtar',
        lastName: 'Aliyu',
        email: testEmail,
        phoneNumber: '08161437292',
        password: 'Password123!',
        businessName: 'Mukhtar VTU Global',
        country: 'NG',
        state: 'Kano',
        lga: 'Gwale',
      },
    });

    const body = regRes.json();
    authToken = body.data.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /kyc/status returns UNVERIFIED before submitting NIN', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/kyc/status',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ kycStatus: string }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.kycStatus).toBe('UNVERIFIED');
  });

  it('POST /kyc/verify-nin verifies NIN/DOB, updates avatarUrl with official photo, and marks KYC as VERIFIED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/kyc/verify-nin',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        nin: '12345678901',
        dob: '1995-05-12',
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{
      kycStatus: string;
      verified: boolean;
      photoExtracted: boolean;
      avatarUrl: string;
    }> = res.json();

    expect(body.success).toBe(true);
    expect(body.data?.verified).toBe(true);
    expect(body.data?.kycStatus).toBe('VERIFIED');
    expect(body.data?.photoExtracted).toBe(true);
    expect(body.data?.avatarUrl).toBeDefined();
  });

  it('POST /kyc/verify-nin prevents repeat verification if already verified', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/kyc/verify-nin',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        nin: '12345678901',
        dob: '1995-05-12',
      },
    });

    expect(res.statusCode).toBe(409);
    const body: ApiResponse = res.json();
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('CONFLICT');
  });
});

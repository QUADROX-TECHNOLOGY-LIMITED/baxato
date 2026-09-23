import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { ApiResponse } from '@baxato/common';
import { whatsAppService } from '../../src/services/whatsapp.service';
import { inMemoryDb, createMockDatabase } from '../test-utils/mock-db';

vi.mock('@baxato/database', () => createMockDatabase());

describe('Authentication & Onboarding Endpoints (/auth/*)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    inMemoryDb.reset();
    const { buildServer } = await import('../../src/server');
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const testEmail = `merchant_${Date.now()}@example.com`;
  const testPhone = '08161437292';

  it('POST /auth/register successfully registers user, provisions first business & wallets', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        firstName: 'Mukhtar',
        lastName: 'Aliyu',
        middleName: 'Babangida',
        email: testEmail,
        phoneNumber: testPhone,
        password: 'Password123!',
        businessName: 'Baxato Tech Ventures',
        websiteUrl: 'https://baxato.com',
        country: 'NG',
        state: 'Kano',
        lga: 'Nassarawa',
      },
    });

    expect(res.statusCode).toBe(201);
    const body: ApiResponse<{
      user: { email: string; isPhoneVerified: boolean; middleName: string };
      business: { name: string; country: string; state: string; lga: string };
      token: string;
    }> = res.json();

    expect(body.success).toBe(true);
    expect(body.data?.user.email).toBe(testEmail);
    expect(body.data?.user.middleName).toBe('Babangida');
    expect(body.data?.business.name).toBe('Baxato Tech Ventures');
    expect(body.data?.business.country).toBe('NG');
    expect(body.data?.business.state).toBe('Kano');
    expect(body.data?.business.lga).toBe('Nassarawa');
    expect(body.data?.token).toBeDefined();
  });

  it('POST /auth/register rejects duplicate email with 409 Conflict', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        firstName: 'Duplicate',
        lastName: 'User',
        email: testEmail,
        phoneNumber: '09011223344',
        password: 'Password123!',
        businessName: 'Duplicate Inc',
        country: 'NG',
        state: 'Lagos',
        lga: 'Ikeja',
      },
    });

    expect(res.statusCode).toBe(409);
    const body: ApiResponse = res.json();
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('CONFLICT');
  });

  it('POST /auth/verify-phone successfully verifies phone OTP', async () => {
    const activeOtp = whatsAppService.getActiveOtpForTesting(testPhone);
    expect(activeOtp).toBeDefined();

    const res = await app.inject({
      method: 'POST',
      url: '/auth/verify-phone',
      payload: {
        phoneNumber: testPhone,
        otp: activeOtp!,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ verified: boolean }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.verified).toBe(true);
  });

  it('POST /auth/login returns token for valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: testEmail,
        password: 'Password123!',
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ token: string; user: { email: string } }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.token).toBeDefined();
    expect(body.data?.user.email).toBe(testEmail);
  });
});

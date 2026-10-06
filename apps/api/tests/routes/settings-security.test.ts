import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { ApiResponse } from '@baxato/common';
import { zeptoMailService } from '../../src/services/zeptomail.service';
import { inMemoryDb, createMockDatabase } from '../test-utils/mock-db';

vi.mock('@baxato/database', () => createMockDatabase());

describe('Settings & Security Endpoints (/users/me/security & /auth/change-password/*)', () => {
  let app: FastifyInstance;
  let authToken: string;
  let userEmail: string;

  beforeAll(async () => {
    inMemoryDb.reset();
    const { buildServer } = await import('../../src/server');
    app = buildServer();
    await app.ready();

    userEmail = `sec_merchant_${Date.now()}@example.com`;

    // Register a merchant user
    const regRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        firstName: 'Amina',
        lastName: 'Yusuf',
        middleName: 'Zainab',
        email: userEmail,
        phoneNumber: '08123456789',
        password: 'InitialPassword123!',
        businessName: 'Zainab Telecoms',
        country: 'NG',
        state: 'Kaduna',
        lga: 'Zaria',
      },
    });

    const body = regRes.json();
    authToken = body.data?.token;
    expect(authToken).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /users/me/security returns active session telemetry, last login, and audit logs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/users/me/security',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{
      lastLoginAt: string;
      currentSession: { ipAddress: string; userAgent: string };
      auditLogs: any[];
    }> = res.json();

    expect(body.success).toBe(true);
    expect(body.data?.currentSession).toBeDefined();
    expect(body.data?.currentSession.ipAddress).toBeDefined();
    expect(Array.isArray(body.data?.auditLogs)).toBe(true);
    expect(body.data?.auditLogs.length).toBeGreaterThan(0);
  });

  it('POST /auth/change-password/request rejects with 400 when current password is wrong', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/change-password/request',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        currentPassword: 'WrongPassword999!',
        newPassword: 'BrandNewPassword2026!',
      },
    });

    expect(res.statusCode).toBe(400);
    const body: ApiResponse = res.json();
    expect(body.success).toBe(false);
    expect(body.error?.message).toContain('Current password is incorrect');
  });

  it('POST /auth/change-password/request rejects with 400 when new password is same as current', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/change-password/request',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        currentPassword: 'InitialPassword123!',
        newPassword: 'InitialPassword123!',
      },
    });

    expect(res.statusCode).toBe(400);
    const body: ApiResponse = res.json();
    expect(body.success).toBe(false);
    expect(body.error?.message).toContain('different from your current password');
  });

  it('POST /auth/change-password/request dispatches email OTP when current password is valid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/change-password/request',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        currentPassword: 'InitialPassword123!',
        newPassword: 'BrandNewPassword2026!',
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ sent: boolean; message: string }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.sent).toBe(true);

    // Verify OTP was stored in ZeptoMailService
    const activeOtp = zeptoMailService.getActivePasswordChangeOtp(userEmail);
    expect(activeOtp).toBeDefined();
    expect(activeOtp).toHaveLength(6);
  });

  it('POST /auth/change-password/confirm rejects with 400 when OTP is invalid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/change-password/confirm',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        currentPassword: 'InitialPassword123!',
        newPassword: 'BrandNewPassword2026!',
        otp: '000000',
      },
    });

    expect(res.statusCode).toBe(400);
    const body: ApiResponse = res.json();
    expect(body.success).toBe(false);
    expect(body.error?.message).toContain('Invalid confirmation code');
  });

  it('POST /auth/change-password/confirm successfully updates password with valid OTP', async () => {
    const activeOtp = zeptoMailService.getActivePasswordChangeOtp(userEmail);
    expect(activeOtp).toBeDefined();

    const res = await app.inject({
      method: 'POST',
      url: '/auth/change-password/confirm',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        currentPassword: 'InitialPassword123!',
        newPassword: 'BrandNewPassword2026!',
        otp: activeOtp!,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ updated: boolean; message: string }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.updated).toBe(true);

    // Verify login with new password succeeds
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: userEmail,
        password: 'BrandNewPassword2026!',
      },
    });

    expect(loginRes.statusCode).toBe(200);
    const loginBody: ApiResponse<{ token: string }> = loginRes.json();
    expect(loginBody.success).toBe(true);
    expect(loginBody.data?.token).toBeDefined();

    // Verify old password is now rejected
    const oldLoginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: userEmail,
        password: 'InitialPassword123!',
      },
    });
    expect(oldLoginRes.statusCode).toBe(401);
  });

  it('PATCH /users/me updates profile name and logs audit event', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/me',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        firstName: 'Amina-Updated',
        lastName: 'Yusuf-Ali',
        middleName: 'Z.',
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ user: { firstName: string; lastName: string } }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.user.firstName).toBe('Amina-Updated');
    expect(body.data?.user.lastName).toBe('Yusuf-Ali');

    // Check security telemetry has PROFILE_UPDATED
    const secRes = await app.inject({
      method: 'GET',
      url: '/users/me/security',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });
    const secBody: ApiResponse<{ auditLogs: any[] }> = secRes.json();
    const actions = secBody.data?.auditLogs.map((l) => l.action);
    expect(actions).toContain('PROFILE_UPDATED');
    expect(actions).toContain('PASSWORD_CHANGED');
  });
});

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { ApiResponse } from '@baxato/common';
import { zeptoMailService } from '../../src/services/zeptomail.service';
import { twoFactorService } from '../../src/services/two-factor.service';
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

  it('GET /auth/2fa/status returns initial disabled state', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/2fa/status',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ enabled: boolean; method: string | null }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.enabled).toBe(false);
  });

  it('POST /auth/2fa/email/request dispatches real ZeptoMail OTP', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/2fa/email/request',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ sent: boolean }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.sent).toBe(true);

    const activeOtp = zeptoMailService.getActiveTwoFactorOtp(userEmail);
    expect(activeOtp).toBeDefined();
    expect(activeOtp).toHaveLength(6);
  });

  it('POST /auth/2fa/email/verify rejects invalid OTP', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/2fa/email/verify',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        otp: '000000',
      },
    });

    expect(res.statusCode).toBe(400);
    const body: ApiResponse = res.json();
    expect(body.success).toBe(false);
  });

  it('POST /auth/2fa/email/verify activates Email 2FA with valid OTP', async () => {
    const activeOtp = zeptoMailService.getActiveTwoFactorOtp(userEmail);
    expect(activeOtp).toBeDefined();

    const res = await app.inject({
      method: 'POST',
      url: '/auth/2fa/email/verify',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        otp: activeOtp!,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ enabled: boolean; method: string }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.enabled).toBe(true);
    expect(body.data?.method).toBe('EMAIL');

    // Confirm via GET /auth/2fa/status
    const statusRes = await app.inject({
      method: 'GET',
      url: '/auth/2fa/status',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });
    const statusBody: ApiResponse<{ enabled: boolean; method: string }> = statusRes.json();
    expect(statusBody.data?.enabled).toBe(true);
    expect(statusBody.data?.method).toBe('EMAIL');
  });

  it('POST /auth/2fa/totp/setup returns real secret, QR Data URL and recovery codes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/2fa/totp/setup',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{
      secret: string;
      qrCodeDataUrl: string;
      backupCodes: string[];
    }> = res.json();

    expect(body.success).toBe(true);
    expect(body.data?.secret).toBeDefined();
    expect(body.data?.secret.length).toBeGreaterThanOrEqual(16);
    expect(body.data?.qrCodeDataUrl).toContain('data:image/png;base64');
    expect(body.data?.backupCodes).toHaveLength(6);
  });

  it('POST /auth/2fa/totp/verify activates Authenticator App 2FA with valid TOTP', async () => {
    const setupRes = await app.inject({
      method: 'POST',
      url: '/auth/2fa/totp/setup',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });
    const setupData = setupRes.json().data;

    // Generate real RFC 6238 TOTP code matching secret
    const validCode = twoFactorService.generateTotp(setupData.secret);

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/auth/2fa/totp/verify',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        secret: setupData.secret,
        token: validCode,
        backupCodes: setupData.backupCodes,
      },
    });

    expect(verifyRes.statusCode).toBe(200);
    const verifyBody: ApiResponse<{ enabled: boolean; method: string }> = verifyRes.json();
    expect(verifyBody.success).toBe(true);
    expect(verifyBody.data?.enabled).toBe(true);
    expect(verifyBody.data?.method).toBe('TOTP');
  });

  it('POST /auth/2fa/disable fails when password is incorrect', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/2fa/disable',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        password: 'IncorrectPassword!',
      },
    });

    expect(res.statusCode).toBe(400);
    const body: ApiResponse = res.json();
    expect(body.success).toBe(false);
    expect(body.error?.message).toContain('Current password is incorrect');
  });

  it('POST /auth/2fa/disable safely deactivates 2FA with correct password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/2fa/disable',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        password: 'BrandNewPassword2026!',
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ enabled: boolean }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.enabled).toBe(false);

    // Confirm via GET /auth/2fa/status
    const statusRes = await app.inject({
      method: 'GET',
      url: '/auth/2fa/status',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });
    const statusBody: ApiResponse<{ enabled: boolean }> = statusRes.json();
    expect(statusBody.data?.enabled).toBe(false);
  });

  it('PATCH /users/me persists hideBalance preference across /users/me and /auth/login', async () => {
    const initialRes = await app.inject({
      method: 'GET',
      url: '/users/me',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });
    expect(initialRes.statusCode).toBe(200);
    const initialBody: ApiResponse<{ user: { hideBalance: boolean } }> = initialRes.json();
    expect(initialBody.data?.user.hideBalance).toBe(false);

    const patchRes = await app.inject({
      method: 'PATCH',
      url: '/users/me',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        hideBalance: true,
      },
    });
    expect(patchRes.statusCode).toBe(200);
    const patchBody: ApiResponse<{ user: { hideBalance: boolean } }> = patchRes.json();
    expect(patchBody.data?.user.hideBalance).toBe(true);

    const verifyMeRes = await app.inject({
      method: 'GET',
      url: '/users/me',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });
    expect(verifyMeRes.statusCode).toBe(200);
    const verifyMeBody: ApiResponse<{ user: { hideBalance: boolean } }> = verifyMeRes.json();
    expect(verifyMeBody.data?.user.hideBalance).toBe(true);

    const reloginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: userEmail,
        password: 'BrandNewPassword2026!',
      },
    });
    expect(reloginRes.statusCode).toBe(200);
    const reloginBody: ApiResponse<{ user: { hideBalance: boolean } }> = reloginRes.json();
    expect(reloginBody.data?.user.hideBalance).toBe(true);
  });

  it('extracts public IP through Cloudflare/proxy chains, distinguishes browsers on same OS, and enriches/sanitizes audit logs', async () => {
    const { parseUserAgent, sanitizeAuditChanges } = await import('../../src/utils/request-meta');

    expect(
      parseUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
      ).browser,
    ).toBe('Microsoft Edge');
    expect(
      parseUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/116.0.0.0',
      ).browser,
    ).toBe('Opera');
    expect(
      sanitizeAuditChanges({
        provider: 'VTPASS',
        secret: 'sk_live_secret',
        environment: 'LIVE',
      }),
    ).toEqual({ environment: 'LIVE' });

    const macEdgeUa =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';
    const winChromeUa =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    const winEdgeUa =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';

    // Login from Windows Chrome behind private Docker + Cloudflare proxy hops
    await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: {
        'user-agent': winChromeUa,
        'x-forwarded-for': '10.0.1.5, ::ffff:197.210.44.8, 172.18.0.2',
      },
      payload: {
        email: userEmail,
        password: 'BrandNewPassword2026!',
      },
    });

    // Login from Windows Edge on same OS (should remain a separate active session)
    await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: {
        'user-agent': winEdgeUa,
        'cf-connecting-ip': '::ffff:102.89.11.20',
      },
      payload: {
        email: userEmail,
        password: 'BrandNewPassword2026!',
      },
    });

    // Query security telemetry from macOS Edge
    const secRes = await app.inject({
      method: 'GET',
      url: '/users/me/security',
      headers: {
        authorization: `Bearer ${authToken}`,
        'user-agent': macEdgeUa,
        'cf-connecting-ip': '197.210.55.90',
        'x-forwarded-for': '10.0.0.4, 172.17.0.1',
      },
    });

    expect(secRes.statusCode).toBe(200);
    const secBody = secRes.json();
    expect(secBody.data.currentSession.ipAddress).toBe('197.210.55.90');
    expect(secBody.data.currentSession.browser).toBe('Microsoft Edge');
    expect(secBody.data.currentSession.os).toBe('macOS');

    const sessions = secBody.data.activeSessions;
    expect(sessions.some((s: any) => s.ipAddress === '197.210.44.8' && s.browser === 'Google Chrome')).toBe(true);
    expect(sessions.some((s: any) => s.ipAddress === '102.89.11.20' && s.browser === 'Microsoft Edge')).toBe(true);

    const loginLog = secBody.data.auditLogs.find(
      (l: any) => l.action === 'USER_LOGIN' && l.ipAddress === '102.89.11.20',
    );
    expect(loginLog).toBeDefined();
    expect(loginLog.title).toBe('Signed in');
    expect(loginLog.category).toBe('auth');
    expect(loginLog.deviceName).toContain('Microsoft Edge');
  });

  it('prefers HMAC-signed proxy visitor IP over Cloudflare server IP while rejecting tampered signatures', async () => {
    const crypto = await import('node:crypto');
    const { env } = await import('@baxato/config');
    const secret = env.CLERK_SECRET_KEY || env.JWT_SECRET;
    const realVisitorIp = '102.88.55.14';
    const ts = String(Date.now());
    const validSig = crypto
      .createHmac('sha256', secret)
      .update(`${realVisitorIp}:${ts}`)
      .digest('hex');

    // 1. Valid signed proxy header recovers real visitor IP even when CF-Connecting-IP and XFF hold Cloudflare/server IPs
    const validRes = await app.inject({
      method: 'GET',
      url: '/users/me/security',
      headers: {
        authorization: `Bearer ${authToken}`,
        'cf-connecting-ip': '172.68.10.22',
        'x-forwarded-for': '104.24.10.1, 18.175.51.199',
        'x-baxato-client-ip': realVisitorIp,
        'x-baxato-client-ts': ts,
        'x-baxato-client-sig': validSig,
      },
    });
    expect(validRes.statusCode).toBe(200);
    expect(validRes.json().data.currentSession.ipAddress).toBe(realVisitorIp);

    // 2. Tampered signature is rejected; Cloudflare authoritative visitor IP (non-CF edge) is used over spoofed XFF
    const spoofedRes = await app.inject({
      method: 'GET',
      url: '/users/me/security',
      headers: {
        authorization: `Bearer ${authToken}`,
        'cf-connecting-ip': '197.210.70.42',
        'x-forwarded-for': '8.8.8.8',
        'x-baxato-client-ip': '8.8.4.4',
        'x-baxato-client-ts': ts,
        'x-baxato-client-sig': 'deadbeefdeadbeef',
      },
    });
    expect(spoofedRes.statusCode).toBe(200);
    expect(spoofedRes.json().data.currentSession.ipAddress).toBe('197.210.70.42');
  });
});

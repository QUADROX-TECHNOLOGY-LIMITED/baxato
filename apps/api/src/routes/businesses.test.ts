import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { ApiResponse } from '@baxato/common';
import { inMemoryDb, createMockDatabase } from '../test-utils/mock-db';

vi.mock('@baxato/database', () => createMockDatabase());

describe('Multi-Business Architecture & 3-Business Cap (/businesses/*)', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let ownerId: string;
  let secondUserToken: string;
  let secondUserId: string;

  const ownerEmail = `merchant_cap_${Date.now()}@example.com`;
  const secondUserEmail = `staff_dev_${Date.now()}@example.com`;

  beforeAll(async () => {
    inMemoryDb.reset();
    const { buildServer } = await import('../server');
    app = buildServer();
    await app.ready();

    // 1. Register Owner (starts with 1st business)
    const regRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        firstName: 'Mukhtar',
        lastName: 'Aliyu',
        email: ownerEmail,
        phoneNumber: '08161437292',
        password: 'Password123!',
        businessName: 'Business One Global',
        country: 'NG',
        state: 'Kano',
        lga: 'Gwale',
      },
    });

    const body = regRes.json();
    ownerToken = body.data.token;
    ownerId = body.data.user.id;

    // 2. Register Second User (for team invitations)
    const secondReg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        firstName: 'Sani',
        lastName: 'Developer',
        email: secondUserEmail,
        phoneNumber: '08012345678',
        password: 'Password123!',
        businessName: 'Sani Freelance Hub',
        country: 'NG',
        state: 'Lagos',
        lga: 'Ikeja',
      },
    });
    const secondBody = secondReg.json();
    secondUserToken = secondBody.data.token;
    secondUserId = secondBody.data.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  let secondBizId: string;

  it('POST /businesses successfully creates 2nd business', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/businesses',
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        name: 'Business Two Telecom',
        websiteUrl: 'https://biztwo.com',
        country: 'NG',
        state: 'Kaduna',
        lga: 'Zaria',
      },
    });

    expect(res.statusCode).toBe(201);
    const body: ApiResponse<{ business: { id: string; name: string; country: string } }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.business.name).toBe('Business Two Telecom');
    expect(body.data?.business.country).toBe('NG');
    secondBizId = body.data!.business.id;
  });

  it('POST /businesses successfully creates 3rd business', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/businesses',
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        name: 'Business Three Logistics',
        country: 'NG',
        state: 'Abuja',
        lga: 'Municipal',
      },
    });

    expect(res.statusCode).toBe(201);
    const body: ApiResponse<{ business: { id: string; name: string } }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.business.name).toBe('Business Three Logistics');
  });

  it('POST /businesses rejects 4th business creation with 400 BUSINESS_CAP_EXCEEDED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/businesses',
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        name: 'Illegal 4th Business',
        country: 'NG',
        state: 'Enugu',
        lga: 'Enugu North',
      },
    });

    expect(res.statusCode).toBe(400);
    const body: ApiResponse = res.json();
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('BUSINESS_CAP_EXCEEDED');
    expect(body.error?.message).toMatch(/limit of 3/);
  });

  it('GET /businesses returns all 3 owned businesses with distinct wallets', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/businesses',
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ businesses: Array<{ name: string; wallets: { main: unknown } }>; count: number }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.count).toBe(3);
    expect(body.data?.businesses).toHaveLength(3);
  });

  it('PATCH /businesses/:id updates business settings and webhook URL', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/businesses/${secondBizId}`,
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        name: 'Business Two Telecom Pro',
        webhookUrl: 'https://webhook.biztwo.com/listener',
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ business: { name: string; webhookUrl: string } }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.business.name).toBe('Business Two Telecom Pro');
    expect(body.data?.business.webhookUrl).toBe('https://webhook.biztwo.com/listener');
  });

  it('POST /businesses/:id/webhook-secret/regenerate generates new HMAC signing secret', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/businesses/${secondBizId}/webhook-secret/regenerate`,
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ webhookSecret: string }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.webhookSecret.startsWith('whsec_')).toBe(true);
  });

  let invitedMemberId: string;

  it('POST /businesses/:id/members invites a team member with DEVELOPER role', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/businesses/${secondBizId}/members`,
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        email: secondUserEmail,
        role: 'DEVELOPER',
      },
    });

    expect(res.statusCode).toBe(201);
    const body: ApiResponse<{ member: { memberId: string; role: string } }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.member.role).toBe('DEVELOPER');
    invitedMemberId = body.data!.member.memberId;
  });

  it('GET /businesses/:id/members lists team members', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/businesses/${secondBizId}/members`,
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ members: Array<{ role: string; email: string }> }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.members.length).toBeGreaterThan(0);
  });

  it('DELETE /businesses/:id/members/:memberId removes team member', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/businesses/${secondBizId}/members/${invitedMemberId}`,
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ removed: boolean }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.removed).toBe(true);
  });
});

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { UserRole } from '@baxato/common';
import { inMemoryDb, createMockDatabase } from '../test-utils/mock-db';

vi.mock('@baxato/database', () => createMockDatabase());

describe('Team & RBAC Management API (/team/* and /invites/*)', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let ownerId: string;
  let businessId: string;
  let inviteId: string;
  let rawInviteToken: string;
  let acceptedMemberId: string;

  const ownerEmail = `merchant_team_owner_${Date.now()}@baxato.ng`;
  const inviteeEmail = `invitee_dev_${Date.now()}@baxato.ng`;

  beforeAll(async () => {
    inMemoryDb.reset();
    const { buildServer } = await import('../../src/server');
    app = buildServer();
    await app.ready();

    // 1. Register Owner
    const regRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        firstName: 'Tunde',
        lastName: 'Bakare',
        email: ownerEmail,
        phoneNumber: '08123456789',
        password: 'Password123!',
        businessName: 'Apex Telecomms Ltd',
        country: 'NG',
        state: 'Lagos',
        lga: 'Ikeja',
      },
    });

    const regBody = regRes.json();
    ownerToken = regBody.data.token;
    ownerId = regBody.data.user.id;
    businessId = regBody.data.business.id;
  });

  it('GET /team/members: retrieves team members including owner', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/team/members',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': businessId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.members).toBeDefined();
    expect(body.data.members.length).toBe(1);
    expect(body.data.members[0].email).toBe(ownerEmail);
    expect(body.data.members[0].isOwner).toBe(true);
    expect(body.data.members[0].role).toBe(UserRole.BUSINESS_OWNER);
  });

  it('POST /team/invites: successfully invites a new Developer member', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/team/invites',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': businessId,
      },
      payload: {
        email: inviteeEmail,
        role: UserRole.DEVELOPER,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(inviteeEmail);
    expect(body.data.role).toBe(UserRole.DEVELOPER);
    expect(body.data.rawToken).toBeDefined();

    inviteId = body.data.invitationId;
    rawInviteToken = body.data.rawToken;
  });

  it('POST /team/invites: rejects inviting as BUSINESS_OWNER', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/team/invites',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': businessId,
      },
      payload: {
        email: 'attacker@baxato.ng',
        role: UserRole.BUSINESS_OWNER,
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('GET /team/invites: lists pending invitations', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/team/invites',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': businessId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.invitations.length).toBe(1);
    expect(body.data.invitations[0].email).toBe(inviteeEmail);
    expect(body.data.invitations[0].role).toBe(UserRole.DEVELOPER);
  });

  it('GET /invites/validate: validates raw token for acceptance flow', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/invites/validate?token=${rawInviteToken}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.valid).toBe(true);
    expect(body.data.email).toBe(inviteeEmail);
    expect(body.data.businessName).toBe('Apex Telecomms Ltd');
    expect(body.data.role).toBe(UserRole.DEVELOPER);
  });

  it('POST /invites/accept: provisions user account and joins business', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/invites/accept',
      payload: {
        token: rawInviteToken,
        firstName: 'Chidi',
        lastName: 'Okafor',
        password: 'SecurePassword123!',
        phoneNumber: '08099887766',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.email).toBe(inviteeEmail);
    expect(body.data.user.role).toBe(UserRole.DEVELOPER);
  });

  it('GET /team/members: now shows newly joined Developer member', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/team/members',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': businessId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.members.length).toBe(2);

    const devMember = body.data.members.find((m: any) => m.email === inviteeEmail);
    expect(devMember).toBeDefined();
    expect(devMember.role).toBe(UserRole.DEVELOPER);
    acceptedMemberId = devMember.id;
  });

  it('PATCH /team/members/:id/role: updates member role to FINANCE', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/team/members/${acceptedMemberId}/role`,
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': businessId,
      },
      payload: {
        role: UserRole.FINANCE,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.role).toBe(UserRole.FINANCE);
  });

  it('DELETE /team/members/:id: removes member from business', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/team/members/${acceptedMemberId}`,
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': businessId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);

    // Verify member count decreased back to 1
    const verifyRes = await app.inject({
      method: 'GET',
      url: '/team/members',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-business-id': businessId,
      },
    });
    expect(verifyRes.json().data.members.length).toBe(1);
  });
});

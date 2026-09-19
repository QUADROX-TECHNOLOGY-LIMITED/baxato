import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  ServiceType,
  type ApiResponse,
} from '@baxato/common';
import { generateToken } from '../plugins/auth.plugin';
import { inMemoryDb } from '../test-utils/mock-db';
import { ProviderRoutingStrategy } from '../services/providers';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

describe('Provider & Routing Management Endpoints (/providers/*)', () => {
  let app: FastifyInstance;
  let superAdminToken: string;
  let staffToken: string;
  let merchantToken: string;

  beforeAll(async () => {
    inMemoryDb.reset();

    // 1. Seed Super Admin (Platform Owner)
    inMemoryDb.users.push({
      id: 'usr_super_admin_providers',
      email: 'owner@baxato.com',
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
      kycStatus: KycStatus.VERIFIED,
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Seed Staff (Platform Operator)
    inMemoryDb.users.push({
      id: 'usr_staff_providers',
      email: 'staff@baxato.com',
      firstName: 'Platform',
      lastName: 'Staff',
      role: UserRole.STAFF,
      status: 'ACTIVE',
      kycStatus: KycStatus.VERIFIED,
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. Seed Merchant (Business Owner)
    inMemoryDb.users.push({
      id: 'usr_merchant_providers',
      email: 'merchant@baxato.com',
      firstName: 'Business',
      lastName: 'Owner',
      role: UserRole.BUSINESS_OWNER,
      status: 'ACTIVE',
      kycStatus: KycStatus.VERIFIED,
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    superAdminToken = generateToken({
      id: 'usr_super_admin_providers',
      email: 'owner@baxato.com',
      role: UserRole.SUPER_ADMIN,
      kycStatus: KycStatus.VERIFIED,
    });

    staffToken = generateToken({
      id: 'usr_staff_providers',
      email: 'staff@baxato.com',
      role: UserRole.STAFF,
      kycStatus: KycStatus.VERIFIED,
    });

    merchantToken = generateToken({
      id: 'usr_merchant_providers',
      email: 'merchant@baxato.com',
      role: UserRole.BUSINESS_OWNER,
      kycStatus: KycStatus.VERIFIED,
    });

    const { buildServer } = await import('../server');
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /providers returns 200 with registered providers and routing table for Super Admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/providers',
      headers: {
        authorization: `Bearer ${superAdminToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<{ providers: string[]; routingTable: unknown[] }>>();
    expect(body.success).toBe(true);
    expect(body.data.providers).toContain('INTERSWITCH');
    expect(body.data.providers).toContain('MONNIFY');
    expect(body.data.routingTable.length).toBeGreaterThan(0);
  });

  it('GET /providers returns 200 for Staff user with PLATFORM_PROVIDERS_MANAGE permission', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/providers',
      headers: {
        authorization: `Bearer ${staffToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<{ providers: string[] }>>();
    expect(body.success).toBe(true);
  });

  it('GET /providers returns 403 Forbidden for Merchant user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/providers',
      headers: {
        authorization: `Bearer ${merchantToken}`,
      },
    });

    expect(res.statusCode).toBe(403);
    const body = res.json<ApiResponse<null>>();
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('FORBIDDEN');
  });

  it('GET /providers/health returns 200 with health and circuit breaker metrics', async () => {
    const { providerRouterService } = await import('../services/providers');
    const spy = vi.spyOn(providerRouterService, 'getAllProviderHealth').mockResolvedValueOnce([
      {
        providerName: 'INTERSWITCH' as any,
        health: {
          providerName: 'INTERSWITCH' as any,
          isHealthy: true,
          latencyMs: 30,
          message: 'OK',
          checkedAt: new Date(),
        },
        circuitBreaker: {
          name: 'INTERSWITCH',
          state: 'CLOSED' as any,
          failureCount: 0,
          successCount: 1,
          consecutiveSuccesses: 1,
          lastStateChange: new Date(),
        },
      },
      {
        providerName: 'MONNIFY' as any,
        health: {
          providerName: 'MONNIFY' as any,
          isHealthy: true,
          latencyMs: 25,
          message: 'OK',
          checkedAt: new Date(),
        },
        circuitBreaker: {
          name: 'MONNIFY',
          state: 'CLOSED' as any,
          failureCount: 0,
          successCount: 1,
          consecutiveSuccesses: 1,
          lastStateChange: new Date(),
        },
      },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: '/providers/health',
      headers: {
        authorization: `Bearer ${superAdminToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<{ providerStatuses: Array<{ providerName: string }> }>>();
    expect(body.success).toBe(true);
    expect(body.data.providerStatuses).toHaveLength(2);
    spy.mockRestore();
  });

  it('PATCH /providers/routing updates routing strategy for a service category', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/providers/routing',
      headers: {
        authorization: `Bearer ${superAdminToken}`,
      },
      payload: {
        serviceType: ServiceType.AIRTIME,
        strategy: ProviderRoutingStrategy.INTERSWITCH_PRIMARY_MONNIFY_FALLBACK,
        allowFailover: true,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ApiResponse<{ config: { strategy: string; primaryProvider: string } }>>();
    expect(body.success).toBe(true);
    expect(body.data.config.strategy).toBe(
      ProviderRoutingStrategy.INTERSWITCH_PRIMARY_MONNIFY_FALLBACK,
    );
    expect(body.data.config.primaryProvider).toBe('INTERSWITCH');
  });

  it('PATCH /providers/routing returns 400 on invalid serviceType', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/providers/routing',
      headers: {
        authorization: `Bearer ${superAdminToken}`,
      },
      payload: {
        serviceType: 'INVALID_SERVICE',
        strategy: ProviderRoutingStrategy.MONNIFY_ONLY,
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json<ApiResponse<null>>();
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('PATCH /providers/routing returns 403 for Merchant user', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/providers/routing',
      headers: {
        authorization: `Bearer ${merchantToken}`,
      },
      payload: {
        serviceType: ServiceType.AIRTIME,
        strategy: ProviderRoutingStrategy.MONNIFY_ONLY,
      },
    });

    expect(res.statusCode).toBe(403);
  });
});

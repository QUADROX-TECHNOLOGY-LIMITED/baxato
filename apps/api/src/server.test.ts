import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from './server.js';
import type { ApiResponse } from '@baxato/common';

describe('API Gateway Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/health returns 200 OK with standard ApiResponse envelope', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/health',
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ status: string; service: string }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.status).toBe('HEALTHY');
    expect(body.data?.service).toBe('baxato-api-gateway');
    expect(body.meta.requestId).toBeDefined();
    expect(body.meta.timestamp).toBeDefined();
  });

  it('GET /v1/health/live returns 200 OK for container liveness check', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/health/live',
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<{ alive: boolean }> = res.json();
    expect(body.success).toBe(true);
    expect(body.data?.alive).toBe(true);
  });

  it('GET non-existent route returns 404 with structured error envelope', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/non-existent-endpoint',
    });

    expect(res.statusCode).toBe(404);
    const body: ApiResponse = res.json();
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('ROUTE_NOT_FOUND');
    expect(body.meta.requestId).toBeDefined();
  });
});

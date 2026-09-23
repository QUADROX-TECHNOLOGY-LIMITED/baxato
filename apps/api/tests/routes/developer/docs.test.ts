import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../../src/server';

describe('OpenAPI 3.1 & Scalar Interactive Documentation (/docs/*)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /docs/json returns valid OpenAPI 3.1 specification schema', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    expect(response.statusCode).toBe(200);
    const spec = response.json();
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info.title).toBe('BAXATO Developer API Platform');
    expect(spec.info.version).toBe('1.0.0');

    // Verify Security Schemes
    expect(spec.components?.securitySchemes?.BearerAuth).toBeDefined();
    expect(spec.components?.securitySchemes?.ApiKeyAuth).toBeDefined();
    expect(spec.components?.securitySchemes?.ApiKeyAuth?.type).toBe('apiKey');
    expect(spec.components?.securitySchemes?.ApiKeyAuth?.name).toBe('x-api-key');

    // Verify Developer Keys endpoints are documented (could be /developer/keys or /developer/keys/)
    const hasDeveloperKeysPath =
      spec.paths?.['/developer/keys'] !== undefined ||
      spec.paths?.['/developer/keys/'] !== undefined;
    expect(hasDeveloperKeysPath).toBe(true);

    const devKeysPath = spec.paths?.['/developer/keys'] ?? spec.paths?.['/developer/keys/'];
    expect(devKeysPath.get).toBeDefined();
    expect(devKeysPath.post).toBeDefined();
  });

  it('GET /docs serves interactive Scalar documentation portal', async () => {
    // Both /docs (redirect) and /docs/ (portal) work
    const redirectRes = await app.inject({
      method: 'GET',
      url: '/docs',
    });
    expect([200, 301, 302]).toContain(redirectRes.statusCode);

    const portalRes = await app.inject({
      method: 'GET',
      url: '/docs/',
    });
    expect(portalRes.statusCode).toBe(200);
    expect(portalRes.headers['content-type']).toContain('text/html');
    expect(portalRes.body.toLowerCase()).toContain('scalar');
  });
});

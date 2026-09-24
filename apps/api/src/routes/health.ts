import type { FastifyPluginAsync } from 'fastify';
import { createSuccessResponse } from '@baxato/common';
import { env } from '@baxato/config';
import { runMigrations } from '@baxato/database';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (request, reply) => {
    const uptimeSeconds = process.uptime();
    const memoryUsage = process.memoryUsage();

    const healthData = {
      status: 'HEALTHY',
      service: 'baxato-api-gateway',
      version: '1.0.0',
      uptimeSeconds: Math.floor(uptimeSeconds),
      environment: env.NODE_ENV,
      memory: {
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    };

    return reply.status(200).send(createSuccessResponse(healthData, request.id));
  });

  fastify.get('/health/live', async (request, reply) => {
    return reply.status(200).send(createSuccessResponse({ alive: true }, request.id));
  });

  fastify.get('/health/migrate', async (request, reply) => {
    try {
      const migrated = await runMigrations();
      return reply.status(200).send(
        createSuccessResponse({ migrated, status: 'MIGRATIONS_APPLIED' }, request.id),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, 'Failed to execute migrations via /health/migrate');
      return reply.status(500).send({
        success: false,
        error: { code: 'MIGRATION_ERROR', message },
      });
    }
  });
};

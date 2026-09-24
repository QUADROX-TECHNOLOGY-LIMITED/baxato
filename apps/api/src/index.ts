import { buildServer } from './server.js';
import { env, getSanitizedEnv } from '@baxato/config';
import { runMigrations } from '@baxato/database';

async function bootstrap() {
  const app = buildServer();

  try {
    // 1. Ensure all database tables, columns, indexes, and constraints exist
    try {
      await runMigrations();
      app.log.info('✅ PostgreSQL schemas and migrations verified successfully');
    } catch (migErr) {
      app.log.error({ err: migErr }, '⚠️ Database auto-migration reported an error (continuing server startup)');
    }

    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    app.log.info(
      {
        address,
        environment: env.NODE_ENV,
        prefix: env.API_PREFIX,
        config: getSanitizedEnv(env),
      },
      '🚀 BAXATO API Gateway Server started successfully',
    );

    const closeGracefully = async (signal: string) => {
      app.log.info(`Received ${signal}. Shutting down gracefully...`);
      await app.close();
      process.exit(0);
    };

    process.on('SIGINT', () => closeGracefully('SIGINT'));
    process.on('SIGTERM', () => closeGracefully('SIGTERM'));
  } catch (err) {
    app.log.error(err, 'Failed to start BAXATO API server');
    process.exit(1);
  }
}

bootstrap();

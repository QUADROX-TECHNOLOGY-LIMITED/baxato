import { buildServer } from './server.js';
import { env, getSanitizedEnv } from '@baxato/config';

async function bootstrap() {
  const app = buildServer();

  try {
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

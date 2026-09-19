import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import scalarReference from '@scalar/fastify-api-reference';
import { generateEntityId, AppError, createErrorResponse } from '@baxato/common';
import { env } from '@baxato/config';
import { authPlugin } from './plugins/auth.plugin';
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { kycRoutes } from './routes/kyc';
import { userRoutes } from './routes/users';
import { businessRoutes } from './routes/businesses';
import { walletRoutes } from './routes/wallets';
import { ledgerRoutes } from './routes/ledger';
import { webhookRoutes } from './routes/webhooks';
import { providerRoutes } from './routes/providers';
import { apiKeyRoutes } from './routes/developer/keys';
import { developerWebhookRoutes } from './routes/developer/webhooks';
import { airtimeRoutes } from './routes/services/airtime';
import { dataRoutes } from './routes/services/data';
import { cableRoutes } from './routes/services/cable';
import { electricityRoutes } from './routes/services/electricity';
import { educationRoutes } from './routes/services/education';

export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'test'
        ? false
        : {
            level: env.LOG_LEVEL,
            transport:
              env.NODE_ENV === 'development'
                ? {
                    target: 'pino-pretty',
                    options: {
                      translateTime: 'HH:MM:ss Z',
                      ignore: 'pid,hostname',
                    },
                  }
                : undefined,
          },
    genReqId: () => generateEntityId('req'),
    requestIdHeader: 'x-request-id',
  });

  // 1. Security & Standard Plugins
  app.register(sensible);
  app.register(helmet, {
    contentSecurityPolicy: false,
  });
  app.register(cors, {
    origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
  });
  app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // 2. Authentication Decorator Plugin
  app.register(authPlugin);

  // 2.5 OpenAPI & Interactive Documentation (Scalar)
  app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'BAXATO Developer API Platform',
        description:
          'Enterprise Multi-Tenant VTU, Utility Vending, and Digital Services API for Nigerian FinTechs and Merchants.',
        version: '1.0.0',
        contact: {
          name: 'BAXATO Developer Support',
          email: 'developer@baxato.ng',
        },
      },
      servers: [
        {
          url: 'http://localhost:4000',
          description: 'Local Development Server',
        },
        {
          url: 'https://api.baxato.ng',
          description: 'Production API Gateway',
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Standard JSON Web Token for interactive dashboard user sessions',
          },
          ApiKeyAuth: {
            type: 'apiKey',
            name: 'x-api-key',
            in: 'header',
            description: 'Merchant 256-bit API key (starts with bx_live_ or bx_test_)',
          },
        },
      },
      tags: [
        { name: 'Developer Keys', description: 'API Key Lifecycle Management and Rotation' },
        { name: 'Webhooks', description: 'Outbound Event Webhook Subscriptions & HMAC-SHA256 Delivery Logs' },
        { name: 'Airtime', description: 'VTU Airtime Top-Up & Network Queries' },
        { name: 'Data Bundles', description: 'Mobile Broadband Data Plan Vending' },
        { name: 'Cable TV', description: 'Decoder Verification & Subscription Vending' },
        { name: 'Electricity', description: 'DISCO Meter Verification & Token Purchase' },
        { name: 'Education', description: 'WAEC, JAMB, NECO Exam Result PINs' },
        { name: 'Wallets', description: 'Account Balances & Auto-Funding' },
      ],
    },
  });

  // Scalar Interactive Documentation Portal served at /docs
  app.register(scalarReference, {
    routePrefix: '/docs',
    configuration: {
      theme: 'purple',
      pageTitle: 'BAXATO Developer API Reference',
      spec: {
        content: () => app.swagger(),
      },
    },
  });

  // Raw OpenAPI JSON Specification Endpoint
  app.get('/docs/json', { schema: { hide: true } }, async () => {
    return app.swagger();
  });

  // 3. Global Error Handler formatting standard ApiResponse envelope
  app.setErrorHandler((error: Error & { statusCode?: number; code?: string; details?: unknown }, request, reply) => {
    const isAppError = error instanceof AppError;
    const statusCode = isAppError ? error.statusCode : typeof error.statusCode === 'number' ? error.statusCode : 500;
    const errorCode = isAppError ? error.code : typeof error.code === 'string' ? error.code : 'INTERNAL_SERVER_ERROR';
    const message =
      statusCode >= 500 && env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please contact support.'
        : error.message || 'Unknown error occurred';

    if (statusCode >= 500) {
      request.log.error(error);
    } else {
      request.log.warn({ code: errorCode, message: error.message }, 'Client request error');
    }

    const response = createErrorResponse(
      {
        code: errorCode,
        message,
        details: isAppError ? error.details : error.details,
      },
      request.id,
    );

    return reply.status(statusCode).send(response);
  });

  // 4. Global 404 Handler formatting standard ApiResponse envelope
  app.setNotFoundHandler((request, reply) => {
    const response = createErrorResponse(
      {
        code: 'ROUTE_NOT_FOUND',
        message: `Route [${request.method}] ${request.url} was not found on this server`,
      },
      request.id,
    );
    return reply.status(404).send(response);
  });

  // 5. Register Internal Application & Onboarding Routes (NO /v1 prefix)
  app.register(healthRoutes, { prefix: '' });
  app.register(healthRoutes, { prefix: '/v1' }); // keep /v1/health for container liveness probes
  app.register(authRoutes, { prefix: '/auth' });
  app.register(kycRoutes, { prefix: '/kyc' });
  app.register(userRoutes, { prefix: '/users' });
  app.register(businessRoutes, { prefix: '/businesses' });
  app.register(walletRoutes, { prefix: '/wallets' });
  app.register(ledgerRoutes, { prefix: '/ledger' });
  app.register(webhookRoutes, { prefix: '/webhooks' });
  app.register(providerRoutes, { prefix: '/providers' });
  app.register(apiKeyRoutes, { prefix: '/developer/keys' });
  app.register(developerWebhookRoutes, { prefix: '/developer/webhooks' });
  app.register(airtimeRoutes, { prefix: '/services/airtime' });
  app.register(dataRoutes, { prefix: '/services/data' });
  app.register(cableRoutes, { prefix: '/services/cable' });
  app.register(electricityRoutes, { prefix: '/services/electricity' });
  app.register(educationRoutes, { prefix: '/services/education' });

  return app;
}

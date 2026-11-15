import type { FastifyPluginAsync } from 'fastify';
import {
  transferCommissionSchema,
  createSuccessResponse,
  ValidationError,
  Permission,
  WalletType,
  nairaToKobo,
} from '@baxato/common';
import { walletService } from '../services/wallet.service.js';
import { realtimeService } from '../services/realtime.service.js';
import { requireTenantPermission } from '../plugins/rbac.plugin.js';

export const walletRoutes: FastifyPluginAsync = async (fastify) => {
  const activeStreamClosers = new Set<() => void>();

  fastify.addHook('onClose', async () => {
    for (const closeStream of Array.from(activeStreamClosers)) {
      closeStream();
    }
    activeStreamClosers.clear();
  });

  /**
   * GET /wallets/stream
   * Server-Sent Events (SSE) endpoint pushing instant wallet balance mutations for the active business.
   */
  fastify.get(
    '/stream',
    { preHandler: [requireTenantPermission(Permission.TENANT_WALLETS_READ)] },
    async (request, reply) => {
      const businessId = request.businessId;
      if (!businessId) {
        throw new ValidationError('Active business context required');
      }

      const initialWallets = await walletService.getBusinessWallets(businessId);
      const baseHeaders = reply.getHeaders();

      reply.hijack();

      const res = reply.raw;
      const normalizedHeaders: Record<string, string | string[]> = {};
      for (const [k, v] of Object.entries(baseHeaders)) {
        if (v !== undefined) {
          normalizedHeaders[k] = Array.isArray(v) ? v.map(String) : String(v);
        }
      }

      res.writeHead(200, {
        ...normalizedHeaders,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      const writeEvent = (eventName: string, data: unknown) => {
        if (res.writableEnded || res.destroyed) return;
        res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      writeEvent('wallet_snapshot', { wallets: initialWallets });

      const unsubscribe = realtimeService.subscribeBusinessWallets(businessId, (evt) => {
        writeEvent('wallet_updated', evt);
      });

      let cleanedUp = false;
      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        clearInterval(heartbeat);
        unsubscribe();
        activeStreamClosers.delete(cleanup);
        if (!res.writableEnded) {
          res.end();
        }
      };

      const heartbeat = setInterval(() => {
        if (res.writableEnded || res.destroyed) {
          cleanup();
          return;
        }
        res.write(': keepalive\n\n');
      }, 25_000);
      heartbeat.unref?.();

      activeStreamClosers.add(cleanup);
      request.raw.once('close', cleanup);
      res.once('close', cleanup);
    },
  );
  /**
   * GET /wallets
   * Retrieves all wallets (MAIN and COMMISSION) for the active business.
   */
  fastify.get(
    '/',
    { preHandler: [requireTenantPermission(Permission.TENANT_WALLETS_READ)] },
    async (request, reply) => {
      const businessId = request.businessId;
      if (!businessId) {
        throw new ValidationError('Active business context required');
      }

      const wallets = await walletService.getBusinessWallets(businessId);
      return reply.status(200).send(createSuccessResponse({ wallets }, request.id));
    },
  );

  /**
   * GET /wallets/main
   */
  fastify.get(
    '/main',
    { preHandler: [requireTenantPermission(Permission.TENANT_WALLETS_READ)] },
    async (request, reply) => {
      const businessId = request.businessId;
      if (!businessId) {
        throw new ValidationError('Active business context required');
      }

      const wallet = await walletService.getBusinessWallet(businessId, WalletType.MAIN);
      return reply.status(200).send(createSuccessResponse({ wallet }, request.id));
    },
  );

  /**
   * GET /wallets/commission
   */
  fastify.get(
    '/commission',
    { preHandler: [requireTenantPermission(Permission.TENANT_WALLETS_READ)] },
    async (request, reply) => {
      const businessId = request.businessId;
      if (!businessId) {
        throw new ValidationError('Active business context required');
      }

      const wallet = await walletService.getBusinessWallet(businessId, WalletType.COMMISSION);
      return reply.status(200).send(createSuccessResponse({ wallet }, request.id));
    },
  );

  /**
   * POST /wallets/transfer
   * Sweeps commission balance into main balance.
   */
  fastify.post(
    '/transfer',
    { preHandler: [requireTenantPermission(Permission.TENANT_WALLETS_TRANSFER)] },
    async (request, reply) => {
      const businessId = request.businessId;
      if (!businessId) {
        throw new ValidationError('Active business context required');
      }

      const parseResult = transferCommissionSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new ValidationError(
          parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        );
      }

      const { amountNaira } = parseResult.data;
      const amountKobo = nairaToKobo(amountNaira);

      const result = await walletService.transferCommissionToMain(businessId, amountKobo);

      return reply.status(200).send(
        createSuccessResponse(
          {
            transfer: {
              amountNaira: result.amountNaira,
              formattedAmount: result.formattedAmount,
              commissionWallet: result.commissionWallet,
              mainWallet: result.mainWallet,
            },
            message: `Successfully transferred ${result.formattedAmount} from Commission to Main wallet.`,
          },
          request.id,
        ),
      );
    },
  );
};

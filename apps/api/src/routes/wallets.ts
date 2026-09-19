import type { FastifyPluginAsync } from 'fastify';
import {
  transferCommissionSchema,
  createSuccessResponse,
  ValidationError,
  Permission,
  WalletType,
  nairaToKobo,
} from '@baxato/common';
import { walletService } from '../services/wallet.service';
import { requireTenantPermission } from '../plugins/rbac.plugin';

export const walletRoutes: FastifyPluginAsync = async (fastify) => {
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

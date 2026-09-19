import type { FastifyPluginAsync } from 'fastify';
import { createSuccessResponse, ValidationError, Permission } from '@baxato/common';
import { ledgerService } from '../services/ledger.service';
import { requireTenantPermission } from '../plugins/rbac.plugin';

export const ledgerRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /ledger/wallets/:walletId
   * Retrieves paginated financial ledger history and running statement for a wallet.
   */
  fastify.get(
    '/wallets/:walletId',
    { preHandler: [requireTenantPermission(Permission.TENANT_WALLETS_READ)] },
    async (request, reply) => {
      const { walletId } = request.params as { walletId: string };
      if (!walletId) {
        throw new ValidationError('Wallet ID required');
      }

      const statement = await ledgerService.getWalletStatement(walletId);
      return reply.status(200).send(createSuccessResponse(statement, request.id));
    },
  );

  /**
   * GET /ledger/wallets/:walletId/verify
   * Computes mathematical audit integrity comparing cumulative ledger net sum with current balance.
   */
  fastify.get(
    '/wallets/:walletId/verify',
    { preHandler: [requireTenantPermission(Permission.TENANT_WALLETS_READ)] },
    async (request, reply) => {
      const { walletId } = request.params as { walletId: string };
      if (!walletId) {
        throw new ValidationError('Wallet ID required');
      }

      const audit = await ledgerService.verifyWalletLedgerAudit(walletId);
      return reply.status(200).send(createSuccessResponse(audit, request.id));
    },
  );
};

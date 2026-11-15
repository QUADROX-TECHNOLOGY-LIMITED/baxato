import type { FastifyPluginAsync } from 'fastify';
import {
  createSuccessResponse,
  ValidationError,
  Permission,
  TelecomNetwork,
} from '@baxato/common';
import { beneficiaryService } from '../services/beneficiary.service.js';
import { requireTenantPermission } from '../plugins/rbac.plugin.js';

export const beneficiaryRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /beneficiaries
   * Lists saved phone beneficiaries for the active business (max 5, newest updated first).
   */
  fastify.get(
    '/',
    { preHandler: [requireTenantPermission(Permission.TENANT_SERVICES_EXECUTE)] },
    async (request, reply) => {
      const businessId = request.businessId;
      if (!businessId) {
        throw new ValidationError('Active business context required');
      }

      const items = await beneficiaryService.listBeneficiaries(businessId);
      return reply.status(200).send(createSuccessResponse(items, request.id));
    },
  );

  /**
   * POST /beneficiaries
   * Saves a beneficiary phone number for the active business (max 5 FIFO per business).
   */
  fastify.post(
    '/',
    { preHandler: [requireTenantPermission(Permission.TENANT_SERVICES_EXECUTE)] },
    async (request, reply) => {
      const businessId = request.businessId;
      if (!businessId) {
        throw new ValidationError('Active business context required');
      }

      const body = request.body as {
        phoneNumber?: string;
        phone?: string;
        network?: TelecomNetwork;
        label?: string;
        serviceType?: 'AIRTIME' | 'DATA';
      };

      const rawPhone = body.phoneNumber ?? body.phone;
      if (!rawPhone || typeof rawPhone !== 'string') {
        throw new ValidationError('Phone number is required.');
      }

      if (body.serviceType && !['AIRTIME', 'DATA'].includes(body.serviceType)) {
        throw new ValidationError('Invalid serviceType. Supported: AIRTIME, DATA.');
      }

      const saved = await beneficiaryService.saveBeneficiary({
        businessId,
        userId: request.user?.id,
        phoneNumber: rawPhone,
        network: body.network,
        label: body.label,
        serviceType: body.serviceType,
      });

      return reply.status(201).send(createSuccessResponse(saved, request.id));
    },
  );

  /**
   * DELETE /beneficiaries/:id
   * Removes a saved beneficiary belonging to the active business.
   */
  fastify.delete(
    '/:id',
    { preHandler: [requireTenantPermission(Permission.TENANT_SERVICES_EXECUTE)] },
    async (request, reply) => {
      const businessId = request.businessId;
      if (!businessId) {
        throw new ValidationError('Active business context required');
      }

      const { id } = request.params as { id: string };
      await beneficiaryService.deleteBeneficiary(businessId, id);

      return reply.status(200).send(
        createSuccessResponse(
          { deleted: true, id },
          request.id,
        ),
      );
    },
  );
};


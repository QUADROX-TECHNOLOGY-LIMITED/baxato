import type { FastifyPluginAsync } from 'fastify';
import {
  createSuccessResponse,
  ValidationError,
  Permission,
  TelecomNetwork,
} from '@baxato/common';
import {
  beneficiaryService,
  type BeneficiaryServiceType,
} from '../services/beneficiary.service.js';
import { requireTenantPermission } from '../plugins/rbac.plugin.js';

const SUPPORTED_SERVICE_TYPES: readonly BeneficiaryServiceType[] = ['AIRTIME', 'DATA', 'ELECTRICITY'];

export const beneficiaryRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /beneficiaries
   * Lists saved beneficiaries for the active business (max 5 per service category, newest updated first).
   */
  fastify.get(
    '/',
    { preHandler: [requireTenantPermission(Permission.TENANT_SERVICES_EXECUTE)] },
    async (request, reply) => {
      const businessId = request.businessId;
      if (!businessId) {
        throw new ValidationError('Active business context required');
      }

      const query = (request.query || {}) as { serviceType?: string };
      const rawServiceType =
        typeof query.serviceType === 'string' && query.serviceType.trim().length > 0
          ? query.serviceType.trim().toUpperCase()
          : undefined;

      if (rawServiceType && !SUPPORTED_SERVICE_TYPES.includes(rawServiceType as BeneficiaryServiceType)) {
        throw new ValidationError('Invalid serviceType. Supported: AIRTIME, DATA, ELECTRICITY.');
      }

      const items = await beneficiaryService.listBeneficiaries(
        businessId,
        rawServiceType as BeneficiaryServiceType | undefined,
      );
      return reply.status(200).send(createSuccessResponse(items, request.id));
    },
  );

  /**
   * POST /beneficiaries
   * Saves a phone or electricity meter beneficiary for the active business (max 5 FIFO per category).
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
        meterNumber?: string;
        meter?: string;
        disco?: string;
        meterType?: string;
        label?: string;
        serviceType?: string;
      };

      const rawServiceType =
        typeof body.serviceType === 'string' && body.serviceType.trim().length > 0
          ? body.serviceType.trim().toUpperCase()
          : undefined;

      if (rawServiceType && !SUPPORTED_SERVICE_TYPES.includes(rawServiceType as BeneficiaryServiceType)) {
        throw new ValidationError('Invalid serviceType. Supported: AIRTIME, DATA, ELECTRICITY.');
      }

      const rawMeter = body.meterNumber ?? body.meter;
      const isElectricity =
        rawServiceType === 'ELECTRICITY' ||
        (typeof rawMeter === 'string' && rawMeter.trim().length > 0 && !body.phoneNumber && !body.phone);

      if (isElectricity) {
        if (!rawMeter || typeof rawMeter !== 'string') {
          throw new ValidationError('Meter number is required.');
        }
        if (!body.disco || typeof body.disco !== 'string') {
          throw new ValidationError('Electricity provider (disco) is required.');
        }
        if (!body.meterType || typeof body.meterType !== 'string') {
          throw new ValidationError('Meter type (PREPAID or POSTPAID) is required.');
        }

        const saved = await beneficiaryService.saveElectricityBeneficiary({
          businessId,
          userId: request.user?.id,
          meterNumber: rawMeter,
          disco: body.disco,
          meterType: body.meterType,
          label: body.label,
        });

        return reply.status(201).send(createSuccessResponse(saved, request.id));
      }

      const rawPhone = body.phoneNumber ?? body.phone;
      if (!rawPhone || typeof rawPhone !== 'string') {
        throw new ValidationError('Phone number is required.');
      }

      const saved = await beneficiaryService.saveBeneficiary({
        businessId,
        userId: request.user?.id,
        phoneNumber: rawPhone,
        network: body.network,
        label: body.label,
        serviceType: rawServiceType as 'AIRTIME' | 'DATA' | undefined,
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


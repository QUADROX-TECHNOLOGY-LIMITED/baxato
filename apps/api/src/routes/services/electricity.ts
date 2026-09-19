import type { FastifyPluginAsync } from 'fastify';
import {
  createSuccessResponse,
  ValidationError,
  Permission,
  DiscoCode,
  ElectricityMeterType,
} from '@baxato/common';
import { electricityService } from '../../services/electricity.service';
import { requireTenantPermission } from '../../plugins/rbac.plugin';

export const electricityRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /services/electricity/discos
   * Returns list of supported Nigerian electricity distribution companies (DISCOs).
   */
  fastify.get('/discos', async (request, reply) => {
    const discos = electricityService.getDiscos();
    return reply.status(200).send(createSuccessResponse(discos, request.id));
  });

  /**
   * POST /services/electricity/validate
   * Validates electricity meter number and retrieves consumer name, address, and balance.
   */
  fastify.post(
    '/validate',
    { preHandler: [requireTenantPermission(Permission.TENANT_SERVICES_EXECUTE)] },
    async (request, reply) => {
      const body = request.body as {
        disco?: string;
        meterNumber?: string;
        meterType?: string;
        amount?: number;
      };

      if (!body.disco || typeof body.disco !== 'string') {
        throw new ValidationError('DISCO code is required (e.g. IBEDC, IKEDC, EKEDC, AEDC).');
      }

      const upperDisco = body.disco.toUpperCase();
      if (!Object.values(DiscoCode).includes(upperDisco as DiscoCode)) {
        throw new ValidationError(
          `Invalid DISCO code: '${body.disco}'. Supported: ${Object.values(DiscoCode).join(', ')}`,
        );
      }

      if (!body.meterNumber || typeof body.meterNumber !== 'string') {
        throw new ValidationError('Meter number is required.');
      }

      const meterType = body.meterType ? (body.meterType.toUpperCase() as ElectricityMeterType) : ElectricityMeterType.PREPAID;
      if (!Object.values(ElectricityMeterType).includes(meterType)) {
        throw new ValidationError(
          `Invalid meter type: '${body.meterType}'. Supported: PREPAID, POSTPAID`,
        );
      }

      const amountKobo = body.amount ? BigInt(Math.round(body.amount * 100)) : undefined;

      const result = await electricityService.validateMeter({
        disco: upperDisco as DiscoCode,
        meterNumber: body.meterNumber,
        meterType,
        amountKobo,
      });

      return reply.status(200).send(createSuccessResponse(result, request.id));
    },
  );

  /**
   * POST /services/electricity/purchase
   * Vends electricity prepayment STS token or bill payment with optimistic concurrency balance locking.
   */
  fastify.post(
    '/purchase',
    { preHandler: [requireTenantPermission(Permission.TENANT_SERVICES_EXECUTE)] },
    async (request, reply) => {
      const body = request.body as {
        disco?: string;
        meterNumber?: string;
        meterType?: string;
        amount?: number;
        amountKobo?: string;
        customerMobile?: string;
        customerName?: string;
        clientReference?: string;
      };

      if (!body.disco || typeof body.disco !== 'string') {
        throw new ValidationError('DISCO code is required.');
      }

      const upperDisco = body.disco.toUpperCase();
      if (!Object.values(DiscoCode).includes(upperDisco as DiscoCode)) {
        throw new ValidationError(
          `Invalid DISCO code: '${body.disco}'. Supported: ${Object.values(DiscoCode).join(', ')}`,
        );
      }

      if (!body.meterNumber || typeof body.meterNumber !== 'string') {
        throw new ValidationError('Meter number is required.');
      }

      const meterType = body.meterType ? (body.meterType.toUpperCase() as ElectricityMeterType) : ElectricityMeterType.PREPAID;
      if (!Object.values(ElectricityMeterType).includes(meterType)) {
        throw new ValidationError(
          `Invalid meter type: '${body.meterType}'. Supported: PREPAID, POSTPAID`,
        );
      }

      let parsedAmountKobo: bigint;
      if (body.amountKobo) {
        parsedAmountKobo = BigInt(body.amountKobo);
      } else if (typeof body.amount === 'number') {
        parsedAmountKobo = BigInt(Math.round(body.amount * 100));
      } else {
        throw new ValidationError('Electricity purchase amount is required.');
      }

      const businessId = request.businessId!;
      const userId = request.user!.id;
      const idempotencyKey = (request.headers['x-idempotency-key'] as string) || undefined;

      const receipt = await electricityService.purchaseElectricity({
        businessId,
        userId,
        disco: upperDisco as DiscoCode,
        meterNumber: body.meterNumber,
        meterType,
        amountKobo: parsedAmountKobo,
        customerMobile: body.customerMobile,
        customerName: body.customerName,
        clientReference: body.clientReference,
        idempotencyKey,
      });

      return reply.status(201).send(createSuccessResponse(receipt, request.id));
    },
  );

  /**
   * GET /services/electricity/history
   * Returns paginated electricity vending history for the tenant business.
   */
  fastify.get(
    '/history',
    { preHandler: [requireTenantPermission(Permission.TENANT_TRANSACTIONS_READ)] },
    async (request, reply) => {
      const query = request.query as { limit?: string; offset?: string };
      const limit = query.limit ? Math.max(1, Math.min(100, parseInt(query.limit, 10))) : 20;
      const offset = query.offset ? Math.max(0, parseInt(query.offset, 10)) : 0;

      const history = await electricityService.getElectricityHistory(
        request.businessId!,
        limit,
        offset,
      );

      return reply.status(200).send(createSuccessResponse(history, request.id));
    },
  );
};

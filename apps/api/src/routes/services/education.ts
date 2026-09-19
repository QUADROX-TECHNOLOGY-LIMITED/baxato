import type { FastifyPluginAsync } from 'fastify';
import {
  createSuccessResponse,
  ValidationError,
  Permission,
  ExamBody,
} from '@baxato/common';
import { educationService, EXAM_PACKAGES } from '../../services/education.service';
import { requireTenantPermission } from '../../plugins/rbac.plugin';

export const educationRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /services/education/packages
   * Returns list of supported examination packages with dynamic wholesale & retail pricing.
   */
  fastify.get('/packages', async (request, reply) => {
    const businessId = request.businessId;
    const packages = educationService.getPackages(businessId);
    return reply.status(200).send(createSuccessResponse(packages, request.id));
  });

  /**
   * POST /services/education/validate
   * Validates candidate profile code (JAMB) or identifier.
   */
  fastify.post(
    '/validate',
    { preHandler: [requireTenantPermission(Permission.TENANT_SERVICES_EXECUTE)] },
    async (request, reply) => {
      const body = request.body as {
        examBody?: string;
        candidateId?: string;
        packageCode?: string;
      };

      if (!body.examBody || typeof body.examBody !== 'string') {
        throw new ValidationError('Exam body is required (e.g. JAMB, WAEC, NECO, NABTEB).');
      }

      const upperBody = body.examBody.toUpperCase();
      if (!Object.values(ExamBody).includes(upperBody as ExamBody)) {
        throw new ValidationError(
          `Invalid exam body: '${body.examBody}'. Supported: ${Object.values(ExamBody).join(', ')}`,
        );
      }

      if (!body.candidateId || typeof body.candidateId !== 'string') {
        throw new ValidationError('Candidate ID / Profile Code is required.');
      }

      const result = await educationService.validateCandidate({
        examBody: upperBody as ExamBody,
        candidateId: body.candidateId,
        packageCode: body.packageCode,
      });

      return reply.status(200).send(createSuccessResponse(result, request.id));
    },
  );

  /**
   * POST /services/education/purchase
   * Vends examination PIN(s) with dynamic wholesale pricing and concurrency balance locking.
   */
  fastify.post(
    '/purchase',
    { preHandler: [requireTenantPermission(Permission.TENANT_SERVICES_EXECUTE)] },
    async (request, reply) => {
      const body = request.body as {
        packageCode?: string;
        candidateId?: string;
        candidateName?: string;
        candidateEmail?: string;
        quantity?: number;
        customMarkupKobo?: string | number;
        clientReference?: string;
      };

      if (!body.packageCode || typeof body.packageCode !== 'string') {
        throw new ValidationError('Package code is required (e.g. JAMB_DIRECT_ENTRY, WAEC_RESULT_CHECKER).');
      }

      const upperPkg = body.packageCode.toUpperCase();
      if (!EXAM_PACKAGES[upperPkg]) {
        throw new ValidationError(
          `Invalid package code: '${body.packageCode}'. Supported: ${Object.keys(EXAM_PACKAGES).join(', ')}`,
        );
      }

      if (!body.candidateId || typeof body.candidateId !== 'string') {
        throw new ValidationError('Candidate ID / Profile Code / Phone number is required.');
      }

      let customMarkupKobo: bigint | undefined;
      if (body.customMarkupKobo !== undefined) {
        try {
          customMarkupKobo = BigInt(body.customMarkupKobo);
        } catch {
          throw new ValidationError('Invalid customMarkupKobo format.');
        }
      }

      const idempotencyKey = request.headers['x-idempotency-key'] as string | undefined;

      const receipt = await educationService.purchaseExamPin({
        businessId: request.businessId!,
        userId: request.user!.id,
        packageCode: upperPkg,
        candidateId: body.candidateId,
        candidateName: body.candidateName,
        candidateEmail: body.candidateEmail,
        quantity: body.quantity ? Number(body.quantity) : 1,
        customMarkupKobo,
        clientReference: body.clientReference,
        idempotencyKey,
      });

      return reply.status(201).send(createSuccessResponse(receipt, request.id));
    },
  );

  /**
   * GET /services/education/history
   * Retrieves paginated Education PIN transaction history for active tenant.
   */
  fastify.get(
    '/history',
    { preHandler: [requireTenantPermission(Permission.TENANT_TRANSACTIONS_READ)] },
    async (request, reply) => {
      const query = request.query as { limit?: string; offset?: string };
      const limit = query.limit ? parseInt(query.limit, 10) : 20;
      const offset = query.offset ? parseInt(query.offset, 10) : 0;

      const history = await educationService.getEducationHistory(
        request.businessId!,
        limit,
        offset,
      );

      return reply.status(200).send(createSuccessResponse(history, request.id));
    },
  );

  /**
   * PUT /services/education/pricing
   * Updates dynamic custom markup for merchant on a specific examination package.
   * Ensures STRICT compliance with NO HARDCODED MARGINS.
   */
  fastify.put(
    '/pricing',
    { preHandler: [requireTenantPermission(Permission.TENANT_SERVICES_EXECUTE)] },
    async (request, reply) => {
      const body = request.body as {
        packageCode?: string;
        markupKobo?: string | number;
      };

      if (!body.packageCode || !EXAM_PACKAGES[body.packageCode.toUpperCase()]) {
        throw new ValidationError('Valid package code is required.');
      }

      if (body.markupKobo === undefined) {
        throw new ValidationError('markupKobo is required.');
      }

      let markup: bigint;
      try {
        markup = BigInt(body.markupKobo);
      } catch {
        throw new ValidationError('Invalid markupKobo format.');
      }

      educationService.setCustomMarkup(
        request.businessId!,
        body.packageCode.toUpperCase(),
        markup,
      );

      return reply.status(200).send(
        createSuccessResponse(
          {
            businessId: request.businessId!,
            packageCode: body.packageCode.toUpperCase(),
            markupKobo: markup.toString(),
            message: 'Custom pricing markup updated successfully.',
          },
          request.id,
        ),
      );
    },
  );
};

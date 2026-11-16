import type { FastifyRequest } from 'fastify';
import { TransactionStatus } from '@baxato/common';
import { auditService } from '../services/audit.service.js';
import {
  extractAuditActor,
  extractClientIp,
  extractUserAgent,
} from './request-meta.js';

export type ServiceAuditActionPrefix =
  | 'AIRTIME_PURCHASE'
  | 'DATA_PURCHASE'
  | 'ELECTRICITY_PURCHASE'
  | 'CABLE_PURCHASE'
  | 'EDUCATION_PURCHASE';

const INTERNAL_PROVIDER_PATTERN = /\b(vtpass|monnify|interswitch|clubkonnect|paystack|flutterwave|zeptomail)\b/gi;

function sanitizeErrorText(raw: unknown): string {
  const text = raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : 'Transaction failed';
  return text.replace(INTERNAL_PROVIDER_PATTERN, 'upstream service').slice(0, 200);
}

/**
 * Executes a service purchase and records a unified tenant-scoped audit log entry
 * with client IP, User-Agent, and actor attribution (dashboard user or API key).
 */
export async function executeWithServiceAudit<
  TReceipt extends { transactionId: string; status: TransactionStatus | string },
>(
  request: FastifyRequest,
  meta: {
    actionPrefix: ServiceAuditActionPrefix;
    successChanges: (receipt: TReceipt) => Record<string, unknown>;
    failureChanges: Record<string, unknown>;
  },
  executor: () => Promise<TReceipt>,
): Promise<TReceipt> {
  const actor = extractAuditActor(request);
  const ipAddress = extractClientIp(request);
  const userAgent = extractUserAgent(request);
  const userId = request.isApiKeyAuth ? undefined : request.user?.id;

  try {
    const receipt = await executor();
    const isProcessing =
      receipt.status === TransactionStatus.PROCESSING ||
      receipt.status === TransactionStatus.PENDING;

    await auditService.log({
      userId,
      businessId: request.businessId,
      action: isProcessing ? `${meta.actionPrefix}_PROCESSING` : meta.actionPrefix,
      resourceType: 'TRANSACTION',
      resourceId: receipt.transactionId,
      ipAddress,
      userAgent,
      changes: {
        ...actor,
        ...meta.successChanges(receipt),
        status: receipt.status,
      },
    });

    return receipt;
  } catch (err) {
    await auditService.log({
      userId,
      businessId: request.businessId,
      action: `${meta.actionPrefix}_FAILED`,
      resourceType: 'TRANSACTION',
      resourceId: String(meta.failureChanges.clientReference || request.id),
      ipAddress,
      userAgent,
      changes: {
        ...actor,
        ...meta.failureChanges,
        error: sanitizeErrorText(err),
        status: 'FAILED',
      },
    });
    throw err;
  }
}


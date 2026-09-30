import { db, auditLogs } from '@baxato/database';

export function sanitizeForJson(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  try {
    return JSON.parse(
      JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
    );
  } catch {
    return {};
  }
}

export interface AuditLogInput {
  userId?: string;
  businessId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, unknown>;
}

export class AuditService {
  /**
   * Persists an audit log entry for user and business activities.
   * Non-blocking to guarantee core transaction flows never fail on audit logging.
   */
  public async log(params: AuditLogInput): Promise<void> {
    try {
      if (!db || typeof db.insert !== 'function' || !auditLogs) return;
      await db.insert(auditLogs).values({
        userId: params.userId,
        businessId: params.businessId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        changes: sanitizeForJson(params.changes),
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('[AuditService] Failed to record audit trail:', err);
      }
    }
  }
}

export const auditService = new AuditService();

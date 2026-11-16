import { db, auditLogs, eq, desc } from '@baxato/database';
import {
  describeAuditEvent,
  normalizeIpAddress,
  parseUserAgent,
  sanitizeAuditChanges,
} from '../utils/request-meta.js';

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

const LOGIN_ACTIONS = new Set([
  'USER_LOGIN',
  'STAFF_LOGIN_SUCCESS',
  'ADMIN_LOGIN_SUCCESS',
]);

export class AuditService {
  /**
   * Persists an audit log entry for user and business activities.
   * Non-blocking to guarantee core transaction flows never fail on audit logging.
   */
  public async log(params: AuditLogInput): Promise<void> {
    try {
      if (!db || typeof db.insert !== 'function' || !auditLogs) return;
      const cleanIp = normalizeIpAddress(params.ipAddress);
      await db.insert(auditLogs).values({
        userId: params.userId,
        businessId: params.businessId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        ipAddress: cleanIp || undefined,
        userAgent: params.userAgent?.trim() || undefined,
        changes: sanitizeForJson(params.changes),
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('[AuditService] Failed to record audit trail:', err);
      }
    }
  }

  /**
   * Retrieves chronological audit trail for a specific user with human-readable summaries
   * and sanitized non-secret metadata.
   */
  public async getLogsForUser(userId: string, limit = 25) {
    try {
      if (!db || typeof db.select !== 'function') return [];
      const rows = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          resourceType: auditLogs.resourceType,
          resourceId: auditLogs.resourceId,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          changes: auditLogs.changes,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      return rows.map((row) => {
        const cleanChanges = sanitizeAuditChanges(row.changes);
        const summary = describeAuditEvent({
          action: row.action,
          resourceType: row.resourceType,
          resourceId: row.resourceId,
          changes: cleanChanges,
        });
        const parsedUa = row.userAgent ? parseUserAgent(row.userAgent) : null;
        return {
          ...row,
          ipAddress: normalizeIpAddress(row.ipAddress),
          changes: cleanChanges,
          title: summary.title,
          description: summary.description,
          category: summary.category,
          deviceName: parsedUa ? parsedUa.displayName : null,
        };
      });
    } catch (err) {
      console.error('[AuditService] Failed to fetch user audit logs:', err);
      return [];
    }
  }

  /**
   * Retrieves the latest login (or initial registration) event for a user.
   */
  public async getLastLoginForUser(userId: string) {
    try {
      if (!db || typeof db.select !== 'function') return null;
      const rows = await db
        .select({
          action: auditLogs.action,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(30);

      const lastLogin =
        rows.find((r) => LOGIN_ACTIONS.has(r.action)) ||
        rows.find((r) => r.action === 'USER_REGISTERED') ||
        null;

      if (!lastLogin) return null;

      return {
        ipAddress: normalizeIpAddress(lastLogin.ipAddress),
        userAgent: lastLogin.userAgent,
        createdAt: lastLogin.createdAt,
      };
    } catch (err) {
      console.error('[AuditService] Failed to fetch last login:', err);
      return null;
    }
  }

  /**
   * Retrieves recent distinct authenticated sessions for a user across browsers, devices, and IPs.
   */
  public async getRecentLoginSessions(userId: string, limit = 8) {
    try {
      if (!db || typeof db.select !== 'function') return [];
      const rows = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(60);

      const loginRows = rows.filter((r) => LOGIN_ACTIONS.has(r.action));
      const candidateRows =
        loginRows.length > 0
          ? loginRows
          : rows.filter((r) => r.action === 'USER_REGISTERED');

      const seen = new Set<string>();
      const distinct: Array<{
        id: string;
        ipAddress: string | null;
        userAgent: string | null;
        deviceName: string;
        os: string;
        browser: string;
        category: string;
        createdAt: Date;
      }> = [];

      for (const row of candidateRows) {
        const parsed = parseUserAgent(row.userAgent);
        if (parsed.isAutomated) continue;

        const cleanIp = normalizeIpAddress(row.ipAddress);
        const dedupKey = `${parsed.fingerprintKey}::${cleanIp || 'unknown'}`;

        if (!seen.has(dedupKey)) {
          seen.add(dedupKey);
          distinct.push({
            id: row.id,
            ipAddress: cleanIp,
            userAgent: row.userAgent,
            deviceName: parsed.displayName,
            os: parsed.os,
            browser: parsed.browser,
            category: parsed.category,
            createdAt: row.createdAt,
          });
        }
      }

      return distinct.slice(0, limit);
    } catch (err) {
      console.error('[AuditService] Failed to fetch login sessions:', err);
      return [];
    }
  }
}

export const auditService = new AuditService();


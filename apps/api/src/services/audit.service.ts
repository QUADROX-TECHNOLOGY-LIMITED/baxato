import { db, auditLogs, eq, desc, and } from '@baxato/database';

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

  /**
   * Retrieves chronological audit trail for a specific user.
   */
  public async getLogsForUser(userId: string, limit = 15) {
    try {
      if (!db || typeof db.select !== 'function') return [];
      return await db
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
    } catch (err) {
      console.error('[AuditService] Failed to fetch user audit logs:', err);
      return [];
    }
  }

  /**
   * Retrieves the latest login event for a user to display last active telemetry.
   */
  public async getLastLoginForUser(userId: string) {
    try {
      if (!db || typeof db.select !== 'function') return null;
      const [lastLogin] = await db
        .select({
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(and(eq(auditLogs.userId, userId), eq(auditLogs.action, 'USER_LOGIN')))
        .orderBy(desc(auditLogs.createdAt))
        .limit(1);

      return lastLogin || null;
    } catch (err) {
      console.error('[AuditService] Failed to fetch last login:', err);
      return null;
    }
  }

  /**
   * Retrieves recent distinct login sessions for a user across devices.
   * Filters out automated test runners (node/undici) and deduplicates by distinct client platform.
   */
  public async getRecentLoginSessions(userId: string, limit = 6) {
    try {
      if (!db || typeof db.select !== 'function') return [];
      const rows = await db
        .select({
          id: auditLogs.id,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(and(eq(auditLogs.userId, userId), eq(auditLogs.action, 'USER_LOGIN')))
        .orderBy(desc(auditLogs.createdAt))
        .limit(30);

      // Filter out automated script user agents like "node", "axios", "undici"
      const humanRows = rows.filter((r) => {
        const ua = (r.userAgent || '').trim().toLowerCase();
        return ua && ua !== 'node' && !ua.startsWith('node/') && !ua.startsWith('axios') && !ua.startsWith('undici');
      });

      // Deduplicate by device/platform so distinct physical devices appear cleanly
      const seen = new Set<string>();
      const distinct: typeof rows = [];

      for (const row of humanRows) {
        const ua = row.userAgent || '';
        let key = 'unknown';
        if (/iPhone/i.test(ua)) key = 'apple-iphone';
        else if (/iPad/i.test(ua)) key = 'apple-ipad';
        else if (/Android/i.test(ua)) key = 'android-device';
        else if (/Windows/i.test(ua)) key = 'windows-pc';
        else if (/Macintosh|Mac OS X/i.test(ua)) key = 'macos-pc';
        else if (/Linux/i.test(ua)) key = 'linux-pc';
        else key = ua.slice(0, 30);

        if (!seen.has(key)) {
          seen.add(key);
          distinct.push(row);
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


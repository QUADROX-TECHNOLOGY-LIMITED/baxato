import {
  db,
  auditLogs,
  users,
  eq,
  and,
  inArray,
  not,
  desc,
} from '@baxato/database';
import {
  ACCOUNT_AUDIT_ACTIONS,
  describeAuditEvent,
  normalizeIpAddress,
  parseUserAgent,
  sanitizeAuditChanges,
} from '../utils/request-meta.js';

export interface BusinessAuditLogQuery {
  category?: string;
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

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
   * Retrieves chronological personal account security & identity audit logs for a user.
   * Excludes workspace/business operations which belong strictly in getLogsForBusiness.
   */
  public async getLogsForUser(userId: string, limit = 25) {
    try {
      if (!db || typeof db.select !== 'function') return [];
      const accountActions = Array.from(ACCOUNT_AUDIT_ACTIONS);
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
        .where(and(eq(auditLogs.userId, userId), inArray(auditLogs.action, accountActions)))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      return rows
        .filter((row) => ACCOUNT_AUDIT_ACTIONS.has(row.action))
        .map((row) => {
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

  /**
   * Retrieves workspace operational audit logs scoped to a specific business
   * (team actions, API keys, webhooks, business configuration, and service transactions).
   * Excludes personal account identity events.
   */
  public async getLogsForBusiness(
    businessId: string,
    query: BusinessAuditLogQuery = {},
  ) {
    const safeLimit = Math.max(1, Math.min(100, Number(query.limit) || 25));
    const safeOffset = Math.max(0, Number(query.offset) || 0);
    const categoryFilter = query.category?.trim().toLowerCase() || 'all';
    const sourceFilter = query.source?.trim().toUpperCase() || 'ALL';
    const searchQuery = query.search?.trim().toLowerCase() || '';

    try {
      if (!db || typeof db.select !== 'function') {
        return { logs: [], total: 0, limit: safeLimit, offset: safeOffset, hasMore: false };
      }

      const accountActions = Array.from(ACCOUNT_AUDIT_ACTIONS);
      const rows = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          businessId: auditLogs.businessId,
          action: auditLogs.action,
          resourceType: auditLogs.resourceType,
          resourceId: auditLogs.resourceId,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          changes: auditLogs.changes,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.businessId, businessId),
            not(inArray(auditLogs.action, accountActions)),
          ),
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(500);

      const filteredRows = rows.filter((row) => !ACCOUNT_AUDIT_ACTIONS.has(row.action));
      const userIds = Array.from(
        new Set(filteredRows.map((r) => r.userId).filter((id): id is string => Boolean(id))),
      );

      const userMap = new Map<
        string,
        { id: string; firstName: string; lastName: string; email: string }
      >();

      if (userIds.length > 0 && users) {
        const userRows = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(users)
          .where(inArray(users.id, userIds));

        for (const u of userRows) {
          userMap.set(u.id, u);
        }
      }

      const enriched = filteredRows.map((row) => {
        const cleanChanges = sanitizeAuditChanges(row.changes);
        const summary = describeAuditEvent({
          action: row.action,
          resourceType: row.resourceType,
          resourceId: row.resourceId,
          changes: cleanChanges,
        });
        const parsedUa = row.userAgent ? parseUserAgent(row.userAgent) : null;
        const cleanIp = normalizeIpAddress(row.ipAddress);

        const isApiKey =
          cleanChanges.actorSource === 'API_KEY' ||
          Boolean(cleanChanges.apiKeyId || cleanChanges.apiKeyName);

        const source: 'API_KEY' | 'DASHBOARD' = isApiKey ? 'API_KEY' : 'DASHBOARD';
        const user = row.userId ? userMap.get(row.userId) : undefined;
        const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : '';
        const fallbackEmail =
          typeof cleanChanges.actorEmail === 'string'
            ? cleanChanges.actorEmail
            : typeof cleanChanges.email === 'string' &&
              (row.action === 'TEAM_INVITATION_ACCEPTED' || row.action === 'TEAM_INVITE_ACCEPTED')
            ? cleanChanges.email
            : null;
        const resolvedEmail = user?.email || fallbackEmail || null;

        const actor = isApiKey
          ? {
              type: 'API_KEY' as const,
              id: cleanChanges.apiKeyId ? String(cleanChanges.apiKeyId) : null,
              name: String(cleanChanges.apiKeyName || 'API Key'),
              email: null as string | null,
              detail: cleanChanges.environment
                ? `${String(cleanChanges.environment)} API Key`
                : 'API Key',
            }
          : {
              type: 'USER' as const,
              id: row.userId || null,
              name: fullName || resolvedEmail || 'Workspace member',
              email: resolvedEmail,
              detail: resolvedEmail || 'Dashboard user',
            };

        return {
          id: row.id,
          action: row.action,
          resourceType: row.resourceType,
          resourceId: row.resourceId,
          ipAddress: cleanIp,
          userAgent: row.userAgent,
          deviceName: parsedUa ? parsedUa.displayName : null,
          source,
          actor,
          changes: cleanChanges,
          title: summary.title,
          description: summary.description,
          category: summary.category,
          createdAt: row.createdAt,
        };
      });

      const matching = enriched.filter((entry) => {
        if (categoryFilter !== 'all' && entry.category !== categoryFilter) {
          return false;
        }
        if (sourceFilter !== 'ALL' && entry.source !== sourceFilter) {
          return false;
        }
        if (searchQuery) {
          const haystack = [
            entry.title,
            entry.description,
            entry.action,
            entry.category,
            entry.actor.name,
            entry.actor.email,
            entry.actor.detail,
            entry.ipAddress,
            entry.deviceName,
            entry.resourceId,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(searchQuery)) {
            return false;
          }
        }
        return true;
      });

      const pageLogs = matching.slice(safeOffset, safeOffset + safeLimit);
      return {
        logs: pageLogs,
        total: matching.length,
        limit: safeLimit,
        offset: safeOffset,
        hasMore: safeOffset + pageLogs.length < matching.length,
      };
    } catch (err) {
      console.error('[AuditService] Failed to fetch business audit logs:', err);
      return { logs: [], total: 0, limit: safeLimit, offset: safeOffset, hasMore: false };
    }
  }
}

export const auditService = new AuditService();


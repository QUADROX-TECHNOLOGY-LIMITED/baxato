import net from 'node:net';
import type { FastifyRequest } from 'fastify';

export type DeviceCategory = 'mobile' | 'desktop' | 'api' | 'browser';

export interface ParsedDeviceInfo {
  displayName: string;
  category: DeviceCategory;
  os: string;
  browser: string;
  fingerprintKey: string;
  isAutomated: boolean;
}

export type AuditCategory =
  | 'auth'
  | 'security'
  | 'profile'
  | 'team'
  | 'developer'
  | 'business'
  | 'transaction'
  | 'system';

export interface AuditEventSummary {
  title: string;
  description: string;
  category: AuditCategory;
}

const SENSITIVE_AUDIT_KEYS = new Set([
  'provider',
  'providerName',
  'password',
  'passwordHash',
  'secret',
  'secretKey',
  'webhookSecret',
  'webhookTestSecret',
  'twoFactorSecret',
  'twoFactorBackupCodes',
  'token',
  'tokenHash',
  'rawToken',
  'otp',
  'rawResponse',
  'ninData',
  'keyHash',
]);

const ROLE_LABELS: Record<string, string> = {
  BUSINESS_OWNER: 'Owner',
  BUSINESS_ADMIN: 'Administrator',
  DEVELOPER: 'Developer',
  FINANCE: 'Finance & Billing',
  SUPPORT: 'Customer Support',
  VIEWER: 'Viewer',
  STAFF: 'Staff',
  SUPER_ADMIN: 'Super Admin',
};

function readHeaderValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) return value.join(',');
  return undefined;
}

/**
 * Normalizes an IP address string (removes IPv4-mapped IPv6 prefix `::ffff:`,
 * strips port suffixes / brackets, and converts `::1` to `127.0.0.1`).
 */
export function normalizeIpAddress(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;

  let candidate = raw.trim().replace(/^["']|["']$/g, '');
  if (!candidate) return null;

  // Handle bracketed IPv6 e.g. [::1]:443 or [2001:db8::1]
  if (candidate.startsWith('[')) {
    const closeBracket = candidate.indexOf(']');
    if (closeBracket !== -1) {
      candidate = candidate.slice(1, closeBracket);
    }
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    // Strip IPv4 :port suffix
    candidate = candidate.replace(/:\d+$/, '');
  }

  // Strip IPv4-mapped IPv6 prefix
  if (/^::ffff:/i.test(candidate)) {
    candidate = candidate.slice(7);
  }

  if (candidate === '::1') {
    return '127.0.0.1';
  }

  return net.isIP(candidate) > 0 ? candidate : null;
}

/**
 * Checks whether a normalized IP address is loopback, private RFC1918,
 * CGNAT (`100.64.0.0/10`), link-local, or IPv6 unique-local/link-local.
 */
export function isPrivateOrLoopbackIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const a = parts[0] ?? 0;
    const b = parts[1] ?? 0;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }

  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::' || lower === '::1') return true;
    if (/^(fc|fd)/i.test(lower)) return true; // Unique local fc00::/7
    if (/^fe[89ab]/i.test(lower)) return true; // Link local fe80::/10
    return false;
  }

  return true;
}

/**
 * Extracts the real client IP from Cloudflare, Traefik, Nginx, or Fastify headers.
 * Prefers the first valid publicly routable IP so Docker/overlay bridge hops
 * (`10.x.x.x`, `172.17.x.x`, `127.0.0.1`) do not mask the visitor's real address.
 */
export function extractClientIp(request: Pick<FastifyRequest, 'headers' | 'ip'>): string {
  const rawCandidates: string[] = [];

  const cfIp = readHeaderValue(request.headers['cf-connecting-ip']);
  if (cfIp) rawCandidates.push(cfIp);

  const trueClientIp = readHeaderValue(request.headers['true-client-ip']);
  if (trueClientIp) rawCandidates.push(trueClientIp);

  const xClientIp = readHeaderValue(request.headers['x-client-ip']);
  if (xClientIp) rawCandidates.push(xClientIp);

  const xForwardedFor = readHeaderValue(request.headers['x-forwarded-for']);
  if (xForwardedFor) {
    for (const part of xForwardedFor.split(',')) {
      rawCandidates.push(part);
    }
  }

  const xRealIp = readHeaderValue(request.headers['x-real-ip']);
  if (xRealIp) rawCandidates.push(xRealIp);

  if (request.ip) {
    rawCandidates.push(request.ip);
  }

  const normalized: string[] = [];
  for (const raw of rawCandidates) {
    const clean = normalizeIpAddress(raw);
    if (clean && !normalized.includes(clean)) {
      normalized.push(clean);
    }
  }

  const publicIp = normalized.find((ip) => !isPrivateOrLoopbackIp(ip));
  if (publicIp) return publicIp;

  const nonLoopbackPrivate = normalized.find((ip) => ip !== '127.0.0.1');
  if (nonLoopbackPrivate) return nonLoopbackPrivate;

  return normalized[0] || '127.0.0.1';
}

/**
 * Extracts and trims the incoming User-Agent header cleanly.
 */
export function extractUserAgent(request: Pick<FastifyRequest, 'headers'>): string | undefined {
  const raw = readHeaderValue(request.headers['user-agent'])?.trim();
  return raw ? raw : undefined;
}

function detectStandardBrowser(raw: string): string {
  // Chromium derivatives must be matched BEFORE Safari/Chrome tokens
  if (/EdgA|EdgiOS|Edg\//i.test(raw)) return 'Microsoft Edge';
  if (/OPR\/|OPiOS\/|OPT\/|Opera/i.test(raw)) return 'Opera';
  if (/SamsungBrowser/i.test(raw)) return 'Samsung Internet';
  if (/YaBrowser/i.test(raw)) return 'Yandex Browser';
  if (/UCBrowser/i.test(raw)) return 'UC Browser';
  if (/DuckDuckGo/i.test(raw)) return 'DuckDuckGo';
  if (/Vivaldi/i.test(raw)) return 'Vivaldi';
  if (/Brave/i.test(raw)) return 'Brave';
  if (/FxiOS|Firefox\//i.test(raw)) return 'Firefox';
  if (/CriOS|Chrome\//i.test(raw)) return 'Google Chrome';
  if (/Safari\//i.test(raw)) return 'Safari';
  return 'Web Browser';
}

/**
 * Parses a raw User-Agent string into normalized device, OS, and browser labels.
 * Fixes Chromium UA token ordering so Edge, Opera, Samsung Internet, etc. are not
 * misclassified as Google Chrome.
 */
export function parseUserAgent(ua?: string | null): ParsedDeviceInfo {
  const raw = (ua || '').trim();
  const lower = raw.toLowerCase();

  if (!raw || lower === 'node' || lower.startsWith('node/')) {
    return {
      displayName: 'Automated Client',
      category: 'api',
      os: 'Node.js Runtime',
      browser: 'HTTP Client',
      fingerprintKey: 'api:node',
      isAutomated: true,
    };
  }

  if (lower.includes('undici') || lower.includes('node-fetch') || lower.includes('axios') || lower.includes('got/')) {
    return {
      displayName: 'API Integration (Node.js)',
      category: 'api',
      os: 'Node.js Runtime',
      browser: 'HTTP Client',
      fingerprintKey: 'api:nodejs-http',
      isAutomated: true,
    };
  }

  if (lower.includes('curl')) {
    return {
      displayName: 'API Client (cURL)',
      category: 'api',
      os: 'Command Line',
      browser: 'cURL',
      fingerprintKey: 'api:curl',
      isAutomated: false,
    };
  }
  if (lower.includes('postman')) {
    return {
      displayName: 'API Client (Postman)',
      category: 'api',
      os: 'Postman',
      browser: 'Postman',
      fingerprintKey: 'api:postman',
      isAutomated: false,
    };
  }
  if (lower.includes('insomnia')) {
    return {
      displayName: 'API Client (Insomnia)',
      category: 'api',
      os: 'Insomnia',
      browser: 'Insomnia',
      fingerprintKey: 'api:insomnia',
      isAutomated: false,
    };
  }
  if (lower.includes('python')) {
    return {
      displayName: 'API Integration (Python)',
      category: 'api',
      os: 'Python Runtime',
      browser: 'Python',
      fingerprintKey: 'api:python',
      isAutomated: false,
    };
  }
  if (lower.includes('go-http-client')) {
    return {
      displayName: 'API Integration (Go)',
      category: 'api',
      os: 'Go Runtime',
      browser: 'Go Client',
      fingerprintKey: 'api:go',
      isAutomated: false,
    };
  }

  // Mobile: iPhone
  if (/iPhone/i.test(raw)) {
    const versionMatch = raw.match(/OS (\d+)[_.](\d+)/i);
    const osVersion = versionMatch ? `iOS ${versionMatch[1]}.${versionMatch[2]}` : 'iOS';
    const browser = detectStandardBrowser(raw);
    return {
      displayName: `iPhone (${osVersion}) · ${browser}`,
      category: 'mobile',
      os: `Apple ${osVersion}`,
      browser,
      fingerprintKey: `mobile:iphone:${browser.toLowerCase()}`,
      isAutomated: false,
    };
  }

  // Tablet: iPad
  if (/iPad/i.test(raw)) {
    const versionMatch = raw.match(/OS (\d+)[_.](\d+)/i);
    const osVersion = versionMatch ? `iPadOS ${versionMatch[1]}` : 'iPadOS';
    const browser = detectStandardBrowser(raw);
    return {
      displayName: `iPad (${osVersion}) · ${browser}`,
      category: 'mobile',
      os: osVersion,
      browser,
      fingerprintKey: `mobile:ipad:${browser.toLowerCase()}`,
      isAutomated: false,
    };
  }

  // Mobile: Android
  if (/Android/i.test(raw)) {
    const androidVerMatch = raw.match(/Android (\d+(?:\.\d+)?)/i);
    const os = androidVerMatch ? `Android ${androidVerMatch[1]}` : 'Android';
    let deviceLabel = 'Android Device';
    if (/Samsung|SM-[A-Z0-9]+/i.test(raw)) deviceLabel = 'Samsung Galaxy';
    else if (/Pixel\s?[0-9a-z]+/i.test(raw)) deviceLabel = 'Google Pixel';
    else if (/Xiaomi|Redmi|POCO/i.test(raw)) deviceLabel = 'Xiaomi Device';
    else if (/TECNO/i.test(raw)) deviceLabel = 'TECNO Device';
    else if (/Infinix/i.test(raw)) deviceLabel = 'Infinix Device';
    else if (/itel/i.test(raw)) deviceLabel = 'itel Device';
    else if (/OPPO|CPH[0-9]+/i.test(raw)) deviceLabel = 'OPPO Device';
    else if (/Vivo/i.test(raw)) deviceLabel = 'Vivo Device';
    else if (/OnePlus/i.test(raw)) deviceLabel = 'OnePlus Device';

    const browser = detectStandardBrowser(raw);
    return {
      displayName: `${deviceLabel} (${os}) · ${browser}`,
      category: 'mobile',
      os,
      browser,
      fingerprintKey: `mobile:android:${deviceLabel.toLowerCase()}:${browser.toLowerCase()}`,
      isAutomated: false,
    };
  }

  // Desktop: Windows
  if (/Windows/i.test(raw)) {
    const os = /Windows NT 10\.0/i.test(raw) ? 'Windows 10/11' : 'Windows';
    const browser = detectStandardBrowser(raw);
    return {
      displayName: `${os} · ${browser}`,
      category: 'desktop',
      os,
      browser,
      fingerprintKey: `desktop:windows:${browser.toLowerCase()}`,
      isAutomated: false,
    };
  }

  // Desktop: macOS
  if (/Macintosh|Mac OS X/i.test(raw)) {
    const os = 'macOS';
    const browser = detectStandardBrowser(raw);
    return {
      displayName: `Mac (${os}) · ${browser}`,
      category: 'desktop',
      os,
      browser,
      fingerprintKey: `desktop:macos:${browser.toLowerCase()}`,
      isAutomated: false,
    };
  }

  // Desktop: ChromeOS
  if (/CrOS/i.test(raw)) {
    const browser = detectStandardBrowser(raw);
    return {
      displayName: `Chromebook · ${browser}`,
      category: 'desktop',
      os: 'ChromeOS',
      browser,
      fingerprintKey: `desktop:chromeos:${browser.toLowerCase()}`,
      isAutomated: false,
    };
  }

  // Desktop: Linux
  if (/Linux/i.test(raw)) {
    const browser = detectStandardBrowser(raw);
    return {
      displayName: `Linux · ${browser}`,
      category: 'desktop',
      os: 'Linux',
      browser,
      fingerprintKey: `desktop:linux:${browser.toLowerCase()}`,
      isAutomated: false,
    };
  }

  const browser = detectStandardBrowser(raw);
  return {
    displayName: browser !== 'Web Browser' ? browser : raw.length > 36 ? `${raw.slice(0, 36)}…` : raw,
    category: 'browser',
    os: 'Web Platform',
    browser,
    fingerprintKey: `browser:${browser.toLowerCase()}`,
    isAutomated: false,
  };
}

/**
 * Removes sensitive or internal upstream fields before returning audit change metadata to clients.
 */
export function sanitizeAuditChanges(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(source)) {
    if (SENSITIVE_AUDIT_KEYS.has(key)) continue;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      cleaned[key] = sanitizeAuditChanges(val);
    } else if (val !== undefined) {
      cleaned[key] = val;
    }
  }

  return cleaned;
}

function formatRoleLabel(role: unknown): string {
  if (typeof role !== 'string' || !role) return 'Member';
  return ROLE_LABELS[role] || role;
}

/**
 * Translates raw backend audit event codes into clear human-readable summaries.
 */
export function describeAuditEvent(entry: {
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  changes?: Record<string, unknown>;
}): AuditEventSummary {
  const c = entry.changes || {};
  const action = (entry.action || 'UNKNOWN').toUpperCase();

  switch (action) {
    case 'USER_REGISTERED':
      return {
        title: 'Account created',
        description: c.businessName
          ? `Registered workspace "${String(c.businessName)}"`
          : 'Completed merchant account registration',
        category: 'auth',
      };
    case 'USER_LOGIN':
      return {
        title: 'Signed in',
        description: c.email ? `Signed in as ${String(c.email)}` : 'Account sign-in',
        category: 'auth',
      };
    case 'STAFF_LOGIN_SUCCESS':
    case 'ADMIN_LOGIN_SUCCESS':
      return {
        title: 'Console sign-in',
        description: c.email ? `Signed in as ${String(c.email)}` : 'Operations sign-in',
        category: 'auth',
      };
    case 'PROFILE_UPDATED': {
      const updatedFields = ['firstName', 'lastName', 'middleName'].filter((k) => c[k]);
      return {
        title: 'Profile updated',
        description:
          updatedFields.length > 0
            ? `Updated profile details`
            : 'Updated account details',
        category: 'profile',
      };
    }
    case 'PASSWORD_CHANGE_REQUESTED':
      return {
        title: 'Password reset code sent',
        description: 'Sent verification code to confirm password change',
        category: 'security',
      };
    case 'PASSWORD_CHANGED':
      return {
        title: 'Password changed',
        description: 'Account password updated',
        category: 'security',
      };
    case 'USER_2FA_EMAIL_REQUESTED':
      return {
        title: '2FA verification code sent',
        description: 'Sent 6-digit email verification code',
        category: 'security',
      };
    case 'USER_2FA_ENABLED': {
      const method = c.method === 'TOTP' ? 'Authenticator App' : 'Email verification';
      return {
        title: 'Two-factor authentication enabled',
        description: `Activated ${method}`,
        category: 'security',
      };
    }
    case 'USER_2FA_DISABLED':
      return {
        title: 'Two-factor authentication turned off',
        description: 'Removed extra sign-in verification step',
        category: 'security',
      };
    case 'KYC_VERIFIED':
      return {
        title: 'Identity verified',
        description: 'Completed NIN verification',
        category: 'profile',
      };
    case 'TEAM_MEMBER_INVITED':
      return {
        title: 'Team member invited',
        description: c.email
          ? `Invited ${String(c.email)} as ${formatRoleLabel(c.role)}`
          : 'Sent workspace invitation',
        category: 'team',
      };
    case 'TEAM_INVITATION_RESENT':
      return {
        title: 'Invitation resent',
        description: c.email ? `Resent invite to ${String(c.email)}` : 'Resent team invitation',
        category: 'team',
      };
    case 'TEAM_INVITATION_REVOKED':
      return {
        title: 'Invitation revoked',
        description: c.email ? `Cancelled invite for ${String(c.email)}` : 'Cancelled pending invitation',
        category: 'team',
      };
    case 'TEAM_MEMBER_ROLE_UPDATED':
      return {
        title: 'Member role updated',
        description:
          c.previousRole && c.newRole
            ? `Changed role from ${formatRoleLabel(c.previousRole)} to ${formatRoleLabel(c.newRole)}`
            : c.newRole
            ? `Updated role to ${formatRoleLabel(c.newRole)}`
            : 'Updated team member permissions',
        category: 'team',
      };
    case 'TEAM_MEMBER_REMOVED':
      return {
        title: 'Team member removed',
        description: c.role
          ? `Removed ${formatRoleLabel(c.role)} from workspace`
          : 'Removed member from workspace',
        category: 'team',
      };
    case 'TEAM_INVITATION_ACCEPTED':
    case 'TEAM_INVITE_ACCEPTED':
      return {
        title: 'Joined workspace',
        description: c.role ? `Accepted invite as ${formatRoleLabel(c.role)}` : 'Accepted workspace invitation',
        category: 'team',
      };
    case 'API_KEY_CREATED':
      return {
        title: 'API key created',
        description: c.name
          ? `${String(c.name)} (${String(c.environment || 'TEST')})`
          : `Created ${String(c.environment || 'TEST')} API key`,
        category: 'developer',
      };
    case 'API_KEY_ROTATED':
      return {
        title: 'API key rotated',
        description: c.name
          ? `Rotated ${String(c.name)} (${String(c.environment || 'TEST')})`
          : 'Rotated API key secret',
        category: 'developer',
      };
    case 'API_KEY_REVOKED':
      return {
        title: 'API key revoked',
        description: c.name
          ? `Revoked ${String(c.name)} (${String(c.environment || 'TEST')})`
          : 'Revoked API key access',
        category: 'developer',
      };
    case 'API_KEY_DELETED':
      return {
        title: 'API key deleted',
        description: c.name ? `Removed ${String(c.name)}` : 'Deleted API key record',
        category: 'developer',
      };
    case 'WEBHOOK_CONFIG_UPDATED':
      return {
        title: 'Webhook updated',
        description: c.environment
          ? `Updated ${String(c.environment)} webhook settings`
          : 'Updated webhook endpoint configuration',
        category: 'developer',
      };
    case 'WEBHOOK_SECRET_REGENERATED':
      return {
        title: 'Webhook signing secret rotated',
        description: 'Generated a new webhook signing secret',
        category: 'developer',
      };
    case 'BUSINESS_UPDATED':
      return {
        title: 'Workspace settings updated',
        description: c.name ? `Updated details for ${String(c.name)}` : 'Updated workspace details',
        category: 'business',
      };
    case 'AIRTIME_PURCHASE':
    case 'AIRTIME_PURCHASE_PROCESSING':
    case 'AIRTIME_PURCHASE_FAILED': {
      const amount = c.amountNaira !== undefined ? `₦${Number(c.amountNaira).toLocaleString()}` : '';
      const network = c.network ? String(c.network) : 'Airtime';
      const recipient = c.recipient ? String(c.recipient) : '';
      const parts = [amount, network, recipient].filter(Boolean).join(' · ');
      return {
        title:
          action === 'AIRTIME_PURCHASE'
            ? 'Airtime purchase completed'
            : action === 'AIRTIME_PURCHASE_PROCESSING'
            ? 'Airtime purchase processing'
            : 'Airtime purchase failed',
        description: parts || 'Airtime transaction',
        category: 'transaction',
      };
    }
    default: {
      const readable = action
        .toLowerCase()
        .split('_')
        .filter(Boolean)
        .map((w, idx) => (idx === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
        .join(' ');
      return {
        title: readable || 'Account event',
        description: entry.resourceType ? `Resource: ${entry.resourceType.toLowerCase()}` : 'Recorded activity event',
        category: 'system',
      };
    }
  }
}

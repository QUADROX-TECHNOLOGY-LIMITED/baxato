import crypto from 'node:crypto';
import net from 'node:net';
import { headers } from 'next/headers';

/**
 * Backend API Client & Proxy Helper for BAXATO Merchant Dashboard
 *
 * Discovers and normalizes the backend Fastify API URL across Coolify, Docker,
 * and local environments, providing actionable diagnostics when misconfigured.
 */

export interface BackendApiConfig {
  url: string | null;
  error?: string;
}

/**
 * Resolves the backend Fastify API base URL from environment variables.
 * In order of priority:
 * 1. API_INTERNAL_URL (Coolify internal Docker network, e.g. http://baxato-api:4000)
 * 2. API_URL (Standard Coolify environment variable, e.g. https://api.baxato.ng)
 * 3. NEXT_PUBLIC_API_URL (Publicly exposed API gateway URL)
 * 4. INTERNAL_API_URL
 * 5. FASTIFY_API_URL
 * 6. BAXATO_API_URL
 */
export function getBackendApiUrl(): BackendApiConfig {
  const candidate =
    process.env.API_INTERNAL_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.INTERNAL_API_URL ||
    process.env.FASTIFY_API_URL ||
    process.env.BAXATO_API_URL;

  if (candidate && candidate.trim()) {
    let clean = candidate.trim().replace(/\/+$/, '');
    // If the base URL ends with /v1, strip it so paths can mount cleanly
    if (clean.endsWith('/v1')) {
      clean = clean.slice(0, -3);
    }
    return { url: clean };
  }

  // Local development outside Docker container
  if (process.env.NODE_ENV !== 'production') {
    return { url: 'http://localhost:4000' };
  }

  // In production / Coolify container: explicit error instead of failing silently on localhost:4000
  return {
    url: null,
    error:
      'Backend API URL is not configured. Please add API_URL to your Coolify Baxato Dashboard environment variables (e.g. API_URL=https://api.yourdomain.com).',
  };
}

export interface ProxyResponse<T = any> {
  status: number;
  data: T;
}

const CLOUDFLARE_IPV4_CIDRS: ReadonlyArray<readonly [number, number]> = [
  [0xadf53000, 20], // 173.245.48.0/20
  [0x6715f400, 22], // 103.21.244.0/22
  [0x6716c800, 22], // 103.22.200.0/22
  [0x671f0400, 22], // 103.31.4.0/22
  [0x8d654000, 18], // 141.101.64.0/18
  [0x6ca2c000, 18], // 108.162.192.0/18
  [0xbe5df000, 20], // 190.93.240.0/20
  [0xbc726000, 20], // 188.114.96.0/20
  [0xc5eaf000, 22], // 197.234.240.0/22
  [0xc6298000, 17], // 198.41.128.0/17
  [0xa29e0000, 15], // 162.158.0.0/15
  [0x68100000, 13], // 104.16.0.0/13
  [0x68180000, 14], // 104.24.0.0/14
  [0xac400000, 13], // 172.64.0.0/13
  [0x83004800, 22], // 131.0.72.0/22
];

function ipv4ToUint32(ip: string): number | null {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
  const [a, b, c, d] = parts as [number, number, number, number];
  return (((a << 24) >>> 0) + (b << 16) + (c << 8) + d) >>> 0;
}

function isCloudflareOrPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    const parts = ip.split('.').map(Number);
    const a = parts[0] ?? 0;
    const b = parts[1] ?? 0;
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127)
    ) {
      return true;
    }
    const intVal = ipv4ToUint32(ip);
    if (intVal !== null) {
      return CLOUDFLARE_IPV4_CIDRS.some(([network, prefix]) => {
        const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
        return (intVal & mask) === (network & mask);
      });
    }
    return false;
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    return lower === '::' || lower === '::1' || /^(fc|fd)/i.test(lower) || /^fe[89ab]/i.test(lower);
  }
  return true;
}

function normalizeClientIpToken(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let candidate = raw.trim().replace(/^["']|["']$/g, '');
  if (!candidate) return null;
  if (candidate.startsWith('[')) {
    const end = candidate.indexOf(']');
    if (end !== -1) candidate = candidate.slice(1, end);
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    candidate = candidate.replace(/:\d+$/, '');
  }
  if (/^::ffff:/i.test(candidate)) {
    candidate = candidate.slice(7);
  }
  if (candidate === '::1') return '127.0.0.1';
  return net.isIP(candidate) > 0 ? candidate : null;
}

function resolveEdgeClientContext(getHeader: (name: string) => string | null): {
  forwardedFor?: string;
  signedHeaders: Record<string, string>;
} {
  const candidates: string[] = [];
  const pushParts = (raw: string | null) => {
    if (!raw) return;
    for (const part of raw.split(',')) {
      const clean = normalizeClientIpToken(part);
      if (clean && !candidates.includes(clean)) {
        candidates.push(clean);
      }
    }
  };

  // Read Cloudflare/proxy headers locally ONLY — never send Cloudflare-reserved
  // headers (cf-connecting-ip, true-client-ip) on outbound requests to API_URL.
  const cfConnectingIp = normalizeClientIpToken(getHeader('cf-connecting-ip'));
  const trueClientIp = normalizeClientIpToken(getHeader('true-client-ip'));
  if (cfConnectingIp) candidates.push(cfConnectingIp);
  if (trueClientIp && !candidates.includes(trueClientIp)) candidates.push(trueClientIp);
  pushParts(getHeader('x-client-ip'));
  pushParts(getHeader('x-forwarded-for'));
  pushParts(getHeader('x-real-ip'));

  const realClientIp =
    cfConnectingIp ||
    trueClientIp ||
    candidates.find((ip) => !isCloudflareOrPrivateIp(ip)) ||
    candidates.find((ip) => ip !== '127.0.0.1') ||
    candidates[0];

  const signedHeaders: Record<string, string> = {};
  const secret =
    process.env.PROXY_IP_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    process.env.JWT_SECRET;

  if (realClientIp && secret) {
    const ts = String(Date.now());
    const sig = crypto
      .createHmac('sha256', secret)
      .update(`${realClientIp}:${ts}`)
      .digest('hex');
    signedHeaders['x-baxato-client-ip'] = realClientIp;
    signedHeaders['x-baxato-client-ts'] = ts;
    signedHeaders['x-baxato-client-sig'] = sig;
  }

  return {
    forwardedFor: candidates.length > 0 ? candidates.join(', ') : undefined,
    signedHeaders,
  };
}

/**
 * Proxies an HTTP request to the Fastify API with error reporting.
 */
export async function proxyToBackendApi<T = any>(
  path: string,
  options: RequestInit,
  incomingRequest?: Request,
): Promise<ProxyResponse<T>> {
  const { url: baseUrl, error: configError } = getBackendApiUrl();

  if (!baseUrl) {
    console.error(`[Backend Proxy Config Error] ${configError}`);
    return {
      status: 500,
      data: {
        success: false,
        error: {
          code: 'BACKEND_URL_NOT_CONFIGURED',
          message: configError,
        },
      } as unknown as T,
    };
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = `${baseUrl}${normalizedPath}`;

  // Forward safe client telemetry (never send Cloudflare-reserved cf-connecting-ip / true-client-ip)
  const clientHeaders: Record<string, string> = {};

  if (incomingRequest) {
    const reqUa = incomingRequest.headers.get('user-agent');
    const reqBiz = incomingRequest.headers.get('x-business-id');
    const edgeCtx = resolveEdgeClientContext((name) => incomingRequest.headers.get(name));
    if (reqUa) clientHeaders['user-agent'] = reqUa;
    if (edgeCtx.forwardedFor) clientHeaders['x-forwarded-for'] = edgeCtx.forwardedFor;
    Object.assign(clientHeaders, edgeCtx.signedHeaders);
    if (reqBiz) clientHeaders['x-business-id'] = reqBiz;
  }

  if (
    !clientHeaders['user-agent'] ||
    !clientHeaders['x-forwarded-for'] ||
    !clientHeaders['x-baxato-client-ip'] ||
    !clientHeaders['x-business-id']
  ) {
    try {
      const h = headers();
      if (!clientHeaders['user-agent']) {
        const ua = h.get('user-agent');
        if (ua) clientHeaders['user-agent'] = ua;
      }
      if (!clientHeaders['x-forwarded-for'] || !clientHeaders['x-baxato-client-ip']) {
        const edgeCtx = resolveEdgeClientContext((name) => h.get(name));
        if (!clientHeaders['x-forwarded-for'] && edgeCtx.forwardedFor) {
          clientHeaders['x-forwarded-for'] = edgeCtx.forwardedFor;
        }
        if (!clientHeaders['x-baxato-client-ip']) {
          Object.assign(clientHeaders, edgeCtx.signedHeaders);
        }
      }
      if (!clientHeaders['x-business-id']) {
        const biz = h.get('x-business-id');
        if (biz) clientHeaders['x-business-id'] = biz;
      }
    } catch {
      // headers() not available in background or static build context
    }
  }

  const method = (options.method || 'GET').toUpperCase();
  const isMutation = ['POST', 'PUT', 'PATCH'].includes(method);
  let resolvedBody = options.body;
  if (isMutation && (resolvedBody === undefined || resolvedBody === null || resolvedBody === '')) {
    resolvedBody = JSON.stringify({});
  }

  try {
    const res = await fetch(targetUrl, {
      ...options,
      body: resolvedBody,
      headers: {
        'Content-Type': 'application/json',
        ...clientHeaders,
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.warn(`[Backend Proxy] Request to ${targetUrl} returned HTTP ${res.status}:`, data);
      return {
        status: res.status,
        data: data || ({
          success: false,
          error: {
            code: 'API_ERROR',
            message: `Backend API responded with status ${res.status}`,
          },
        } as unknown as T),
      };
    }

    return {
      status: 200,
      data,
    };
  } catch (err: unknown) {
    const rawError = err instanceof Error ? err.message : String(err);
    console.error(`[Backend Proxy Network Error] Failed to reach ${targetUrl}:`, rawError);

    let diagnosticMessage = `Unable to connect to BAXATO backend API (${targetUrl}).`;
    if (rawError.includes('ECONNREFUSED') || rawError.includes('fetch failed')) {
      diagnosticMessage = `Could not reach BAXATO backend API at ${baseUrl}. Please verify the API container is running and API_URL in Coolify Dashboard environment variables is configured correctly.`;
    }

    return {
      status: 502,
      data: {
        success: false,
        error: {
          code: 'BACKEND_UNREACHABLE',
          message: diagnosticMessage,
          details: rawError,
        },
      } as unknown as T,
    };
  }
}

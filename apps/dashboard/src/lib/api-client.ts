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

/**
 * Proxies an HTTP request to the Fastify API with error reporting.
 */
export async function proxyToBackendApi<T = any>(
  path: string,
  options: RequestInit,
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

  try {
    const res = await fetch(targetUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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

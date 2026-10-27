/**
 * Unified Authentication & Session Management for BAXATO Dashboards
 *
 * Ensures consistent handling of JWT bearer tokens, user profiles, token expiration,
 * and automatic redirection to each respective login portal (/admin/login, /staff/login, or /login)
 * whenever a session expires, is invalid, or returns an HTTP 401.
 */

export interface StoredUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  kycStatus?: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';
  phone?: string;
}

export interface StoredBusiness {
  id: string;
  name: string;
  slug?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  rcNumber?: string;
  bvn?: string;
}

/**
 * Safely decodes the payload of a standard JWT without external dependencies.
 */
export function parseJwtPayload(token: string): Record<string, any> | null {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Checks if a JWT bearer token is missing, malformed, or past its expiration timestamp.
 */
export function isTokenExpired(token?: string | null): boolean {
  if (!token || typeof token !== 'string' || !token.trim()) return true;
  const payload = parseJwtPayload(token);
  if (!payload) return true;
  if (!payload.exp) return false;
  // exp is in seconds; apply a 5-second buffer for network/clock skew
  const nowSeconds = Math.floor(Date.now() / 1000);
  return nowSeconds >= Number(payload.exp) - 5;
}

/**
 * Retrieves the cached JWT bearer token from localStorage.
 */
export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('bx_auth_token');
  } catch {
    return null;
  }
}

/**
 * Retrieves a verified, unexpired JWT bearer token from localStorage.
 * If expired or missing, cleans local storage and returns null.
 */
export function getValidAuthToken(): string | null {
  const token = getStoredAuthToken();
  if (!token || isTokenExpired(token)) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('bx_auth_token');
        localStorage.removeItem('bx_user');
        localStorage.removeItem('bx_business');
      } catch {}
    }
    return null;
  }
  return token;
}

/**
 * Retrieves the cached user profile from localStorage.
 */
export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('bx_user');
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

/**
 * Retrieves the cached business profile from localStorage.
 */
export function getStoredBusiness(): StoredBusiness | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('bx_business');
    return raw ? (JSON.parse(raw) as StoredBusiness) : null;
  } catch {
    return null;
  }
}

/**
 * Updates the active business profile (and optionally token) in localStorage,
 * and notifies listening components via a window event.
 */
export function setActiveBusiness(biz: StoredBusiness, token?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('bx_business', JSON.stringify(biz));
    if (token) {
      localStorage.setItem('bx_auth_token', token);
    }
    if (biz.role) {
      const userRaw = localStorage.getItem('bx_user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        u.role = biz.role;
        localStorage.setItem('bx_user', JSON.stringify(u));
      }
    }
    window.dispatchEvent(new CustomEvent('bx_business_switched', { detail: { business: biz } }));
  } catch {}
}

/**
 * Resolves the destination login URL according to the current dashboard workspace.
 */
export function getDestinationLoginPath(currentPath?: string): string {
  const path = currentPath || (typeof window !== 'undefined' ? window.location.pathname : '/');
  if (path.startsWith('/admin')) {
    return '/admin/login';
  }
  if (path.startsWith('/staff')) {
    return '/staff/login';
  }
  return '/login';
}

/**
 * Clears all auth session data and immediately redirects the user to the appropriate login page.
 */
export function clearSessionAndRedirect(reason: 'expired' | 'unauthorized' | 'logout' = 'expired'): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('bx_auth_token');
    localStorage.removeItem('bx_user');
    localStorage.removeItem('bx_business');
    document.cookie = 'bx_auth_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  } catch {}

  const currentPath = window.location.pathname;
  const loginPath = getDestinationLoginPath(currentPath);
  const queryParam = reason === 'logout' ? '' : reason === 'unauthorized' ? '?unauthorized=true' : '?expired=true';
  const target = `${loginPath}${queryParam}`;

  // Prevent navigation loops if already on a login route
  if (
    !currentPath.startsWith('/login') &&
    !currentPath.startsWith('/staff/login') &&
    !currentPath.startsWith('/admin/login')
  ) {
    try {
      window.location.replace(target);
    } catch {
      window.location.href = target;
    }
  }
}

/**
 * Detects whether an HTTP response status or body indicates an invalid/expired session.
 */
export function isAuthError(status: number, data?: any): boolean {
  if (status === 401) return true;

  const code = (data?.error?.code || data?.code || '').toString().toUpperCase();
  if (
    code === 'UNAUTHORIZED' ||
    code === 'AUTHENTICATION_REQUIRED' ||
    code === 'TOKEN_EXPIRED' ||
    code === 'INVALID_TOKEN' ||
    code === 'JWT_EXPIRED'
  ) {
    return true;
  }

  const msg = (data?.error?.message || data?.message || '').toString().toLowerCase();
  if (
    msg.includes('expired authentication session') ||
    msg.includes('invalid or expired') ||
    msg.includes('session token') ||
    msg.includes('authentication required') ||
    msg.includes('jwt expired') ||
    msg.includes('unauthorized') ||
    msg.includes('jwt malformed') ||
    msg.includes('invalid token')
  ) {
    return true;
  }

  return false;
}

/**
 * Inspects a response and automatically redirects to the respective login page if expired or unauthorized.
 * Returns true if an auth error was detected and handled, false otherwise.
 */
export function handleAuthResponse(res: Response, data?: any): boolean {
  if (isAuthError(res.status, data)) {
    clearSessionAndRedirect('expired');
    return true;
  }
  return false;
}

declare global {
  interface Window {
    __bx_auth_interceptor_installed?: boolean;
  }
}

/**
 * Installs a global fetch interceptor that catches any 401/unauthorized API response
 * and immediately executes clearSessionAndRedirect to bounce the user to their role's login page.
 */
export function installGlobalAuthInterceptor(): void {
  if (typeof window === 'undefined') return;
  if (window.__bx_auth_interceptor_installed) return;
  window.__bx_auth_interceptor_installed = true;

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : '';

    if (response.status === 401 && (url.includes('/api/') || url.startsWith('/api'))) {
      const currentPath = window.location.pathname;
      const isLoginRoute =
        currentPath.startsWith('/login') ||
        currentPath.startsWith('/admin/login') ||
        currentPath.startsWith('/staff/login');

      if (!isLoginRoute) {
        try {
          const clone = response.clone();
          const data = await clone.json().catch(() => null);
          if (isAuthError(response.status, data)) {
            clearSessionAndRedirect('expired');
          }
        } catch {
          clearSessionAndRedirect('expired');
        }
      }
    }
    return response;
  };
}

// Automatically install in browser runtime on module import
if (typeof window !== 'undefined') {
  installGlobalAuthInterceptor();
}

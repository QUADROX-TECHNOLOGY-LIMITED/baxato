/**
 * Unified Authentication & Session Management for BAXATO Merchant Dashboard
 *
 * Ensures consistent handling of JWT bearer tokens, user profiles, token expiration,
 * and automatic redirection to /login when sessions expire or 401s occur.
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
  rcNumber?: string;
  bvn?: string;
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
 * Clears all auth session data and immediately redirects the user to /login.
 */
export function clearSessionAndRedirect(reason: 'expired' | 'unauthorized' | 'logout' = 'expired'): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('bx_auth_token');
    localStorage.removeItem('bx_user');
    localStorage.removeItem('bx_business');
  } catch {}

  const isStaffPath = window.location.pathname.startsWith('/staff') || window.location.pathname.startsWith('/admin');
  const loginPath = isStaffPath ? '/staff/login' : '/login';
  const target = reason === 'logout' ? loginPath : `${loginPath}?expired=true`;
  if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/staff/login')) {
    window.location.href = target;
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
    code === 'INVALID_TOKEN'
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
    msg.includes('unauthorized')
  ) {
    return true;
  }

  return false;
}

/**
 * Inspects a response and automatically redirects to /login if expired or unauthorized.
 * Returns true if an auth error was detected and handled, false otherwise.
 */
export function handleAuthResponse(res: Response, data?: any): boolean {
  if (isAuthError(res.status, data)) {
    clearSessionAndRedirect('expired');
    return true;
  }
  return false;
}

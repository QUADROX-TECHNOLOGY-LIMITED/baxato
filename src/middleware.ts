import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Must match the secret in src/modules/auth/session.ts
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_must_change_in_production'
);

export async function middleware(req: NextRequest) {
  // 1. Extract tokens from HTTP-only cookies
  const accessToken = req.cookies.get('baxato_access')?.value;
  const refreshToken = req.cookies.get('baxato_refresh')?.value;
  
  const { pathname } = req.nextUrl;
  
  // Define route types
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isProtectedRoute = pathname.startsWith('/dashboard');

  let isValidAccess = false;
  
  // 2. Cryptographically verify the Access Token on the Edge
  if (accessToken) {
    try {
      await jwtVerify(accessToken, JWT_SECRET);
      isValidAccess = true;
    } catch (err) {
      // Token is expired, malformed, or tampered with
      isValidAccess = false;
    }
  }

  // 3. Routing Logic: Protect the Dashboard
  if (isProtectedRoute) {
    // If they have no valid access token and no refresh token, kick them to login
    if (!isValidAccess && !refreshToken) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    
    // NOTE: If isValidAccess is false BUT refreshToken exists, we let them through.
    // The Dashboard's root layout.tsx (a Server Component) will handle querying Prisma 
    // to validate the refresh token and issue a fresh pair of cookies.
  }

  // 4. Routing Logic: Keep logged-in users away from auth pages
  if (isAuthRoute) {
    if (isValidAccess || refreshToken) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

// 5. Configure which paths trigger this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

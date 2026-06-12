import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_must_change_in_production'
);

export async function middleware(req: NextRequest) {
  const accessToken = req.cookies.get('baxato_access')?.value;
  const { pathname, searchParams } = req.nextUrl;
  
  // 1. THE LOOP BREAKER: If layout.tsx kicks the user, destroy cookies and strip the URL
  if (searchParams.get('clear_session') === 'true') {
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.delete('baxato_access');
    response.cookies.delete('baxato_refresh');
    return response;
  }

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isProtectedRoute = pathname.startsWith('/dashboard');

  let isValidAccess = false;
  
  // 2. Verify the Token
  if (accessToken) {
    try {
      await jwtVerify(accessToken, JWT_SECRET);
      isValidAccess = true;
    } catch (err) {
      isValidAccess = false;
    }
  }

  // 3. Routing Logic: Protect Dashboard
  if (isProtectedRoute) {
    if (!isValidAccess) {
      // Send them to login but clear any stale cookies
      return NextResponse.redirect(new URL('/login?clear_session=true', req.url));
    }
  }

  // 4. Routing Logic: Keep logged-in users away from auth pages
  if (isAuthRoute) {
    if (isValidAccess) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

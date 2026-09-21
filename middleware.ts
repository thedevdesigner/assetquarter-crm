import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect all routes starting with /dashboard
  if (path.startsWith('/dashboard')) {
    const authCookie = request.cookies.get('admin_session');
    
    // If no session cookie exists, redirect back to the root login page
    if (!authCookie || authCookie.value !== 'authenticated') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
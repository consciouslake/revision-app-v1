import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Get the path
    const path = request.nextUrl.pathname;

    // Define public paths that don't need authentication
    const isPublicPath =
        path === '/login' ||
        path.startsWith('/api/auth') ||
        path.startsWith('/_next') ||
        path.startsWith('/static') ||
        path.includes('favicon.ico');

    // Check for the auth cookie
    const token = request.cookies.get('auth_token')?.value;

    // 1. If user is NOT logged in and tries to access a protected route
    if (!isPublicPath && !token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 2. If user IS logged in and tries to access the login page
    if (path === '/login' && token) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (API routes for login/logout)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
    ],
};

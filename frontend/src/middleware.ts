import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * CampusOS Next.js 15 Middleware - RBAC Hardening & Auth Protection
 * Enforces server-side route guards based on cookies set by the Auth Store.
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get('campusos_token');
  const role = request.cookies.get('campusos_role')?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isDashboardPage = pathname.startsWith('/dashboard');

  // 1. Initial Identity Check: Kick out unauthenticated users from dashboard
  if (isDashboardPage && !token) {
    const loginUrl = new URL('/login', request.url);
    // Don't append callback if current is dashboard root or has special logic
    return NextResponse.redirect(loginUrl);
  }

  // 2. Prevent authenticated users from returning to login/register
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. RBAC Enforcement (System Hardening)
  if (isDashboardPage && role) {
    
    // Strict Governance Hub Protection
    if (pathname.startsWith('/dashboard/users')) {
       if (role !== 'super_admin' && role !== 'department_admin') {
         console.warn(`[SECURITY] Forbidden access to User Management by role: ${role}`);
         return NextResponse.redirect(new URL('/dashboard', request.url));
       }
    }

    // New Governance Approval Tier (Super Admin only)
    if (pathname.startsWith('/dashboard/governance')) {
       if (role !== 'super_admin') {
         console.warn(`[SECURITY] Forbidden access to Governance Module by role: ${role}`);
         return NextResponse.redirect(new URL('/dashboard', request.url));
       }
    }

    // Analytics Data Protection
    if (pathname.startsWith('/dashboard/analytics')) {
       if (role !== 'super_admin' && role !== 'department_admin') {
         return NextResponse.redirect(new URL('/dashboard', request.url));
       }
    }
  }

  return NextResponse.next();
}

/**
 * Route Matcher Configuration
 * Targets all dashboard paths and auth entry points.
 */
export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/login', 
    '/register'
  ],
};

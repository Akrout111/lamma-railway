import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createNextIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Combined middleware: Clerk (auth) + next-intl (i18n).
 *
 * Order matters: intl runs first to set the locale, then Clerk protects
 * private routes. Public routes (/, /sign-in, /api/v1/health, etc.) are
 * always accessible without authentication.
 */

const intlMiddleware = createNextIntlMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/v1/health',
  '/api/v1/ai/(.*)', // AI endpoints may be public for demo
  '/api/webhooks/clerk',
  '/api/v1/csrf-token',
]);

const isIntlRoute = createRouteMatcher([
  '/((?!api|_next|_vercel|sign-in|sign-up|.*\\..*).*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // 1. Apply next-intl for locale-aware routes
  let response;
  if (isIntlRoute(req)) {
    response = intlMiddleware(req);
  }

  // 2. Protect non-public routes
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  return response ?? undefined;
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|_vercel|.*\\..*).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

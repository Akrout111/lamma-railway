import createNextIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Combined middleware: Clerk (auth) + next-intl (i18n).
 *
 * PROD-ONLY: Clerk middleware is temporarily disabled to fix
 * "Application failed to respond" errors caused by Clerk SSR issues.
 * Re-enable once the publishable key is available at build time.
 *
 * import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
 * const isPublicRoute = createRouteMatcher([...]);
 */

const intlMiddleware = createNextIntlMiddleware(routing);

export default intlMiddleware;

export const config = {
  matcher: [
    // Skip API routes, Next.js internals, and static files
    '/((?!api|_next|_vercel|sign-in|sign-up|.*\\..*).*)',
  ],
};

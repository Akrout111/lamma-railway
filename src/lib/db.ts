import { PrismaClient } from '@prisma/client';

/**
 * Lamma database client (Phase B — PostgreSQL via Supabase).
 *
 * Production: connects to Supabase via Transaction pooler (port 6543).
 * The `connection_limit=1` parameter is added automatically when
 * `pgbouncer=true` is detected, to avoid connection exhaustion with
 * PgBouncer/Supavisor.
 *
 * Development: connects to a local PostgreSQL or Supabase preview.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const datasourceUrl = process.env.DATABASE_URL ?? '';

// Add connection_limit=1 for PgBouncer compatibility (Supabase Transaction pooler)
const optimizedUrl =
  datasourceUrl.includes('pgbouncer=true') && !datasourceUrl.includes('connection_limit')
    ? `${datasourceUrl}&connection_limit=1&pool_timeout=10`
    : datasourceUrl;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['query', 'error', 'warn'],
    datasources: {
      db: { url: optimizedUrl },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

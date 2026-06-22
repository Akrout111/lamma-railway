# ============================================================
# Lamma — Railway Production Dockerfile
# Multi-stage build for Next.js (standalone) + Live Companion
# Based on: /reference/GLM-5.2-Assistant-Operations-Reference.md
# ============================================================

# ==========================================
# Stage 1: deps — install ALL dependencies
# ==========================================
FROM oven/bun:1-slim AS deps
WORKDIR /app

# Copy lockfiles first (cache layer)
# NOTE: Bun 1.2+ uses `bun.lock` (text-based) instead of `bun.lockb` (binary).
# If both exist, prefer `bun.lock` (the newer format).
COPY package.json bun.lock ./

# Install all deps (including devDependencies for build)
RUN bun install --frozen-lockfile

# ==========================================
# Stage 2: builder — build Next.js + Live Companion
# ==========================================
FROM oven/bun:1-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1

# Generate Prisma client (required before next build)
RUN bun ./node_modules/prisma/build/index.js generate

# Build Next.js standalone
RUN bun run build

# Install live-companion deps
RUN cd mini-services/live-companion && bun install --production

# ==========================================
# Stage 3: prod-deps — production deps only (with transitive)
# ==========================================
FROM oven/bun:1-slim AS prod-deps
WORKDIR /app

COPY package.json bun.lock ./

# Install production deps WITH transitive deps (ignore-scripts avoids native rebuilds)
RUN bun install --production --frozen-lockfile --ignore-scripts

# Copy generated Prisma client from builder (avoid regenerating in prod)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# ==========================================
# Stage 4: runner — final minimal image
# ==========================================
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV LIVE_COMPANION_PORT=3003

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Create writable db directory (for SQLite fallback during dev/preview)
RUN mkdir -p /app/db && chown nextjs:nodejs /app/db

# Copy Next.js standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy production node_modules + Prisma
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --chown=nextjs:nodejs prisma ./prisma
COPY --chown=nextjs:nodejs package.json ./package.json

# Copy Live Companion mini-service
COPY --from=builder --chown=nextjs:nodejs /app/mini-services ./mini-services

USER nextjs

# Railway exposes ports via EXPOSE
EXPOSE 3000
# Note: 3003 (Live Companion) is internal-only, not exposed externally

# Use ; (not &&) between migrate and server so server starts even if migration fails
# This is critical: a failed migration should NOT prevent the server from booting
# (allows debugging via /api/v1/health + Railway logs)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Start both services: Next.js (port 3000) + Live Companion (port 3003)
# IMPORTANT: Use `bun server.js` (not `node server.js`) because the base image
# `oven/bun:1-slim` does NOT include Node.js — only Bun.
# Phase B: uses `migrate deploy` (not `db push`) to apply committed migrations.
CMD ["sh", "-c", "echo '=== Lamma startup (Phase B) ===' && echo \"DATABASE_URL: $([ -n \\\"$DATABASE_URL\\\" ] && echo set || echo NOT SET)\" && echo \"DIRECT_URL: $([ -n \\\"$DIRECT_URL\\\" ] && echo set || echo NOT SET)\" && echo \"NODE_ENV: $NODE_ENV\" && bun ./node_modules/prisma/build/index.js migrate deploy ; bun server.js & cd mini-services/live-companion && bun run start & wait"]

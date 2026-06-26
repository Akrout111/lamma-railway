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
# NOTE: --frozen-lockfile is intentionally omitted because the lockfile
# may be out of sync with package.json after Phase B dependency additions.
# Bun will update the lockfile during build (safe in isolated CI environment).
RUN bun install

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

# NEXT_PUBLIC_* vars are inlined by Next.js at build time, so they MUST be
# available during `next build`. Railway passes all variables as Docker build
# args automatically. We accept them here and export as ENV.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL

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
# NOTE: --frozen-lockfile omitted (same reason as deps stage above).
RUN bun install --production --ignore-scripts

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
# Do NOT set PORT — Railway injects it automatically at runtime.
# Next.js standalone server.js reads process.env.PORT.
ENV HOSTNAME=0.0.0.0
ENV LIVE_COMPANION_PORT=3003

# Create non-root user
# NOTE: oven/bun:1-slim is based on Debian slim which does NOT include
# `addgroup`/`adduser`. Use `groupadd`/`useradd` (from `passwd` package)
# which are always available.
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --home-dir /app --shell /usr/sbin/nologin nextjs

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

# Copy env injection script (replaces NEXT_PUBLIC_* placeholders at runtime)
COPY --chown=nextjs:nodejs scripts/inject-env.sh ./scripts/inject-env.sh
RUN chmod +x ./scripts/inject-env.sh

USER nextjs

# Railway auto-detects port from EXPOSE or PORT env var.
# EXPOSE 8080 helps Railway route healthcheck traffic correctly.
EXPOSE 8080

# Start Next.js server only.
CMD ["sh", "-c", "echo '=== Lamma startup ===' && echo \"PORT: $PORT\" && exec bun server.js"]

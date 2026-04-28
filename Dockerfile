# syntax=docker/dockerfile:1.7
#
# Callboard API — production image.
# Two stages: builder (full deps, tsoa + tsc + prisma generate) → runtime (slim).

# ─── builder ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
ENV NODE_ENV=development
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/callboard

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

# Schema first so `prisma generate` can produce the client.
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Source + config, then build (tsoa spec-and-routes, then tsc).
COPY tsconfig.json tsoa.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

# ─── runtime ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat tini curl

# Keep node_modules from builder so the prisma CLI is available at container
# startup to run `prisma migrate deploy`. Adds ~150MB; acceptable tradeoff for
# correctness and simpler ops.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/scripts ./scripts
COPY package.json ./

RUN addgroup -S callboard && adduser -S callboard -G callboard \
    && chown -R callboard:callboard /app
USER callboard

EXPOSE 3000

# tini reaps zombies and forwards signals so SIGTERM from Coolify/Docker
# cleanly shuts down Express.
ENTRYPOINT ["/sbin/tini", "--"]

# Apply any pending migrations, then start the API.
# If a migration fails, the container exits and Coolify keeps the old one
# serving traffic — prod stays up, deploy is stuck until you fix forward.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]

### ────────────────────────────────────────────────────────────────
### Stage 1: Dependencies + Build
### ────────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy manifests first for better layer caching.
# pnpm install is re-run only when these files change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/prisma/package.json  ./packages/prisma/
COPY packages/shared/package.json  ./packages/shared/
COPY apps/be-multipass/package.json ./apps/be-multipass/

RUN pnpm install --frozen-lockfile

# Copy source after deps are cached
COPY packages/ ./packages/
COPY apps/be-multipass/ ./apps/be-multipass/

# Generate Prisma Client (writes schema-specific JS into node_modules/@prisma/client)
RUN pnpm --filter @multipass/prisma db:generate

# Compile NestJS with SWC → apps/be-multipass/dist/
RUN pnpm --filter @multipass/be-multipass build

### ────────────────────────────────────────────────────────────────
### Stage 2: Production image
### ────────────────────────────────────────────────────────────────
FROM node:24-alpine AS production

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/prisma/package.json  ./packages/prisma/
COPY packages/shared/package.json  ./packages/shared/
COPY apps/be-multipass/package.json ./apps/be-multipass/

# Install all deps (including prisma CLI needed for migrate:deploy at deploy time)
RUN pnpm install --frozen-lockfile

# Copy workspace package sources (needed at runtime for @multipass/prisma exports)
COPY packages/prisma/src        ./packages/prisma/src
COPY packages/prisma/schema.prisma   ./packages/prisma/
COPY packages/prisma/prisma.config.ts ./packages/prisma/
COPY packages/prisma/migrations      ./packages/prisma/migrations
COPY packages/shared/src        ./packages/shared/src

# Generate Prisma Client in this stage's node_modules
RUN pnpm --filter @multipass/prisma db:generate

# Copy compiled application output from builder
COPY --from=builder /app/apps/be-multipass/dist ./apps/be-multipass/dist

WORKDIR /app/apps/be-multipass

EXPOSE 4000

CMD ["node", "dist/main.js"]

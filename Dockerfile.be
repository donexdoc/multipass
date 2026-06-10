### ────────────────────────────────────────────────────────────────
### Stage 1: Install dependencies (shared base for builder + runtime)
### pnpm install runs ONCE; both subsequent stages reuse these layers.
### --mount=type=cache keeps the pnpm store off the image layers,
### so the store is not re-downloaded on each pipeline run.
### ────────────────────────────────────────────────────────────────
FROM node:24-alpine AS deps

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/prisma/package.json  ./packages/prisma/
COPY packages/shared/package.json  ./packages/shared/
COPY apps/be-multipass/package.json ./apps/be-multipass/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

### ────────────────────────────────────────────────────────────────
### Stage 2: Compile TypeScript
### ────────────────────────────────────────────────────────────────
FROM deps AS builder

COPY packages/ ./packages/
COPY apps/be-multipass/ ./apps/be-multipass/

RUN pnpm --filter @multipass/prisma db:generate

RUN pnpm --filter @multipass/be-multipass build && \
    test -f apps/be-multipass/dist/main.js || \
    (echo "ERROR: dist/main.js not found after build!" && exit 1)

### ────────────────────────────────────────────────────────────────
### Stage 3: Production image
### Reuses node_modules from the deps stage — no second pnpm install.
### ────────────────────────────────────────────────────────────────
FROM deps AS production

ENV NODE_ENV=production

# Copy workspace package sources (needed at runtime for @multipass/prisma exports)
COPY packages/prisma/src          ./packages/prisma/src
COPY packages/prisma/schema.prisma    ./packages/prisma/
COPY packages/prisma/prisma.config.ts ./packages/prisma/
COPY packages/prisma/migrations       ./packages/prisma/migrations
COPY packages/shared/src          ./packages/shared/src

# Generate Prisma Client in this stage's node_modules
RUN pnpm --filter @multipass/prisma db:generate

# Copy compiled application output from builder
COPY --from=builder /app/apps/be-multipass/dist ./apps/be-multipass/dist

WORKDIR /app/apps/be-multipass

EXPOSE 4000

CMD ["node", "dist/main.js"]

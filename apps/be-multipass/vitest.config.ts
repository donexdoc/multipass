import { defineConfig } from 'vitest/config'
import swc from 'unplugin-swc'

export default defineConfig({
  plugins: [
    // @ts-expect-error — unplugin-swc is typed against vite@5; the monorepo also
    // has vite@6 (fe-multipass), causing a Plugin type mismatch in pnpm's store.
    // The plugin works correctly at runtime — only a cosmetic type conflict.
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    globals: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    include: ['test/e2e/**/*.e2e-spec.ts', 'test/unit/**/*.spec.ts'],
    server: {
      deps: {
        inline: ['cron'],
      },
    },
    env: {
      // In CI: set DATABASE_URL to point to the service container (e.g. @postgres:5432).
      // Locally: defaults to the docker-compose dev database.
      DATABASE_URL:
        process.env['DATABASE_URL'] ??
        'postgresql://multipass:password@localhost:5432/multipass',
      ADMIN_LOGIN: process.env['ADMIN_LOGIN'] ?? 'admin',
      ADMIN_PASSWORD: process.env['ADMIN_PASSWORD'] ?? 'Admin123!',
      JWT_SECRET: process.env['JWT_SECRET'] ?? 'test-secret',
      JWT_REFRESH_SECRET: process.env['JWT_REFRESH_SECRET'] ?? 'test-refresh-secret',
    },
  },
})

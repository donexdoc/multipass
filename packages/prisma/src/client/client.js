// JavaScript re-export wrapper for production runtime (Node.js cannot load .ts files).
// TypeScript uses client.ts for type-checking (via "types" export condition).
// Node.js uses this file at runtime (via "default" export condition).
export { PrismaClient } from '@prisma/client'
export * from '@prisma/client'

import { PrismaClient } from '@prisma/client';
import { isProduction } from '@/config/env';

// Reuse a single PrismaClient instance across hot-reloads in dev.
// We type it as `any` so TypeScript does not require full Prisma.Client types
// to be generated (which depends on `prisma generate` after a schema migration).
// At runtime Prisma is fully functional.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let instance: any;

function createPrisma(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (PrismaClient as any)({
    log: isProduction ? ['error', 'warn'] : ['error', 'warn'],
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma: any = instance ?? createPrisma();

if (!isProduction) {
  (globalThis as any).__prisma__ = prisma;
}

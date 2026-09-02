import { PrismaClient } from '@prisma/client';
import { isProduction } from '@/config/env';

// Reuse a single PrismaClient instance across hot-reloads in dev.
// We type it as `any` so TypeScript does not require full Prisma.Client types
// to be generated (which depends on `prisma generate` after a schema migration).
// At runtime Prisma is fully functional.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = globalThis as unknown as { __prisma__?: any };

function createPrisma(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (PrismaClient as any)({
    log: isProduction ? ['error', 'warn'] : ['error', 'warn'],
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma: any = globalForPrisma.__prisma__ ?? createPrisma();

if (!isProduction) {
  globalForPrisma.__prisma__ = prisma;
}


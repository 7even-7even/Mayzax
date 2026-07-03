import { PrismaClient } from '@prisma/client';
import { isProduction } from '@/config/env';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

// Reuse a single PrismaClient instance across hot-reloads in dev
export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: isProduction ? ['error', 'warn'] : ['error', 'warn'],
  });

if (!isProduction) {
  global.__prisma__ = prisma;
}

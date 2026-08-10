import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  envDir: path.resolve(__dirname, '../backend'),
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../backend/src'),
      '@prisma/client': path.resolve(__dirname, '../backend/node_modules/@prisma/client'),
      'bcryptjs': path.resolve(__dirname, '../backend/node_modules/bcryptjs'),
      'jsonwebtoken': path.resolve(__dirname, '../backend/node_modules/jsonwebtoken'),
    },
  },
});

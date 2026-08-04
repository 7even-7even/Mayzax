import { createApp } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { getQueue, stopQueue } from '@/lib/queue';
import { getFirebaseApp } from '@/lib/firebase';
import { registerJobProcessors, startPeriodicJobs } from '@/jobs/processors';
import { ensureDefaultShiftConfig } from '@/modules/shifts/shift.service';

async function main() {
  const app = createApp();

  await prisma.$connect();
  logger.info('✅ Database connected');

  // Ensure a default shift config exists (idempotent)
  await ensureDefaultShiftConfig().catch((err) => {
    logger.error({ err }, 'Failed to ensure default shift config');
  });

  // Initialize queue subsystem (BullMQ or node-cron fallback)
  await getQueue();
  try {
    await registerJobProcessors();
    startPeriodicJobs();
  } catch (err) {
    logger.error({ err }, 'Failed to register/start background job processors');
  }

  // Initialize Firebase Admin (no-op if not configured)
  getFirebaseApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Mayzax ATS API running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`   API base: http://localhost:${env.PORT}${env.API_PREFIX}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await stopQueue().catch(() => {});
      await prisma.$disconnect();
      logger.info('Shutdown complete.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    if (reason instanceof Error) {
      logger.error({ err: reason, message: reason.message, stack: reason.stack }, 'Unhandled promise rejection');
      return;
    }
    logger.error({ reason }, 'Unhandled promise rejection');
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

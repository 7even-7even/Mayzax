import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { env, isProduction } from '@/config/env';
import { createDailyRotatingStream } from '@/lib/daily-log-stream';

/**
 * Application-wide logger.
 * ------------------------------------------------------------------
 * Every log line is written to BOTH:
 *   1. A daily-rotating file at `${LOGS_DIR}/YYYY-MM-DD.log` (always,
 *      in every environment) - raw JSON, one line per log entry.
 *   2. stdout - pretty/colorized in development, raw JSON in production
 *      (so production log shippers can parse it structurally).
 * ------------------------------------------------------------------
 */

const dailyFileStream = createDailyRotatingStream(env.LOGS_DIR);

const consoleStream = isProduction
  ? { stream: process.stdout }
  : {
      stream: pinoPretty({
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      }),
    };

export const logger = pino(
  {
    level: env.LOG_LEVEL,
    base: { service: 'mayzax-ats-api' },
  },
  pino.multistream([consoleStream, { stream: dailyFileStream, level: env.LOG_LEVEL }]),
);

export const logsDirectory = dailyFileStream.directory;

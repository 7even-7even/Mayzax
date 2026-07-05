import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from '@/config/env';
import { requestLogger } from '@/middleware/requestLogger';
import { globalRateLimiter } from '@/middleware/rateLimiter';
import { notFoundHandler, errorHandler } from '@/middleware/errorHandler';
import apiRouter from '@/routes';

const allowedOrigins = [
  env.CLIENT_URL,
  ...(env.ADDITIONAL_CORS_ORIGINS ? env.ADDITIONAL_CORS_ORIGINS.split(',').map((o) => o.trim()) : []),
].filter(Boolean);

function isAllowedOrigin(origin: string) {
  if (allowedOrigins.includes(origin)) return true;

  if (env.NODE_ENV === 'development') {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  }

  return false;
}

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin/non-browser requests (no Origin header, e.g. curl, health checks)
        if (!origin) return callback(null, true);
        if (isAllowedOrigin(origin)) return callback(null, true);
        callback(new Error(`CORS: origin "${origin}" is not allowed`));
      },
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(globalRateLimiter);

  // API versioning: all routes mounted under API_PREFIX (e.g. /api/v1)
  app.use(env.API_PREFIX, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

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

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
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

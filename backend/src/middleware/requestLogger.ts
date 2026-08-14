import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res, responseTime) => {
    return `${req.method} ${req.url} - ${res.statusCode} (${responseTime}ms)`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} - ${res.statusCode} - Error: ${err.message}`;
  },
  // Suppress default verbose request/response serialization object output in console
  serializers: {
    req: () => undefined,
    res: () => undefined,
    err: () => undefined,
  },
});

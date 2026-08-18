import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';

// Centralized Semantic Endpoint Mappings (Normalized Path keys)
const SEMANTIC_MAPPINGS: Record<string, string> = {
  // Authentication
  'POST /auth/login': 'User logged in successfully',
  'POST /auth/logout': 'User logged out successfully',
  'POST /auth/refresh': 'Access token refreshed successfully',
  'GET /auth/me': 'Current user profile retrieved successfully',

  // Client Profiles
  'GET /profiles': 'Client profiles fetched successfully',
  'POST /profiles': 'Client profile created successfully',
  'POST /profiles/bulk-archive': 'Client profiles bulk archived successfully',
  'POST /profiles/bulk-delete': 'Client profiles bulk deleted successfully',
  'POST /profiles/merge': 'Client profiles merged successfully',

  // Activity & Attendance Monitoring
  'GET /activity/today': "Today's activity data fetched successfully",
  'GET /activity/productivity': 'Productivity data fetched successfully',
  'GET /activity/live-status': 'Live availability status fetched successfully',
  'GET /activity/history': 'Activity history log fetched successfully',
  'GET /activity/current': 'Current activity status fetched successfully',

  // Applications & Summaries (also matching Root / route mounts)
  'GET /applications': 'Job applications fetched successfully',
  'POST /applications': 'Job application logged successfully',
  'GET /applications/client-stats': 'Client statistics fetched successfully',
  'GET /job-portals': 'Job portals list fetched successfully',
  'GET /daily-counts': 'Daily application counts fetched successfully',
  'GET /summary': 'Global metrics summary fetched successfully',
  'GET /history': 'Recent operations history logs fetched successfully',
  'GET /': 'Dashboard default data fetched successfully',
  'GET /config': 'Application config settings retrieved successfully',
};

// Normalize path by stripping query strings and dynamic IDs (UUID / MongoID patterns)
function normalizePath(method: string, originalUrl: string): { normalizedPath: string; key: string } {
  // Strip query parameters
  let cleanPath = originalUrl.split('?')[0];

  // Strip prefix API version (e.g. /api/v1)
  if (cleanPath.startsWith('/api/v1')) {
    cleanPath = cleanPath.slice(7);
  }

  // Normalize dynamic UUIDs, integers, etc to placeholder pattern
  // Matches typical UUID / database IDs e.g. /profiles/0c66f02a-... -> /profiles/:id
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
  cleanPath = cleanPath.replace(uuidRegex, ':id');

  // Treat trailing slashes
  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }

  return {
    normalizedPath: cleanPath,
    key: `${method.toUpperCase()} ${cleanPath}`,
  };
}

// Generate the semantic message based on mapped key or defaults
function getSemanticMessage(method: string, originalUrl: string, statusCode: number, errorMessage?: string): string {
  const { key } = normalizePath(method, originalUrl);

  if (statusCode >= 400) {
    // Generate descriptive failure messages
    const mapped = SEMANTIC_MAPPINGS[key];
    const prefix = mapped
      ? mapped
          .replace('successfully', 'failed')
          .replace('fetched', 'fetch')
          .replace('logged', 'log')
          .replace('archived', 'archive')
          .replace('deleted', 'delete')
          .replace('refreshed', 'refresh')
          .replace('merged', 'merge')
      : 'API request failed';
    return `${prefix}${errorMessage ? `: ${errorMessage}` : ` (Status ${statusCode})`}`;
  }

  return SEMANTIC_MAPPINGS[key] ?? 'API request completed';
}

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
    const method = req.method ?? 'GET';
    const url = req.url ?? '/';
    const msg = getSemanticMessage(method, url, res.statusCode);
    return `${msg} | ${method} ${url.split('?')[0]} | ${res.statusCode} | ${responseTime}ms`;
  },
  customErrorMessage: (req, res, err) => {
    const method = req.method ?? 'GET';
    const url = req.url ?? '/';
    const msg = getSemanticMessage(method, url, res.statusCode, err.message);
    return `${msg} | ${method} ${url.split('?')[0]} | ${res.statusCode}`;
  },
  // Suppress default verbose request/response serialization object output in console
  serializers: {
    req: () => undefined,
    res: () => undefined,
    err: () => undefined,
  },
});

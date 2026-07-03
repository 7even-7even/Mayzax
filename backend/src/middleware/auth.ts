import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '@/utils/apiError';
import { verifyAccessToken } from '@/modules/auth/token.service';

export interface AuthPayload {
  sub: string; // user id
  role: Role;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/** Requires a valid access token (from Authorization header or cookie). Attaches req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const headerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined;
    const cookieToken = req.cookies?.access_token;
    const token = headerToken ?? cookieToken;

    if (!token) {
      throw ApiError.unauthorized('Authentication token missing');
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    next(ApiError.unauthorized('Invalid or expired authentication token'));
  }
}

/** Restricts route access to specific roles. Use after requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

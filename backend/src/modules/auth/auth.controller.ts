import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { env } from '@/config/env';
import { parseExpiryToMs } from './token.service';
import * as authService from './auth.service';
import { ApiError } from '@/utils/apiError';

const REFRESH_COOKIE = 'refresh_token';
const ACCESS_COOKIE = 'access_token';

function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax' as const,
    domain: env.NODE_ENV === 'production' ? env.COOKIE_DOMAIN : undefined,
    maxAge: maxAgeMs,
    path: '/',
  };
}

function setSessionCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, cookieOptions(parseExpiryToMs(env.JWT_ACCESS_EXPIRES_IN)));
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(parseExpiryToMs(env.JWT_REFRESH_EXPIRES_IN)));
}

function clearSessionCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  setSessionCookies(res, result.tokens);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
    },
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
  if (!refreshToken) throw ApiError.unauthorized('No refresh token provided');

  const result = await authService.refreshSession(refreshToken, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  setSessionCookies(res, result.tokens);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
    },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  await authService.logout(refreshToken);
  clearSessionCookies(res);
  res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.sub);
  res.status(200).json({ success: true, data: user });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.changePassword(req.user!.sub, req.body);
  clearSessionCookies(res);
  res.status(200).json({ success: true, data: { message: 'Password changed. Please log in again.' } });
});

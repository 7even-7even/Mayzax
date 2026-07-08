import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { env } from '@/config/env';
import { parseExpiryToMs } from './token.service';
import * as authService from './auth.service';
import { ApiError } from '@/utils/apiError';

const REFRESH_COOKIE = 'refresh_token';
const ACCESS_COOKIE = 'access_token';

function cookieOptions(maxAgeMs: number) {
  // Cross-site cookies (frontend + backend on different domains, e.g. Vercel +
  // Render) are only ever sent by browsers when SameSite=None AND Secure=true.
  // Same-site deployments (single domain, or local dev) use the safer Lax mode.
  const crossSite = env.CROSS_SITE_COOKIES;

  return {
    httpOnly: true,
    secure: crossSite ? true : env.COOKIE_SECURE,
    sameSite: (crossSite ? 'none' : 'lax') as 'none' | 'lax',
    domain: env.COOKIE_DOMAIN || undefined,
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

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.signupRecruiter(req.body, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  setSessionCookies(res, result.tokens);

  res.status(201).json({
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

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateProfile(req.user!.sub, req.body);
  res.status(200).json({ success: true, data: user });
});

export const setSecurityQuestion = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.setSecurityQuestion(req.user!.sub, req.body);
  res.status(200).json({ success: true, data: user });
});

export const forgotPasswordQuestion = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.getForgotPasswordQuestion(req.body);
  res.status(200).json({ success: true, data: result });
});

export const forgotPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPasswordWithSecurityAnswer(req.body);
  res.status(200).json({ success: true, data: { message: 'Password reset successfully. Please log in.' } });
});

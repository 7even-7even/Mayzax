import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { resolveClientType } from './token.service';
import * as authService from './auth.service';
import { env } from '@/config/env';
import {
  loginSchema,
  signupSchema,
  changePasswordSchema,
  updateProfileSchema,
  securityQuestionSchema,
  forgotPasswordQuestionSchema,
  forgotPasswordResetSchema,
} from './auth.validation';

function extractSessionMeta(req: Request) {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  };
}

function extractClientMeta(req: Request) {
  const clientType = resolveClientType(req.headers['x-client-type']);
  return {
    clientType,
    deviceName: typeof req.headers['x-device-name'] === 'string' ? req.headers['x-device-name'] : null,
    sessionMeta: extractSessionMeta(req),
  };
}
function setAuthCookies(res: Response, tokens: { accessToken: string }) {
  const isProd = env.NODE_ENV === 'production';
  const cookieOptions: any = {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.CROSS_SITE_COOKIES || isProd,
    sameSite: env.CROSS_SITE_COOKIES ? 'none' : 'lax',
    path: '/',
  };
  if (env.COOKIE_DOMAIN) {
    cookieOptions.domain = env.COOKIE_DOMAIN;
  }

  // Set access token cookie (long lived for 7 days)
  res.cookie('access_token', tokens.accessToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const input = signupSchema.parse(req.body);
  const { clientType, deviceName, sessionMeta } = extractClientMeta(req);
  const result = await authService.signupRecruiter(input, { ...sessionMeta, clientType, deviceName });
  setAuthCookies(res, result.tokens);
  res.status(201).json({ success: true, data: result });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const { clientType, deviceName, sessionMeta } = extractClientMeta(req);
  const result = await authService.login(input, { ...sessionMeta, clientType, deviceName });
  setAuthCookies(res, result.tokens);
  res.status(200).json({ success: true, data: result });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;
  const cookieToken = req.cookies?.access_token;
  const token = authHeader ?? cookieToken;

  const clientType = req.user?.clientType ?? resolveClientType(req.headers['x-client-type']);
  await authService.logout(token, clientType);
  res.clearCookie?.('access_token');
  res.status(200).json({ success: true, data: { message: 'Logged out' } });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.sub);
  res.status(200).json({ success: true, data: user });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const input = updateProfileSchema.parse(req.body);
  const user = await authService.updateProfile(req.user!.sub, input);
  res.status(200).json({ success: true, data: user });
});

export const setSecurityQuestion = asyncHandler(async (req: Request, res: Response) => {
  const input = securityQuestionSchema.parse(req.body);
  const user = await authService.setSecurityQuestion(req.user!.sub, input);
  res.status(200).json({ success: true, data: user });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const input = changePasswordSchema.parse(req.body);
  await authService.changePassword(req.user!.sub, input);
  res.status(200).json({ success: true, data: { message: 'Password changed successfully' } });
});

export const forgotPasswordQuestion = asyncHandler(async (req: Request, res: Response) => {
  const input = forgotPasswordQuestionSchema.parse(req.body);
  const result = await authService.getForgotPasswordQuestion(input);
  res.status(200).json({ success: true, data: result });
});

export const forgotPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const input = forgotPasswordResetSchema.parse(req.body);
  await authService.resetPasswordWithSecurityAnswer(input);
  res.status(200).json({ success: true, data: { message: 'Password reset successfully' } });
});



import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ClientType, Role } from '@prisma/client';
import { env } from '@/config/env';
import { AuthPayload } from '@/middleware/auth';

export interface RefreshPayload {
  sub: string;
  tokenId: string;
}

export function signAccessToken(payload: {
  id: string;
  role: Role;
  email: string;
  clientType?: ClientType;
}): string {
  const data: AuthPayload = {
    sub: payload.id,
    role: payload.role,
    email: payload.email,
    clientType: payload.clientType ?? ClientType.WEB,
  };
  return jwt.sign(data, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any });
}

export function verifyAccessToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
  // Backwards-compat for tokens issued before clientType was added
  if (!decoded.clientType) decoded.clientType = ClientType.WEB;
  return decoded;
}

export function signRefreshToken(payload: { userId: string; tokenId: string }): string {
  const data: RefreshPayload = { sub: payload.userId, tokenId: payload.tokenId };
  return jwt.sign(data, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any });
}

export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as unknown as RefreshPayload;
}

/** We never store raw refresh tokens - only a SHA-256 hash, so a DB leak can't be replayed. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function parseExpiryToMs(expiresIn: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 15 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[unit];
}

/**
 * Resolve the client type from a trusted/validated source.
 * Accepts a header value and returns a valid ClientType. WEB is the safe default.
 */
export function resolveClientType(value: unknown): ClientType {
  if (typeof value !== 'string') return ClientType.WEB;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'mobile') return ClientType.MOBILE;
  return ClientType.WEB;
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authService from '../../../backend/src/modules/auth/auth.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { ClientType } from '@prisma/client';
import * as tokenService from '../../../backend/src/modules/auth/token.service';

vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../../../backend/src/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-access-secret-minimum-32-chars-long',
    JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-32-chars-long',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  },
}));

vi.mock('../../../backend/src/modules/activity/activity.service', () => ({
  handleLoginEvent: vi.fn(),
  handleLogoutEvent: vi.fn(),
}));

describe('Authentication - Refresh Session Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AUTH-REFRESH-004: Should reuse same refresh token when far from expiry (>= 24 hours)', async () => {
    const userId = 'user-123';
    const tokenId = 'token-uuid-123';
    const rawRefreshToken = tokenService.signRefreshToken({ userId, tokenId });

    const storedTokenRecord = {
      id: tokenId,
      userId,
      tokenHash: tokenService.hashToken(rawRefreshToken),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days remaining
      revokedAt: null,
      clientType: ClientType.WEB,
    };

    const mockUser = {
      id: userId,
      role: 'RECRUITER',
      email: 'recruiter@mayzax.com',
      isActive: true,
      deletedAt: null,
    };

    (prisma.refreshToken.findUnique as any).mockResolvedValue(storedTokenRecord);
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.user.update as any).mockResolvedValue(mockUser);

    const result = await authService.refreshSession(rawRefreshToken, { ip: '127.0.0.1', clientType: ClientType.WEB });

    expect(result).toBeDefined();
    // Reuses same refresh token
    expect(result.tokens.refreshToken).toBe(rawRefreshToken);
    expect(result.tokens.accessToken).toBeDefined();
  });

  it('AUTH-REFRESH-003: Should rotate refresh token when nearing expiry (< 24 hours)', async () => {
    const userId = 'user-123';
    const tokenId = 'token-uuid-123';
    const rawRefreshToken = tokenService.signRefreshToken({ userId, tokenId });

    const storedTokenRecord = {
      id: tokenId,
      userId,
      tokenHash: tokenService.hashToken(rawRefreshToken),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours remaining (< 24 hours)
      revokedAt: null,
      clientType: ClientType.WEB,
    };

    const mockUser = {
      id: userId,
      role: 'RECRUITER',
      email: 'recruiter@mayzax.com',
      isActive: true,
      deletedAt: null,
    };

    (prisma.refreshToken.findUnique as any).mockResolvedValue(storedTokenRecord);
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.refreshToken.create as any).mockResolvedValue({});
    (prisma.refreshToken.update as any).mockResolvedValue({});
    (prisma.user.update as any).mockResolvedValue(mockUser);

    const result = await authService.refreshSession(rawRefreshToken, { ip: '127.0.0.1', clientType: ClientType.WEB });

    expect(result).toBeDefined();
    // Generates a new rotated refresh token
    expect(result.tokens.refreshToken).not.toBe(rawRefreshToken);
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: storedTokenRecord.id },
      data: expect.objectContaining({
        revokedAt: expect.any(Date),
        replacedByTokenHash: expect.any(String),
      }),
    });
  });

  it('AUTH-REFRESH-005: Should detect reuse attack and revoke all user sessions', async () => {
    const userId = 'user-123';
    const tokenId = 'token-uuid-123';
    const rawRefreshToken = tokenService.signRefreshToken({ userId, tokenId });

    const storedTokenRecord = {
      id: tokenId,
      userId,
      tokenHash: tokenService.hashToken(rawRefreshToken),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      revokedAt: new Date(Date.now() - 30 * 1000), // Revoked 30 seconds ago (> 10 seconds threshold)
      clientType: ClientType.WEB,
    };

    (prisma.refreshToken.findUnique as any).mockResolvedValue(storedTokenRecord);
    (prisma.refreshToken.updateMany as any).mockResolvedValue({});

    await expect(
      authService.refreshSession(rawRefreshToken, { ip: '127.0.0.1', clientType: ClientType.WEB })
    ).rejects.toThrow('Refresh token has already been used. All sessions revoked for security.');

    // Verifies all active user tokens were revoked
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});

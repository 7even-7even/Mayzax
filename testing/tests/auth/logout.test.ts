import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authService from '../../../backend/src/modules/auth/auth.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { ClientType } from '@prisma/client';
import * as tokenService from '../../../backend/src/modules/auth/token.service';

vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    refreshToken: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('../../../backend/src/modules/activity/activity.service', () => ({
  handleLogoutEvent: vi.fn(),
}));

describe('Authentication - Logout Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AUTH-LOGOUT-001: Should revoke refresh token on logout', async () => {
    const rawRefreshToken = tokenService.signRefreshToken({ userId: 'user-123', tokenId: 'token-uuid-123' });
    const tokenHash = tokenService.hashToken(rawRefreshToken);

    const storedToken = {
      userId: 'user-123',
      clientType: ClientType.WEB,
      user: { role: 'RECRUITER' },
    };

    (prisma.refreshToken.findUnique as any).mockResolvedValue(storedToken);
    (prisma.refreshToken.updateMany as any).mockResolvedValue({});

    await authService.logout(rawRefreshToken, ClientType.WEB);

    expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash },
      select: { userId: true, clientType: true, user: { select: { role: true } } },
    });

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('AUTH-LOGOUT-002: Should handle logout with no refresh token gracefully', async () => {
    await authService.logout(undefined, ClientType.WEB);
    expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
  });
});

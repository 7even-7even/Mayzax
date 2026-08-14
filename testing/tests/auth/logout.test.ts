import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authService from '../../../backend/src/modules/auth/auth.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { ClientType, Role } from '@prisma/client';
import * as tokenService from '../../../backend/src/modules/auth/token.service';

vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    revokedToken: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../../../backend/src/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-access-secret-minimum-32-chars-long',
    JWT_ACCESS_EXPIRES_IN: '7d',
  },
}));

vi.mock('../../../backend/src/modules/activity/activity.service', () => ({
  handleLogoutEvent: vi.fn(),
}));

describe('Authentication - Logout Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AUTH-LOGOUT-001: Should blacklist access token on logout', async () => {
    const rawAccessToken = tokenService.signAccessToken({
      id: 'user-123',
      role: Role.RECRUITER,
      email: 'recruiter@mayzax.com',
      clientType: ClientType.WEB,
    });
    const tokenHash = tokenService.hashToken(rawAccessToken);

    (prisma.revokedToken.create as any).mockResolvedValue({});

    await authService.logout(rawAccessToken, ClientType.WEB);

    expect(prisma.revokedToken.create).toHaveBeenCalledWith({
      data: {
        tokenHash,
        expiresAt: expect.any(Date),
      },
    });
  });

  it('AUTH-LOGOUT-002: Should handle logout with no access token gracefully', async () => {
    await authService.logout(undefined, ClientType.WEB);
    expect(prisma.revokedToken.create).not.toHaveBeenCalled();
  });
});

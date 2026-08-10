import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as authService from '../../../backend/src/modules/auth/auth.service';
import * as activityService from '../../../backend/src/modules/activity/activity.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { ClientType, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Mock Prisma
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
      deleteMany: vi.fn(),
    },
    activityLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../../backend/src/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-access-secret-minimum-32-chars-long',
    JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-32-chars-long',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    LOGS_DIR: 'logs',
  },
}));

vi.mock('../../../backend/src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../../backend/src/modules/activity/activity.service', () => ({
  handleLoginEvent: vi.fn(),
  handleLogoutEvent: vi.fn(),
  processHeartbeat: vi.fn(),
}));

describe('Session Management & Heartbeats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('SESS-MGMT-003: changePassword should cascade revoke all active refresh tokens', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-123',
      passwordHash: 'hashedpassword',
    });
    (prisma.user.update as any).mockResolvedValue({});
    (prisma.refreshToken.updateMany as any).mockResolvedValue({});

    // Mock bcrypt compare to succeed AND hash to skip expensive computation
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-new-password' as never);

    await authService.changePassword('user-123', {
      currentPassword: 'OldPassword123',
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    });

    // Verify all active refresh tokens for the user were revoked
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('SESS-HB-003: processHeartbeat should NOT close session on short network blip (< 40 min)', async () => {
    // Unmock processHeartbeat to test the actual implementation
    const realProcessHeartbeat = vi.importActual('../../../backend/src/modules/activity/activity.service')
      .then(async (mod: any) => {
        const lastHeartbeat = new Date('2026-08-10T10:00:00Z');
        const activeTime = new Date(lastHeartbeat.getTime() + 30 * 60 * 1000); // 30 minutes later (< 40 minutes)
        vi.setSystemTime(activeTime);

        (prisma.user.findUnique as any).mockResolvedValue({ lastHeartbeatAt: lastHeartbeat });
        const openLog = {
          id: 'log-active-id',
          userId: 'user-123',
          status: UserStatus.ACTIVE,
          startedAt: new Date('2026-08-10T09:00:00Z'),
        };
        (prisma.activityLog.findFirst as any).mockResolvedValue(openLog);
        (prisma.user.update as any).mockResolvedValue({});

        // Call the real processHeartbeat logic
        await mod.processHeartbeat('user-123', Role.RECRUITER);

        // Verify user timestamps updated
        expect(prisma.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: { lastHeartbeatAt: activeTime, lastActiveAt: activeTime },
        });

        // Verify NO activityLog update/creation occurred (session kept open)
        expect(prisma.activityLog.update).not.toHaveBeenCalled();
        expect(prisma.activityLog.create).not.toHaveBeenCalled();
      });
    await realProcessHeartbeat;
  });
});

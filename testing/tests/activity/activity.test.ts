import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as activityService from '../../../backend/src/modules/activity/activity.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { UserStatus, Role } from '@prisma/client';

// Mock Prisma client
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    activityLog: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    refreshToken: {
      deleteMany: vi.fn(),
    },
  },
}));

// Mock logger to avoid test console pollution
vi.mock('../../../backend/src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Login Hours & Activity Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ACT-STATUS-001: handleLoginEvent should initialize ACTIVE status log', async () => {
    (prisma.activityLog.findFirst as any).mockResolvedValue(null);
    (prisma.activityLog.create as any).mockResolvedValue({});
    (prisma.user.update as any).mockResolvedValue({});

    await activityService.handleLoginEvent('user-123', Role.RECRUITER);

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        status: UserStatus.ACTIVE,
        startedAt: expect.any(Date),
        endedAt: null,
      },
    });
  });

  it('ACT-STATUS-002: changeStatus should close previous log and create a new status log', async () => {
    const fakeTime = new Date('2026-08-10T10:00:00Z');
    vi.setSystemTime(fakeTime);

    const openLog = {
      id: 'log-active-id',
      userId: 'user-123',
      status: UserStatus.ACTIVE,
      startedAt: new Date('2026-08-10T09:00:00Z'),
      optionalNote: null,
    };

    (prisma.activityLog.findFirst as any).mockResolvedValue(openLog);
    (prisma.activityLog.update as any).mockResolvedValue({});
    (prisma.activityLog.create as any).mockResolvedValue({
      status: UserStatus.SHORT_BREAK,
      startedAt: fakeTime,
      optionalNote: 'Coffee break',
    });
    (prisma.user.update as any).mockResolvedValue({});

    const result = await activityService.changeStatus(
      'user-123',
      UserStatus.SHORT_BREAK,
      'Coffee break',
      Role.RECRUITER
    );

    expect(result.status).toBe(UserStatus.SHORT_BREAK);
    expect(result.optionalNote).toBe('Coffee break');

    // Verify previous log was closed
    expect(prisma.activityLog.update).toHaveBeenCalledWith({
      where: { id: 'log-active-id' },
      data: { endedAt: fakeTime },
    });

    // Verify new log was created
    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        status: UserStatus.SHORT_BREAK,
        startedAt: fakeTime,
        endedAt: null,
        optionalNote: 'Coffee break',
      },
    });
  });

  it('ACT-STATUS-004: changeStatus should block untracked roles (e.g. ADMIN)', async () => {
    await expect(
      activityService.changeStatus('user-123', UserStatus.SHORT_BREAK, null, Role.ADMIN)
    ).rejects.toThrow('Activity tracking is only applicable to Recruiters and Team Leaders.');
  });

  it('ACT-HB-002: processHeartbeat should auto-close session if heartbeat is stale (> 40 min)', async () => {
    const lastHeartbeat = new Date('2026-08-10T09:00:00Z');
    const staleTime = new Date(lastHeartbeat.getTime() + 45 * 60 * 1000); // 45 minutes later
    vi.setSystemTime(staleTime);

    (prisma.user.findUnique as any).mockResolvedValue({ lastHeartbeatAt: lastHeartbeat });
    const openLog = {
      id: 'log-active-id',
      userId: 'user-123',
      status: UserStatus.ACTIVE,
      startedAt: new Date('2026-08-10T08:00:00Z'),
    };
    (prisma.activityLog.findFirst as any).mockResolvedValue(openLog);
    (prisma.activityLog.update as any).mockResolvedValue({});
    (prisma.activityLog.create as any).mockResolvedValue({});
    (prisma.user.update as any).mockResolvedValue({});

    await expect(
      activityService.processHeartbeat('user-123', Role.RECRUITER)
    ).rejects.toThrow('Session expired due to inactivity');

    // Verify previous log closed at last heartbeat time (09:00:00)
    expect(prisma.activityLog.update).toHaveBeenCalledWith({
      where: { id: 'log-active-id' },
      data: { endedAt: lastHeartbeat },
    });

    // Verify offline log was created starting at last heartbeat time (09:00:00)
    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        status: UserStatus.OFFLINE,
        startedAt: lastHeartbeat,
        endedAt: staleTime,
        optionalNote: 'Disconnected due to inactivity',
      },
    });
  });

  it('ACT-MON-001: getTodayActivity should aggregate durations correctly', async () => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const mockLogs = [
      {
        id: 'log-1',
        status: UserStatus.ACTIVE,
        startedAt: new Date(startOfToday.getTime() + 1 * 60 * 60 * 1000), // 01:00 AM
        endedAt: new Date(startOfToday.getTime() + 2 * 60 * 60 * 1000),   // 02:00 AM (3600 seconds)
      },
      {
        id: 'log-2',
        status: UserStatus.SHORT_BREAK,
        startedAt: new Date(startOfToday.getTime() + 2 * 60 * 60 * 1000), // 02:00 AM
        endedAt: new Date(startOfToday.getTime() + 2 * 60 * 60 * 1000 + 15 * 60 * 1000), // 02:15 AM (900 seconds)
      },
    ];

    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-123',
      name: 'Test Recruiter',
      email: 'recruiter@mayzax.com',
      role: Role.RECRUITER,
    });
    (prisma.activityLog.findMany as any).mockResolvedValue(mockLogs);

    const result = await activityService.getTodayActivity('user-123');

    expect(result.totalLoggedInSeconds).toBe(4500); // 3600 + 900
    expect(result.totalProductiveSeconds).toBe(3600);
    expect(result.totalBreakSeconds).toBe(900);
    expect(result.breakDetails.shortBreakSeconds).toBe(900);
  });
});

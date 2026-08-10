import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as shiftService from '../../../backend/src/modules/shifts/shift.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { AttendanceStatus, UserStatus, Role } from '@prisma/client';

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    shiftConfig: {
      findFirst: vi.fn(),
    },
    activityLog: {
      findMany: vi.fn(),
    },
  },
}));

describe('Shifts - Attendance Computations Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockShiftConfig = {
    id: 'shift-id-123',
    name: 'Night Shift',
    timezone: 'Asia/Kolkata',
    startHour: 18,
    startMinute: 0,
    endHour: 9,
    endMinute: 0,
    shortBreakAllowedSec: 900,
    dinnerBreakAllowedSec: 2400,
    briefingAllowedSec: 900,
    meetingAllowedSec: 1800,
    systemIssueAllowedSec: 0,
    expectedWorkSeconds: 28800, // 8 hours
    lateGraceMinutes: 15,
    earlyGraceMinutes: 15,
    penaltyPerLateMinute: 1,
    isActive: true,
  };

  it('SH-ATT-001: Punctual check-in (within grace minutes) has no lateness penalty', async () => {
    const businessDate = new Date('2026-08-10T00:00:00.000Z');
    const firstLoginTime = new Date('2026-08-10T12:40:00.000Z'); // 6:10 PM IST (10 minutes late, grace = 15)

    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-123',
      shiftConfig: mockShiftConfig,
    });

    const mockLogs = [
      {
        id: 'log-1',
        status: UserStatus.ACTIVE,
        startedAt: firstLoginTime,
        endedAt: null,
      },
    ];
    (prisma.activityLog.findMany as any).mockResolvedValue(mockLogs);

    const result = await shiftService.computeAttendanceDay('user-123', businessDate, {
      now: new Date('2026-08-11T03:00:00.000Z'),
    });

    expect(result.lateByMinutes).toBe(10);
    expect(result.penaltyMinutes).toBe(0);
    expect(result.status).toBe(AttendanceStatus.PRESENT);
  });

  it('SH-ATT-002: Late check-in (exceeding grace minutes) triggers lateness penalty', async () => {
    const businessDate = new Date('2026-08-10T00:00:00.000Z');
    const firstLoginTime = new Date('2026-08-10T12:55:00.000Z'); // 6:25 PM IST (25 minutes late, grace = 15)

    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-123',
      shiftConfig: mockShiftConfig,
    });

    const mockLogs = [
      {
        id: 'log-1',
        status: UserStatus.ACTIVE,
        startedAt: firstLoginTime,
        endedAt: null,
      },
    ];
    (prisma.activityLog.findMany as any).mockResolvedValue(mockLogs);

    const result = await shiftService.computeAttendanceDay('user-123', businessDate, {
      now: new Date('2026-08-11T03:00:00.000Z'),
    });

    expect(result.lateByMinutes).toBe(25);
    expect(result.penaltyMinutes).toBe(10); // 25 late - 15 grace = 10 penalty minutes
  });
});

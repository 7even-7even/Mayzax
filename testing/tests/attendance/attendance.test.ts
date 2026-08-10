import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as attendanceService from '../../../backend/src/modules/attendance/attendance.service';
import * as shiftService from '../../../backend/src/modules/shifts/shift.service';
import * as activityService from '../../../backend/src/modules/activity/activity.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { Role, UserStatus } from '@prisma/client';

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock Shift Service
vi.mock('../../../backend/src/modules/shifts/shift.service', () => ({
  computeAttendanceDay: vi.fn(),
  getAllowedSecondsForStatus: vi.fn(),
  statusLabel: vi.fn().mockReturnValue('Short Break'),
  resolveManagerForUser: vi.fn().mockResolvedValue(null),
}));

// Mock Activity Service
vi.mock('../../../backend/src/modules/activity/activity.service', () => ({
  getCurrentStatus: vi.fn(),
}));

describe('Attendance - Today Summary DTO Compiler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ATT-TODAY-001: Should compile today DTO successfully while working (active status)', async () => {
    const userId = 'user-123';

    // Mock user profile details
    (prisma.user.findUnique as any).mockResolvedValue({
      id: userId,
      name: 'John Doe',
      email: 'john@mayzax.com',
      role: Role.RECRUITER,
    });

    // Mock shift rollup details
    const mockShiftConfig = {
      name: 'Default Shift',
      timezone: 'Asia/Kolkata',
      expectedWorkSeconds: 28800,
      lateGraceMinutes: 15,
      earlyGraceMinutes: 15,
      startHour: 18,
      startMinute: 0,
      endHour: 9,
      endMinute: 0,
    };
    (shiftService.computeAttendanceDay as any).mockResolvedValue({
      shiftConfig: mockShiftConfig,
      shiftWindow: {
        start: new Date('2026-08-10T12:30:00.000Z'),
        end: new Date('2026-08-11T03:30:00.000Z'),
      },
      firstLoginAt: new Date('2026-08-10T12:30:00.000Z'),
      totalLoggedInSec: 18000,
      totalBreakSec: 0,
      totalProductiveSec: 18000,
      lateByMinutes: 0,
      earlyByMinutes: 0,
      penaltyMinutes: 0,
    });

    // Mock active state
    (activityService.getCurrentStatus as any).mockResolvedValue({
      status: UserStatus.ACTIVE,
      startedAt: new Date('2026-08-10T12:30:00.000Z'),
    });

    const result = await attendanceService.getTodayForUser(userId);

    expect(result.user.name).toBe('John Doe');
    expect(result.today.workedSeconds).toBe(18000);
    expect(result.today.currentStatus).toBe(UserStatus.ACTIVE);
    expect(result.today.currentBreak).toBeNull();
  });

  it('ATT-TODAY-002: Should calculate remaining break metrics while user is on short break', async () => {
    const userId = 'user-123';
    const breakStartTime = new Date(Date.now() - 300 * 1000); // 5 minutes ago

    (prisma.user.findUnique as any).mockResolvedValue({
      id: userId,
      name: 'John Doe',
      email: 'john@mayzax.com',
      role: Role.RECRUITER,
    });

    const mockShiftConfig = {
      name: 'Default Shift',
      timezone: 'Asia/Kolkata',
      expectedWorkSeconds: 28800,
      startHour: 18,
      startMinute: 0,
      endHour: 9,
      endMinute: 0,
    };
    (shiftService.computeAttendanceDay as any).mockResolvedValue({
      shiftConfig: mockShiftConfig,
      shiftWindow: {
        start: new Date('2026-08-10T12:30:00.000Z'),
        end: new Date('2026-08-11T03:30:00.000Z'),
      },
      firstLoginAt: new Date('2026-08-10T12:30:00.000Z'),
      totalLoggedInSec: 10000,
      totalBreakSec: 300,
      totalProductiveSec: 9700,
      lateByMinutes: 0,
      earlyByMinutes: 0,
      penaltyMinutes: 0,
    });

    (activityService.getCurrentStatus as any).mockResolvedValue({
      status: UserStatus.SHORT_BREAK,
      startedAt: breakStartTime,
    });

    (shiftService.getAllowedSecondsForStatus as any).mockReturnValue(900); // 15 mins allowed

    const result = await attendanceService.getTodayForUser(userId);

    expect(result.today.status).toBe('ON_BREAK');
    expect(result.today.currentBreak).toBeDefined();
    expect(result.today.currentBreak?.type).toBe(UserStatus.SHORT_BREAK);
    expect(result.today.currentBreak?.usedSec).toBe(300);
    expect(result.today.currentBreak?.remainingSec).toBe(600);
  });
});

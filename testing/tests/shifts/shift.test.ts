import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as shiftService from '../../../backend/src/modules/shifts/shift.service';
import { prisma } from '../../../backend/src/lib/prisma';

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    shiftConfig: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock env
vi.mock('../../../backend/src/config/env', () => ({
  env: {
    BUSINESS_SHIFT_START_HOUR: 18,
    BUSINESS_SHIFT_START_MINUTE: 0,
    BUSINESS_SHIFT_END_HOUR: 9,
    BUSINESS_SHIFT_END_MINUTE: 0,
    BUSINESS_TIMEZONE: 'Asia/Kolkata',
    DEFAULT_SHORT_BREAK_SECONDS: 900,
    DEFAULT_DINNER_BREAK_SECONDS: 2400,
    DEFAULT_BRIEFING_SECONDS: 900,
    DEFAULT_MEETING_SECONDS: 1800,
    DEFAULT_SYSTEM_ISSUE_SECONDS: 0,
    DEFAULT_SHIFT_DURATION_SECONDS: 28800,
    DEFAULT_LATE_GRACE_MINUTES: 15,
    DEFAULT_EARLY_GRACE_MINUTES: 15,
    DEFAULT_PENALTY_PER_LATE_MINUTE: 1,
  },
}));

describe('Shifts - Config & Window Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SH-CONFIG-002: Should fall back to environment variables when no configuration exists in DB', async () => {
    (prisma.shiftConfig.findFirst as any).mockResolvedValue(null);

    const config = await shiftService.getDefaultShiftConfig();

    expect(config.name).toBe('Default Shift');
    expect(config.startHour).toBe(18);
    expect(config.timezone).toBe('Asia/Kolkata');
  });

  it('SH-CONFIG-003: Should calculate standard day shift windows correctly', () => {
    const dayShiftConfig: shiftService.ResolvedShiftConfig = {
      id: 'day-shift-id',
      name: 'Day Shift',
      timezone: 'Asia/Kolkata',
      startHour: 9,
      startMinute: 0,
      endHour: 17,
      endMinute: 0,
      shortBreakAllowedSec: 1800,
      dinnerBreakAllowedSec: 3600,
      briefingAllowedSec: 900,
      meetingAllowedSec: 1800,
      systemIssueAllowedSec: 0,
      expectedWorkSeconds: 28800,
      lateGraceMinutes: 15,
      earlyGraceMinutes: 15,
      penaltyPerLateMinute: 0,
    };

    const window = shiftService.getShiftWindowForDate('2026-08-10', dayShiftConfig);

    // 9:00 AM IST => 03:30 AM UTC
    expect(window.start.toISOString()).toBe('2026-08-10T03:30:00.000Z');
    // 5:00 PM IST => 11:30 AM UTC (ending with 59.999s)
    expect(window.end.toISOString()).toBe('2026-08-10T11:30:59.999Z');
  });

  it('SH-CONFIG-004: Should calculate night shift windows spanning midnight correctly (+1 day)', () => {
    const nightShiftConfig: shiftService.ResolvedShiftConfig = {
      id: 'night-shift-id',
      name: 'Night Shift',
      timezone: 'Asia/Kolkata',
      startHour: 18,
      startMinute: 0,
      endHour: 9,
      endMinute: 0,
      shortBreakAllowedSec: 1800,
      dinnerBreakAllowedSec: 3600,
      briefingAllowedSec: 900,
      meetingAllowedSec: 1800,
      systemIssueAllowedSec: 0,
      expectedWorkSeconds: 28800,
      lateGraceMinutes: 15,
      earlyGraceMinutes: 15,
      penaltyPerLateMinute: 1,
    };

    const window = shiftService.getShiftWindowForDate('2026-08-10', nightShiftConfig);

    // 6:00 PM IST on 10th => 12:30 PM UTC
    expect(window.start.toISOString()).toBe('2026-08-10T12:30:00.000Z');
    // 9:00 AM IST on 11th => 03:30 AM UTC on 11th (ending with 59.999s)
    expect(window.end.toISOString()).toBe('2026-08-11T03:30:59.999Z');
  });
});

/**
 * Shift configuration + attendance-day computation.
 *
 * Source-of-truth for all display math the mobile app renders:
 *  - Shift start/end, expected work seconds
 *  - Allowed break durations by type
 *  - Late / early thresholds
 *  - Penalty calculation
 *  - Daily attendance rollup
 *
 * The mobile app does NOT compute any of these values — it consumes them.
 */
import { AttendanceStatus, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { env } from '@/config/env';
import { getBusinessDate } from '@/utils/businessDate';

export interface ResolvedShiftConfig {
  id: string | null;
  name: string;
  timezone: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  shortBreakAllowedSec: number;
  dinnerBreakAllowedSec: number;
  briefingAllowedSec: number;
  meetingAllowedSec: number;
  systemIssueAllowedSec: number; // 0 => unlimited
  expectedWorkSeconds: number;
  lateGraceMinutes: number;
  earlyGraceMinutes: number;
  penaltyPerLateMinute: number;
}

export async function getDefaultShiftConfig(): Promise<ResolvedShiftConfig> {
  // Look up DB default; if none exists, build one from env.
  const defaultCfg = await prisma.shiftConfig.findFirst({ where: { isDefault: true, isActive: true } });
  if (defaultCfg) return toResolved(defaultCfg);
  return envShiftConfig();
}

function envShiftConfig(): ResolvedShiftConfig {
  const startHour = env.BUSINESS_SHIFT_START_HOUR;
  const startMinute = env.BUSINESS_SHIFT_START_MINUTE;
  const endHour = env.BUSINESS_SHIFT_END_HOUR;
  const endMinute = env.BUSINESS_SHIFT_END_MINUTE;
  return {
    id: null,
    name: 'Default Shift',
    timezone: env.BUSINESS_TIMEZONE,
    startHour,
    startMinute,
    endHour,
    endMinute,
    shortBreakAllowedSec: env.DEFAULT_SHORT_BREAK_SECONDS,
    dinnerBreakAllowedSec: env.DEFAULT_DINNER_BREAK_SECONDS,
    briefingAllowedSec: env.DEFAULT_BRIEFING_SECONDS,
    meetingAllowedSec: env.DEFAULT_MEETING_SECONDS,
    systemIssueAllowedSec: env.DEFAULT_SYSTEM_ISSUE_SECONDS,
    expectedWorkSeconds: env.DEFAULT_SHIFT_DURATION_SECONDS,
    lateGraceMinutes: env.DEFAULT_LATE_GRACE_MINUTES,
    earlyGraceMinutes: env.DEFAULT_EARLY_GRACE_MINUTES,
    penaltyPerLateMinute: env.DEFAULT_PENALTY_PER_LATE_MINUTE,
  };
}

function toResolved(cfg: any): ResolvedShiftConfig {
  return {
    id: cfg.id,
    name: cfg.name,
    timezone: cfg.timezone,
    startHour: cfg.startHour,
    startMinute: cfg.startMinute,
    endHour: cfg.endHour,
    endMinute: cfg.endMinute,
    shortBreakAllowedSec: cfg.shortBreakAllowedSec,
    dinnerBreakAllowedSec: cfg.dinnerBreakAllowedSec,
    briefingAllowedSec: cfg.briefingAllowedSec,
    meetingAllowedSec: cfg.meetingAllowedSec,
    systemIssueAllowedSec: cfg.systemIssueAllowedSec,
    expectedWorkSeconds: cfg.expectedWorkSeconds,
    lateGraceMinutes: cfg.lateGraceMinutes,
    earlyGraceMinutes: cfg.earlyGraceMinutes,
    penaltyPerLateMinute: cfg.penaltyPerLateMinute,
  };
}

export async function resolveUserShiftConfig(userId: string): Promise<ResolvedShiftConfig> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { shiftConfig: true },
  });
  if (user?.shiftConfig && user.shiftConfig.isActive) return toResolved(user.shiftConfig);
  return getDefaultShiftConfig();
}

/** Convert an IST wall-clock (hour/min) within a business date to UTC instant. */
function istWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
  ms = 0,
): Date {
  const IST_OFFSET_MINUTES = 5 * 60 + 30;
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute, second, ms) - IST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMillis);
}

function istParts(date: Date, tz: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value;
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour,
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
  };
}

/**
 * Compute absolute shift start/end instants for a given business date (YYYY-MM-DD)
 * and shift config. Night shifts that span midnight end on the following calendar day.
 */
export function getShiftWindowForDate(
  businessDateStr: string,
  cfg: ResolvedShiftConfig,
): { start: Date; end: Date } {
  // Support both night shifts (start > end) and day shifts (start < end).
  const [y, m, d] = businessDateStr.split('-').map((v) => parseInt(v, 10));
  const start = istWallClockToUtc(y, m, d, cfg.startHour, cfg.startMinute, 0);
  const isNightShift = cfg.startHour > cfg.endHour || (cfg.startHour === cfg.endHour && cfg.startMinute >= cfg.endMinute);
  let end: Date;
  if (isNightShift) {
    // End is on the next calendar day
    end = istWallClockToUtc(y, m, d, cfg.endHour, cfg.endMinute, 59, 999);
    // If end wall-clock is "earlier" than start (e.g. end 9:00 < start 18:00), it's actually +1 day
    if (end.getTime() <= start.getTime()) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
  } else {
    end = istWallClockToUtc(y, m, d, cfg.endHour, cfg.endMinute, 59, 999);
  }
  return { start, end };
}

export function getAllowedSecondsForStatus(status: UserStatus, cfg: ResolvedShiftConfig): number | null {
  switch (status) {
    case UserStatus.SHORT_BREAK:
      return cfg.shortBreakAllowedSec;
    case UserStatus.DINNER_BREAK:
      return cfg.dinnerBreakAllowedSec;
    case UserStatus.BRIEFING_TRAINING:
      return cfg.briefingAllowedSec;
    case UserStatus.MEETING:
      return cfg.meetingAllowedSec;
    case UserStatus.SYSTEM_ISSUE:
      return cfg.systemIssueAllowedSec > 0 ? cfg.systemIssueAllowedSec : null;
    default:
      return null;
  }
}

export function statusLabel(status: UserStatus): string {
  switch (status) {
    case UserStatus.ACTIVE: return 'Working';
    case UserStatus.ONLINE: return 'Online';
    case UserStatus.SHORT_BREAK: return 'Short Break';
    case UserStatus.DINNER_BREAK: return 'Dinner Break';
    case UserStatus.BRIEFING_TRAINING: return 'Briefing / Training';
    case UserStatus.MEETING: return 'In a Meeting';
    case UserStatus.SYSTEM_ISSUE: return 'System Issue';
    case UserStatus.OFFLINE: return 'Logged Out';
  }
}

/**
 * Compute a daily attendance summary for a given user & business date.
 * Used both for live (today) and historical (attendance_days rollup) views.
 */
export async function computeAttendanceDay(
  userId: string,
  businessDate: Date,
  opts: { recomputeFromLogs?: boolean; now?: Date } = {},
) {
  const now = opts.now ?? new Date();
  const cfg = await resolveUserShiftConfig(userId);
  const businessDateStr = businessDate.toISOString().slice(0, 10);
  const window = getShiftWindowForDate(businessDateStr, cfg);

  // Determine which logs fall into this business date window
  const logs = await prisma.activityLog.findMany({
    where: {
      userId,
      // Logs starting within the window OR open during the window (started before, ended within/after)
      OR: [
        { startedAt: { gte: window.start, lte: window.end } },
        { endedAt: { gte: window.start, lte: window.end } },
        { AND: [{ startedAt: { lt: window.start } }, { endedAt: null }] },
      ],
    },
    orderBy: { startedAt: 'asc' },
  });

  let totalLoggedInSec = 0;
  let totalProductiveSec = 0;
  let totalBreakSec = 0;
  let shortBreakSec = 0;
  let dinnerBreakSec = 0;
  let briefingSec = 0;
  let meetingSec = 0;
  let systemIssueSec = 0;
  let onlineSec = 0;

  let firstLoginAt: Date | null = null;
  let lastLogoutAt: Date | null = null;

  const timeline: Array<{
    id: string;
    status: UserStatus;
    label: string;
    startedAt: Date;
    endedAt: Date | null;
    durationSec: number;
    note: string | null;
  }> = [];

  const endCap = now < window.end ? now : window.end;

  for (const log of logs) {
    const segStart = log.startedAt < window.start ? window.start : log.startedAt;
    let segEnd: Date;
    if (log.endedAt) {
      segEnd = log.endedAt > window.end ? window.end : log.endedAt;
    } else {
      segEnd = endCap;
    }
    if (segEnd <= segStart) continue;
    const dur = Math.max(0, Math.floor((segEnd.getTime() - segStart.getTime()) / 1000));

    if (!firstLoginAt && log.status !== UserStatus.OFFLINE) {
      firstLoginAt = log.startedAt < window.start ? window.start : log.startedAt;
    }
    if (log.status === UserStatus.OFFLINE && log.startedAt >= window.start && log.startedAt <= window.end) {
      lastLogoutAt = log.startedAt;
    }

    if (log.status !== UserStatus.OFFLINE) totalLoggedInSec += dur;

    switch (log.status) {
      case UserStatus.ACTIVE:
        totalProductiveSec += dur;
        break;
      case UserStatus.ONLINE:
        onlineSec += dur;
        totalProductiveSec += dur;
        break;
      case UserStatus.SHORT_BREAK:
        shortBreakSec += dur;
        totalBreakSec += dur;
        break;
      case UserStatus.DINNER_BREAK:
        dinnerBreakSec += dur;
        totalBreakSec += dur;
        break;
      case UserStatus.BRIEFING_TRAINING:
        briefingSec += dur;
        totalBreakSec += dur;
        break;
      case UserStatus.MEETING:
        meetingSec += dur;
        totalBreakSec += dur;
        break;
      case UserStatus.SYSTEM_ISSUE:
        systemIssueSec += dur;
        totalBreakSec += dur;
        break;
    }

    timeline.push({
      id: log.id,
      status: log.status,
      label: statusLabel(log.status),
      startedAt: log.startedAt,
      endedAt: log.endedAt,
      durationSec: dur,
      note: log.optionalNote ?? null,
    });
  }

  // Late / early calculations
  let lateByMinutes = 0;
  let earlyByMinutes = 0;
  let penaltyMinutes = 0;
  let status: AttendanceStatus = AttendanceStatus.NOT_STARTED;
  let expectedLogoutAt: Date | null = null;

  if (firstLoginAt) {
    const lateMs = firstLoginAt.getTime() - window.start.getTime();
    lateByMinutes = Math.max(0, Math.floor(lateMs / 60000));
    const afterGrace = Math.max(0, lateByMinutes - cfg.lateGraceMinutes);
    penaltyMinutes = afterGrace; // 1 minute penalty per late minute after grace by default
    expectedLogoutAt = new Date(firstLoginAt.getTime() + cfg.expectedWorkSeconds * 1000);
    if (lastLogoutAt && expectedLogoutAt) {
      earlyByMinutes = Math.max(
        0,
        Math.floor((expectedLogoutAt.getTime() - lastLogoutAt.getTime()) / 60000) - cfg.earlyGraceMinutes,
      );
      if (earlyByMinutes > 0) penaltyMinutes += earlyByMinutes;
    }
    // Classify day status
    if (totalLoggedInSec >= cfg.expectedWorkSeconds * 0.5) status = AttendanceStatus.PRESENT;
    else status = AttendanceStatus.HALF_DAY;
    // Clamp half-day if they logged in but worked very little
    if (totalLoggedInSec < 30 * 60) status = AttendanceStatus.ABSENT;
  } else {
    // No login in window
    // Weekend detection (Saturday=6, Sunday=0 in IST calendar) simple heuristic
    const ist = istParts(now, cfg.timezone);
    // Determine the day-of-week of the business date (IST)
    const dow = new Date(Date.UTC(
      parseInt(businessDateStr.slice(0, 4), 10),
      parseInt(businessDateStr.slice(5, 7), 10) - 1,
      parseInt(businessDateStr.slice(8, 10), 10),
    )).getUTCDay();
    if (dow === 0) status = AttendanceStatus.WEEK_OFF;
    else status = AttendanceStatus.ABSENT;
    void ist;
  }

  return {
    businessDate: businessDateStr,
    shiftWindow: { start: window.start, end: window.end },
    shiftConfig: cfg,
    firstLoginAt,
    lastLogoutAt,
    totalLoggedInSec,
    totalProductiveSec,
    totalBreakSec,
    shortBreakSec,
    dinnerBreakSec,
    briefingSec,
    meetingSec,
    systemIssueSec,
    onlineSec,
    lateByMinutes,
    earlyByMinutes,
    penaltyMinutes,
    expectedLogoutAt,
    status,
    timeline,
  };
}

/** Upsert an AttendanceDay record from the computed summary. */
export async function upsertAttendanceDay(
  userId: string,
  businessDate: Date,
  summary: Record<string, any>,
) {
  const existing = await prisma.attendanceDay.findUnique({
    where: { userId_businessDate: { userId, businessDate } },
  });
  if (existing) {
    return prisma.attendanceDay.update({
      where: { id: existing.id },
      data: { ...summary, computedAt: new Date() } as any,
    });
  }
  return prisma.attendanceDay.create({
    data: {
      userId,
      businessDate,
      ...summary,
    } as any,
  });
}

/** Seed a default shift config if none exists (idempotent). */
export async function ensureDefaultShiftConfig() {
  const existing = await prisma.shiftConfig.findFirst({ where: { isDefault: true } });
  if (existing) return existing;
  return prisma.shiftConfig.create({
    data: {
      name: 'Default IST Night Shift',
      isDefault: true,
      timezone: env.BUSINESS_TIMEZONE,
      startHour: env.BUSINESS_SHIFT_START_HOUR,
      startMinute: env.BUSINESS_SHIFT_START_MINUTE,
      endHour: env.BUSINESS_SHIFT_END_HOUR,
      endMinute: env.BUSINESS_SHIFT_END_MINUTE,
      shortBreakAllowedSec: env.DEFAULT_SHORT_BREAK_SECONDS,
      dinnerBreakAllowedSec: env.DEFAULT_DINNER_BREAK_SECONDS,
      briefingAllowedSec: env.DEFAULT_BRIEFING_SECONDS,
      meetingAllowedSec: env.DEFAULT_MEETING_SECONDS,
      systemIssueAllowedSec: env.DEFAULT_SYSTEM_ISSUE_SECONDS,
      expectedWorkSeconds: env.DEFAULT_SHIFT_DURATION_SECONDS,
      lateGraceMinutes: env.DEFAULT_LATE_GRACE_MINUTES,
      earlyGraceMinutes: env.DEFAULT_EARLY_GRACE_MINUTES,
      penaltyPerLateMinute: env.DEFAULT_PENALTY_PER_LATE_MINUTE,
    },
  });
}

// Re-export business date helpers to avoid callers needing two imports
export { getBusinessDate };

// Resolve manager (fallback to createdBy if reportingManagerId is unset)
export async function resolveManagerForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      reportingManagerId: true,
      reportingManager: { select: { id: true, name: true, email: true } },
      createdById: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  return user?.reportingManager ?? user?.createdBy ?? null;
}

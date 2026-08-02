/**
 * Mobile-friendly attendance read service.
 * Returns fully-computed DTOs the mobile app renders directly — no math on the client.
 */
import { AttendanceStatus, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  computeAttendanceDay,
  getAllowedSecondsForStatus,
  resolveManagerForUser,
  resolveUserShiftConfig,
  statusLabel,
  upsertAttendanceDay,
} from '../shifts/shift.service';
import { getBusinessDate, getBusinessDateString } from '@/utils/businessDate';
import { getCurrentStatus } from '../activity/activity.service';

export interface TodayResponse {
  user: {
    id: string;
    name: string;
    email: string;
    employeeId: string | null;
    designation: string | null;
    department: string | null;
    avatarUrl: string | null;
    phone: string | null;
    teamName: string | null;
    manager: { id: string; name: string; email: string } | null;
  };
  shift: {
    name: string;
    timezone: string;
    startAt: Date;
    endAt: Date;
    windowText: string;
    expectedWorkSeconds: number;
  };
  today: {
    businessDate: string;
    currentStatus: UserStatus;
    currentStatusLabel: string;
    currentStatusSince: Date | null;
    firstLoginAt: Date | null;
    lastLogoutAt: Date | null;
    isLoggedIn: boolean;
    workedSeconds: number;
    productiveSeconds: number;
    breakSeconds: number;
    remainingWorkSeconds: number;
    expectedLogoutAt: Date | null;
    currentBreak: {
      type: UserStatus;
      label: string;
      startedAt: Date;
      allowedSec: number;
      usedSec: number;
      remainingSec: number;
      expiresAt: Date | null;
      isOver: boolean;
    } | null;
    status: AttendanceStatus | 'ON_BREAK';
    lateByMinutes: number;
    earlyByMinutes: number;
    penaltyMinutes: number;
    totals: {
      shortBreakSec: number;
      dinnerBreakSec: number;
      briefingSec: number;
      meetingSec: number;
      systemIssueSec: number;
    };
  };
  timeline: Array<{
    id: string;
    status: UserStatus;
    label: string;
    startedAt: Date;
    endedAt: Date | null;
    durationSec: number;
    note: string | null;
  }>;
  serverTime: Date;
}

function formatWindow(startHour: number, startMinute: number, endHour: number, endMinute: number, tz: string) {
  const fmt = (h: number, m: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
  };
  return `${fmt(startHour, startMinute)} – ${fmt(endHour, endMinute)} ${tz}`;
}

export async function getTodayForUser(userId: string): Promise<TodayResponse> {
  const now = new Date();
  const today = getBusinessDate(now);
  const [user, summary, currentStatus] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true, avatarUrl: true,
        department: true, designation: true, employeeId: true, teamName: true,
      },
    }),
    computeAttendanceDay(userId, today, { now }),
    getCurrentStatus(userId, (await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }))!.role),
  ]);
  if (!user) throw new Error('User not found');
  const cfg = summary.shiftConfig;

  const isBreak =
    currentStatus.status === UserStatus.SHORT_BREAK ||
    currentStatus.status === UserStatus.DINNER_BREAK ||
    currentStatus.status === UserStatus.BRIEFING_TRAINING ||
    currentStatus.status === UserStatus.MEETING ||
    currentStatus.status === UserStatus.SYSTEM_ISSUE;

  let breakInfo: TodayResponse['today']['currentBreak'] = null;
  if (isBreak) {
    const startedAt = currentStatus.startedAt;
    const allowed = getAllowedSecondsForStatus(currentStatus.status, cfg);
    const usedSec = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    const remainingSec = allowed !== null ? allowed - usedSec : Infinity;
    const expiresAt = allowed !== null ? new Date(startedAt.getTime() + allowed * 1000) : null;
    breakInfo = {
      type: currentStatus.status,
      label: statusLabel(currentStatus.status),
      startedAt,
      allowedSec: allowed ?? 0,
      usedSec,
      remainingSec: Number.isFinite(remainingSec) ? remainingSec : -1,
      expiresAt,
      isOver: Number.isFinite(remainingSec) ? remainingSec < 0 : false,
    };
  }

  const workedSeconds = summary.totalLoggedInSec;
  const remainingWorkSeconds = summary.firstLoginAt
    ? Math.max(0, cfg.expectedWorkSeconds - (workedSeconds - summary.totalBreakSec) - summary.totalProductiveSec + summary.totalProductiveSec)
    : cfg.expectedWorkSeconds;
  // Cleaner remaining = expected work minus productive (what counts). Use that.
  const cleanerRemaining = summary.firstLoginAt
    ? Math.max(0, cfg.expectedWorkSeconds - summary.totalProductiveSec)
    : cfg.expectedWorkSeconds;
  void remainingWorkSeconds;

  const todayStatus: AttendanceStatus | 'ON_BREAK' = isBreak
    ? 'ON_BREAK'
    : summary.firstLoginAt
      ? summary.status
      : AttendanceStatus.NOT_STARTED;

  const manager = await resolveManagerForUser(userId);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      designation: user.designation,
      department: user.department,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      teamName: user.teamName,
      manager: manager ? { id: manager.id, name: manager.name, email: manager.email } : null,
    },
    shift: {
      name: cfg.name,
      timezone: cfg.timezone,
      startAt: summary.shiftWindow.start,
      endAt: summary.shiftWindow.end,
      windowText: formatWindow(cfg.startHour, cfg.startMinute, cfg.endHour, cfg.endMinute, cfg.timezone),
      expectedWorkSeconds: cfg.expectedWorkSeconds,
    },
    today: {
      businessDate: summary.businessDate,
      currentStatus: currentStatus.status,
      currentStatusLabel: statusLabel(currentStatus.status),
      currentStatusSince: currentStatus.startedAt,
      firstLoginAt: summary.firstLoginAt,
      lastLogoutAt: summary.lastLogoutAt,
      isLoggedIn: !!summary.firstLoginAt && currentStatus.status !== UserStatus.OFFLINE,
      workedSeconds: summary.totalLoggedInSec,
      productiveSeconds: summary.totalProductiveSec,
      breakSeconds: summary.totalBreakSec,
      remainingWorkSeconds: cleanerRemaining,
      expectedLogoutAt: summary.expectedLogoutAt,
      currentBreak: breakInfo,
      status: todayStatus,
      lateByMinutes: summary.lateByMinutes,
      earlyByMinutes: summary.earlyByMinutes,
      penaltyMinutes: summary.penaltyMinutes,
      totals: {
        shortBreakSec: summary.shortBreakSec,
        dinnerBreakSec: summary.dinnerBreakSec,
        briefingSec: summary.briefingSec,
        meetingSec: summary.meetingSec,
        systemIssueSec: summary.systemIssueSec,
        // shortBreakSec: cfg.shortBreakSec,
        // dinnerBreakSec: cfg.dinnerBreakSec,
      },
    },
    timeline: summary.timeline,
    serverTime: now,
  };
}

export async function getCurrentBreakForUser(userId: string) {
  const now = new Date();
  const cfg = await resolveUserShiftConfig(userId);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) throw new Error('User not found');
  const status = await getCurrentStatus(userId, user.role);
  const isBreak =
    status.status === UserStatus.SHORT_BREAK ||
    status.status === UserStatus.DINNER_BREAK ||
    status.status === UserStatus.BRIEFING_TRAINING ||
    status.status === UserStatus.MEETING ||
    status.status === UserStatus.SYSTEM_ISSUE;
  if (!isBreak) return { inBreak: false };
  const allowed = getAllowedSecondsForStatus(status.status, cfg);
  const usedSec = Math.floor((now.getTime() - status.startedAt.getTime()) / 1000);
  const remainingSec = allowed !== null ? allowed - usedSec : -1;
  return {
    inBreak: true,
    type: status.status,
    label: statusLabel(status.status),
    startedAt: status.startedAt,
    allowedSec: allowed ?? 0,
    usedSec,
    remainingSec,
    expiresAt: allowed !== null ? new Date(status.startedAt.getTime() + allowed * 1000) : null,
    serverTime: now,
  };
}

export interface DayDetailResponse {
  businessDate: string;
  firstLoginAt: Date | null;
  lastLogoutAt: Date | null;
  totalLoggedInSec: number;
  totalProductiveSec: number;
  totalBreakSec: number;
  shortBreakSec: number;
  dinnerBreakSec: number;
  briefingSec: number;
  meetingSec: number;
  systemIssueSec: number;
  onlineSec: number;
  lateByMinutes: number;
  earlyByMinutes: number;
  penaltyMinutes: number;
  expectedLogoutAt: Date | null;
  status: AttendanceStatus;
  remarks: string | null;
  timeline: TodayResponse['timeline'];
  shift: {
    startAt: Date;
    endAt: Date;
  };
}

function parseDateParam(dateStr: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export async function getDayDetail(userId: string, dateStr: string): Promise<DayDetailResponse> {
  const date = parseDateParam(dateStr);
  const today = getBusinessDate(new Date());
  const isToday = date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);

  // First check if a persisted AttendanceDay exists (faster for historical)
  const persisted = await prisma.attendanceDay.findUnique({
    where: { userId_businessDate: { userId, businessDate: date } },
  });
  if (!isToday && persisted) {
    // Use persisted; rebuild timeline for detail screen
    const summary = await computeAttendanceDay(userId, date);
    return {
      businessDate: dateStr,
      firstLoginAt: persisted.firstLoginAt,
      lastLogoutAt: persisted.lastLogoutAt,
      totalLoggedInSec: persisted.totalLoggedInSec,
      totalProductiveSec: persisted.totalProductiveSec,
      totalBreakSec: persisted.totalBreakSec,
      shortBreakSec: persisted.shortBreakSec,
      dinnerBreakSec: persisted.dinnerBreakSec,
      briefingSec: persisted.briefingSec,
      meetingSec: persisted.meetingSec,
      systemIssueSec: persisted.systemIssueSec,
      onlineSec: persisted.onlineSec,
      lateByMinutes: persisted.lateByMinutes,
      earlyByMinutes: persisted.earlyByMinutes,
      penaltyMinutes: persisted.penaltyMinutes,
      expectedLogoutAt: persisted.expectedLogoutAt,
      status: persisted.status,
      remarks: persisted.remarks,
      timeline: summary.timeline,
      shift: { startAt: summary.shiftWindow.start, endAt: summary.shiftWindow.end },
    };
  }
  const summary = await computeAttendanceDay(userId, date);
  // Persist rollup for today/historical so it's faster next time
  await upsertAttendanceDay(userId, date, {
    firstLoginAt: summary.firstLoginAt,
    lastLogoutAt: summary.lastLogoutAt,
    totalLoggedInSec: summary.totalLoggedInSec,
    totalProductiveSec: summary.totalProductiveSec,
    totalBreakSec: summary.totalBreakSec,
    shortBreakSec: summary.shortBreakSec,
    dinnerBreakSec: summary.dinnerBreakSec,
    briefingSec: summary.briefingSec,
    meetingSec: summary.meetingSec,
    systemIssueSec: summary.systemIssueSec,
    onlineSec: summary.onlineSec,
    lateByMinutes: summary.lateByMinutes,
    earlyByMinutes: summary.earlyByMinutes,
    penaltyMinutes: summary.penaltyMinutes,
    expectedLogoutAt: summary.expectedLogoutAt,
    status: summary.status,
    remarks: null,
    computedAt: new Date(),
  } as any).catch(() => null);

  return {
    businessDate: dateStr,
    firstLoginAt: summary.firstLoginAt,
    lastLogoutAt: summary.lastLogoutAt,
    totalLoggedInSec: summary.totalLoggedInSec,
    totalProductiveSec: summary.totalProductiveSec,
    totalBreakSec: summary.totalBreakSec,
    shortBreakSec: summary.shortBreakSec,
    dinnerBreakSec: summary.dinnerBreakSec,
    briefingSec: summary.briefingSec,
    meetingSec: summary.meetingSec,
    systemIssueSec: summary.systemIssueSec,
    onlineSec: summary.onlineSec,
    lateByMinutes: summary.lateByMinutes,
    earlyByMinutes: summary.earlyByMinutes,
    penaltyMinutes: summary.penaltyMinutes,
    expectedLogoutAt: summary.expectedLogoutAt,
    status: summary.status,
    remarks: null,
    timeline: summary.timeline,
    shift: { startAt: summary.shiftWindow.start, endAt: summary.shiftWindow.end },
  };
}

export async function getMonthSummary(
  userId: string,
  monthStr: string,
): Promise<{ month: string; days: Array<{ date: string; status: AttendanceStatus; totalProductiveSec: number; penaltyMinutes: number; firstLoginAt: Date | null }> }> {
  // monthStr expected YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(monthStr)) throw new Error('Invalid month format. Expected YYYY-MM');
  const [y, m] = monthStr.split('-').map((v) => parseInt(v, 10));
  const startDate = new Date(Date.UTC(y, m - 1, 1));
  const endDate = new Date(Date.UTC(y, m, 0));
  const daysInMonth = endDate.getUTCDate();

  // Build list of date strings
  const dateList: Date[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dateList.push(new Date(Date.UTC(y, m - 1, d)));
  }

  const businessToday = getBusinessDateString(new Date());
  const results: Array<{ date: string; status: AttendanceStatus; totalProductiveSec: number; penaltyMinutes: number; firstLoginAt: Date | null }> = [];

  // Fetch existing rollups in bulk
  const existing = await prisma.attendanceDay.findMany({
    where: { userId, businessDate: { gte: startDate, lte: endDate } },
  });
  const existingMap = new Map<string, (typeof existing)[number]>();
  existing.forEach((e: any) => existingMap.set(e.businessDate.toISOString().slice(0, 10), e));

  for (const date of dateList) {
    const dateStr = date.toISOString().slice(0, 10);
    const isToday = dateStr === businessToday;
    let status: AttendanceStatus = AttendanceStatus.NOT_STARTED;
    let totalProductiveSec = 0;
    let penaltyMinutes = 0;
    let firstLoginAt: Date | null = null;

    const isFuture = date > new Date() && !isToday;
    if (isFuture) {
      // Don't compute future days; mark as NOT_STARTED
      results.push({ date: dateStr, status: AttendanceStatus.NOT_STARTED, totalProductiveSec: 0, penaltyMinutes: 0, firstLoginAt: null });
      continue;
    }

    const cached = existingMap.get(dateStr);
    if (cached && !isToday) {
      results.push({
        date: dateStr,
        status: cached.status,
        totalProductiveSec: cached.totalProductiveSec,
        penaltyMinutes: cached.penaltyMinutes,
        firstLoginAt: cached.firstLoginAt,
      });
      continue;
    }
    // Compute (light; does not load heavy relation details)
    const s = await computeAttendanceDay(userId, date);
    status = s.status;
    totalProductiveSec = s.totalProductiveSec;
    penaltyMinutes = s.penaltyMinutes;
    firstLoginAt = s.firstLoginAt;

    // Persist in background (do not await) to speed response
      upsertAttendanceDay(userId, date, {
      firstLoginAt: s.firstLoginAt,
      lastLogoutAt: s.lastLogoutAt,
      totalLoggedInSec: s.totalLoggedInSec,
      totalProductiveSec: s.totalProductiveSec,
      totalBreakSec: s.totalBreakSec,
      shortBreakSec: s.shortBreakSec,
      dinnerBreakSec: s.dinnerBreakSec,
      briefingSec: s.briefingSec,
      meetingSec: s.meetingSec,
      systemIssueSec: s.systemIssueSec,
      onlineSec: s.onlineSec,
      lateByMinutes: s.lateByMinutes,
      earlyByMinutes: s.earlyByMinutes,
      penaltyMinutes: s.penaltyMinutes,
      expectedLogoutAt: s.expectedLogoutAt,
      status: s.status,
      remarks: null,
      computedAt: new Date(),
    } as any).catch(() => null);

    results.push({ date: dateStr, status, totalProductiveSec, penaltyMinutes, firstLoginAt });
  }

  return { month: monthStr, days: results };
}

export async function getHistory(
  userId: string,
  query: { fromDate?: string; toDate?: string; page: number; pageSize: number },
) {
  // Paginate through AttendanceDay rollups
  const where: any = { userId };
  if (query.fromDate) where.businessDate = { ...(where.businessDate ?? {}), gte: parseDateParam(query.fromDate) };
  if (query.toDate) where.businessDate = { ...(where.businessDate ?? {}), lte: parseDateParam(query.toDate) };
  const [items, total] = await prisma.$transaction([
    prisma.attendanceDay.findMany({
      where,
      orderBy: { businessDate: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.attendanceDay.count({ where }),
  ]);
  return {
    items,
    pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
  };
}

/** Rolls up yesterday for all active users (runs after shift end). */
export async function rollUpAllForDate(date: Date) {
  const users = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null, role: { in: ['RECRUITER', 'TEAM_LEADER'] } },
    select: { id: true },
  });
  for (const u of users) {
    try {
      const s = await computeAttendanceDay(u.id, date);
      await upsertAttendanceDay(u.id, date, {
        firstLoginAt: s.firstLoginAt,
        lastLogoutAt: s.lastLogoutAt,
        totalLoggedInSec: s.totalLoggedInSec,
        totalProductiveSec: s.totalProductiveSec,
        totalBreakSec: s.totalBreakSec,
        shortBreakSec: s.shortBreakSec,
        dinnerBreakSec: s.dinnerBreakSec,
        briefingSec: s.briefingSec,
        meetingSec: s.meetingSec,
        systemIssueSec: s.systemIssueSec,
        onlineSec: s.onlineSec,
        lateByMinutes: s.lateByMinutes,
        earlyByMinutes: s.earlyByMinutes,
        penaltyMinutes: s.penaltyMinutes,
        expectedLogoutAt: s.expectedLogoutAt,
        status: s.status,
        remarks: null,
        computedAt: new Date(),
      } as any);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Failed to roll up attendance for ${u.id} on ${date.toISOString()}`, err);
    }
  }
}

import { UserStatus, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ApiError } from '@/utils/apiError';
import { getBusinessDateString, getBusinessShiftBounds } from '@/utils/businessDate';
import {
  ActivityRequester,
  CurrentStatusResponse,
  DailyActivitySummary,
  LiveStatusItem,
  LiveStatusMetrics,
  ProductivityMetrics,
} from './activity.types';

const BREAK_STATUSES = new Set<UserStatus>([
  UserStatus.SHORT_BREAK,
  UserStatus.DINNER_BREAK,
  UserStatus.BRIEFING_TRAINING,
  UserStatus.MEETING,
  UserStatus.SYSTEM_ISSUE,
]);

function isBreakStatus(s: UserStatus) {
  return BREAK_STATUSES.has(s);
}

const STALE_HEARTBEAT_THRESHOLD_MS = 40 * 60 * 1000; // 40 minutes

/**
 * Helper to check if a role should be tracked
 */
export function isTrackedRole(role: Role): boolean {
  return role === Role.RECRUITER || role === Role.TEAM_LEADER || role === Role.RESUME_ASSIST || role === Role.SALES_EXEC;
}

/**
 * Closes any open ActivityLog for the given user.
 */
async function closeOpenActivityLog(userId: string, closeTime: Date = new Date()) {
  const openLog = await prisma.activityLog.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });

  if (openLog) {
    await prisma.activityLog.update({
      where: { id: openLog.id },
      data: { endedAt: closeTime },
    });
  }
  return openLog;
}

/**
 * Changes a user's activity status.
 * Closes the previous active log and starts a new one.
 */
export async function changeStatus(
  userId: string,
  newStatus: UserStatus,
  optionalNote?: string | null,
  actorRole?: Role
): Promise<CurrentStatusResponse> {
  if (actorRole && !isTrackedRole(actorRole)) {
    throw ApiError.badRequest('Activity tracking is only applicable to Recruiters and Team Leaders.');
  }

  const now = new Date();

  // Find existing open log
  const openLog = await prisma.activityLog.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });

  // If status is unchanged and no new note, return current
  if (openLog && openLog.status === newStatus && openLog.optionalNote === (optionalNote ?? null)) {
    return {
      status: openLog.status,
      startedAt: openLog.startedAt,
      optionalNote: openLog.optionalNote,
      currentDurationSeconds: Math.floor((now.getTime() - openLog.startedAt.getTime()) / 1000),
    };
  }

  // Close previous open activity
  if (openLog) {
    await prisma.activityLog.update({
      where: { id: openLog.id },
      data: { endedAt: now },
    });
  }

  // Create new activity log
  const newLog = await prisma.activityLog.create({
    data: {
      userId,
      status: newStatus,
      startedAt: now,
      endedAt: newStatus === UserStatus.OFFLINE ? now : null,
      optionalNote: optionalNote ?? null,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { lastHeartbeatAt: now, lastActiveAt: now },
  });

  // Schedule mobile reminders when a break starts / shift is active.
  // We import lazily to avoid a circular dependency between modules.
  if (actorRole && isTrackedRole(actorRole)) {
    import('../../jobs/processors.js').then(({ scheduleBreakReminders, scheduleShiftRemindersIfNeeded }) => {
      if (isBreakStatus(newStatus)) {
        scheduleBreakReminders(userId, newStatus, newLog.startedAt).catch((err) => {
          logger.error({ err }, 'Failed to schedule break reminders');
        });
      } else if (newStatus === UserStatus.ACTIVE) {
        scheduleShiftRemindersIfNeeded(userId).catch((err) => {
          logger.error({ err }, 'Failed to schedule shift reminders');
        });
      }
    }).catch((err) => {
      logger.error({ err }, 'Reminders module loading failed');
    });
  }

  return {
    status: newLog.status,
    startedAt: newLog.startedAt,
    optionalNote: newLog.optionalNote,
    currentDurationSeconds: 0,
  };
}

/**
 * Called on user login / session restore: starts ACTIVE status (user is present).
 * User can then toggle to other break statuses.
 * Skipped if the user already has an open (non-OFFLINE) activity log,
 * so a page refresh does not interrupt an in-progress status change.
 */
export async function handleLoginEvent(userId: string, role: Role) {
  if (!isTrackedRole(role)) return;

  const now = new Date();

  // Check for an existing open log
  const openLog = await prisma.activityLog.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });

  // If already tracking an active (non-OFFLINE) status, do nothing
  if (openLog && openLog.status !== UserStatus.OFFLINE) return;

  // Close any stale log first (e.g. a dangling OFFLINE record)
  await closeOpenActivityLog(userId, now);

  // flow: login starts as ACTIVE (user productive and working)
  await prisma.activityLog.create({
    data: {
      userId,
      status: UserStatus.ACTIVE,
      startedAt: now,
      endedAt: null,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { lastHeartbeatAt: now, lastActiveAt: now },
  });
}

/**
 * Called on user logout: closes open activity and sets status to OFFLINE.
 */
export async function handleLogoutEvent(userId: string, role: Role) {
  if (!isTrackedRole(role)) return;

  const now = new Date();
  await closeOpenActivityLog(userId, now);

  await prisma.activityLog.create({
    data: {
      userId,
      status: UserStatus.OFFLINE,
      startedAt: now,
      endedAt: now,
    },
  });
}

/**
 * Processes periodic heartbeat from frontend.
 * Auto-closes stale sessions if heartbeats were missed.
 */
export async function processHeartbeat(userId: string, role: Role) {
  if (!isTrackedRole(role)) return { status: 'OK' };

  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastHeartbeatAt: true },
  });

  const lastHeartbeat = user?.lastHeartbeatAt;

  // Check for stale open activity
  const openLog = await prisma.activityLog.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });

  if (
    openLog &&
    lastHeartbeat &&
    (openLog.status === UserStatus.ACTIVE)
  ) {
    const timeSinceLastHeartbeat = now.getTime() - lastHeartbeat.getTime();
    if (timeSinceLastHeartbeat > STALE_HEARTBEAT_THRESHOLD_MS) {
      // Auto-close stale log at last known heartbeat time + threshold (up to now)
      const adjustedCloseTime = new Date(Math.min(lastHeartbeat.getTime() + STALE_HEARTBEAT_THRESHOLD_MS, now.getTime()));
      await prisma.activityLog.update({
        where: { id: openLog.id },
        data: { endedAt: adjustedCloseTime },
      });

      // Transition to OFFLINE
      await prisma.activityLog.create({
        data: {
          userId,
          status: UserStatus.OFFLINE,
          startedAt: adjustedCloseTime,
          endedAt: now,
          optionalNote: 'Disconnected due to inactivity',
        },
      });



      // Throw Unauthorized to trigger immediate logout on the user screen
      throw ApiError.unauthorized('Session expired due to inactivity');
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lastHeartbeatAt: now, lastActiveAt: now },
  });

  return { status: 'OK' };
}

/**
 * Gets the current active status for the logged-in user.
 */
export async function getCurrentStatus(userId: string, role: Role): Promise<CurrentStatusResponse> {
  const now = new Date();

  if (!isTrackedRole(role)) {
    return {
      status: UserStatus.ACTIVE,
      startedAt: now,
      optionalNote: null,
      currentDurationSeconds: 0,
    };
  }

  const openLog = await prisma.activityLog.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });

  if (!openLog) {
    return {
      status: UserStatus.OFFLINE,
      startedAt: now,
      optionalNote: null,
      currentDurationSeconds: 0,
    };
  }

  return {
    status: openLog.status,
    startedAt: openLog.startedAt,
    optionalNote: openLog.optionalNote,
    currentDurationSeconds: Math.floor((now.getTime() - openLog.startedAt.getTime()) / 1000),
  };
}

/**
 * Calculates today's activity metrics and logs breakdown for a user.
 */
export async function getTodayActivity(userId: string): Promise<DailyActivitySummary> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, lastHeartbeatAt: true },
  });
  if (!user) throw ApiError.notFound('User not found');

  const lastHb = user.lastHeartbeatAt;
  const isStale = lastHb && (now.getTime() - lastHb.getTime() > STALE_HEARTBEAT_THRESHOLD_MS);

  const logs = await prisma.activityLog.findMany({
    where: {
      userId,
      OR: [
        { startedAt: { gte: startOfToday } },
        { endedAt: null },
        { endedAt: { gte: startOfToday } },
      ],
    },
    orderBy: { startedAt: 'asc' },
  });

  let totalLoggedInSeconds = 0;
  let totalProductiveSeconds = 0;
  let totalOnlineSeconds = 0;
  let shortBreakSeconds = 0;
  let dinnerBreakSeconds = 0;
  let briefingTrainingSeconds = 0;
  let meetingSeconds = 0;
  let systemIssueSeconds = 0;

  let firstLogin: Date | null = null;
  let lastLogout: Date | null = null;

  const formattedLogs = logs.map((log) => {
    const logStart = log.startedAt < startOfToday ? startOfToday : log.startedAt;
    let logEnd = log.endedAt;
    if (!logEnd) {
      if (isStale && log.status === UserStatus.ACTIVE && lastHb) {
        logEnd = new Date(Math.min(lastHb.getTime() + STALE_HEARTBEAT_THRESHOLD_MS, now.getTime()));
      } else {
        logEnd = now;
      }
    }
    const durationSeconds = Math.max(0, Math.floor((logEnd.getTime() - logStart.getTime()) / 1000));

    if (!firstLogin && log.status !== UserStatus.OFFLINE) {
      firstLogin = log.startedAt;
    }
    if (log.status === UserStatus.OFFLINE) {
      lastLogout = log.startedAt;
    }

    if (log.status !== UserStatus.OFFLINE) {
      totalLoggedInSeconds += durationSeconds;
    }

    switch (log.status) {
      case UserStatus.ACTIVE:
        totalProductiveSeconds += durationSeconds;
        break;
      case UserStatus.SHORT_BREAK:
        shortBreakSeconds += durationSeconds;
        break;
      case UserStatus.DINNER_BREAK:
        dinnerBreakSeconds += durationSeconds;
        break;
      case UserStatus.BRIEFING_TRAINING:
        briefingTrainingSeconds += durationSeconds;
        break;
      case UserStatus.MEETING:
        meetingSeconds += durationSeconds;
        break;
      case UserStatus.SYSTEM_ISSUE:
        systemIssueSeconds += durationSeconds;
        break;
    }

    return {
      id: log.id,
      status: log.status,
      startedAt: log.startedAt,
      endedAt: log.endedAt,
      durationSeconds,
      optionalNote: log.optionalNote,
    };
  });

  const totalBreakSeconds =
    shortBreakSeconds + dinnerBreakSeconds + briefingTrainingSeconds + meetingSeconds + systemIssueSeconds;

  const currentLog = logs.find((l) => l.endedAt === null) ?? logs[logs.length - 1];
  const currentStatus = currentLog ? currentLog.status : UserStatus.OFFLINE;
  const currentDurationSeconds = currentLog
    ? Math.max(0, Math.floor((now.getTime() - currentLog.startedAt.getTime()) / 1000))
    : 0;

  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    role: user.role,
    date: startOfToday.toISOString().slice(0, 10),
    loginTime: firstLogin,
    logoutTime: lastLogout,
    totalLoggedInSeconds,
    totalProductiveSeconds,
    totalOnlineSeconds,
    totalBreakSeconds,
    breakDetails: {
      shortBreakSeconds,
      dinnerBreakSeconds,
      briefingTrainingSeconds,
      meetingSeconds,
      systemIssueSeconds,
      onlineSeconds: totalOnlineSeconds,
    },
    currentStatus,
    currentDurationSeconds,
    logs: formattedLogs,
  };
}

/**
 * Returns available users for filtering activity logs based on actor role.
 */
export async function getActivityUsers(requester: ActivityRequester) {
  const where: any = {
    deletedAt: null,
    isActive: true,
  };

  if (requester.role === Role.ADMIN) {
    where.role = { in: [Role.RECRUITER, Role.TEAM_LEADER, Role.RESUME_ASSIST, Role.SALES_EXEC] };
  } else if (requester.role === Role.TEAM_LEADER) {
    where.OR = [{ id: requester.id }, { createdById: requester.id }];
  } else {
    where.id = requester.id;
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  });

  return users;
}

/**
 * Returns real-time status metrics of team members for Admin and TL dashboards.
 */
export async function getLiveStatusMetrics(requester: ActivityRequester): Promise<LiveStatusMetrics> {
  const now = new Date();

  // Admin sees all recruiters & TLs; TL sees team members created by them plus themselves
  const userWhere: any = {
    deletedAt: null,
    isActive: true,
    role: { in: [Role.RECRUITER, Role.TEAM_LEADER, Role.RESUME_ASSIST, Role.SALES_EXEC] },
  };

  if (requester.role === Role.TEAM_LEADER) {
    userWhere.OR = [{ id: requester.id }, { createdById: requester.id }];
  }

  const users = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdById: true,
      teamName: true,
      lastHeartbeatAt: true,
    },
    orderBy: { name: 'asc' },
  });

  const userIds = users.map((u) => u.id);

  // Fetch current open logs
  const openLogs = await prisma.activityLog.findMany({
    where: {
      userId: { in: userIds },
      endedAt: null,
    },
    orderBy: { startedAt: 'desc' },
  });

  const openLogMap = new Map<string, typeof openLogs[0]>();
  openLogs.forEach((log) => {
    if (!openLogMap.has(log.userId)) openLogMap.set(log.userId, log);
  });

  // Calculate today's productive & break time per user
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayLogs = await prisma.activityLog.findMany({
    where: {
      userId: { in: userIds },
      startedAt: { gte: startOfToday },
    },
  });

  const lastHeartbeatMap = new Map<string, Date>();
  users.forEach((u) => {
    if (u.lastHeartbeatAt) lastHeartbeatMap.set(u.id, u.lastHeartbeatAt);
  });

  const productiveTimeMap = new Map<string, number>();
  const breakTimeMap = new Map<string, number>();

  todayLogs.forEach((log) => {
    let end = log.endedAt;
    if (!end) {
      const lastHb = lastHeartbeatMap.get(log.userId);
      const isStale = lastHb && (now.getTime() - lastHb.getTime() > STALE_HEARTBEAT_THRESHOLD_MS);
      if (isStale && log.status === UserStatus.ACTIVE && lastHb) {
        end = new Date(Math.min(lastHb.getTime() + STALE_HEARTBEAT_THRESHOLD_MS, now.getTime()));
      } else {
        end = now;
      }
    }
    const dur = Math.max(0, Math.floor((end.getTime() - log.startedAt.getTime()) / 1000));
    if (log.status === UserStatus.ACTIVE) {
      productiveTimeMap.set(log.userId, (productiveTimeMap.get(log.userId) ?? 0) + dur);
    } else if (log.status !== UserStatus.OFFLINE) {
      breakTimeMap.set(log.userId, (breakTimeMap.get(log.userId) ?? 0) + dur);
    }
  });

  let totalActiveCount = 0;
  let totalBreakCount = 0;
  let totalIssueCount = 0;
  let totalOfflineCount = 0;

  const members: LiveStatusItem[] = users.map((u) => {
    const log = openLogMap.get(u.id);
    const status = log ? log.status : UserStatus.OFFLINE;
    const startedAt = log ? log.startedAt : now;
    const currentDurationSeconds = log ? Math.floor((now.getTime() - log.startedAt.getTime()) / 1000) : 0;
    const isOnline =
      !!u.lastHeartbeatAt && now.getTime() - u.lastHeartbeatAt.getTime() <= STALE_HEARTBEAT_THRESHOLD_MS;

    const statusToShow = (isOnline || (status !== UserStatus.ACTIVE)) ? status : UserStatus.OFFLINE;

    if (statusToShow === UserStatus.ACTIVE) {
      totalActiveCount++;
    } else if (statusToShow === UserStatus.SYSTEM_ISSUE) {
      totalIssueCount++;
    } else if (statusToShow === UserStatus.OFFLINE) {
      totalOfflineCount++;
    } else {
      totalBreakCount++;
    }

    const todayProductiveSeconds = productiveTimeMap.get(u.id) ?? 0;
    const todayBreakSeconds = breakTimeMap.get(u.id) ?? 0;

    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdById: u.createdById,
      teamName: u.teamName ?? null,
      status: statusToShow,
      startedAt,
      currentDurationSeconds,
      optionalNote: log?.optionalNote ?? null,
      todayLoggedInSeconds: todayProductiveSeconds + todayBreakSeconds,
      todayProductiveSeconds,
      todayBreakSeconds,
      lastHeartbeatAt: u.lastHeartbeatAt,
      isOnline,
    };
  });

  return {
    totalActiveCount,
    totalBreakCount,
    totalIssueCount,
    totalOfflineCount,
    members,
  };
}

/**
 * Paginated historical activity logs for reporting & audit.
 */
export async function getActivityHistory(
  query: { userId?: string; fromDate?: string; toDate?: string; status?: UserStatus; page: number; pageSize: number; role?: string },
  requester: ActivityRequester
) {
  const where: any = {};

  if (query.role) {
    where.user = { role: query.role };
  }

  if (query.userId) {
    if (requester.role === Role.TEAM_LEADER) {
      const allowedUser = await prisma.user.findFirst({
        where: {
          id: query.userId,
          deletedAt: null,
          OR: [{ id: requester.id }, { createdById: requester.id }],
        },
      });
      if (!allowedUser) {
        throw ApiError.forbidden('You can only view activity for members in your team.');
      }
    } else if ((requester.role === Role.RECRUITER || requester.role === Role.RESUME_ASSIST || requester.role === Role.SALES_EXEC) && query.userId !== requester.id) {
      throw ApiError.forbidden('You can only view your own activity.');
    }
    where.userId = query.userId;
  } else if (requester.role === Role.TEAM_LEADER) {
    const teamUsers = await prisma.user.findMany({
      where: { createdById: requester.id, deletedAt: null },
      select: { id: true },
    });
    where.userId = { in: [requester.id, ...teamUsers.map((u) => u.id)] };
  } else if (requester.role === Role.RECRUITER || requester.role === Role.RESUME_ASSIST || requester.role === Role.SALES_EXEC) {
    where.userId = requester.id;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.fromDate || query.toDate) {
    const startBounds = query.fromDate ? getBusinessShiftBounds(query.fromDate) : null;
    const endBounds = query.toDate ? getBusinessShiftBounds(query.toDate) : null;
    where.startedAt = {
      ...(startBounds ? { gte: startBounds.start } : {}),
      ...(endBounds ? { lte: endBounds.end } : {}),
    };
  }

  const [items, total] = await prisma.$transaction([
    prisma.activityLog.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return {
    items: items.map((item) => {
      const end = item.endedAt ?? new Date();
      const durationSeconds = Math.max(0, Math.floor((end.getTime() - item.startedAt.getTime()) / 1000));
      return {
        ...item,
        durationSeconds,
      };
    }),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

/**
 * Calculates overall shift utilization & productivity metrics for Admin & TL dashboards.
 */
export async function getProductivityMetrics(
  query: { fromDate?: string; toDate?: string; recruiterId?: string },
  requester: ActivityRequester
): Promise<ProductivityMetrics> {
  const now = new Date();
  const defaultFrom = getBusinessDateString(now);

  const fromDate = query.fromDate || defaultFrom;
  const toDate = query.toDate || defaultFrom;

  const startBounds = getBusinessShiftBounds(fromDate);
  const endBounds = getBusinessShiftBounds(toDate);

  const where: any = {
    startedAt: {
      gte: startBounds.start,
      lte: endBounds.end,
    },
  };

  if (query.recruiterId) {
    if (requester.role !== Role.ADMIN && requester.role !== Role.TEAM_LEADER) {
      where.userId = requester.id;
    } else {
      where.userId = query.recruiterId;
    }
  } else if (requester.role === Role.TEAM_LEADER) {
    const teamUsers = await prisma.user.findMany({
      where: { createdById: requester.id, deletedAt: null },
      select: { id: true },
    });
    where.userId = { in: [requester.id, ...teamUsers.map((u) => u.id)] };
  } else if (requester.role !== Role.ADMIN) {
    where.userId = requester.id;
  }

  const logs = await prisma.activityLog.findMany({ where });

  let totalProductiveSecs = 0;
  let totalBreakSecs = 0;
  const uniqueUsers = new Set<string>();

  logs.forEach((log) => {
    uniqueUsers.add(log.userId);
    const logStart = log.startedAt < startBounds.start ? startBounds.start : log.startedAt;
    const logEnd = (log.endedAt && log.endedAt < endBounds.end) ? log.endedAt : (now < endBounds.end ? now : endBounds.end);
    const dur = Math.max(0, Math.floor((logEnd.getTime() - logStart.getTime()) / 1000));

    if (log.status === UserStatus.ACTIVE) {
      totalProductiveSecs += dur;
    } else if (log.status !== UserStatus.OFFLINE) {
      totalBreakSecs += dur;
    }
  });

  const totalProductiveHours = Number((totalProductiveSecs / 3600).toFixed(2));
  const totalBreakHours = Number((totalBreakSecs / 3600).toFixed(2));
  const activeUsersCount = uniqueUsers.size;
  const averageProductiveHoursPerUser =
    activeUsersCount > 0 ? Number((totalProductiveHours / activeUsersCount).toFixed(2)) : 0;

  const totalLoggedSecs = totalProductiveSecs + totalBreakSecs;
  const shiftUtilizationPercentage =
    totalLoggedSecs > 0 ? Math.min(100, Number(((totalProductiveSecs / totalLoggedSecs) * 100).toFixed(1))) : 0;

  return {
    totalProductiveHours,
    totalBreakHours,
    averageProductiveHoursPerUser,
    shiftUtilizationPercentage,
    attendancePercentage: activeUsersCount > 0 ? 100 : 0,
    activeUsersCount,
  };
}

/**
 * Detailed Attendance & Shift Metrics Report for Admin export.
 */
export async function getAttendanceReport(
  query: { fromDate?: string; toDate?: string; recruiterId?: string },
  requester: ActivityRequester
) {
  const now = new Date();
  const defaultDate = getBusinessDateString(now);
  const fromDate = query.fromDate || defaultDate;
  const toDate = query.toDate || defaultDate;

  const userWhere: any = {
    deletedAt: null,
    isActive: true,
    role: { in: [Role.RECRUITER, Role.TEAM_LEADER, Role.RESUME_ASSIST, Role.SALES_EXEC] },
  };

  if (query.recruiterId) {
    userWhere.id = query.recruiterId;
  } else if (requester.role === Role.TEAM_LEADER) {
    userWhere.OR = [{ id: requester.id }, { createdById: requester.id }];
  }

  const users = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { name: 'asc' },
  });

  const startBounds = getBusinessShiftBounds(fromDate);
  const endBounds = getBusinessShiftBounds(toDate);

  const logs = await prisma.activityLog.findMany({
    where: {
      userId: { in: users.map((u) => u.id) },
      startedAt: {
        gte: startBounds.start,
        lte: endBounds.end,
      },
    },
    orderBy: { startedAt: 'asc' },
  });

  const userLogsMap = new Map<string, typeof logs>();
  logs.forEach((log) => {
    if (!userLogsMap.has(log.userId)) userLogsMap.set(log.userId, []);
    userLogsMap.get(log.userId)!.push(log);
  });

  const reports = users.map((user) => {
    const uLogs = userLogsMap.get(user.id) ?? [];
    let firstLogin: Date | null = null;
    let lastLogout: Date | null = null;
    let totalLoggedInSeconds = 0;
    let totalProductiveSeconds = 0;
    let shortBreakSeconds = 0;
    let dinnerBreakSeconds = 0;
    let briefingTrainingSeconds = 0;
    let meetingSeconds = 0;
    let systemIssueSeconds = 0;

    uLogs.forEach((log) => {
      const logStart = log.startedAt < startBounds.start ? startBounds.start : log.startedAt;
      const logEnd = (log.endedAt && log.endedAt < endBounds.end) ? log.endedAt : (now < endBounds.end ? now : endBounds.end);
      const dur = Math.max(0, Math.floor((logEnd.getTime() - logStart.getTime()) / 1000));

      if (!firstLogin && log.status !== UserStatus.OFFLINE) {
        firstLogin = log.startedAt;
      }
      if (log.status === UserStatus.OFFLINE) {
        lastLogout = log.startedAt;
      }

      if (log.status !== UserStatus.OFFLINE) {
        totalLoggedInSeconds += dur;
      }

      switch (log.status) {
        case UserStatus.ACTIVE:
          totalProductiveSeconds += dur;
          break;
        case UserStatus.SHORT_BREAK:
          shortBreakSeconds += dur;
          break;
        case UserStatus.DINNER_BREAK:
          dinnerBreakSeconds += dur;
          break;
        case UserStatus.BRIEFING_TRAINING:
          briefingTrainingSeconds += dur;
          break;
        case UserStatus.MEETING:
          meetingSeconds += dur;
          break;
        case UserStatus.SYSTEM_ISSUE:
          systemIssueSeconds += dur;
          break;
      }
    });

    const totalBreakSeconds =
      shortBreakSeconds + dinnerBreakSeconds + briefingTrainingSeconds + meetingSeconds + systemIssueSeconds;

    const shiftUtilization =
      totalLoggedInSeconds > 0
        ? Math.min(100, Math.round((totalProductiveSeconds / totalLoggedInSeconds) * 100))
        : 0;

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      managerName: user.createdBy?.name ?? 'Admin',
      firstLogin,
      lastLogout,
      totalLoggedInHours: Number((totalLoggedInSeconds / 3600).toFixed(2)),
      totalProductiveHours: Number((totalProductiveSeconds / 3600).toFixed(2)),
      totalBreakHours: Number((totalBreakSeconds / 3600).toFixed(2)),
      shortBreakHours: Number((shortBreakSeconds / 3600).toFixed(2)),
      dinnerBreakHours: Number((dinnerBreakSeconds / 3600).toFixed(2)),
      meetingHours: Number((meetingSeconds / 3600).toFixed(2)),
      briefingHours: Number((briefingTrainingSeconds / 3600).toFixed(2)),
      downtimeHours: Number((systemIssueSeconds / 3600).toFixed(2)),
      shiftUtilization,
      attendanceStatus: (firstLogin && totalLoggedInSeconds >= 900) ? 'Present' : 'Absent',
    };
  });

  return {
    fromDate,
    toDate,
    reports,
  };
}

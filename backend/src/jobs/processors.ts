/**
 * BullMQ / node-cron job processors.
 *
 * Reminder rules (server-side; mobile NEVER computes these):
 *  - When a break begins, enqueue checks at allowed -5m, allowed -2m, allowed (expired).
 *  - When shift end approaches, enqueue 15m and 5m reminders.
 *  - After shift end, roll up the day.
 *
 * This module exports processors to be registered at server boot and helper
 * functions that other services call to schedule reminders.
 */
import { NotificationType, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Jobs, registerProcessor } from '@/lib/queue';
import { enqueue } from '@/lib/queue';
import {
  createNotification,
  dispatchNotification,
} from '@/modules/notifications/notifications.service';
import {
  getAllowedSecondsForStatus,
  resolveUserShiftConfig,
  getShiftWindowForDate,
  statusLabel,
  computeAttendanceDay,
  upsertAttendanceDay,
} from '@/modules/shifts/shift.service';
import { rollUpAllForDate } from '@/modules/attendance/attendance.service';
import { getBusinessDate } from '@/utils/businessDate';
import { getCurrentStatus } from '@/modules/activity/activity.service';
import { logger } from '@/lib/logger';

/**
 * Schedule reminders for a break that just started. Called by activity.service.changeStatus
 * when a new break status begins (short/dinner/briefing/meeting/system-issue).
 * If allowed seconds is null (unlimited, e.g. SYSTEM_ISSUE), no expiry reminders are scheduled.
 */
export async function scheduleBreakReminders(userId: string, status: UserStatus, startedAt: Date) {
  const cfg = await resolveUserShiftConfig(userId);
  const allowed = getAllowedSecondsForStatus(status, cfg);
  if (allowed === null) return; // unlimited
  const now = Date.now();
  const startMs = startedAt.getTime();

  const thresholds = [
    { label: '5 minutes remaining', offsetSec: allowed - 5 * 60, type: NotificationType.BREAK_5MIN },
    { label: '2 minutes remaining', offsetSec: allowed - 2 * 60, type: NotificationType.BREAK_2MIN },
    { label: 'break expired', offsetSec: allowed, type: NotificationType.BREAK_EXPIRED },
  ];
  for (const t of thresholds) {
    const fireAt = startMs + t.offsetSec * 1000;
    const delay = Math.max(0, fireAt - now);
    const breakLabel = statusLabel(status);
    await enqueue(
      Jobs.BreakReminder,
      {
        userId,
        type: t.type,
        expectedStatus: status,
        startedAt: startedAt.toISOString(),
        allowedSec: allowed,
        title:
          t.type === NotificationType.BREAK_EXPIRED
            ? `${breakLabel} time exceeded`
            : `${breakLabel}: ${t.label}`,
        body:
          t.type === NotificationType.BREAK_EXPIRED
            ? `Your ${breakLabel.toLowerCase()} is over. Please resume work.`
            : `You have ${t.label.toLowerCase()} left in your ${breakLabel.toLowerCase()}.`,
        data: { screen: 'Home' },
      },
      { delay },
    );
  }
}

export async function cancelBreakReminders(_userId: string) {
  // BullMQ jobs are not uniquely tracked per user; we rely on expectedStatus checks
  // at fire time (i.e. if user is no longer on that break, we skip sending).
}

/** Schedule shift-end reminders for a user's current active shift. */
export async function scheduleShiftRemindersIfNeeded(userId: string) {
  const cfg = await resolveUserShiftConfig(userId);
  const today = getBusinessDate(new Date());
  const window = getShiftWindowForDate(today.toISOString().slice(0, 10), cfg);
  const now = Date.now();

  const thresholds = [
    { offsetMs: -15 * 60 * 1000, type: NotificationType.SHIFT_ENDING_15MIN, body: '15 minutes remaining in your shift.' },
    { offsetMs: -5 * 60 * 1000, type: NotificationType.SHIFT_ENDING_5MIN, body: '5 minutes remaining in your shift.' },
  ];

  for (const t of thresholds) {
    const fireAt = window.end.getTime() + t.offsetMs;
    const delay = Math.max(0, fireAt - now);
    if (delay === 0) continue; // already past
    await enqueue(
      Jobs.ShiftEndReminder,
      {
        userId,
        type: t.type,
        title: 'Shift ending soon',
        body: t.body,
        data: { screen: 'Home' },
      },
      { delay },
    );
  }

  // Roll up attendance day 15 minutes after shift end (so post-logout activity is captured).
  const rollupDelay = Math.max(0, window.end.getTime() + 15 * 60 * 1000 - now);
  await enqueue(
    Jobs.RollupAttendanceDay,
    { userId, businessDate: today.toISOString() },
    { delay: rollupDelay },
  );
}

// ---- Processors ----

async function processBreakReminder(payload: any) {
  const { userId, expectedStatus, startedAt, title, body, type, data } = payload;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });
  if (!user || !user.isActive) return;
  const current = await getCurrentStatus(userId, user.role);
  // Only send if the user is still on the same break that was active when scheduled
  if (current.status !== expectedStatus) return;
  // Extra guard: if the start time drifted (break was restarted), ignore
  if (new Date(startedAt).getTime() !== new Date(current.startedAt).getTime()) return;

  await createNotification({
    userId,
    type,
    title,
    body,
    data,
  });
}

async function processShiftEndReminder(payload: any) {
  const { userId, title, body, type, data } = payload;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
  if (!user || !user.isActive) return;
  await createNotification({
    userId,
    type,
    title,
    body,
    data,
  });
}

async function processDispatchNotification(payload: any) {
  await dispatchNotification(payload.notificationId);
}

async function processRollupDay(payload: any) {
  const { userId, businessDate: dateStr } = payload;
  const date = new Date(dateStr);
  // Recompute+persist single user's day
  const s = await computeAttendanceDay(userId, date);
  await upsertAttendanceDay(userId, date, {
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
  logger.info({ userId, businessDate: dateStr }, 'Rolled up attendance day for user');
}

async function processRollupAll() {
  // Daily rollup: run at shift end + buffer. Use yesterday's business date.
  const yesterday = new Date(getBusinessDate(new Date()).getTime() - 24 * 60 * 60 * 1000);
  await rollUpAllForDate(yesterday);
}

export async function registerJobProcessors() {
  const registrations = [
    [Jobs.BreakReminder, registerProcessor(Jobs.BreakReminder, processBreakReminder)],
    [Jobs.ShiftEndReminder, registerProcessor(Jobs.ShiftEndReminder, processShiftEndReminder)],
    [Jobs.DispatchNotification, registerProcessor(Jobs.DispatchNotification, processDispatchNotification)],
    [Jobs.RollupAttendanceDay, registerProcessor(Jobs.RollupAttendanceDay, processRollupDay)],
    [Jobs.RollupAllToday, registerProcessor(Jobs.RollupAllToday, processRollupAll)],
  ] as const;

  const results = await Promise.allSettled(registrations.map(([, promise]) => promise));
  const failed = results
    .map((result, idx) => ({ result, job: registrations[idx][0] }))
    .filter((x) => x.result.status === 'rejected');

  if (failed.length > 0) {
    for (const f of failed) {
      logger.error({ job: f.job, err: (f.result as PromiseRejectedResult).reason }, 'Failed to register queue processor');
    }
    throw new Error(`Failed to register ${failed.length} queue processor(s)`);
  }
}

/** Schedule periodic jobs (daily rollup) — called once at server boot. */
export function startPeriodicJobs() {
  // Schedule a daily rollup to catch up anything missed.
  // Prefer BullMQ repeat; if using node-cron fallback, use node-cron directly.
  enqueue(Jobs.RollupAllToday, {}, {}).catch(() => {});

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cron = require('node-cron');
    if (cron?.schedule) {
      // Run at 8:00 AM IST (02:30 UTC) daily — shortly after typical night shift end
      cron.schedule('30 2 * * *', () => {
        processRollupAll().catch((err: any) => logger.error({ err }, 'Daily rollup failed'));
      }, { timezone: 'UTC' });
    }
  } catch {
    // node-cron is available; if not installed, periodic job only runs at boot.
  }
}

/**
 * Business Shift / Business Date Utilities
 * ------------------------------------------------------------------
 * Mayzax operates a night shift (IST):
 *   Shift START: 7:30 PM IST
 *   Shift END:   7:30 AM IST (next calendar day)
 *
 * All analytics, reports, and duplicate-window logic must key off the
 * "business date" rather than the raw calendar date, because a shift
 * spans midnight.
 *
 * Examples (IST):
 *   8:00 PM, Jul 3   -> businessDate = Jul 3   (shift just started)
 *   1:00 AM, Jul 4   -> businessDate = Jul 3   (still in Jul 3's shift)
 *   4:00 AM, Jul 4   -> businessDate = Jul 3   (still in Jul 3's shift)
 *   7:30 AM, Jul 4   -> businessDate = Jul 3   (shift end boundary, inclusive)
 *   7:31 AM, Jul 4   -> businessDate = Jul 4   (outside shift -> own day)
 *   10:00 AM, Jul 4  -> businessDate = Jul 4   (daytime, no active shift)
 *   7:30 PM, Jul 4   -> businessDate = Jul 4   (new shift starts)
 * ------------------------------------------------------------------
 */

import { env } from '@/config/env';

interface ISTParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Extracts calendar/time parts of a given timestamp as observed in IST,
 * regardless of the server's local timezone.
 */
function getISTParts(date: Date): ISTParts {
  const { timezone } = getShiftConfig();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
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
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }

  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0; // Intl sometimes returns "24" for midnight in hour12:false

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour,
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
  };
}

/** Builds a UTC-midnight Date object representing a pure calendar date (for @db.Date columns). */
function buildDateOnly(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/** Adds `days` (can be negative) to a Y/M/D triple, returning a normalized {year, month, day}. */
function addDays(year: number, month: number, day: number, days: number) {
  const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  d.setUTCDate(d.getUTCDate() + days);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function minutesOfDay(hour: number, minute: number): number {
  return hour * 60 + minute;
}

function getShiftConfig() {
  const startHour = env.BUSINESS_SHIFT_START_HOUR;
  const startMinute = env.BUSINESS_SHIFT_START_MINUTE;
  const endHour = env.BUSINESS_SHIFT_END_HOUR;
  const endMinute = env.BUSINESS_SHIFT_END_MINUTE;
  const timezone = env.BUSINESS_TIMEZONE;
  return {
    startHour,
    startMinute,
    endHour,
    endMinute,
    timezone,
    startMinutes: minutesOfDay(startHour, startMinute),
    endMinutes: minutesOfDay(endHour, endMinute),
  };
}

/**
 * Computes the "business date" for a given timestamp per Mayzax's night-shift rules.
 *
 * Rule:
 *  - If time-of-day (IST) >= shift start (19:30) => business date = same IST calendar date.
 *  - Else if time-of-day (IST) <= shift end (07:30) => business date = previous IST calendar date.
 *  - Else (daytime, between 07:30 and 19:30, no active shift) => business date = same IST calendar date.
 *
 * @param timestamp Date, ISO string, or epoch millis. Defaults to "now".
 * @returns A UTC-midnight Date representing the business date (safe for Postgres DATE columns).
 */
export function getBusinessDate(timestamp: Date | string | number = new Date()): Date {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`getBusinessDate received an invalid timestamp: ${timestamp}`);
  }

  const { startMinutes, endMinutes } = getShiftConfig();
  const { year, month, day, hour, minute } = getISTParts(date);
  const currentMinutes = minutesOfDay(hour, minute);

  if (currentMinutes >= startMinutes) {
    // Evening shift just began today -> belongs to today's business date.
    return buildDateOnly(year, month, day);
  }

  if (currentMinutes <= endMinutes) {
    // Still within the shift that started the previous evening.
    const prev = addDays(year, month, day, -1);
    return buildDateOnly(prev.year, prev.month, prev.day);
  }

  // Daytime, no active shift -> falls on its own calendar date.
  return buildDateOnly(year, month, day);
}

/** Returns the business date formatted as `YYYY-MM-DD`. */
export function getBusinessDateString(timestamp: Date | string | number = new Date()): string {
  const d = getBusinessDate(timestamp);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns true if the given timestamp falls within an active business shift window
 * (19:30 IST -> 07:30 IST next day).
 */
export function isWithinBusinessShift(timestamp: Date | string | number = new Date()): boolean {
  const { startMinutes, endMinutes } = getShiftConfig();
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const { hour, minute } = getISTParts(date);
  const currentMinutes = minutesOfDay(hour, minute);
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

/**
 * Given a business date (YYYY-MM-DD or Date), returns the actual UTC start/end
 * instants of that shift window - useful for building DB range queries
 * (e.g. "applications submitted in current business shift").
 */
export function getBusinessShiftBounds(businessDate: string | Date): { start: Date; end: Date } {
  const { startHour, startMinute, endHour, endMinute } = getShiftConfig();
  const dateStr = typeof businessDate === 'string' ? businessDate : businessDate.toISOString().slice(0, 10);
  const [year, month, day] = dateStr.split('-').map((v) => parseInt(v, 10));

  // Shift start: businessDate at startHour:startMinute IST -> convert to UTC instant.
  const start = istWallClockToUtc(year, month, day, startHour, startMinute, 0);

  // Shift end: businessDate + 1 day at endHour:endMinute:00 IST (inclusive), we use endHour:endMinute:59.999 to include the boundary minute.
  const next = addDays(year, month, day, 1);
  const end = istWallClockToUtc(next.year, next.month, next.day, endHour, endMinute, 59, 999);

  return { start, end };
}

/**
 * Converts an IST wall-clock time (Y/M/D H:m:s) into the equivalent UTC Date instant.
 * IST is a fixed UTC+5:30 offset (no DST), so this is a simple, reliable conversion.
 */
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
  const utcMillis =
    Date.UTC(year, month - 1, day, hour, minute, second, ms) - IST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMillis);
}

/** Returns today's business date bounds (start/end UTC instants of the current or most recent shift). */
export function getCurrentBusinessShiftBounds(): { businessDate: string; start: Date; end: Date } {
  const businessDate = getBusinessDateString(new Date());
  const bounds = getBusinessShiftBounds(businessDate);
  return { businessDate, ...bounds };
}

/** Returns the formatted shift window text, e.g. "6:00 PM – 9:00 AM IST" */
export function getShiftWindowText(): string {
  const { startHour, startMinute, endHour, endMinute } = getShiftConfig();
  const formatTime = (hour: number, minute: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${ampm}`;
  };

  const startText = formatTime(startHour, startMinute);
  const endText = formatTime(endHour, endMinute);
  return `${startText} – ${endText} IST`;
}


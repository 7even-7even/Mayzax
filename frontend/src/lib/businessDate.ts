/**
 * Business Shift / Business Date Utilities — Frontend Mirror
 * ------------------------------------------------------------------
 * Mirrors the backend's businessDate.ts logic exactly.
 *
 * Mayzax operates a night shift (IST):
 *   Shift START: configurable (default 6:00 PM IST)
 *   Shift END:   configurable (default 9:00 AM IST next calendar day)
 *
 * Rule:
 *  - If time-of-day (IST) >= shift start  → business date = same IST calendar date
 *  - If time-of-day (IST) <= shift end    → business date = PREVIOUS IST calendar date (overnight)
 *  - Otherwise (daytime gap)              → business date = PREVIOUS IST calendar date (most recent closed shift)
 *
 * NOTE: These defaults must match the backend env values
 *       (BUSINESS_SHIFT_START_HOUR / BUSINESS_SHIFT_END_HOUR, etc.)
 */

const IST_OFFSET_MINUTES = 5 * 60 + 30; // UTC+5:30, no DST

// Mutable Shift config — defaults matching backend
const config = {
  startHour: 18,     // 6:00 PM IST
  startMinute: 0,
  endHour: 9,        // 9:00 AM IST
  endMinute: 0,
  startMinutes: 18 * 60,
  endMinutes: 9 * 60,
};

/**
 * Updates the shift config with the values fetched from the backend.
 */
export function initializeShiftConfig(backendConfig: {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}) {
  config.startHour = backendConfig.startHour;
  config.startMinute = backendConfig.startMinute;
  config.endHour = backendConfig.endHour;
  config.endMinute = backendConfig.endMinute;
  config.startMinutes = backendConfig.startHour * 60 + backendConfig.startMinute;
  config.endMinutes = backendConfig.endHour * 60 + backendConfig.endMinute;
}

/**
 * Convert a UTC Date to IST year/month/day/hour/minute components.
 * IST = UTC+5:30 (fixed offset, no DST).
 */
function getISTParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const istMs = date.getTime() + IST_OFFSET_MINUTES * 60_000;
  const ist = new Date(istMs);
  return {
    year:   ist.getUTCFullYear(),
    month:  ist.getUTCMonth() + 1, // 1-12
    day:    ist.getUTCDate(),
    hour:   ist.getUTCHours(),
    minute: ist.getUTCMinutes(),
  };
}

/**
 * Subtract one calendar day from a Y/M/D triple.
 */
function prevDay(year: number, month: number, day: number): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  d.setUTCDate(d.getUTCDate() - 1);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * Format a Y/M/D triple as "YYYY-MM-DD".
 */
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Returns the current "business date" string (YYYY-MM-DD) per Mayzax's shift rules.
 * This is what the backend stores in `JobApplication.businessDate`.
 */
export function getCurrentBusinessDate(now: Date = new Date()): string {
  const { year, month, day, hour, minute } = getISTParts(now);
  const currentMinutes = hour * 60 + minute;

  if (currentMinutes >= config.startMinutes) {
    // Evening or night — shift just started, belongs to today
    return formatDate(year, month, day);
  }

  if (currentMinutes <= config.endMinutes) {
    // Early morning — still inside the shift that started yesterday
    const prev = prevDay(year, month, day);
    return formatDate(prev.year, prev.month, prev.day);
  }

  // Daytime gap (between shift end and shift start) — no active shift,
  // belongs to the previous calendar date (most recently completed shift)
  const prev = prevDay(year, month, day);
  return formatDate(prev.year, prev.month, prev.day);
}

/**
 * Returns true if `now` falls within an active business shift window.
 */
export function isWithinBusinessShift(now: Date = new Date()): boolean {
  const { hour, minute } = getISTParts(now);
  const currentMinutes = hour * 60 + minute;
  return currentMinutes >= config.startMinutes || currentMinutes <= config.endMinutes;
}

/**
 * Given any timestamp (ISO string or Date), returns its business date string (YYYY-MM-DD).
 * Useful for matching app.businessDate against the current business date.
 */
export function getBusinessDateForTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return getCurrentBusinessDate(date);
}

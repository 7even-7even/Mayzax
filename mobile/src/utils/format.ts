import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(duration);

const DEFAULT_TZ = 'Asia/Kolkata';

function getTimezoneOffsetMinutes(tzName: string): number {
  if (tzName === 'Asia/Kolkata') return 330;
  // fallback to local device offset
  return -new Date().getTimezoneOffset();
}

export function tz(d?: string | Date, tzName: string = DEFAULT_TZ) {
  const offset = getTimezoneOffsetMinutes(tzName);
  return dayjs(d).utc().utcOffset(offset);
}

export function formatTime(d?: string | Date, tzName: string = DEFAULT_TZ): string {
  if (!d) return '--';
  const offset = getTimezoneOffsetMinutes(tzName);
  return dayjs(d).utc().utcOffset(offset).format('hh:mm A');
}

export function formatDate(d?: string | Date, tzName: string = DEFAULT_TZ): string {
  if (!d) return '--';
  const offset = getTimezoneOffsetMinutes(tzName);
  return dayjs(d).utc().utcOffset(offset).format('DD MMM YYYY');
}

export function formatDateTime(d?: string | Date, tzName: string = DEFAULT_TZ): string {
  if (!d) return '--';
  const offset = getTimezoneOffsetMinutes(tzName);
  return dayjs(d).utc().utcOffset(offset).format('DD MM, hh:mm A');
}

export function formatDuration(seconds: number): string {
  if (seconds < 0) {
    const abs = Math.abs(seconds);
    return `-${formatDuration(abs)}`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatDurationDigital(seconds: number): string {
  const sign = seconds < 0 ? '-' : '';
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  if (h > 0) return `${sign}${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${sign}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatRelative(d?: string | Date): string {
  if (!d) return '';
  return dayjs(d).fromNow();
}

export function dayName(d?: string | Date, tzName: string = DEFAULT_TZ): string {
  if (!d) return '';
  return dayjs(d).tz(tzName).format('ddd');
}

export function dayNum(d?: string | Date, tzName: string = DEFAULT_TZ): number {
  if (!d) return 1;
  return dayjs(d).tz(tzName).date();
}

export function isSameDay(a?: string | Date, b?: string | Date, tzName: string = DEFAULT_TZ): boolean {
  if (!a || !b) return false;
  return dayjs(a).tz(tzName).isSame(dayjs(b).tz(tzName), 'day');
}

export { dayjs };

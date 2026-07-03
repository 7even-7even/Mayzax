import fs from 'fs';
import path from 'path';
import { env } from '@/config/env';

/**
 * Daily Rotating File Log Stream
 * ------------------------------------------------------------------
 * Writes every log line emitted by the app's Pino logger to a file
 * named after the current date (e.g. `2026-07-04.log`) inside the
 * directory configured via the `LOGS_DIR` environment variable.
 *
 * The stream automatically "rotates" to a new file the moment the
 * calendar date changes, with zero external dependencies - it just
 * swaps the underlying fs.WriteStream when the date string differs
 * from the one currently open.
 * ------------------------------------------------------------------
 */

interface DailyRotatingStream {
  /** Required shape for a Pino multistream destination. */
  write(msg: string): void;
  /** Gracefully flush and close the currently open file handle. */
  end(): void;
  /** Absolute path to the logs directory currently in use. */
  readonly directory: string;
}

function getDateString(date: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which matches our desired log file name.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: env.BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function createDailyRotatingStream(logsDir: string = env.LOGS_DIR): DailyRotatingStream {
  const directory = path.isAbsolute(logsDir) ? logsDir : path.resolve(process.cwd(), logsDir);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  let currentDateStr: string | null = null;
  let currentStream: fs.WriteStream | null = null;

  function rotateIfNeeded() {
    const todayStr = getDateString();
    if (todayStr === currentDateStr && currentStream) return;

    if (currentStream) {
      currentStream.end();
    }

    currentDateStr = todayStr;
    const filePath = path.join(directory, `${todayStr}.log`);
    currentStream = fs.createWriteStream(filePath, { flags: 'a' });

    currentStream.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error(`Failed writing to log file ${filePath}:`, err);
    });
  }

  // Open today's file immediately so the logs directory + file exist as
  // soon as the app boots, even before the first log line is written.
  rotateIfNeeded();

  return {
    directory,
    write(msg: string) {
      rotateIfNeeded();
      currentStream?.write(msg);
    },
    end() {
      currentStream?.end();
    },
  };
}

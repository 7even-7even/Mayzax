import { useEffect, useState } from 'react';

/**
 * Returns seconds remaining until targetDate.
 * Finished when remaining <= 0. Ticks once per second.
 */
export function useCountdown(targetDate: string | Date | null | undefined, serverNow?: string | Date): {
  remainingSec: number;
  isOver: boolean;
  isRunning: boolean;
} {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  if (!targetDate) {
    return { remainingSec: 0, isOver: false, isRunning: false };
  }
  const targetMs = typeof targetDate === 'string' ? new Date(targetDate).getTime() : targetDate.getTime();
  const clientNow = now;
  // If serverNow is provided, compute offset to correct for clock drift.
  let correctedNow = clientNow;
  if (serverNow) {
    const serverMs = typeof serverNow === 'string' ? new Date(serverNow).getTime() : serverNow.getTime();
    const offset = serverMs - Date.now(); // when we measured
    correctedNow = clientNow + offset;
  }
  const remainingMs = targetMs - correctedNow;
  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
  return {
    remainingSec,
    isOver: remainingMs <= 0,
    isRunning: remainingMs > 0,
  };
}

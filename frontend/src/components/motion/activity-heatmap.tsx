import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { DailyCount } from '@/types';

interface ActivityHeatmapProps {
  data: DailyCount[];
  weeks?: number; // how many weeks back to render
  className?: string;
}

interface DayCell {
  date: string; // YYYY-MM-DD
  count: number;
  isPadding: boolean;
}

const INTENSITY_LEVELS = [
  { max: 0, className: 'bg-slate-100' },
  { max: 2, className: 'bg-mayzax-green-100' },
  { max: 4, className: 'bg-mayzax-green-200' },
  { max: 7, className: 'bg-mayzax-green-400' },
  { max: Infinity, className: 'bg-mayzax-green-600' },
];

function getIntensityClass(count: number): string {
  if (count === 0) return INTENSITY_LEVELS[0].className;
  const level = INTENSITY_LEVELS.find((l) => count <= l.max);
  return level?.className ?? INTENSITY_LEVELS[INTENSITY_LEVELS.length - 1].className;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatFullDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/**
 * GitHub-style contribution heatmap showing recruiter application activity
 * per business date, grouped into weekly columns (Sun -> Sat rows).
 * Clicking a cell navigates to the Applications page filtered to that date.
 */
export function ActivityHeatmap({ data, weeks = 26, className }: ActivityHeatmapProps) {
  const [hovered, setHovered] = useState<DayCell | null>(null);
  const navigate = useNavigate();
  const minHeatmapWidth = weeks * 18 + 80;

  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data) map.set(d.businessDate, d.count);
    return map;
  }, [data]);

  const { columns, monthLabels, maxCount } = useMemo(() => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Find the most recent Saturday to align the grid to full weeks.
    const endDate = new Date(today);
    const dayOfWeek = endDate.getUTCDay(); // 0 = Sunday
    endDate.setUTCDate(endDate.getUTCDate() + (6 - dayOfWeek));

    const totalDays = weeks * 7;
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - totalDays + 1);

    const cols: DayCell[][] = [];
    const labels: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    let max = 0;

    for (let w = 0; w < weeks; w++) {
      const col: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const current = new Date(startDate);
        current.setUTCDate(startDate.getUTCDate() + w * 7 + d);
        const dateStr = toDateStr(current);
        const isPadding = current > today;
        const count = countMap.get(dateStr) ?? 0;
        if (!isPadding && count > max) max = count;
        col.push({ date: dateStr, count, isPadding });

        if (d === 0) {
          const month = current.getUTCMonth();
          if (month !== lastMonth) {
            labels.push({ weekIndex: w, label: current.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }) });
            lastMonth = month;
          }
        }
      }
      cols.push(col);
    }

    return { columns: cols, monthLabels: labels, maxCount: max };
  }, [countMap, weeks]);

  const handleCellClick = (cell: DayCell) => {
    if (cell.isPadding) return;
    navigate(`/applications?date=${cell.date}`);
  };

  return (
    <div className={cn('relative w-full overflow-x-auto pb-2', className)}>
      {/* Month labels — grid-aligned with the main heatmap columns below */}
      <div
        className="mb-1.5 grid pl-10 text-[11px] text-slate-400"
        style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`, minWidth: minHeatmapWidth }}
      >
        {columns.map((_, i) => {
          const label = monthLabels.find((m) => m.weekIndex === i);
          return <div key={i}>{label?.label}</div>;
        })}
      </div>

      <div className="flex gap-3">
        {/* Day-of-week labels */}
        <div className="flex w-7 flex-col justify-between py-0.5 text-[11px] text-slate-400">
          <span>Sun</span>
          <span>Wed</span>
          <span>Sat</span>
        </div>

        {/* Main grid — columns scale with container width via 1fr, cells stay square */}
        <div
          className="grid flex-1 gap-1.5 pt-5 pl-3 pr-40"
          style={{ gridTemplateColumns: `repeat(${weeks}, minmax(14px, 1fr))`, minWidth: minHeatmapWidth }}
        >
          {columns.map((col, wIdx) => (
            <div key={wIdx} className="grid gap-1.5" style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}>
              {col.map((cell, dIdx) => (
                <div key={cell.date} className="relative">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: cell.isPadding ? 0 : 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.2, delay: (wIdx * 7 + dIdx) * 0.002 }}
                    onMouseEnter={() => !cell.isPadding && setHovered(cell)}
                    onMouseLeave={() => setHovered((h) => (h?.date === cell.date ? null : h))}
                    onClick={() => handleCellClick(cell)}
                    className={cn(
                      'aspect-square w-full rounded-[4px] transition-transform hover:scale-125 hover:ring-2 hover:ring-mayzax-green-500',
                      cell.isPadding ? 'invisible' : 'cursor-pointer',
                      cell.isPadding ? '' : getIntensityClass(cell.count),
                    )}
                  />

                  {/* Floating tooltip, positioned above the hovered cell */}
                  <AnimatePresence>
                    {hovered?.date === cell.date && !cell.isPadding && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.9 }}
                        transition={{ duration: 0.12 }}
                        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
                      >
                        <span className="font-semibold">
                          {cell.count} application{cell.count === 1 ? '' : 's'}
                        </span>
                        <span className="ml-1 text-slate-300">· {formatFullDate(cell.date)}</span>
                        <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-900" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span>Business-date activity{maxCount > 0 ? ` · peak ${maxCount}/day` : ''} — click a day to view applications</span>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          {INTENSITY_LEVELS.map((level, i) => (
            <div key={i} className={cn('h-3 w-3 rounded-[3px]', level.className)} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
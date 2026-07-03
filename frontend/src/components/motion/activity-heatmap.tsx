import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

/**
 * GitHub-style contribution heatmap showing recruiter application activity
 * per business date, grouped into weekly columns (Sun -> Sat rows).
 */
export function ActivityHeatmap({ data, weeks = 18, className }: ActivityHeatmapProps) {
  const [hovered, setHovered] = useState<DayCell | null>(null);

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

  return (
    <div className={cn('relative', className)}>
      <div className="mb-1 flex pl-7 text-[10px] text-slate-400" style={{ gap: '2px' }}>
        {columns.map((_, i) => {
          const label = monthLabels.find((m) => m.weekIndex === i);
          return (
            <div key={i} style={{ width: '13px' }} className="shrink-0">
              {label?.label}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-0.5 text-[10px] text-slate-400" style={{ height: '103px' }}>
          <span>Sun</span>
          <span>Wed</span>
          <span>Sat</span>
        </div>
        <div className="flex" style={{ gap: '2px' }}>
          {columns.map((col, wIdx) => (
            <div key={wIdx} className="flex flex-col" style={{ gap: '2px' }}>
              {col.map((cell, dIdx) => (
                <motion.div
                  key={cell.date}
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: cell.isPadding ? 0 : 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.2, delay: (wIdx * 7 + dIdx) * 0.003 }}
                  onMouseEnter={() => !cell.isPadding && setHovered(cell)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    'h-[13px] w-[13px] rounded-[3px] transition-transform hover:scale-125 hover:ring-1 hover:ring-mayzax-green-500',
                    cell.isPadding ? 'invisible' : getIntensityClass(cell.count),
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
        <AnimatePresence mode="wait">
          {hovered ? (
            <motion.span
              key={hovered.date}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="font-medium text-slate-600"
            >
              {hovered.count} application{hovered.count === 1 ? '' : 's'} · {hovered.date}
            </motion.span>
          ) : (
            <span>Business-date activity{maxCount > 0 ? ` · peak ${maxCount}/day` : ''}</span>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-1">
          <span>Less</span>
          {INTENSITY_LEVELS.map((level, i) => (
            <div key={i} className={cn('h-[10px] w-[10px] rounded-[2px]', level.className)} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

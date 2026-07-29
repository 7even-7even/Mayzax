import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { DailyCount } from '@/types';
import { Sparkles, Flame, TrendingUp } from 'lucide-react';

interface ActivityHeatmapProps {
  data: DailyCount[];
  weeks?: number;
  className?: string;
}

interface DayCell {
  date: string;
  count: number;
  isPadding: boolean;
}

const INTENSITY_LEVELS = [
  { max: 0, className: 'bg-slate-100 border border-slate-200/30', glow: '' },
  { max: 2, className: 'bg-emerald-100 border border-emerald-200/50', glow: 'shadow-sm shadow-emerald-100' },
  { max: 5, className: 'bg-emerald-300 border border-emerald-400/50', glow: 'shadow-sm shadow-emerald-200' },
  { max: 10, className: 'bg-emerald-500 border border-emerald-600/50 text-white', glow: 'shadow-md shadow-emerald-300' },
  { max: Infinity, className: 'bg-gradient-to-br from-emerald-600 to-teal-700 border border-emerald-700 text-white', glow: 'shadow-lg shadow-emerald-400' },
];

function getIntensity(count: number) {
  if (count === 0) return INTENSITY_LEVELS[0];
  const level = INTENSITY_LEVELS.find((l) => count <= l.max);
  return level ?? INTENSITY_LEVELS[INTENSITY_LEVELS.length - 1];
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatFullDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function ActivityHeatmap({ data, weeks = 26, className }: ActivityHeatmapProps) {
  const [hovered, setHovered] = useState<DayCell | null>(null);
  const navigate = useNavigate();
  const minHeatmapWidth = weeks * 20 + 80;

  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data) map.set(d.businessDate, d.count);
    return map;
  }, [data]);

  const { columns, monthLabels, maxCount, total, avg } = useMemo(() => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(today);
    const dayOfWeek = endDate.getUTCDay();
    endDate.setUTCDate(endDate.getUTCDate() + (6 - dayOfWeek));

    const totalDays = weeks * 7;
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - totalDays + 1);

    const cols: DayCell[][] = [];
    const labels: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    let max = 0;
    let sum = 0;
    let daysWithData = 0;

    for (let w = 0; w < weeks; w++) {
      const col: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const current = new Date(startDate);
        current.setUTCDate(startDate.getUTCDate() + w * 7 + d);
        const dateStr = toDateStr(current);
        const isPadding = current > today;
        const count = countMap.get(dateStr) ?? 0;
        if (!isPadding) {
          if (count > max) max = count;
          if (count > 0) {
            sum += count;
            daysWithData++;
          }
        }
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

    return { columns: cols, monthLabels: labels, maxCount: max, total: sum, avg: daysWithData ? sum / daysWithData : 0 };
  }, [countMap, weeks]);

  const handleCellClick = (cell: DayCell) => {
    if (cell.isPadding) return;
    navigate(`/applications?date=${cell.date}`);
  };

  return (
    <div className={cn('relative w-full overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-4 shadow-sm', className)}>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 ">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md ">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 dark:text-black">
              Business-Date Activity Map
              <span className="rounded-full bg-amber-100 border border-amber-200 text-amber-700 px-1.5 py-0.5 text-[10px] font-bold">{weeks}w</span>
            </p>
            <p className="text-xs text-slate-500">
              {total} apps • {maxCount ? `peak ${maxCount}/day` : 'no activity'} • avg {avg.toFixed(1)}/active day • click to filter
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1 shadow-sm">
          <TrendingUp className="h-3 w-3 text-emerald-500" />
          Interactive
        </div>
      </div>

      {/* Month labels */}
      <div className="mb-2 grid pl-10 text-[11px] font-medium text-slate-400" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`, minWidth: minHeatmapWidth }}>
        {columns.map((_, i) => {
          const label = monthLabels.find((m) => m.weekIndex === i);
          return (
            <div key={i} className="truncate">
              {label?.label}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2">
        <div className="flex w-8 flex-col justify-between py-1 text-[11px] font-medium text-slate-400 shrink-0">
          <span>Sun</span>
          <span>Tue</span>
          <span>Thu</span>
          <span>Sat</span>
        </div>

        <div className="grid flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(16px, 1fr))`, minWidth: minHeatmapWidth }}>
          {columns.map((col, wIdx) => (
            <div key={wIdx} className="grid gap-1.5" style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}>
              {col.map((cell, dIdx) => {
                const intensity = getIntensity(cell.count);
                return (
                  <div key={cell.date} className="relative">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.6 }}
                      whileInView={{ opacity: cell.isPadding ? 0 : 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.25, delay: (wIdx * 7 + dIdx) * 0.0015 }}
                      whileHover={{ scale: 1.3, zIndex: 10 }}
                      onMouseEnter={() => !cell.isPadding && setHovered(cell)}
                      onMouseLeave={() => setHovered((h) => (h?.date === cell.date ? null : h))}
                      onClick={() => handleCellClick(cell)}
                      className={cn(
                        'aspect-square w-full rounded-md transition-all cursor-pointer flex items-center justify-center text-[9px] font-bold',
                        cell.isPadding ? 'invisible' : intensity.className,
                        intensity.glow,
                        'hover:ring-2 hover:ring-violet-400 hover:shadow-lg'
                      )}
                    >
                      {cell.count > 0 && cell.count < 10 ? '' : cell.count > 9 ? cell.count : ''}
                    </motion.div>

                    <AnimatePresence>
                      {hovered?.date === cell.date && !cell.isPadding && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.9 }}
                          transition={{ duration: 0.15 }}
                          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-xl border border-white/10"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold ${cell.count > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{cell.count}</span>
                            <div>
                              <p className="font-semibold">{cell.count} app{cell.count === 1 ? '' : 's'}</p>
                              <p className="text-[11px] text-white/60">{formatFullDate(cell.date)}</p>
                            </div>
                          </div>
                          <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-900 border-r border-b border-white/10" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 border-t border-slate-100 pt-3 dark:text-white">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-violet-500" />
          Click any day to view applications • Business-date (IST shift) grouping
        </span>
        <div className="flex items-center gap-2">
          <span>Less</span>
          <div className="flex items-center gap-1">
            {INTENSITY_LEVELS.map((level, i) => (
              <div key={i} className={cn('h-3 w-3 rounded-[4px]', level.className)} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

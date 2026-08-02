import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useTodayActivity, useActivityHistory } from '@/hooks/use-activity';
import { STATUS_CONFIG } from '@/components/activity/user-status-selector';
import { UserStatus } from '@/types';
import { PremiumPageHeader } from '@/components/shared/premium-page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { VirtualizedTable } from '@/components/shared/virtualized-table';
import { formatDateTime, cn } from '@/lib/utils';
import {
  Timer,
  Activity,
  Coffee,
  Clock,
  Zap,
  TrendingUp,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Reveal, StaggerContainer, StaggerItem } from '@/components/motion/reveal';
import { CountUp } from '@/components/motion/count-up';

function formatHoursMinutes(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

function getStatusNodeStyles(status: UserStatus) {
  switch (status) {
    case 'ACTIVE':
    case 'ONLINE':
      return {
        btnClass: "bg-gradient-to-b from-emerald-400 to-emerald-600 border-emerald-300 shadow-[0_4px_0_#047857] hover:shadow-[0_1px_0_#047857] hover:translate-y-[2px]",
        pingColor: '#10b981'
      };
    case 'SHORT_BREAK':
      return {
        btnClass: "bg-gradient-to-b from-amber-400 to-amber-600 border-amber-300 shadow-[0_4px_0_#b45309] hover:shadow-[0_1px_0_#b45309] hover:translate-y-[2px]",
        pingColor: '#f59e0b'
      };
    case 'DINNER_BREAK':
      return {
        btnClass: "bg-gradient-to-b from-orange-400 to-orange-600 border-orange-300 shadow-[0_4px_0_#c2410c] hover:shadow-[0_1px_0_#c2410c] hover:translate-y-[2px]",
        pingColor: '#ea580c'
      };
    case 'BRIEFING_TRAINING':
      return {
        btnClass: "bg-gradient-to-b from-indigo-400 to-indigo-600 border-indigo-300 shadow-[0_4px_0_#4338ca] hover:shadow-[0_1px_0_#4338ca] hover:translate-y-[2px]",
        pingColor: '#6366f1'
      };
    case 'MEETING':
      return {
        btnClass: "bg-gradient-to-b from-sky-400 to-sky-600 border-sky-300 shadow-[0_4px_0_#0369a1] hover:shadow-[0_1px_0_#0369a1] hover:translate-y-[2px]",
        pingColor: '#0ea5e9'
      };
    case 'SYSTEM_ISSUE':
      return {
        btnClass: "bg-gradient-to-b from-rose-400 to-rose-600 border-rose-300 shadow-[0_4px_0_#be123c] hover:shadow-[0_1px_0_#be123c] hover:translate-y-[2px]",
        pingColor: '#f43f5e'
      };
    case 'OFFLINE':
    default:
      return {
        btnClass: "bg-gradient-to-b from-slate-400 to-slate-500 border-slate-300 shadow-[0_4px_0_#334155] hover:shadow-[0_1px_0_#334155] hover:translate-y-[2px] dark:from-slate-600 dark:to-slate-700 dark:border-slate-500 dark:shadow-[0_4px_0_#1e293b]",
        pingColor: '#64748b'
      };
  }
}

// Premium Metric Card
function PremiumMetricCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
  gradient,
  index = 0,
  trend,
}: {
  icon: any;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  gradient: string;
  index?: number;
  trend?: string;
}) {
  const darkColor = color.includes('slate-800')
    ? 'dark:text-white'
    : color.includes('violet-700')
    ? 'dark:text-violet-300'
    : color.includes('emerald-700')
    ? 'dark:text-emerald-300'
    : color.includes('amber-700')
    ? 'dark:text-amber-300'
    : 'dark:text-slate-200';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-[1px] shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${gradient} blur-[1px]`} />
      <div className="relative h-full rounded-[15px] bg-white dark:bg-slate-900 p-4 flex flex-col justify-between">
        <div className="flex items-start justify-between mb-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-100">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </div>
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className={cn("text-xl font-bold tracking-tight", color, darkColor)}>
              {typeof value === 'number' ? <CountUp value={value} /> : value}
            </p>
            {subValue && <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{subValue}</span>}
          </div>
        </div>
        <div className="mt-3 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-850 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.5 + index * 0.08, duration: 0.8 }}
            className={`h-full bg-gradient-to-r ${gradient}`}
          />
        </div>
      </div>
    </motion.div>
  );
}

// Game Roadmap Timeline
function TodayTimeline({ data }: { data?: any }) {
  if (!data?.logs?.length) return null;

  const [showAll, setShowAll] = useState(false);
  const logs = showAll ? data.logs : data.logs.slice(-5);
  const displayLogs = [...logs].reverse();

  const stepWidth = 256;
  const svgWidth = Math.max(1280, logs.length * stepWidth);
  let pathD = "M 0,24";
  for (let i = 0; i < logs.length; i++) {
    const x = 128 + i * stepWidth;
    const y = i % 2 === 0 ? 24 : 56;
    if (i === 0) {
      pathD = `M 0,24 C 64,24 64,${y} ${x},${y}`;
    } else {
      const prevX = 128 + (i - 1) * stepWidth;
      const prevY = (i - 1) % 2 === 0 ? 24 : 56;
      const cp1X = prevX + 128;
      const cp2X = x - 128;
      pathD += ` C ${cp1X},${prevY} ${cp2X},${y} ${x},${y}`;
    }
  }
  pathD += ` T ${svgWidth} ${logs.length % 2 === 0 ? 56 : 24}`;

  return (
    <Card className="border-slate-200/60 shadow-md rounded-2xl overflow-hidden bg-white dark:bg-slate-900 dark:border-slate-800">
      <CardHeader className="pb-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white dark:from-slate-850 dark:to-slate-900 dark:border-slate-800 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <Timer className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2 dark:text-white">
              Today's Journey
            </CardTitle>
            <CardDescription className="text-xs dark:text-slate-400">Chronological level timeline • Winding pathway</CardDescription>
          </div>
        </div>
        
        {data.logs.length > 5 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-semibold gap-1.5 h-8 border-slate-200 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:bg-slate-750"
          >
            {showAll ? 'Show Latest 5' : `See Full Journey (${data.logs.length} states)`}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative overflow-x-auto scrollbar-thick py-10 px-8 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:16px_16px]">
          <svg className="absolute inset-y-0 top-[52%] -translate-y-1/2 h-20 pointer-events-none opacity-60" style={{ width: `${svgWidth}px` }} viewBox={`0 0 ${svgWidth} 80`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="road-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <path
              d={pathD}
              fill="transparent"
              stroke="url(#road-grad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="10 8"
            />
          </svg>
          
          <div className="flex flex-row items-center relative" style={{ width: `${svgWidth}px` }}>
            {displayLogs.map((log, idx) => {
              const cfg = STATUS_CONFIG[log.status as UserStatus] || STATUS_CONFIG.OFFLINE;
              const nodeStyles = getStatusNodeStyles(log.status as UserStatus);
              const isOddVisual = idx % 2 === 0;
              const isCurrent = idx === 0;
              const Icon = cfg.icon || Zap;

              return (
                <div key={log.id} className={cn("flex flex-col items-center justify-center relative w-[256px] shrink-0 transition-transform duration-350", isOddVisual ? "-translate-y-3" : "translate-y-3")}>
                  {isOddVisual ? (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="mb-8">
                      <div className="rounded-2xl border border-slate-100 bg-white dark:bg-slate-850 dark:border-slate-800 p-3 shadow-[0_10px_25px_rgba(0,0,0,0.06)] dark:shadow-[0_10px_25px_rgba(0,0,0,0.3)] w-48 text-left relative">
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-[-6px] w-3 h-3 bg-white dark:bg-slate-850 border-r border-b border-slate-100 dark:border-slate-800 rotate-45" />
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className={`h-2 w-2 rounded-full ${cfg.dotColor}`} />
                          <span className={cn("text-[11px] font-bold uppercase tracking-wider", cfg.textColor)}>{cfg.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{formatDateTime(log.startedAt)}</p>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-700 dark:text-slate-350 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-750 font-mono">
                          <span className="font-semibold text-slate-500 dark:text-slate-400 font-sans">Duration:</span>
                          <span>{formatHoursMinutes(log.durationSeconds)}</span>
                        </div>
                        {log.optionalNote && <p className="mt-1 text-[9px] text-slate-500 dark:text-slate-450 italic truncate" title={log.optionalNote}>“{log.optionalNote}”</p>}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-[96px] mb-8" />
                  )}

                  <div className="relative flex flex-col items-center justify-center z-10">
                    <div className="relative">
                      {isCurrent && (
                        <>
                          <span className="absolute -inset-2 rounded-full border-4 border-current opacity-25 animate-ping pointer-events-none" style={{ color: nodeStyles.pingColor }} />
                          <span className="absolute -inset-1.5 rounded-full border-2 border-current opacity-40 animate-pulse pointer-events-none" style={{ color: nodeStyles.pingColor }} />
                        </>
                      )}
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "h-14 w-14 rounded-full border-4 flex items-center justify-center text-white shadow-md transition-all duration-300 transform",
                          nodeStyles.btnClass
                        )}
                        title={`${cfg.label} - ${formatHoursMinutes(log.durationSeconds)}`}
                      >
                        <Icon className="h-5 w-5" />
                      </motion.button>
                    </div>
                    <p className="mt-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">{cfg.label}</p>
                  </div>

                  {!isOddVisual ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="mt-8">
                      <div className="rounded-2xl border border-slate-100 dark:bg-slate-850 dark:border-slate-800 bg-white p-3 shadow-[0_10px_25px_rgba(0,0,0,0.06)] dark:shadow-[0_10px_25px_rgba(0,0,0,0.3)] w-48 text-left relative">
                        <div className="absolute left-1/2 -translate-x-1/2 top-[-6px] w-3 h-3 bg-white dark:bg-slate-850 border-l border-t border-slate-100 dark:border-slate-800 rotate-45" />
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className={`h-2 w-2 rounded-full ${cfg.dotColor}`} />
                          <span className={cn("text-[11px] font-bold uppercase tracking-wider", cfg.textColor)}>{cfg.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{formatDateTime(log.startedAt)}</p>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-700 dark:text-slate-350 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-750 font-mono">
                          <span className="font-semibold text-slate-500 dark:text-slate-400 font-sans">Duration:</span>
                          <span>{formatHoursMinutes(log.durationSeconds)}</span>
                        </div>
                        {log.optionalNote && <p className="mt-1 text-[9px] text-slate-550 dark:text-slate-450 italic truncate" title={log.optionalNote}>“{log.optionalNote}”</p>}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-[96px] mt-8" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CompanionDashboardPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data: todayData, isLoading: todayLoading } = useTodayActivity();
  const { data: historyData, isLoading: historyLoading, isError, refetch } = useActivityHistory({
    userId: user?.id,
    page,
    pageSize: 15,
  });

  const logs = historyData?.data ?? [];

  return (
    <div className="space-y-6">
      <PremiumPageHeader
        icon={Activity}
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'User'}!`}
        description="Your companion cockpit • Shift timeline & break transition log"
        pills={[
          { label: user?.role === 'RESUME_ASSIST' ? 'Resume Assist Profile' : 'Sales Executive Profile', icon: Sparkles, variant: 'premium' }
        ]}
        gradient="from-violet-600 to-indigo-600"
        bottomGradient="from-violet-600 via-indigo-500 to-teal-500"
      />

      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <PremiumMetricCard
            icon={Zap}
            label="Productive Today"
            value={todayLoading ? '...' : formatHoursMinutes(todayData?.totalProductiveSeconds ?? 0)}
            color="text-emerald-700"
            gradient="from-emerald-500 to-teal-600"
            index={0}
            trend={`${todayData?.totalLoggedInSeconds ? Math.min(100, Math.round((todayData.totalProductiveSeconds / todayData.totalLoggedInSeconds) * 100)) : 0}% util`}
          />
        </StaggerItem>
        <StaggerItem>
          <PremiumMetricCard
            icon={Coffee}
            label="Break Time"
            value={todayLoading ? '...' : formatHoursMinutes(todayData?.totalBreakSeconds ?? 0)}
            color="text-amber-700"
            gradient="from-amber-500 to-orange-600"
            index={1}
          />
        </StaggerItem>
        <StaggerItem>
          <PremiumMetricCard
            icon={Timer}
            label="Total Logged In"
            value={todayLoading ? '...' : formatHoursMinutes(todayData?.totalLoggedInSeconds ?? 0)}
            color="text-slate-800"
            gradient="from-slate-700 to-slate-900"
            index={2}
          />
        </StaggerItem>
        <StaggerItem>
          <PremiumMetricCard
            icon={TrendingUp}
            label="Shift Utilization"
            value={todayData?.totalLoggedInSeconds ? `${Math.min(100, Math.round((todayData.totalProductiveSeconds / todayData.totalLoggedInSeconds) * 100))}%` : '100%'}
            color="text-violet-700"
            gradient="from-violet-500 to-indigo-600"
            index={3}
            subValue="productive vs logged"
          />
        </StaggerItem>
      </StaggerContainer>

      {todayData && todayData.logs && todayData.logs.length > 0 && (
        <Reveal delay={0.15}>
          <TodayTimeline data={todayData} />
        </Reveal>
      )}

      <Reveal delay={0.2}>
        <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-850 dark:to-slate-900 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold dark:text-white">Your Shift Transition Logs</CardTitle>
                <CardDescription className="text-xs dark:text-slate-400">Detailed transition history</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {historyLoading && <div className="p-4"><TableSkeleton rows={6} cols={5} /></div>}
            {isError && <div className="p-4"><ErrorState onRetry={() => refetch()} /></div>}
            {!historyLoading && !isError && logs.length === 0 && (
              <div className="p-6"><EmptyState icon={AlertCircle} title="No transition logs found" description="Transition logs will appear once your activity records start." /></div>
            )}
            {!historyLoading && !isError && logs.length > 0 && (
              <>
                <VirtualizedTable
                  data={logs}
                  estimateRowHeight={64}
                  maxHeight="500px"
                  header={
                    <div className="grid grid-cols-[1fr_1.2fr_1.2fr_0.8fr_1.8fr] gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-850/80">
                      <span>Status</span>
                      <span>Started At</span>
                      <span>Ended At</span>
                      <span>Duration</span>
                      <span>Note</span>
                    </div>
                  }
                  renderRow={(log: any) => {
                    const cfg = STATUS_CONFIG[log.status as UserStatus] || STATUS_CONFIG.OFFLINE;
                    return (
                      <div className="grid grid-cols-[1fr_1.2fr_1.2fr_0.8fr_1.8fr] gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 items-center">
                        <div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
                            {cfg.label}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">{formatDateTime(log.startedAt)}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">{log.endedAt ? formatDateTime(log.endedAt) : <span className="font-semibold text-emerald-600 dark:text-emerald-400">Active</span>}</div>
                        <div className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">{formatHoursMinutes(log.durationSeconds)}</div>
                        <div className="text-xs text-slate-550 dark:text-slate-400 truncate max-w-[320px]">{log.optionalNote || '-'}</div>
                      </div>
                    );
                  }}
                />
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-850/30">
                  <PaginationControls pagination={historyData?.pagination} onPageChange={setPage} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}

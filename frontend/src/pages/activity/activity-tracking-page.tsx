import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePermissions } from '@/hooks/use-permissions';
import {
  useTodayActivity,
  useActivityHistory,
  useProductivityMetrics,
  useActivityUsers,
  useLiveStatus,
  TodayActivityData,
  LiveStatusMetricsData,
} from '@/hooks/use-activity';
import { STATUS_CONFIG } from '@/components/activity/user-status-selector';
import { UserStatus, ApiSuccess } from '@/types';
import { apiClient } from '@/lib/api-client';
import { PremiumPageHeader } from '@/components/shared/premium-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { formatDateTime, generateExportFilename, cn } from '@/lib/utils';
import { getRoleLabel } from '@/lib/permissions';
import {
  Calendar,
  Clock,
  Download,
  Activity,
  Coffee,
  ShieldCheck,
  PieChart as PieChartIcon,
  UserCheck,
  AlertCircle,
  Users as UsersIcon,
  Zap,
  TrendingUp,
  Timer,
  Sparkles,
  Award,
  BarChart3,
  Filter,
  Star,
  Lock,
  RefreshCw,
} from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Reveal, StaggerContainer, StaggerItem } from '@/components/motion/reveal';
import { CountUp } from '@/components/motion/count-up';
import { VirtualizedTable } from '@/components/shared/virtualized-table';
import { PermissionGate } from '@/components/shared/permission-gate';

interface AttendanceReportItem {
  name: string;
  email: string;
  role: string;
  managerName: string;
  firstLogin: string | null;
  lastLogout: string | null;
  totalLoggedInHours: number;
  totalProductiveHours: number;
  totalBreakHours: number;
  shortBreakHours: number;
  dinnerBreakHours: number;
  meetingHours: number;
  briefingHours: number;
  downtimeHours: number;
  shiftUtilization: number;
  attendanceStatus: string;
}

const ALL = '__all__';
const ALL_TEAMS = '__all_teams__';

function formatHoursMinutes(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

function formatDecimalHoursToHMS(hours: number): string {
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatHoursLabel(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatRoleLabel(role: string, short = true): string {
  if (role === 'TEAM_LEADER') return 'Team Leader';
  if (role === 'RECRUITER') return 'Recruiter';
  if (role === 'RESUME_ASSIST') return 'Resume Assist';
  if (role === 'SALES_EXEC') return 'Sales Exec';
  return role;
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
        <div className="mt-3 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
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

interface ShiftActivityPieChartProps {
  todayData?: TodayActivityData;
  liveData?: LiveStatusMetricsData;
  filteredMembers?: LiveStatusMetricsData['members'];
  isAdminView?: boolean;
}

function ShiftActivityPieChart({ todayData, liveData, filteredMembers, isAdminView }: ShiftActivityPieChartProps) {
  if (isAdminView && liveData) {
    const displayMembers = filteredMembers ?? liveData.members;
    const totalMembers = displayMembers.length;

    const counts: Record<UserStatus, number> = {
      ACTIVE: 0,
      SHORT_BREAK: 0,
      DINNER_BREAK: 0,
      BRIEFING_TRAINING: 0,
      MEETING: 0,
      SYSTEM_ISSUE: 0,
      OFFLINE: 0,
    };

    displayMembers.forEach((m) => {
      const statusKey = m.status as UserStatus;
      if (counts[statusKey] !== undefined) {
        counts[statusKey]++;
      } else {
        counts.OFFLINE++;
      }
    });

    const activeCount = counts.ACTIVE;

    const chartData = [
      { name: 'Active', value: counts.ACTIVE, color: '#10B981', gradient: 'from-emerald-500 to-teal-600' },
      { name: 'Short Break', value: counts.SHORT_BREAK, color: '#F59E0B', gradient: 'from-amber-500 to-orange-600' },
      { name: 'Dinner Break', value: counts.DINNER_BREAK, color: '#F97316', gradient: 'from-orange-500 to-red-500' },
      { name: 'Briefing / Training', value: counts.BRIEFING_TRAINING, color: '#8B5CF6', gradient: 'from-indigo-500 to-violet-600' },
      { name: 'Meeting', value: counts.MEETING, color: '#0EA5E9', gradient: 'from-sky-500 to-blue-600' },
      { name: 'System Issue', value: counts.SYSTEM_ISSUE, color: '#F43F5E', gradient: 'from-rose-500 to-red-600' },
      { name: 'Offline', value: counts.OFFLINE, color: '#94A3B8', gradient: 'from-slate-400 to-slate-600' },
    ].filter((d) => d.value > 0);

    return (
      <Card className="border-slate-200/60 shadow-sm overflow-hidden rounded-2xl dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-850 dark:to-slate-900 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md">
                <PieChartIcon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  Live Team Status
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Real-time distribution • {totalMembers} tracked</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="w-fit text-xs font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm dark:text-white">
              <UsersIcon className="h-3 w-3 mr-1 " />
              {totalMembers} members
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {chartData.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
                <UsersIcon className="h-6 w-6" />
              </div>
              <p className="text-sm text-slate-500">No active team status data</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-center">
              <div className="h-56 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={62} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
                      formatter={(val: number) => [`${val} member${val === 1 ? '' : 's'}`, '']}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    <CountUp value={activeCount} />
                  </span>
                  <span className="text-[11px] uppercase font-semibold tracking-wider text-emerald-600 mt-0.5">Active Now</span>
                  <div className="mt-1 h-1 w-8 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {chartData.map((item) => {
                  const pct = totalMembers > 0 ? Math.round((item.value / totalMembers) * 100) : 0;
                  return (
                    <motion.div
                      key={item.name}
                      whileHover={{ scale: 1.02, y: -2 }}
                      className="group relative overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-850 p-3.5 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-[0.04] bg-gradient-to-br ${item.gradient} transition-opacity`} />
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-slate-900 dark:text-white">{item.value}</span>
                          <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400">{pct}%</span>
                        </div>
                      </div>
                      <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (todayData) {
    const totalSecs = todayData.totalLoggedInSeconds || 1;
    const items = [
      { name: 'Productive', value: todayData.totalProductiveSeconds, color: '#10B981', pct: Math.round((todayData.totalProductiveSeconds / totalSecs) * 100) },
      { name: 'Short Break', value: todayData.breakDetails.shortBreakSeconds, color: '#F59E0B', pct: Math.round((todayData.breakDetails.shortBreakSeconds / totalSecs) * 100) },
      { name: 'Dinner Break', value: todayData.breakDetails.dinnerBreakSeconds, color: '#F97316', pct: Math.round((todayData.breakDetails.dinnerBreakSeconds / totalSecs) * 100) },
      { name: 'Meetings', value: todayData.breakDetails.meetingSeconds, color: '#6366F1', pct: Math.round((todayData.breakDetails.meetingSeconds / totalSecs) * 100) },
      { name: 'Briefing', value: todayData.breakDetails.briefingTrainingSeconds, color: '#8B5CF6', pct: Math.round((todayData.breakDetails.briefingTrainingSeconds / totalSecs) * 100) },
      { name: 'System Issue', value: todayData.breakDetails.systemIssueSeconds, color: '#F43F5E', pct: Math.round((todayData.breakDetails.systemIssueSeconds / totalSecs) * 100) },
    ].filter((item) => item.value > 0);

    const utilization = todayData.totalLoggedInSeconds
      ? Math.min(100, Math.round((todayData.totalProductiveSeconds / todayData.totalLoggedInSeconds) * 100))
      : 100;

    return (
      <Card className="border-slate-200/60 shadow-sm overflow-hidden rounded-2xl dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-white dark:from-slate-850 dark:to-slate-900 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">Shift Breakdown</CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Today's time allocation • Utilization {utilization}%</CardDescription>
              </div>
            </div>
            <Badge className="w-fit text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm">
              <Zap className="h-3 w-3 mr-1" />
              {utilization}% Productive
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {items.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No activity yet today</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-center">
              <div className="h-56 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={items} cx="50%" cy="50%" innerRadius={58} outerRadius={86} paddingAngle={3} dataKey="value">
                      {items.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      formatter={(val: number) => [formatHoursMinutes(val), '']}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{utilization}%</span>
                  <span className="text-[11px] uppercase font-semibold text-slate-400">Utilization</span>
                </div>
              </div>
              <div className="space-y-2.5">
                {items.map((item) => (
                  <div key={item.name} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850/40 p-3 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-350 min-w-[90px]">{item.name}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                    <span className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-300 min-w-[72px] text-right">{formatHoursMinutes(item.value)}</span>
                    <span className="text-[11px] text-slate-400 font-medium min-w-[32px] text-right">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
    return null;
  }

  return null;
}

interface ExtendedBreaksSectionProps {
  members: LiveStatusMetricsData['members'];
}

function ExtendedBreaksSection({ members }: ExtendedBreaksSectionProps) {
  const extendedMembers = useMemo(() => {
    return members.filter((m) => {
      const isShortBreakExtended = m.status === 'SHORT_BREAK' && m.currentDurationSeconds > 900;
      const isDinnerBreakExtended = m.status === 'DINNER_BREAK' && m.currentDurationSeconds > 2400;
      return isShortBreakExtended || isDinnerBreakExtended;
    });
  }, [members]);

  if (extendedMembers.length === 0) {
    return (
      <Card className="border-slate-200/60 shadow-sm overflow-hidden rounded-2xl dark:bg-slate-900 dark:border-slate-800">
        <CardContent className="py-4 flex items-center gap-3 bg-emerald-50/40 dark:bg-emerald-950/10 border-l-4 border-emerald-500">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">All members are within break limits</p>
            <p className="text-[10px] text-emerald-650 dark:text-emerald-400">There are no recruiters currently exceeding the 15-minute short break or 40-minute dinner break limit.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-rose-200 dark:border-rose-900/30 shadow-sm overflow-hidden rounded-2xl dark:bg-slate-900">
      <CardHeader className="pb-2 border-b border-rose-100 bg-rose-50/30 dark:bg-rose-950/10 dark:border-rose-900/30">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500 text-white shadow-sm">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-rose-800 dark:text-rose-450 flex items-center gap-2">
              Extended Break Alerts
              <Badge variant="destructive" className="h-5 rounded-full px-2 text-[10px] font-black animate-pulse">
                {extendedMembers.length} active
              </Badge>
            </CardTitle>
            <CardDescription className="text-[11px] text-rose-600/80 dark:text-rose-400/80">Recruiters currently exceeding standard break allowances</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/40 dark:bg-slate-900/30">
              <TableHead className="font-semibold text-xs py-2 pl-4">Recruiter</TableHead>
              <TableHead className="font-semibold text-xs py-2">Break Type</TableHead>
              <TableHead className="font-semibold text-xs py-2">Active Duration</TableHead>
              <TableHead className="font-semibold text-xs py-2 text-right pr-4">Exceeded By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {extendedMembers.map((m) => {
              const limit = m.status === 'SHORT_BREAK' ? 900 : 2400;
              const exceededSeconds = m.currentDurationSeconds - limit;
              const exceededFormatted = formatHoursMinutes(exceededSeconds);
              const durationFormatted = formatHoursMinutes(m.currentDurationSeconds);

              return (
                <TableRow key={m.userId} className="hover:bg-rose-50/10 dark:hover:bg-rose-950/10 border-rose-100 dark:border-rose-900/20">
                  <TableCell className="py-2.5 pl-4 font-bold text-slate-850 dark:text-slate-200">
                    <div>{m.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{m.email}</div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge variant="outline" className="text-[10px] bg-rose-50/50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900">
                      {m.status === 'SHORT_BREAK' ? 'Short Break' : 'Dinner Break'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-350">
                    {durationFormatted}
                  </TableCell>
                  <TableCell className="py-2.5 text-right pr-4 font-mono font-bold text-rose-600 dark:text-rose-450 text-xs">
                    +{exceededFormatted}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Helper to get dynamic roadmap styling for each user status
function getStatusNodeStyles(status: UserStatus) {
  switch (status) {
    case 'ACTIVE':
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

// Premium Timeline Component - Game Roadmap Journey Style
function TodayTimeline({ data }: { data?: TodayActivityData }) {
  if (!data?.logs?.length) return null;

  const [showAll, setShowAll] = useState(false);
  const logs = showAll ? data.logs : data.logs.slice(-5);
  const displayLogs = [...logs].reverse();

  // Dynamically generate the SVG path to match any count of levels (logs)
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

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY === 0) return;
    e.currentTarget.scrollLeft += e.deltaY;
  };

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
        <div
          // onWheel={handleWheel}
          className="relative overflow-x-auto scrollbar-thick py-10 px-8 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:16px_16px]"
        >
          {/* Curved Winding Track Line */}
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
                  
                  {/* Details Speech Bubble - Alternating ABOVE the node */}
                  {isOddVisual ? (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="mb-8"
                    >
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
                        {log.optionalNote && <p className="mt-1 text-[9px] text-slate-550 dark:text-slate-450 italic truncate" title={log.optionalNote}>“{log.optionalNote}”</p>}
                      </div>
                    </motion.div>
                  ) : (
                    // Spacer to align stepping stone to center
                    <div className="h-[96px] mb-8" />
                  )}

                  {/* Stepping Stone Node */}
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

                  {/* Details Speech Bubble - Alternating BELOW the node */}
                  {!isOddVisual ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="mt-8"
                    >
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
                    // Spacer to align stepping stone to center
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

export default function ActivityTrackingPage({ forceUserId }: { forceUserId?: string } = {}) {
  const { isAdmin, isTeamLeader } = usePermissions();
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status');

  const [selectedUserId, setSelectedUserId] = useState<string | typeof ALL>(forceUserId || ALL);
  const [selectedTeamId, setSelectedTeamId] = useState<string | typeof ALL_TEAMS>(ALL_TEAMS);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'ON_BREAK' | typeof ALL>(() => {
    if (statusParam) return statusParam as any;
    return ALL;
  });
  const [selectedRole, setSelectedRole] = useState<string | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (statusParam) {
      setStatusFilter(statusParam as any);
    } else {
      setStatusFilter(ALL);
    }
  }, [statusParam]);

  const { data: activityUsers } = useActivityUsers();
  const { data: todayData, isLoading: todayLoading } = useTodayActivity();
  const { data: liveData, isLoading: liveLoading, refetch: refetchLive, isFetching: isFetchingLive } = useLiveStatus();
  const { data: productivityData } = useProductivityMetrics({
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    recruiterId: selectedUserId === ALL ? undefined : selectedUserId,
  });

  const { data: historyData, isLoading: historyLoading, isError, refetch } = useActivityHistory({
    userId: selectedUserId === ALL ? undefined : selectedUserId,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    status: statusFilter === ALL || statusFilter === 'ON_BREAK' ? undefined : statusFilter,
    role: selectedRole === ALL ? undefined : selectedRole,
    page,
    pageSize: 20,
  });

  const logs = historyData?.data ?? [];
  const members = liveData?.members ?? [];

  const teamOptions = members
    .filter((m) => m.role === 'TEAM_LEADER')
    .map((tl) => ({ id: tl.userId, label: tl.teamName ? `${tl.teamName}` : tl.name, tlName: tl.name }));

  const filteredActivityUsers = useMemo(() => {
    if (!activityUsers) return [];
    if (selectedRole === ALL) return activityUsers;
    return activityUsers.filter((u) => u.role === selectedRole);
  }, [activityUsers, selectedRole]);

  const filteredMembers = useMemo(
    () =>
      members.filter((m) => {
        if (selectedTeamId !== ALL_TEAMS) {
          if (m.userId !== selectedTeamId && m.createdById !== selectedTeamId) return false;
        }
        if (selectedUserId !== ALL && m.userId !== selectedUserId) return false;
        if (statusFilter !== ALL) {
          if (statusFilter === 'ON_BREAK') {
            if (m.status !== 'SHORT_BREAK' && m.status !== 'DINNER_BREAK') return false;
          } else if (m.status !== statusFilter) {
            return false;
          }
        }
        if (selectedRole !== ALL && m.role !== selectedRole) return false;
        return true;
      }),
    [members, selectedTeamId, selectedUserId, statusFilter, selectedRole]
  );

  const productivityChartData = useMemo(() => {
    if (!productivityData) return [];
    return [
      { name: 'Productive', hours: productivityData.totalProductiveHours, color: '#10B981' },
      { name: 'Break', hours: productivityData.totalBreakHours, color: '#F59E0B' },
      { name: 'Avg/Productive', hours: productivityData.averageProductiveHoursPerUser, color: '#6366F1' },
    ];
  }, [productivityData]);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      let ExcelJS;
      try {
        ExcelJS = await import('exceljs').then((m) => m.default ?? m);
      } catch (err) {
        console.error('Failed to load exceljs', err);
        toast.error('Application update detected. Reloading page...');
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Mayzax ATS';
      workbook.created = new Date();
      const worksheet = workbook.addWorksheet('Activity Logs');
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      const headers = ['User Name', 'Email', 'Role', 'Status', 'Started At', 'Ended At', 'Duration', 'Note'];
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A5DA8' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      logs.forEach((log) => {
        worksheet.addRow([
          log.user.name,
          log.user.email,
          log.user.role,
          STATUS_CONFIG[log.status as UserStatus]?.label ?? log.status,
          formatDateTime(log.startedAt),
          log.endedAt ? formatDateTime(log.endedAt) : 'In Progress',
          formatHoursMinutes(log.durationSeconds),
          log.optionalNote ?? '',
        ]);
      });
      worksheet.columns.forEach((col) => (col.width = 22));
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const selectedUser = activityUsers?.find((u) => u.id === selectedUserId);
      const filename = generateExportFilename({
        baseName: 'Activity_Logs',
        userNameOrCandidate: selectedUser ? selectedUser.name : undefined,
        status: statusFilter === ALL ? undefined : statusFilter,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      saveAs(blob, filename);
      toast.success(`Exported ${logs.length} activity records.`);
    } catch {
      toast.error('Failed to export activity logs.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAttendanceSheet = async () => {
    setIsExporting(true);
    try {
      let ExcelJS;
      try {
        ExcelJS = await import('exceljs').then((m) => m.default ?? m);
      } catch (err) {
        console.error('Failed to load exceljs', err);
        toast.error('Application update detected. Reloading page...');
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
      const { saveAs } = await import('file-saver');

      const { data } = await apiClient.get<
        ApiSuccess<{
          fromDate: string;
          toDate: string;
          reports: AttendanceReportItem[];
        }>
      >('/activity/attendance', {
        params: {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          recruiterId: selectedUserId === ALL ? undefined : selectedUserId,
        },
      });

      const { reports, fromDate: responseFromDate, toDate: responseToDate } = data.data;
      if (reports.length === 0) {
        toast.info('No attendance data available to export.');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Mayzax ATS';
      workbook.created = new Date();
      const worksheet = workbook.addWorksheet('Attendance Report');
      worksheet.views = [{ state: 'frozen', ySplit: 2 }];
      const titleRow = worksheet.addRow(['Mayzax ATS - Employee Attendance & Shift Utilization Report']);
      titleRow.height = 30;
      worksheet.mergeCells('A1:P1');
      const titleCell = titleRow.getCell(1);
      titleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      const headers = [
        'Employee Name',
        'Email',
        'Role',
        'Manager / TL',
        'Attendance Status',
        'First Login Time',
        'Last Logout Time',
        'Logged In (hh:mm:ss)',
        'Productive (hh:mm:ss)',
        'Total Break (hh:mm:ss)',
        'Short Break (hh:mm:ss)',
        'Dinner Break (hh:mm:ss)',
        'Meetings (hh:mm:ss)',
        'Briefing/Training (hh:mm:ss)',
        'System Downtime (hh:mm:ss)',
        'Shift Utilization (%)',
      ];
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A5DA8' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      reports.forEach((item, idx) => {
        const row = worksheet.addRow([
          item.name,
          item.email,
          formatRoleLabel(item.role, false),
          item.managerName,
          item.attendanceStatus,
          item.firstLogin ? formatDateTime(item.firstLogin) : 'N/A',
          item.lastLogout ? formatDateTime(item.lastLogout) : 'Active / N/A',
          formatDecimalHoursToHMS(item.totalLoggedInHours),
          formatDecimalHoursToHMS(item.totalProductiveHours),
          formatDecimalHoursToHMS(item.totalBreakHours),
          formatDecimalHoursToHMS(item.shortBreakHours),
          formatDecimalHoursToHMS(item.dinnerBreakHours),
          formatDecimalHoursToHMS(item.meetingHours),
          formatDecimalHoursToHMS(item.briefingHours),
          formatDecimalHoursToHMS(item.downtimeHours),
          `${item.shiftUtilization}%`,
        ]);
        const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
        row.eachCell((cell) => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          cell.alignment = { vertical: 'middle' };
        });
      });

      worksheet.columns.forEach((col) => (col.width = 22));
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const selectedUser = activityUsers?.find((u) => u.id === selectedUserId);
      const filename = generateExportFilename({
        baseName: 'Attendance',
        userNameOrCandidate: selectedUser ? selectedUser.name : undefined,
        fromDate: fromDate || responseFromDate,
        toDate: toDate || responseToDate,
      });
      saveAs(blob, filename);
      toast.success(`Exported attendance sheet for ${reports.length} user${reports.length === 1 ? '' : 's'}.`);
    } catch {
      toast.error('Failed to export attendance sheet.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <PremiumPageHeader
        icon={Activity}
        title={isAdmin ? 'Employee Monitoring' : 'Shift & Activity'}
        description={
          isAdmin
            ? 'Real-time pulse of your workforce • Productivity, breaks & shift utilization'
            : isTeamLeader
            ? 'Monitor your team’s shift, breaks & productivity in real time'
            : 'Your personal shift cockpit • Track productive time, breaks & utilization'
        }
        live={true}
        liveLabel="Live"
        pills={[
          { label: 'Visual Analytics', icon: Sparkles, variant: 'premium' }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PermissionGate permission="export:activity">
              <Button variant="outline" onClick={handleExportExcel} disabled={isExporting || logs.length === 0} className="gap-2 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm dark:text-white">
                <Download className="h-4 w-4" /> Export Logs
              </Button>
            </PermissionGate>
            {(isAdmin || isTeamLeader) && (
              <Button variant="brand" onClick={handleExportAttendanceSheet} disabled={isExporting} className="gap-2 shadow-md shadow-violet-500/20">
                <Award className="h-4 w-4" /> Attendance Sheet
              </Button>
            )}
          </div>
        }
        gradient="from-violet-600 to-indigo-600"
        bottomGradient="from-violet-600 via-indigo-500 to-teal-500"
      />

      {/* Premium Summary Cards */}
      {!isAdmin && (
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
      )}

      {/* Admin Productivity Overview - Premium */}
       {isAdmin && productivityData && (
        <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <PremiumMetricCard
              icon={Clock}
              label="Avg. Productive"
              value={formatHoursLabel(productivityData.averageProductiveHoursPerUser)}
              subValue={`${productivityData.averageProductiveHoursPerUser}h / user`}
              color="text-emerald-700"
              gradient="from-emerald-500 to-teal-600"
              index={0}
            />
          </StaggerItem>
          <StaggerItem>
            <PremiumMetricCard
              icon={Coffee}
              label="Avg. Break"
              value={formatHoursLabel(productivityData.activeUsersCount > 0 ? (productivityData.totalBreakHours / productivityData.activeUsersCount) : 0)}
              subValue={`${productivityData.totalBreakHours}h total`}
              color="text-amber-700"
              gradient="from-amber-500 to-orange-500"
              index={1}
            />
          </StaggerItem>
          <StaggerItem>
            <PremiumMetricCard
              icon={BarChart3}
              label="Avg. Shift Utilization"
              value={`${productivityData.shiftUtilizationPercentage}%`}
              color="text-violet-700"
              gradient="from-violet-500 to-indigo-600"
              index={2}
              trend={`${productivityData.activeUsersCount} active`}
            />
          </StaggerItem>
          <StaggerItem>
            <PremiumMetricCard
              icon={UsersIcon}
              label="Active Users"
              value={productivityData.activeUsersCount}
              subValue={`${productivityData.attendancePercentage}% attendance`}
              color="text-slate-800"
              gradient="from-slate-700 to-slate-900"
              index={3}
            />
          </StaggerItem>
        </StaggerContainer>
      )}

      {/* Productivity Chart */}
      {productivityChartData.length > 0 && (
        <Reveal delay={0.1}>
          <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-850 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">Productivity Pulse</CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Hours distribution across selected period</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={productivityChartData}>
                    <defs>
                      <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      formatter={(val: number) => [`${val}h`, '']}
                    />
                    <Area type="monotone" dataKey="hours" stroke="#10B981" strokeWidth={2.5} fill="url(#prodGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      )}

      {/* Main breakdown charts */}
      <Reveal delay={0.15}>
        <ShiftActivityPieChart
          todayData={todayData}
          liveData={liveData}
          filteredMembers={filteredMembers}
          isAdminView={isAdmin || isTeamLeader}
        />
      </Reveal>

      {/* Extended Breaks Alert Section (Admin/TL only) */}
      {(isAdmin || isTeamLeader) && liveData && (
        <Reveal delay={0.18}>
          <ExtendedBreaksSection members={liveData.members} />
        </Reveal>
      )}

      {/* Timeline for Recruiters */}
      {!isAdmin && todayData && (
        <Reveal delay={0.2}>
          <TodayTimeline data={todayData} />
        </Reveal>
      )}

      {/* Premium Filters */}
      <Reveal delay={0.2}>
        <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <div className="bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-850 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-white">Filters & View Controls</span>
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-400">{filteredMembers.length} members • {logs.length} logs</span>
          </div>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2 dark:text-white">
                <PermissionGate permission="view:activity:all">
                  <Select value={selectedTeamId} onValueChange={(v) => { setSelectedTeamId(v as any); setPage(1); }}>
                    <SelectTrigger className="w-full sm:w-[155px] bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                      <SelectValue placeholder="Filter by Team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_TEAMS}>All Teams</SelectItem>
                      {teamOptions.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.label} • TL: {team.tlName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedRole} onValueChange={(v) => { setSelectedRole(v); setSelectedUserId(ALL); setPage(1); }}>
                    <SelectTrigger className="w-full sm:w-[155px] bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                      <SelectValue placeholder="Filter by Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All Roles</SelectItem>
                      <SelectItem value="TEAM_LEADER">Team Leader</SelectItem>
                      <SelectItem value="RECRUITER">Recruiter</SelectItem>
                      <SelectItem value="SALES_EXEC">Sales Exec</SelectItem>
                      <SelectItem value="RESUME_ASSIST">Resume Assist</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedUserId} onValueChange={(v) => { setSelectedUserId(v as any); setPage(1); }}>
                    <SelectTrigger className="w-full sm:w-[155px] bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                      <SelectValue placeholder="Filter by User" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All Users</SelectItem>
                      {filteredActivityUsers?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({formatRoleLabel(u.role)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </PermissionGate>

                <Select value={statusFilter as any} onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[155px] bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All Statuses</SelectItem>
                    {(Object.keys(STATUS_CONFIG) as UserStatus[]).map((st) => (
                      <SelectItem key={st} value={st}>
                        {STATUS_CONFIG[st].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 shadow-sm">
                <Calendar className="h-4 w-4 text-violet-500 shrink-0" />
                <span className="font-medium text-slate-500 dark:text-slate-400">From</span>
                <Input
                  type="date"
                  className="h-7 w-32 border-0 bg-transparent p-0 text-xs focus:ring-0 cursor-pointer dark:text-white"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                />
                <span className="font-medium text-slate-500 dark:text-slate-400">To</span>
                <Input
                  type="date"
                  className="h-7 w-32 border-0 bg-transparent p-0 text-xs focus:ring-0 cursor-pointer dark:text-white"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {/* Live Status + Logs */}
      {(isAdmin || isTeamLeader) && selectedUserId === ALL && !fromDate && !toDate ? (
        <Reveal delay={0.25}>
          <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-850 dark:to-slate-900 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <UsersIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 dark:text-white">
                      {statusFilter !== ALL ? `In ${STATUS_CONFIG[statusFilter as UserStatus]?.label}` : 'Live User Pulse'}
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </CardTitle>
                    <CardDescription className="text-xs dark:text-slate-400">{filteredMembers.length} members • Real-time</CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchLive()}
                  disabled={isFetchingLive}
                  className="gap-2 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm dark:text-white"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isFetchingLive ? 'animate-spin' : ''}`} />
                  Refresh status
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {liveLoading && <div className="p-4"><TableSkeleton rows={6} cols={7} /></div>}
              {!liveLoading && filteredMembers.length === 0 && (
                <div className="p-6">
                  <EmptyState icon={ShieldCheck} title="No users found" description={statusFilter !== ALL ? `No users in ${STATUS_CONFIG[statusFilter as UserStatus]?.label}` : 'No active members'} />
                </div>
              )}
              {!liveLoading && filteredMembers.length > 0 && (
                <VirtualizedTable
                  data={filteredMembers}
                  estimateRowHeight={72}
                  maxHeight="520px"
                  header={
                    <div className="grid grid-cols-[1.8fr_0.7fr_1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.9fr] gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-850/80">
                      <span>User</span>
                      <span>Role</span>
                      <span>Status</span>
                      <span>Duration</span>
                      <span>Logged In</span>
                      <span>Productive</span>
                      <span>Break</span>
                      <span className="text-right">Action</span>
                    </div>
                  }
                  renderRow={(m: any) => {
                    const cfg = STATUS_CONFIG[m.status as UserStatus];
                    return (
                      <div className="grid grid-cols-[1.8fr_0.7fr_1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.9fr] gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors items-center">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{m.name}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate">{m.email}</p>
                        </div>
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{formatRoleLabel(m.role)}</div>
                        <div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
                            {cfg.label}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-slate-700 dark:text-slate-300 font-medium">{formatHoursMinutes(m.currentDurationSeconds)}</div>
                        <div className="text-xs font-mono text-slate-600 dark:text-slate-400">{formatHoursMinutes(m.todayLoggedInSeconds)}</div>
                        <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-medium">{formatHoursMinutes(m.todayProductiveSeconds)}</div>
                        <div className="text-xs font-mono text-amber-700 dark:text-amber-400">{formatHoursMinutes(m.todayBreakSeconds)}</div>
                        <div className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-slate-800"
                            onClick={() => { setSelectedUserId(m.userId); setPage(1); }}
                          >
                            View Logs →
                          </Button>
                        </div>
                      </div>
                    );
                  }}
                />
              )}
            </CardContent>
          </Card>
        </Reveal>
      ) : (
        <Reveal delay={0.25}>
          <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-850 dark:to-slate-900 py-4">
              {selectedUserId !== ALL && (isAdmin || isTeamLeader) ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold dark:text-white">Event Logs — {activityUsers?.find((u) => u.id === selectedUserId)?.name || 'Selected User'}</CardTitle>
                    <CardDescription className="text-xs dark:text-white">Detailed transition history</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white" onClick={() => { setSelectedUserId(ALL); setPage(1); }}>
                    ← Back to Summary
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Timer className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold dark:text-white">Activity Event Logs</CardTitle>
                    <CardDescription className="text-xs dark:text-slate-400">Status transitions • Virtualized for performance</CardDescription>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {historyLoading && <div className="p-4"><TableSkeleton rows={6} cols={6} /></div>}
              {isError && <div className="p-4"><ErrorState onRetry={() => refetch()} /></div>}
              {!historyLoading && !isError && logs.length === 0 && (
                <div className="p-6"><EmptyState icon={ShieldCheck} title="No logs" description="Adjust filters" /></div>
              )}
              {!historyLoading && !isError && logs.length > 0 && (
                <>
                  <VirtualizedTable
                    data={logs}
                    estimateRowHeight={64}
                    maxHeight="560px"
                    header={
                      <div className="grid grid-cols-[1.3fr_0.9fr_1fr_1fr_0.6fr_1fr] gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-850/80">
                        <span>User</span>
                        <span>Status</span>
                        <span>Started</span>
                        <span>Ended</span>
                        <span>Duration</span>
                        <span>Note</span>
                      </div>
                    }
                    renderRow={(log: any) => {
                      const cfg = STATUS_CONFIG[log.status as UserStatus];
                      return (
                        <div className="grid grid-cols-[1.3fr_0.9fr_1fr_1fr_0.6fr_1fr] gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 items-center">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{log.user.name}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate">{log.user.email}</p>
                          </div>
                          <div>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
                              {cfg.label}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">{formatDateTime(log.startedAt)}</div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">{log.endedAt ? formatDateTime(log.endedAt) : <span className="font-semibold text-emerald-600 dark:text-emerald-400">Active</span>}</div>
                          <div className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">{formatHoursMinutes(log.durationSeconds)}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{log.optionalNote || '-'}</div>
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
      )}
    </div>
  );
}

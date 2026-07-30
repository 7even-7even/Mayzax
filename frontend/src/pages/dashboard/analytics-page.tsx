import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  ComposedChart,
  Bar,
} from 'recharts';
import { BarChart3, TrendingUp, Briefcase, Flame, Sparkles, Calendar, Filter, Zap, Award, Activity } from 'lucide-react';
import { PremiumPageHeader } from '@/components/shared/premium-page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Reveal, StaggerContainer, StaggerItem } from '@/components/motion/reveal';
import { CountUp } from '@/components/motion/count-up';
import { ActivityHeatmap } from '@/components/motion/activity-heatmap';
import { JobPortalAnalyticsCard } from './job-portal-analytics-card';
import { useDailyCounts, useGlobalSummary } from '@/hooks/use-analytics';
import { useRecruiters } from '@/hooks/use-recruiters';
import { usePermissions } from '@/hooks/use-permissions';
import { motion } from 'framer-motion';

const ALL = '__all__';

function getDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function PremiumStat({ icon: Icon, label, value, sub, gradient, index }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-[1px] shadow-sm hover:shadow-lg transition-all"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br ${gradient} transition-opacity blur-[0.5px]`} />
      <div className="relative rounded-[15px] bg-white dark:bg-slate-900 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
            <Sparkles className="h-3 w-3" />
          </div>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          <CountUp value={typeof value === 'number' ? value : 0} />
          {typeof value !== 'number' && <span className="text-base"> {value}</span>}
        </p>
        {sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const { isAdmin } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [teamId, setTeamId] = useState<string>(() => searchParams.get('teamId') || ALL);
  const [recruiterId, setRecruiterId] = useState<string>(ALL);
  const [range, setRange] = useState(getDefaultRange);

  // Sync state from query parameters
  const paramTeamId = searchParams.get('teamId') || ALL;
  useEffect(() => {
    setTeamId(paramTeamId);
    setRecruiterId(ALL);
  }, [paramTeamId]);
  
  const handleTeamChange = (newTeamId: string) => {
    setTeamId(newTeamId);
    setRecruiterId(ALL);
    const newParams = new URLSearchParams(searchParams);
    if (newTeamId === ALL) {
      newParams.delete('teamId');
    } else {
      newParams.set('teamId', newTeamId);
    }
    setSearchParams(newParams);
  };

  const { data: recruitersData } = useRecruiters({
    pageSize: 100,
    createdById: teamId === ALL ? undefined : teamId
  });
  const { data: summary, isLoading: summaryLoading } = useGlobalSummary();
  const { data: dailyCounts, isLoading, isError, refetch } = useDailyCounts({
    recruiterId: recruiterId === ALL ? undefined : recruiterId,
    teamId: teamId === ALL ? undefined : teamId,
    from: range.from,
    to: range.to,
  });

  const recruiters = recruitersData?.data ?? [];
  const chartData = useMemo(
    () =>
      (dailyCounts ?? []).map((d) => ({
        date: d.businessDate.slice(5),
        fullDate: d.businessDate,
        applications: d.count,
        movingAvg: 0, // will compute next
      })),
    [dailyCounts]
  );

  // Compute moving average 3-day
  const enrichedChartData = useMemo(() => {
    return chartData.map((d, i, arr) => {
      const window = arr.slice(Math.max(0, i - 2), i + 1);
      const avg = window.reduce((s, x) => s + x.applications, 0) / window.length;
      return { ...d, movingAvg: Number(avg.toFixed(1)) };
    });
  }, [chartData]);

  const avgPerDay = chartData.length > 0 ? Math.round((chartData.reduce((s, d) => s + d.applications, 0) / chartData.length) * 10) / 10 : 0;
  const peakDay = chartData.length > 0 ? Math.max(...chartData.map((d) => d.applications)) : 0;
  const totalInRange = chartData.reduce((s, d) => s + d.applications, 0);

  return (
    <div className="space-y-6">
      <PremiumPageHeader
        icon={BarChart3}
        title="Analytics Hub"
        description="Business-date trends, recruiter filters, portal breakdowns & heatmaps — all in IST shift logic."
        pills={[
          { label: `${totalInRange} apps in range`, icon: Activity },
          { label: `${range.from} → ${range.to}`, icon: Calendar }
        ]}
        actions={
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 shadow-sm whitespace-nowrap overflow-x-auto">
            <Filter className="h-4 w-4 text-slate-400 dark:text-slate-400 ml-1 shrink-0" />
            {isAdmin && (
              <Select value={teamId} onValueChange={handleTeamChange}>
                <SelectTrigger className="w-32 sm:w-36 h-8 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-white shrink-0">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Teams</SelectItem>
                  {summary?.teams?.map((t) => (
                    <SelectItem key={t.tlId} value={t.tlId}>
                      {t.teamName || t.tlName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={recruiterId} onValueChange={setRecruiterId}>
              <SelectTrigger className="w-32 sm:w-36 h-8 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-white shrink-0">
                <SelectValue placeholder="All recruiters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Recruiters</SelectItem>
                {recruiters.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={range.from} onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))} className="w-28 sm:w-32 h-8 text-xs dark:bg-slate-900 dark:text-white dark:border-slate-700 shrink-0" />
            <Input type="date" value={range.to} onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))} className="w-28 sm:w-32 h-8 text-xs dark:bg-slate-900 dark:text-white dark:border-slate-700 shrink-0" />
          </div>
        }
        gradient="from-mayzax-blue-600 to-mayzax-green-600"
        bottomGradient="from-mayzax-blue-600 via-mayzax-green-500 to-mayzax-blue-600"
      />

      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StaggerItem>
          <PremiumStat icon={Briefcase} label="Total Apps (all-time)" value={summary?.totalApplications ?? 0} sub="Lifetime" gradient="from-blue-500 to-cyan-600" index={0} />
        </StaggerItem>
        <StaggerItem>
          <PremiumStat icon={TrendingUp} label="Avg / Day (range)" value={avgPerDay} sub={`${totalInRange} total`} gradient="from-emerald-500 to-teal-600" index={1} />
        </StaggerItem>
        <StaggerItem>
          <PremiumStat icon={Flame} label="Peak Day" value={peakDay} sub="Max in range" gradient="from-amber-500 to-orange-600" index={2} />
        </StaggerItem>
      </StaggerContainer>

      <Reveal delay={0.1}>
        <JobPortalAnalyticsCard recruiterId={recruiterId} teamId={teamId} />
      </Reveal>

      <Reveal delay={0.15}>
        <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-mayzax-blue-600 to-mayzax-green-600 text-white shadow-md">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2 dark:text-black">
                  Daily Applications Trend
                  <Badge variant="outline" className="text-[10px] bg-violet-50 border-violet-200 text-violet-700">Live</Badge>
                </CardTitle>
                <CardDescription className="text-xs mt-1 dark:text-black">
                  Shift logic: {summary?.shiftWindowText || '6:00 PM – 9:00 AM IST'} • Current BD: <span className="font-medium text-slate-700">{summary?.currentBusinessDate}</span> • 3-day moving average
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && <div className="p-6"><Skeleton className="h-80 w-full rounded-xl" /></div>}
            {isError && <div className="p-6"><ErrorState onRetry={() => refetch()} /></div>}
            {!isLoading && !isError && enrichedChartData.length === 0 && (
              <div className="p-6"><EmptyState icon={BarChart3} title="No data yet" description="Charts appear once apps are logged." /></div>
            )}
            {!isLoading && !isError && enrichedChartData.length > 0 && (
              <div className="p-4 sm:p-6">
                <div className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 p-3 sm:p-4">
                  <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart data={enrichedChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAppsPremium" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl min-w-[180px]">
                              <p className="text-xs font-semibold text-slate-900">BD: {label}</p>
                              {payload.map((p: any) => (
                                <div key={p.dataKey} className="mt-1 flex items-center justify-between gap-4 text-xs">
                                  <span className="flex items-center gap-1.5 text-slate-500">
                                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                                    {p.dataKey === 'applications' ? 'Applications' : '3-day Avg'}
                                  </span>
                                  <span className="font-bold text-slate-900">{p.value}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Area type="monotone" dataKey="applications" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorAppsPremium)" dot={{ r: 3, strokeWidth: 2, fill: 'white', stroke: '#6366f1' }} activeDot={{ r: 6, fill: '#6366f1' }} />
                      <Line type="monotone" dataKey="movingAvg" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-2">
                      <span className="flex items-center gap-1 dark:text-black"><span className="h-2 w-2 rounded-full bg-violet-500 " /> Daily</span>
                      <span className="flex items-center gap-1 dark:text-black"><span className="h-2 w-2 rounded-full bg-amber-500" style={{ borderStyle: 'dashed' }} /> Moving Avg (3d)</span>
                    </span>
                    <span className="flex items-center gap-1.5 dark:text-black">
                      <Zap className="h-3 w-3 text-violet-500 " /> 
                      Business-date grouping • IST shift
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.25}>
        <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-amber-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2 dark:text-black">
                  Activity Heatmap
                  <Badge variant="outline" className="text-[10px]">18 weeks</Badge>
                </CardTitle>
                <CardDescription className="text-xs dark:text-black">
                  {recruiterId === ALL ? 'All recruiters' : recruiters.find((r) => r.id === recruiterId)?.name} • business-date activity
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 overflow-x-auto">
            {isLoading ? <Skeleton className="h-28 w-full max-w-2xl rounded-xl" /> : <ActivityHeatmap data={dailyCounts ?? []} weeks={18} />}
            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400 dark:text-white">
              <Sparkles className="h-3 w-3 text-amber-500 " />
              Hover cells for details
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}

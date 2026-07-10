import { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { BarChart3, TrendingUp, Briefcase, Flame } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Reveal } from '@/components/motion/reveal';
import { StatCard } from '@/components/motion/stat-card';
import { GradientBorderCard } from '@/components/motion/gradient-border-card';
import { ActivityHeatmap } from '@/components/motion/activity-heatmap';
import { JobPortalAnalyticsCard } from './job-portal-analytics-card';
import { useDailyCounts, useGlobalSummary } from '@/hooks/use-analytics';
import { useRecruiters } from '@/hooks/use-recruiters';

const ALL = '__all__';

function getDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function AnalyticsPage() {
  const [recruiterId, setRecruiterId] = useState<string>(ALL);
  const [range, setRange] = useState(getDefaultRange);

  const { data: recruitersData } = useRecruiters({ pageSize: 100 });
  const { data: summary, isLoading: summaryLoading } = useGlobalSummary();
  const {
    data: dailyCounts,
    isLoading,
    isError,
    refetch,
  } = useDailyCounts({
    recruiterId: recruiterId === ALL ? undefined : recruiterId,
    from: range.from,
    to: range.to,
  });

  const recruiters = recruitersData?.data ?? [];
  const chartData = (dailyCounts ?? []).map((d) => ({
    date: d.businessDate.slice(5),
    applications: d.count,
  }));

  const avgPerDay = chartData.length > 0 ? Math.round((chartData.reduce((s, d) => s + d.applications, 0) / chartData.length) * 10) / 10 : 0;
  const peakDay = chartData.length > 0 ? Math.max(...chartData.map((d) => d.applications)) : 0;

  return (
    <div>
      <Reveal>
        <PageHeader
          title="Analytics"
          description="Application trends with recruiter and business-date filters."
          actions={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={recruiterId} onValueChange={setRecruiterId}>
                <SelectTrigger className="w-full sm:w-56">
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
              <Input
                type="date"
                value={range.from}
                onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))}
                className="w-full sm:w-36"
                aria-label="Analytics start date"
              />
              <Input
                type="date"
                value={range.to}
                onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))}
                className="w-full sm:w-36"
                aria-label="Analytics end date"
              />
            </div>
          }
        />
      </Reveal>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Briefcase} label="Total Applications (all-time)" value={summary?.totalApplications ?? 0} isLoading={summaryLoading} colorClass="text-mayzax-blue bg-mayzax-blue-50" index={0} />
        <StatCard icon={TrendingUp} label="Avg. Applications / Day" value={avgPerDay} isLoading={isLoading} colorClass="text-mayzax-green bg-mayzax-green-50" index={1} />
        <StatCard icon={Flame} label="Peak Day" value={peakDay} isLoading={isLoading} colorClass="text-amber-600 bg-amber-50" index={2} />
      </div>

      <Reveal delay={0.1} className="mb-6">
        <JobPortalAnalyticsCard
          title="Job Portal Analytics"
          description="Admin overview of application submissions by portal across all recruiters."
        />
      </Reveal>

      <Reveal delay={0.15} className="mb-6">
        <GradientBorderCard>
          <Card className="border-0 shadow-none">
            <CardHeader>
              <CardTitle>Daily Applications by Business Date</CardTitle>
              <CardDescription>
                Grouped using Mayzax's business shift (7:30 PM – 7:30 AM IST), not calendar date.
                {summary && <> Current business date: <span className="font-medium text-slate-700">{summary.currentBusinessDate}</span>.</>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && <Skeleton className="h-72 w-full" />}
              {isError && <ErrorState onRetry={() => refetch()} />}
              {!isLoading && !isError && chartData.length === 0 && (
                <EmptyState icon={BarChart3} title="No application data yet" description="Charts will appear once applications are logged." />
              )}
              {!isLoading && !isError && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2A5DA8" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2A5DA8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                      labelFormatter={(label) => `Business date: ${label}`}
                      animationDuration={200}
                    />
                    <Area
                      type="monotone"
                      dataKey="applications"
                      stroke="#2A5DA8"
                      strokeWidth={2}
                      fill="url(#colorApps)"
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </GradientBorderCard>
      </Reveal>

      <Reveal delay={0.25}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4 text-mayzax-green" /> Activity Heatmap
            </CardTitle>
            <CardDescription>
              {recruiterId === ALL ? 'All recruiters combined' : recruiters.find((r) => r.id === recruiterId)?.name} · business-date activity over the last 18 weeks.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto pb-5">
            {isLoading ? <Skeleton className="h-28 w-full max-w-2xl" /> : <ActivityHeatmap data={dailyCounts ?? []} weeks={18} />}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}

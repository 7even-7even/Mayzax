import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { useDailyCounts, useGlobalSummary } from '@/hooks/use-analytics';
import { useRecruiters } from '@/hooks/use-recruiters';
import { BarChart3 } from 'lucide-react';

const ALL = '__all__';

function getDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function AnalyticsPage() {
  const [recruiterId, setRecruiterId] = useState<string>(ALL);
  const range = useMemo(getDefaultRange, []);

  const { data: recruitersData } = useRecruiters({ pageSize: 100 });
  const { data: summary } = useGlobalSummary();
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

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Application trends across the last 30 business days."
        actions={
          <Select value={recruiterId} onValueChange={setRecruiterId}>
            <SelectTrigger className="w-56">
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
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Daily Applications by Business Date</CardTitle>
          <CardDescription>
            Grouped using Mayzax's business shift (7:30 PM – 4:30 AM IST), not calendar date.
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
                />
                <Area type="monotone" dataKey="applications" stroke="#2A5DA8" strokeWidth={2} fill="url(#colorApps)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

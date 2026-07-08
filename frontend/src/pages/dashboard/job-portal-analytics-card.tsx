import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useJobPortalAnalytics } from '@/hooks/use-analytics';
import { formatEnumLabel } from '@/components/shared/status-badge';

type PortalScope = 'all' | 'currentShift' | 'custom';

interface JobPortalAnalyticsCardProps {
  title?: string;
  description?: string;
}

export function JobPortalAnalyticsCard({
  title = 'Job Portal Analytics',
  description = 'Portal-wise application count across tracked job portals.',
}: JobPortalAnalyticsCardProps) {
  const [scope, setScope] = useState<PortalScope>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading, isError, refetch } = useJobPortalAnalytics({
    scope,
    from: scope === 'custom' && from ? from : undefined,
    to: scope === 'custom' && to ? to : undefined,
  });

  const portals = data?.portals ?? [];
  const chartData = portals.map((row) => ({ portal: formatEnumLabel(row.portal), applications: row.count }));
  const hasPortalData = portals.some((row) => row.count > 0);

  const activeButton = (value: PortalScope) => (scope === value ? 'brand' : 'outline');
  const rangeLabel =
    scope === 'currentShift'
      ? `Current shift${data?.currentBusinessDate ? ` · ${data.currentBusinessDate}` : ''}`
      : scope === 'custom'
        ? `${from || 'Start'} to ${to || 'End'}`
        : 'All time';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-mayzax-blue" /> {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={activeButton('all')} onClick={() => setScope('all')}>
                All Time
              </Button>
              <Button type="button" size="sm" variant={activeButton('currentShift')} onClick={() => setScope('currentShift')}>
                Current Shift
              </Button>
              <Button type="button" size="sm" variant={activeButton('custom')} onClick={() => setScope('custom')}>
                Date Range
              </Button>
            </div>
            {scope === 'custom' && (
              <div className="flex flex-wrap gap-2">
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-36" />
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-36" />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-80 w-full" />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {!isLoading && !isError && !hasPortalData && (
          <EmptyState icon={BarChart3} title="No portal data yet" description={`No applications found for ${rangeLabel.toLowerCase()}.`} />
        )}
        {!isLoading && !isError && hasPortalData && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 35 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="portal"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(value) => [value, 'Applications']}
                />
                <Bar dataKey="applications" fill="#2A5DA8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-2">
              <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <div>
                  Total applications: <span className="font-semibold text-slate-900">{data?.totalApplications ?? 0}</span>
                </div>
                <div className="mt-0.5 text-xs text-slate-400">{rangeLabel}</div>
              </div>
              {portals.map((row) => (
                <div key={row.portal} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">{formatEnumLabel(row.portal)}</span>
                  <Badge variant={row.count > 0 ? 'default' : 'muted'}>{row.count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, LabelList } from 'recharts';
import { BarChart3, Sparkles, TrendingUp, Zap, Calendar, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useJobPortalAnalytics } from '@/hooks/use-analytics';
import { formatEnumLabel, ALL_JOB_PORTALS } from '@/components/shared/status-badge';
import { motion } from 'framer-motion';
import { Reveal } from '@/components/motion/reveal';

type PortalScope = 'all' | 'currentShift' | 'custom';

interface JobPortalAnalyticsCardProps {
  title?: string;
  description?: string;
}

const PORTAL_COLORS: Record<string, string> = {
  LINKEDIN: '#0A66C2',
  INDEED: '#2164A6',
  GLASSDOOR: '#17A2B8',
  JOBRIGHT: '#7C3AED',
  SIMPLIFY: '#06B6D4',
  SIMPLYHIRED: '#F59E0B',
  WELLFOUND: '#10B981',
  HANDSHAKE: '#F97316',
  ZIPRECRUITER: '#8B5CF6',
  COMPANY_WEBSITE: '#64748B',
  CAREERBUILDER: '#0EA5A4',
  LEVER: '#F43F5E',
  GREENHOUSE: '#22C55E',
  SPEEDY_APPLY: '#E11D48',
  THE_MUSE: '#6366F1',
  Y_COMBINATOR: '#F97316',
  CAREER_SITE: '#94A3B8',
  OTHER: '#94A3B8',
};

const PORTAL_GRADIENTS: Record<string, string> = {
  LINKEDIN: 'from-[#0A66C2] to-[#004182]',
  INDEED: 'from-[#2164A6] to-[#003061]',
  GLASSDOOR: 'from-cyan-500 to-teal-600',
  JOBRIGHT: 'from-violet-500 to-purple-600',
  SIMPLIFY: 'from-cyan-400 to-blue-500',
  SIMPLYHIRED: 'from-amber-400 to-orange-500',
  WELLFOUND: 'from-emerald-400 to-teal-600',
  HANDSHAKE: 'from-orange-400 to-red-500',
  OTHER: 'from-slate-400 to-slate-600',
};

export function JobPortalAnalyticsCard({
  title = 'Job Portal Performance',
  description = 'Interactive breakdown by portal • Real-time',
}: JobPortalAnalyticsCardProps) {
  const [scope, setScope] = useState<PortalScope>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedPortal, setSelectedPortal] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useJobPortalAnalytics({
    scope,
    from: scope === 'custom' && from ? from : undefined,
    to: scope === 'custom' && to ? to : undefined,
  });

  const portals = data?.portals ?? [];

  const chartData = useMemo(
    () =>
      portals
        .filter((r) => r.count > 0)
        .map((row) => ({
          portal: formatEnumLabel(row.portal),
          rawPortal: row.portal,
          applications: row.count,
          color: PORTAL_COLORS[row.portal] ?? '#2A5DA8',
          gradient: PORTAL_GRADIENTS[row.portal] ?? 'from-slate-500 to-slate-700',
        }))
        .sort((a, b) => b.applications - a.applications),
    [portals]
  );

  const hasPortalData = chartData.length > 0;
  const totalApps = data?.totalApplications ?? 0;
  const topPortal = chartData[0];

  const rangeLabel =
    scope === 'currentShift'
      ? `Current shift${data?.currentBusinessDate ? ` • ${data.currentBusinessDate}` : ''}`
      : scope === 'custom'
      ? `${from || 'Start'} → ${to || 'End'}`
      : 'All time';

  const activeButton = (value: PortalScope) => (scope === value ? 'brand' : 'outline');

  return (
    <Reveal delay={0.1}>
      <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  {title}
                  {topPortal && (
                    <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 text-[10px] shadow-sm">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Top: {topPortal.portal}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">{description} • {rangeLabel}</CardDescription>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-2.5 py-1 font-semibold shadow-sm">
                    <Zap className="h-3 w-3" />
                    {totalApps} applications
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2 py-1 font-medium text-violet-700">
                    <Sparkles className="h-3 w-3" />
                    {chartData.length} active portals
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex flex-wrap gap-1.5">
                <Button type="button" size="sm" variant={activeButton('all')} onClick={() => setScope('all')} className="h-8 text-xs rounded-full">
                  All Time
                </Button>
                <Button type="button" size="sm" variant={activeButton('currentShift')} onClick={() => setScope('currentShift')} className="h-8 text-xs rounded-full">
                  Current Shift
                </Button>
                <Button type="button" size="sm" variant={activeButton('custom')} onClick={() => setScope('custom')} className="h-8 text-xs rounded-full gap-1">
                  <Calendar className="h-3 w-3" />
                  Date Range
                </Button>
              </div>

              {scope === 'custom' && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2 bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Filter className="h-3 w-3" />
                    From
                    <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-7 w-32 text-xs" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    To
                    <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-7 w-32 text-xs" />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && (
            <div className="p-6">
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          )}

          {isError && (
            <div className="p-6">
              <ErrorState onRetry={() => refetch()} />
            </div>
          )}

          {!isLoading && !isError && !hasPortalData && (
            <div className="p-6">
              <EmptyState icon={BarChart3} title="No portal data yet" description={`No applications found for ${rangeLabel.toLowerCase()}.`} />
            </div>
          )}

          {!isLoading && !isError && hasPortalData && (
            <div className="grid grid-cols-1 gap-0 xl:grid-cols-[1fr_300px]">
              {/* Chart */}
              <div className="p-4 sm:p-6">
                <div className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 p-3 sm:p-4 shadow-inner">
                  <ResponsiveContainer width="100%" height={420}>
                    <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 60 }} barCategoryGap="28%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="portal"
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                        angle={-32}
                        textAnchor="end"
                        interval={0}
                        height={70}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: '#f8fafc', radius: 8 }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl min-w-[160px]">
                              <p className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                                {d.portal}
                              </p>
                              <p className="mt-1 text-lg font-bold text-slate-900">{d.applications} apps</p>
                              <p className="text-[11px] text-slate-500">{((d.applications / totalApps) * 100).toFixed(1)}% of total</p>
                              <div className="mt-2 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${(d.applications / (topPortal?.applications || 1)) * 100}%`, background: d.color }} />
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="applications" radius={[10, 10, 0, 0]} barSize={28} animationDuration={900}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={selectedPortal === entry.rawPortal ? '#0f172a' : entry.color}
                            stroke={selectedPortal === entry.rawPortal ? '#0f172a' : 'none'}
                            strokeWidth={selectedPortal === entry.rawPortal ? 2 : 0}
                            style={{ filter: selectedPortal === entry.rawPortal ? 'brightness(1.1)' : undefined, cursor: 'pointer' }}
                          />
                        ))}
                        <LabelList
                          dataKey="applications"
                          position="top"
                          content={(props: any) => {
                            const { x, y, width, value } = props;
                            if (!value) return null;
                            return (
                              <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#334155">
                                {value}
                              </text>
                            );
                          }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-violet-500" />
                    Click bars to highlight • Hover for details
                  </span>
                  <span className="hidden sm:inline">Interactive • Animated • GPU accelerated</span>
                </div>
              </div>

              {/* Side list */}
              <div className="border-t xl:border-t-0 xl:border-l border-slate-200 bg-gradient-to-b from-slate-50/60 to-white">
                <div className="p-4">
                  <div className="rounded-xl bg-slate-900 text-white p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Volume</span>
                      <Zap className="h-4 w-4 text-amber-400" />
                    </div>
                    <p className="text-2xl font-bold tracking-tight">{totalApps}</p>
                    <p className="text-xs text-slate-400 mt-1">{rangeLabel}</p>
                    <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                    {chartData.map((row, idx) => {
                      const pct = totalApps > 0 ? Math.round((row.applications / totalApps) * 100) : 0;
                      const isSelected = selectedPortal === row.rawPortal;
                      return (
                        <motion.button
                          key={row.rawPortal}
                          onClick={() => setSelectedPortal(isSelected ? null : row.rawPortal)}
                          whileHover={{ scale: 1.01, x: 2 }}
                          whileTap={{ scale: 0.99 }}
                          className={`w-full text-left flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all duration-200 ${
                            isSelected ? 'border-slate-900 bg-slate-900 text-white shadow-md' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px] shadow-sm" style={{ background: row.color }}>
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{row.portal}</p>
                              <p className={`text-[11px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{pct}% share</p>
                            </div>
                          </div>
                          <div className="text-right ml-2">
                            <p className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>{row.applications}</p>
                            <div className={`mt-1 h-1 w-12 rounded-full ${isSelected ? 'bg-white/20' : 'bg-slate-100'} overflow-hidden ml-auto`}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: isSelected ? 'white' : row.color }} />
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 p-3">
                    <p className="text-xs font-semibold text-violet-800 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Insight
                    </p>
                    <p className="text-[11px] text-violet-700/80 mt-1 leading-relaxed">
                      {topPortal ? `${topPortal.portal} dominates with ${topPortal.applications} applications (${Math.round((topPortal.applications / totalApps) * 100)}%). Focus more sourcing here.` : 'No data to generate insights.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Reveal>
  );
}

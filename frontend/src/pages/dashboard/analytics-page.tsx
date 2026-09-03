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
import { BarChart3, TrendingUp, Briefcase, Flame, Sparkles, Calendar, Filter, Zap, Award, Activity, Download, Loader2 } from 'lucide-react';
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
import { useDailyCounts, useGlobalSummary, useJobPortalAnalytics, useDashboardOverview } from '@/hooks/use-analytics';
import { useRecruiters } from '@/hooks/use-recruiters';
import { usePermissions } from '@/hooks/use-permissions';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { formatEnumLabel } from '@/components/shared/status-badge';
import { Trophy, Medal, UserCheck, Users } from 'lucide-react';

const ALL = '__all__';

function getDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function styleHeaderRow(row: any, titleBgColor: string = 'FF2A5DA8') {
  row.height = 26;
  row.eachCell((cell: any) => {
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: titleBgColor } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });
}

function styleDataRow(row: any, isEven: boolean) {
  row.height = 20;
  row.eachCell((cell: any) => {
    cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    if (isEven) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFF1F5F9' } },
      left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFF1F5F9' } },
    };
  });
}

async function exportAnalyticsToExcel({
  summary,
  dailyCounts,
  portalData,
  enrichedChartData,
  leaderboardData,
  filterInfo,
}: {
  summary: any;
  dailyCounts: any[];
  portalData: any[];
  enrichedChartData: any[];
  leaderboardData: any[];
  filterInfo: { team: string; recruiter: string; from: string; to: string };
}) {
  let ExcelJS;
  try {
    ExcelJS = await import('exceljs').then((m) => m.default ?? m);
  } catch (err) {
    console.error('Failed to load exceljs', err);
    toast.error('Failed to load Excel export module.');
    return;
  }
  const { saveAs } = await import('file-saver');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mayzax CRM Analytics';
  workbook.created = new Date();

  // 1. Sheet 1: Executive KPI Overview
  const summarySheet = workbook.addWorksheet('KPI Overview', { properties: { tabColor: { argb: 'FF2A5DA8' } } });
  summarySheet.views = [{ showGridLines: true }];
  
  // Title Header Banner
  summarySheet.mergeCells('A1:D1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'MAYZAX CRM — EXECUTIVE ANALYTICS REPORT';
  titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A5DA8' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(1).height = 36;

  // Metadata block
  summarySheet.addRow(['Report Generation Date', new Date().toLocaleString(), 'Filter Scope (Team)', filterInfo.team]);
  summarySheet.addRow(['Business Date (Shift)', summary?.currentBusinessDate || '—', 'Filter Scope (Recruiter)', filterInfo.recruiter]);
  summarySheet.addRow(['Date Range Evaluated', `${filterInfo.from} to ${filterInfo.to}`, 'Shift Timing Window', summary?.shiftWindowText || '6:00 PM – 9:00 AM IST']);
  
  for (let r = 2; r <= 4; r++) {
    const row = summarySheet.getRow(r);
    row.height = 20;
    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Segoe UI', size: 10, bold: colNum % 2 === 1 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colNum % 2 === 1 ? 'FFEBF1FA' : 'FFFFFFFF' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  }

  summarySheet.addRow([]); // Blank line

  // KPI Metrics Table
  const kpiHeader = summarySheet.addRow(['Metric / Key Indicator', 'Current Value', 'Unit / Details', 'Context']);
  styleHeaderRow(kpiHeader, 'FF1E293B');

  const totalInRange = dailyCounts.reduce((acc, c) => acc + (c.count || 0), 0);
  const avgInRange = dailyCounts.length > 0 ? (totalInRange / dailyCounts.length).toFixed(1) : '0';
  const peakInRange = dailyCounts.length > 0 ? Math.max(...dailyCounts.map((c) => c.count || 0)) : 0;

  const kpiRows = [
    ['Total Lifetime Applications', summary?.totalApplications ?? 0, 'Applications', 'System-wide all time'],
    ['Current Shift Applications (Today)', summary?.currentShiftApplications ?? 0, 'Applications', 'Logged in active business date'],
    ['Selected Range Total Applications', totalInRange, 'Applications', `From ${filterInfo.from} to ${filterInfo.to}`],
    ['Average Applications / Day', avgInRange, 'Apps / Day', 'Average across days in selected filter'],
    ['Peak Daily Volume in Range', peakInRange, 'Applications', 'Highest single-day volume in range'],
    ['Active Recruiters in Roster', summary?.activeRecruiters ?? 0, 'Recruiters', 'Currently marked active'],
    ['Total Registered Candidates / Profiles', summary?.totalProfiles ?? 0, 'Candidate Profiles', 'Total in Client Vault'],
    ['Total Organization Teams', summary?.totalTeams ?? (summary?.teams?.length || 0), 'Teams', 'Active Team Leader units'],
    ['Top Performing Recruiter', summary?.topPerformer || '—', 'Recruiter Name', 'Leader in active shift applications'],
  ];

  kpiRows.forEach((item, idx) => {
    const row = summarySheet.addRow(item);
    styleDataRow(row, idx % 2 === 1);
  });

  summarySheet.columns = [
    { width: 36 },
    { width: 22 },
    { width: 24 },
    { width: 38 },
  ];

  // 2. Sheet 2: Daily Applications Trend
  const dailySheet = workbook.addWorksheet('Daily Trend', { properties: { tabColor: { argb: 'FF6366F1' } } });
  dailySheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: true }];
  const dailyHeader = dailySheet.addRow(['Business Date', 'Applications Logged', '3-Day Moving Average', 'Day of Week']);
  styleHeaderRow(dailyHeader, 'FF4F46E5');

  enrichedChartData.forEach((d, idx) => {
    const dateObj = new Date(d.fullDate);
    const dayName = isNaN(dateObj.getTime()) ? '—' : dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const row = dailySheet.addRow([d.fullDate, d.applications, d.movingAvg, dayName]);
    styleDataRow(row, idx % 2 === 1);
  });

  dailySheet.columns = [
    { width: 20 },
    { width: 24 },
    { width: 26 },
    { width: 20 },
  ];
  dailySheet.autoFilter = 'A1:D1';

  // 3. Sheet 3: Job Portal Breakdown
  const portalSheet = workbook.addWorksheet('Job Portals', { properties: { tabColor: { argb: 'FF3F9C71' } } });
  portalSheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: true }];
  const portalHeader = portalSheet.addRow(['Job Portal', 'Total Applications', 'Percentage Share (%)', 'Performance Rank']);
  styleHeaderRow(portalHeader, 'FF059669');

  const totalPortalApps = portalData.reduce((acc, p) => acc + (p.count || 0), 0);
  const sortedPortals = [...portalData].sort((a, b) => (b.count || 0) - (a.count || 0));

  sortedPortals.forEach((p, idx) => {
    const count = p.count || 0;
    const share = totalPortalApps > 0 ? ((count / totalPortalApps) * 100).toFixed(1) + '%' : '0.0%';
    const row = portalSheet.addRow([formatEnumLabel(p.portal), count, share, `#${idx + 1}`]);
    styleDataRow(row, idx % 2 === 1);
  });

  portalSheet.columns = [
    { width: 26 },
    { width: 22 },
    { width: 24 },
    { width: 20 },
  ];
  portalSheet.autoFilter = 'A1:D1';

  // 4. Sheet 4: Activity Heatmap Data
  const heatmapSheet = workbook.addWorksheet('Activity Heatmap', { properties: { tabColor: { argb: 'FFF59E0B' } } });
  heatmapSheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: true }];
  const heatmapHeader = heatmapSheet.addRow(['Business Date', 'Shift Applications', 'Activity Intensity Level']);
  styleHeaderRow(heatmapHeader, 'FFD97706');

  dailyCounts.forEach((d, idx) => {
    let level = 'None (0)';
    if (d.count > 10) level = 'Very High (10+)';
    else if (d.count > 5) level = 'High (6-10)';
    else if (d.count > 2) level = 'Medium (3-5)';
    else if (d.count > 0) level = 'Low (1-2)';

    const row = heatmapSheet.addRow([d.businessDate, d.count, level]);
    styleDataRow(row, idx % 2 === 1);
  });

  heatmapSheet.columns = [
    { width: 22 },
    { width: 24 },
    { width: 28 },
  ];
  heatmapSheet.autoFilter = 'A1:C1';

  // 5. Sheet 5: Recruiter Leaderboard
  if (leaderboardData && leaderboardData.length > 0) {
    const leaderSheet = workbook.addWorksheet('Leaderboard', { properties: { tabColor: { argb: 'FFE11D48' } } });
    leaderSheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: true }];
    const leaderHeader = leaderSheet.addRow(['Rank', 'Recruiter Name', 'Email', 'Assigned Profiles', 'Today / Shift Apps', 'Lifetime Total Apps', 'Status']);
    styleHeaderRow(leaderHeader, 'FFE11D48');

    leaderboardData.forEach((r: any, idx: number) => {
      const row = leaderSheet.addRow([
        `#${idx + 1}`,
        r.name,
        r.email,
        r.assignedProfiles ?? 0,
        r.currentShiftApplications ?? 0,
        r.totalApplications ?? 0,
        r.isActive ? 'Active' : 'Inactive',
      ]);
      styleDataRow(row, idx % 2 === 1);
    });

    leaderSheet.columns = [
      { width: 12 },
      { width: 28 },
      { width: 32 },
      { width: 22 },
      { width: 24 },
      { width: 24 },
      { width: 16 },
    ];
    leaderSheet.autoFilter = 'A1:G1';
  }

  // 6. Sheet 6: Organization Teams
  if (summary?.teams && summary.teams.length > 0) {
    const teamSheet = workbook.addWorksheet('Teams Breakdown', { properties: { tabColor: { argb: 'FF8B5CF6' } } });
    teamSheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: true }];
    const teamHeader = teamSheet.addRow(['Team Name', 'Team Leader', 'Members Count', 'Total Applications', 'Shift Applications']);
    styleHeaderRow(teamHeader, 'FF7C3AED');

    summary.teams.forEach((t: any, idx: number) => {
      const row = teamSheet.addRow([
        t.teamName || '—',
        t.tlName || '—',
        t.memberCount || 0,
        t.totalApplications || 0,
        t.currentApplications || 0,
      ]);
      styleDataRow(row, idx % 2 === 1);
    });

    teamSheet.columns = [
      { width: 28 },
      { width: 26 },
      { width: 20 },
      { width: 24 },
      { width: 24 },
    ];
    teamSheet.autoFilter = 'A1:E1';
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `Mayzax_Analytics_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
  saveAs(blob, filename);
  toast.success('Analytics workbook exported successfully!');
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
  const [isExporting, setIsExporting] = useState(false);

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
  const { data: portalAnalytics } = useJobPortalAnalytics({
    scope: 'custom',
    from: range.from,
    to: range.to,
    recruiterId: recruiterId === ALL ? undefined : recruiterId,
    teamId: teamId === ALL ? undefined : teamId,
  });

  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardOverview({
    pageSize: 100,
    sortBy: 'currentShiftApplications',
    sortOrder: 'desc',
  });

  const recruiters = recruitersData?.data ?? [];
  const leaderboardList = useMemo(() => {
    const list = dashboardData?.data ?? [];
    return [...list].sort((a, b) => (b.currentShiftApplications ?? 0) - (a.currentShiftApplications ?? 0));
  }, [dashboardData]);

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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const teamName = teamId === ALL ? 'All Teams' : summary?.teams?.find((t) => t.tlId === teamId)?.teamName || 'Selected Team';
      const recruiterName = recruiterId === ALL ? 'All Recruiters' : recruiters.find((r) => r.id === recruiterId)?.name || 'Selected Recruiter';
      await exportAnalyticsToExcel({
        summary,
        dailyCounts: dailyCounts || [],
        portalData: portalAnalytics?.portals || [],
        enrichedChartData,
        leaderboardData: leaderboardList,
        filterInfo: {
          team: teamName,
          recruiter: recruiterName,
          from: range.from,
          to: range.to,
        },
      });
    } catch (e) {
      console.error('Export error:', e);
      toast.error('Failed to export analytics report.');
    } finally {
      setIsExporting(false);
    }
  };

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
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Button
              onClick={handleExport}
              disabled={isExporting || isLoading}
              className="rounded-xl h-10 text-xs font-semibold gap-1.5 shadow-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0 transition-all shrink-0"
            >
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export Analytics
            </Button>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 shadow-sm whitespace-nowrap overflow-x-auto">
              <Filter className="h-4 w-4 text-slate-400 dark:text-slate-400 ml-1 shrink-0" />
              {isAdmin && (
                <Select value={teamId} onValueChange={handleTeamChange}>
                  <SelectTrigger className="w-32 sm:w-36 h-8 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shrink-0">
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-850 dark:border-slate-800">
                    <SelectItem value={ALL} className="dark:text-slate-200 dark:focus:bg-slate-800">All Teams</SelectItem>
                    {summary?.teams?.map((t) => (
                      <SelectItem key={t.tlId} value={t.tlId} className="dark:text-slate-200 dark:focus:bg-slate-800">
                        {t.teamName || t.tlName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={recruiterId} onValueChange={setRecruiterId}>
                <SelectTrigger className="w-32 sm:w-36 h-8 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shrink-0">
                  <SelectValue placeholder="All recruiters" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-850 dark:border-slate-800">
                  <SelectItem value={ALL} className="dark:text-slate-200 dark:focus:bg-slate-800">All Recruiters</SelectItem>
                  {recruiters.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="dark:text-slate-200 dark:focus:bg-slate-800">
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={range.from} onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))} className="w-28 sm:w-32 h-8 text-xs dark:bg-slate-900 dark:text-white dark:border-slate-700 shrink-0 [&::-webkit-calendar-picker-indicator]:dark:invert" />
              <Input type="date" value={range.to} onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))} className="w-28 sm:w-32 h-8 text-xs dark:bg-slate-900 dark:text-white dark:border-slate-700 shrink-0 [&::-webkit-calendar-picker-indicator]:dark:invert" />
            </div>
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
        <Card className="border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-850 dark:to-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-mayzax-blue-600 to-mayzax-green-600 text-white shadow-md">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                  Daily Applications Trend
                  <Badge variant="outline" className="text-[10px] bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300">Live</Badge>
                </CardTitle>
                <CardDescription className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                  Shift logic: {summary?.shiftWindowText || '6:00 PM – 9:00 AM IST'} • Current BD: <span className="font-medium text-slate-700 dark:text-slate-300">{summary?.currentBusinessDate}</span> • 3-day moving average
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
                <div className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-850/50 dark:to-slate-900 p-3 sm:p-4">
                  <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart data={enrichedChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAppsPremium" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800/80" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 shadow-xl min-w-[180px]">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white">BD: {label}</p>
                              {payload.map((p: any) => (
                                <div key={p.dataKey} className="mt-1 flex items-center justify-between gap-4 text-xs">
                                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                                    {p.dataKey === 'applications' ? 'Applications' : '3-day Avg'}
                                  </span>
                                  <span className="font-bold text-slate-900 dark:text-white">{p.value}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Area type="monotone" dataKey="applications" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorAppsPremium)" dot={{ r: 3, strokeWidth: 2, fill: '#6366f1', stroke: '#6366f1' }} activeDot={{ r: 6, fill: '#6366f1' }} />
                      <Line type="monotone" dataKey="movingAvg" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300"><span className="h-2 w-2 rounded-full bg-violet-500" /> Daily</span>
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300"><span className="h-2 w-2 rounded-full bg-amber-500" style={{ borderStyle: 'dashed' }} /> Moving Avg (3d)</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Zap className="h-3 w-3 text-violet-500" /> 
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
        <Card className="border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-50/50 to-white dark:from-slate-850 dark:to-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                  Activity Heatmap
                  <Badge variant="outline" className="text-[10px] dark:border-slate-700 dark:text-slate-300">18 weeks</Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  {recruiterId === ALL ? 'All recruiters' : recruiters.find((r) => r.id === recruiterId)?.name} • business-date activity
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 overflow-x-auto">
            {isLoading ? <Skeleton className="h-28 w-full max-w-2xl rounded-xl" /> : <ActivityHeatmap data={dailyCounts ?? []} weeks={18} />}
            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-400">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Hover cells for details
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {/* Recruiter Performance Leaderboard */}
      <Reveal delay={0.3}>
        <Card className="border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-rose-50/60 via-amber-50/30 to-white dark:from-slate-850 dark:to-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 text-white shadow-md">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                    Recruiter Performance Leaderboard
                    <Badge variant="outline" className="text-[10px] bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
                      Live Shift Rankings
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Real-time ranking of recruiters by shift output and overall lifetime application volume
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-850 px-3 py-1.5 rounded-full">
                <Users className="h-3.5 w-3.5 text-rose-500" />
                <span>{leaderboardList.length} Recruiters Ranked</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {dashboardLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : leaderboardList.length === 0 ? (
              <div className="p-8">
                <EmptyState icon={Trophy} title="No Leaderboard Data" description="Recruiter performance will show here once applications are logged." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4 w-16 text-center">Rank</th>
                      <th className="py-3 px-4">Recruiter</th>
                      <th className="py-3 px-4">Assigned Profiles</th>
                      <th className="py-3 px-4">Today / Shift Apps</th>
                      <th className="py-3 px-4">Lifetime Apps</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {leaderboardList.map((item, index) => {
                      const isTop1 = index === 0;
                      const isTop2 = index === 1;
                      const isTop3 = index === 2;

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/50 ${
                            isTop1
                              ? 'bg-amber-50/30 dark:bg-amber-950/10'
                              : isTop2
                              ? 'bg-slate-50/40 dark:bg-slate-850/20'
                              : isTop3
                              ? 'bg-orange-50/20 dark:bg-orange-950/10'
                              : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center font-bold">
                            {isTop1 ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm text-xs">
                                🥇
                              </span>
                            ) : isTop2 ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-400 text-white shadow-sm text-xs">
                                🥈
                              </span>
                            ) : isTop3 ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-700 text-white shadow-sm text-xs">
                                🥉
                              </span>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400 font-mono">#{index + 1}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                                {item.name}
                                {isTop1 && (
                                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded-full">
                                    Leader
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs">{item.email}</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {item.assignedProfiles ?? 0} profiles
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800 px-2 py-0.5 font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                                +{item.currentShiftApplications ?? 0}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {item.totalApplications?.toLocaleString() ?? 0}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                item.isActive
                                  ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {item.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}

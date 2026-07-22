import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
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
import { PageHeader } from '@/components/shared/page-header';
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
import { formatDateTime, generateExportFilename } from '@/lib/utils';
import { Calendar, Clock, Download, Activity, Coffee, ShieldCheck, PieChart as PieChartIcon, User as UserIcon, UserCheck, AlertCircle, UserX, Users as UsersIcon } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

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

interface ShiftActivityPieChartProps {
  todayData?: TodayActivityData;
  liveData?: LiveStatusMetricsData;
  filteredMembers?: LiveStatusMetricsData['members'];
  isAdminView?: boolean;
}

function ShiftActivityPieChart({ todayData, liveData, filteredMembers, isAdminView }: ShiftActivityPieChartProps) {
  if (isAdminView && liveData) {
    // Use filteredMembers if provided (team filter active), else all members
    const displayMembers = filteredMembers ?? liveData.members;
    const totalMembers = displayMembers.length;

    let activeCount = 0, breakCount = 0, issueCount = 0, offlineCount = 0;
    displayMembers.forEach((m) => {
      if (m.status === 'ACTIVE') activeCount++;
      else if (m.status === 'SYSTEM_ISSUE') issueCount++;
      else if (m.status === 'OFFLINE') offlineCount++;
      else breakCount++;
    });

    const chartData = [
      { name: 'Active (Productive)', value: activeCount, color: '#10B981' },
      { name: 'On Break', value: breakCount, color: '#F59E0B' },
      { name: 'System Issue', value: issueCount, color: '#F43F5E' },
      { name: 'Offline', value: offlineCount, color: '#94A3B8' },
    ].filter((d) => d.value > 0);

    return (
      <Card className="mb-6 border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mayzax-blue/10 text-mayzax-blue">
                <PieChartIcon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">Live Team Status Breakdown</CardTitle>
                <CardDescription className="text-xs text-slate-500">Real-time status distribution across tracked team members</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="w-fit text-xs font-medium bg-white border-slate-200">
              Total {totalMembers} Tracked Member{totalMembers === 1 ? '' : 's'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {chartData.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No active team status data available.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-center">
              <div className="h-48 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={76}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      formatter={(val: number) => [`${val} member${val === 1 ? '' : 's'}`, 'Users']}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-slate-900">{activeCount}</span>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Active Now</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {chartData.map((item) => {
                  const pct = totalMembers > 0 ? Math.round((item.value / totalMembers) * 100) : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-slate-700">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">{item.value}</span>
                        <span className="ml-1 text-[11px] text-slate-400">({pct}%)</span>
                      </div>
                    </div>
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
      { name: 'Productive Work', value: todayData.totalProductiveSeconds, color: '#10B981' },
      { name: 'Short Break', value: todayData.breakDetails.shortBreakSeconds, color: '#F59E0B' },
      { name: 'Dinner Break', value: todayData.breakDetails.dinnerBreakSeconds, color: '#F97316' },
      { name: 'Meetings', value: todayData.breakDetails.meetingSeconds, color: '#6366F1' },
      { name: 'Briefing / Training', value: todayData.breakDetails.briefingTrainingSeconds, color: '#8B5CF6' },
      { name: 'System Issue', value: todayData.breakDetails.systemIssueSeconds, color: '#F43F5E' },
    ].filter((item) => item.value > 0);

    const utilization = todayData.totalLoggedInSeconds
      ? Math.min(100, Math.round((todayData.totalProductiveSeconds / todayData.totalLoggedInSeconds) * 100))
      : 100;

    return (
      <Card className="mb-6 border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <PieChartIcon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">Today's Shift Time Breakdown</CardTitle>
                <CardDescription className="text-xs text-slate-500">Visual allocation of working hours versus break time</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="w-fit text-xs font-semibold text-emerald-700 bg-emerald-50/60 border-emerald-200">
              {utilization}% Shift Utilization
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {items.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No shift activity logged yet today.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-center">
              <div className="h-48 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={items}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={76}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {items.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      formatter={(val: number) => [formatHoursMinutes(val), 'Duration']}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-bold text-slate-900">{formatHoursMinutes(todayData.totalLoggedInSeconds)}</span>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Total Logged</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {items.map((item) => {
                  const pct = Math.round((item.value / totalSecs) * 100);
                  return (
                    <div key={item.name} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-slate-700">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-slate-900">{formatHoursMinutes(item.value)}</span>
                        <span className="ml-1.5 text-[11px] text-slate-400 font-medium">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}


export default function ActivityTrackingPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isTL = user?.role === 'TEAM_LEADER';

  const [selectedUserId, setSelectedUserId] = useState<string | typeof ALL>(ALL);
  const [selectedTeamId, setSelectedTeamId] = useState<string | typeof ALL_TEAMS>(ALL_TEAMS);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const { data: activityUsers } = useActivityUsers();
  const { data: todayData, isLoading: todayLoading } = useTodayActivity();
  const { data: liveData, isLoading: liveLoading } = useLiveStatus();
  const { data: productivityData } = useProductivityMetrics({ fromDate, toDate, recruiterId: selectedUserId === ALL ? undefined : selectedUserId });

  const { data: historyData, isLoading: historyLoading, isError, refetch } = useActivityHistory({
    userId: selectedUserId === ALL ? undefined : selectedUserId,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    status: statusFilter === ALL ? undefined : statusFilter,
    page,
    pageSize: 15,
  });

  const logs = historyData?.data ?? [];
  const members = liveData?.members ?? [];

  // Derive team options from live members (TLs are members with role TEAM_LEADER)
  const teamOptions = members
    .filter((m) => m.role === 'TEAM_LEADER')
    .map((tl) => ({ id: tl.userId, label: tl.teamName ? `${tl.teamName}` : tl.name, tlName: tl.name }));

  const filteredMembers = members.filter((m) => {
    if (selectedTeamId !== ALL_TEAMS) {
      // include the TL themselves and their recruiters
      if (m.userId !== selectedTeamId && m.createdById !== selectedTeamId) return false;
    }
    if (selectedUserId !== ALL && m.userId !== selectedUserId) return false;
    if (statusFilter !== ALL && m.status !== statusFilter) return false;
    return true;
  });

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
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
          STATUS_CONFIG[log.status]?.label ?? log.status,
          formatDateTime(log.startedAt),
          log.endedAt ? formatDateTime(log.endedAt) : 'In Progress',
          formatHoursMinutes(log.durationSeconds),
          log.optionalNote ?? '',
        ]);
      });

      worksheet.columns.forEach((col) => {
        col.width = 22;
      });

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
      const { data } = await apiClient.get<ApiSuccess<{
        fromDate: string;
        toDate: string;
        reports: Array<{
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
        }>;
      }>>('/activity/attendance', {
        params: {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          recruiterId: selectedUserId === ALL ? undefined : selectedUserId,
        },
      });

      const { reports } = data.data;

      if (reports.length === 0) {
        toast.info('No attendance data available to export.');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Mayzax ATS';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Attendance Report');
      worksheet.views = [{ state: 'frozen', ySplit: 2 }];

      // Title header row
      const titleRow = worksheet.addRow(['Mayzax ATS - Employee Attendance & Shift Utilization Report']);
      titleRow.height = 30;
      worksheet.mergeCells('A1:P1');
      const titleCell = titleRow.getCell(1);
      titleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Table Header Row
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

      reports.forEach((item: AttendanceReportItem, idx: number) => {
        const row = worksheet.addRow([
          item.name,
          item.email,
          item.role === 'TEAM_LEADER' ? 'Team Leader' : 'Recruiter',
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

      worksheet.columns.forEach((col) => {
        col.width = 22;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const selectedUser = activityUsers?.find((u) => u.id === selectedUserId);
      const filename = generateExportFilename({
        baseName: 'Attendance',
        userNameOrCandidate: selectedUser ? selectedUser.name : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
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
    <div>
      <PageHeader
        title={isAdmin ? 'Employee Monitoring' : 'Shift & Activity Tracking'}
        description={
          isAdmin
            ? 'Real-time overview of user status, current shift log duration, and total break time across all Team Leaders and Recruiters.'
            : isTL
              ? 'Track shift working hours and event logs for yourself and your team members.'
              : 'Track your shift working hours, break logs, and shift utilization.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {(isAdmin || isTL) && (
              <Button variant="brand" onClick={handleExportAttendanceSheet} disabled={isExporting}>
                <Download className="h-4 w-4" /> Download Attendance Sheet
              </Button>
            )}
            {/* {isAdmin && (
              <Button variant="outline" onClick={handleExportExcel} disabled={isExporting || logs.length === 0}>
                <Download className="h-4 w-4" /> Export Raw Logs
              </Button>
            )} */}
          </div>
        }
      />

      {/* Recruiter / TL Summary Cards */}
      {!isAdmin && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Today Productive</p>
                <p className="text-lg font-bold text-slate-900">
                  {todayLoading ? '...' : formatHoursMinutes(todayData?.totalProductiveSeconds ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Coffee className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Break Time</p>
                <p className="text-lg font-bold text-slate-900">
                  {todayLoading ? '...' : formatHoursMinutes(todayData?.totalBreakSeconds ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mayzax-blue/10 text-mayzax-blue">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Logged In</p>
                <p className="text-lg font-bold text-slate-900">
                  {todayLoading ? '...' : formatHoursMinutes(todayData?.totalLoggedInSeconds ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <PieChartIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Shift Utilization</p>
                <p className="text-lg font-bold text-slate-900">
                  {todayData?.totalLoggedInSeconds
                    ? `${Math.min(100, Math.round((todayData.totalProductiveSeconds / todayData.totalLoggedInSeconds) * 100))}%`
                    : '100%'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Admin Monitoring Overview Cards */}
      {isAdmin && productivityData && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Productive Hours</p>
                <p className="text-lg font-bold text-slate-900">{productivityData.totalProductiveHours} hrs</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Coffee className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Break Hours</p>
                <p className="text-lg font-bold text-slate-900">{productivityData.totalBreakHours} hrs</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <PieChartIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Avg Shift Utilization</p>
                <p className="text-lg font-bold text-slate-900">{productivityData.shiftUtilizationPercentage}%</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <UserIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Active Tracked Members</p>
                <p className="text-lg font-bold text-slate-900">{productivityData.activeUsersCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Aesthetic Shift Activity Pie / Donut Chart */}
      <ShiftActivityPieChart
        todayData={todayData}
        liveData={liveData}
        filteredMembers={isAdmin && selectedTeamId !== ALL_TEAMS ? filteredMembers : undefined}
        isAdminView={isAdmin}
      />

      {/* Filter Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Team Filter — Admin only */}
          {isAdmin && teamOptions.length > 0 && (
            <Select value={selectedTeamId} onValueChange={(v) => { setSelectedTeamId(v); setSelectedUserId(ALL); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Filter by Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TEAMS}>All Teams</SelectItem>
                {teamOptions.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <span className="flex items-center gap-1.5">
                      <UsersIcon className="h-3 w-3 text-slate-400" />
                      {team.label}
                      {team.label !== team.tlName && (
                        <span className="text-xs text-slate-400">({team.tlName})</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* User Filter Dropdown for Admin and TL */}
          {(isAdmin || isTL) && (
            <Select value={selectedUserId} onValueChange={(v) => { setSelectedUserId(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder={isAdmin ? 'Filter by User (Recruiter/TL)' : 'Filter by Team Member'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{isAdmin ? 'All Users (Recruiters & TLs)' : 'All Team Members'}</SelectItem>
                {activityUsers?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.role === 'TEAM_LEADER' ? 'TL' : 'Recruiter'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48">
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

        {/* Date Filter */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm w-full sm:w-auto">
          <Calendar className="h-4 w-4 text-mayzax-blue shrink-0" />
          <span className="font-medium text-slate-500">From:</span>
          <Input
            type="date"
            className="h-7 w-32 border-0 bg-transparent p-0 text-xs focus:ring-0 cursor-pointer"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
          />
          <span className="font-medium text-slate-500">To:</span>
          <Input
            type="date"
            className="h-7 w-32 border-0 bg-transparent p-0 text-xs focus:ring-0 cursor-pointer"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Admin / TL Live User Status Summary Table */}
      {(isAdmin || isTL) && selectedUserId === ALL && !fromDate && !toDate ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              {statusFilter !== ALL
                ? `Users currently in ${STATUS_CONFIG[statusFilter]?.label ?? statusFilter} status`
                : 'Live User Shift & Status Summary'}
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {filteredMembers.length} User{filteredMembers.length === 1 ? '' : 's'}
            </span>
          </div>
          {liveLoading && <TableSkeleton rows={6} cols={7} />}
          {!liveLoading && filteredMembers.length === 0 && (
            <EmptyState
              icon={ShieldCheck}
              title="No users found"
              description={
                statusFilter !== ALL
                  ? `No users are currently in ${STATUS_CONFIG[statusFilter]?.label ?? statusFilter} status.`
                  : 'No active recruiters or team leaders found.'
              }
            />
          )}
          {!liveLoading && filteredMembers.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>User Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Current Status</TableHead>
                  <TableHead>Duration in Status</TableHead>
                  <TableHead>Total Shift Logged In</TableHead>
                  <TableHead>Total Productive</TableHead>
                  <TableHead>Total Break</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((m) => {
                  const cfg = STATUS_CONFIG[m.status];
                  return (
                    <TableRow key={m.userId} className="text-xs">
                      <TableCell>
                        <p className="font-medium text-slate-900">{m.name}</p>
                        <p className="text-[11px] text-slate-400">{m.email}</p>
                        {m.role === 'TEAM_LEADER' && m.teamName && (
                          <p className="text-[10px] text-purple-500 font-medium mt-0.5">{m.teamName}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium">
                        {m.role === 'TEAM_LEADER' ? (
                          <span className="inline-flex items-center gap-1">
                            Team Leader
                            <span className="rounded bg-purple-100 px-1 py-px text-[10px] font-semibold text-purple-600">TL</span>
                          </span>
                        ) : 'Recruiter'}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium border ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
                          {cfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-slate-700 font-medium">
                        {formatHoursMinutes(m.currentDurationSeconds)}
                      </TableCell>
                      <TableCell className="font-mono text-slate-700 font-medium">
                        {formatHoursMinutes(m.todayLoggedInSeconds)}
                      </TableCell>
                      <TableCell className="font-mono text-emerald-700 font-medium">
                        {formatHoursMinutes(m.todayProductiveSeconds)}
                      </TableCell>
                      <TableCell className="font-mono text-amber-700 font-medium">
                        {formatHoursMinutes(m.todayBreakSeconds)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs font-semibold text-mayzax-blue hover:text-mayzax-blue-700 hover:bg-mayzax-blue-50"
                          onClick={() => { setSelectedUserId(m.userId); setPage(1); }}
                        >
                          View Event Logs →
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      ) : (
        /* Detailed Event Logs Table (for specific user selection, date range filter, or recruiter view) */
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {selectedUserId !== ALL && (isAdmin || isTL) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Event Logs for {activityUsers?.find((u) => u.id === selectedUserId)?.name || 'Selected User'}
                </h3>
                <p className="text-xs text-slate-400">Detailed status transition history and duration logs</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 border-slate-200 hover:bg-slate-50"
                onClick={() => { setSelectedUserId(ALL); setPage(1); }}
              >
                ← Back to All Users Summary
              </Button>
            </div>
          )}

          {historyLoading && <TableSkeleton rows={6} cols={6} />}
          {isError && <ErrorState onRetry={() => refetch()} />}

          {!historyLoading && !isError && logs.length === 0 && (
            <EmptyState
              icon={ShieldCheck}
              title="No activity logs found"
              description="Adjust your user, status, or date range filters."
            />
          )}

          {!historyLoading && !isError && logs.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started At</TableHead>
                    <TableHead>Ended At</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const cfg = STATUS_CONFIG[log.status];
                    return (
                      <TableRow key={log.id} className="text-xs">
                        <TableCell>
                          <p className="font-medium text-slate-900">{log.user.name}</p>
                          <p className="text-[11px] text-slate-400">{log.user.email}</p>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium border ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
                            {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-600">{formatDateTime(log.startedAt)}</TableCell>
                        <TableCell className="text-slate-600">
                          {log.endedAt ? formatDateTime(log.endedAt) : <span className="font-semibold text-emerald-600">Active</span>}
                        </TableCell>
                        <TableCell className="font-mono font-medium text-slate-700">
                          {formatHoursMinutes(log.durationSeconds)}
                        </TableCell>
                        <TableCell className="text-slate-500 max-w-xs truncate">{log.optionalNote || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <PaginationControls pagination={historyData?.pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

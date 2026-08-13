import { getApi } from './api';
import type { TodayDto, ShiftDto, DayDetailDto, MonthSummaryDto, Paginated, AttendanceStatus, AnalyticsSummaryDto, JobPortalAnalyticsDto, LiveStatusMetricsDto } from '@/types/api';

export interface DailyCountsFilter {
  from?: string;
  to?: string;
  recruiterId?: string;
  teamId?: string;
}

export interface DailyCountItem {
  businessDate: string;
  count: number;
}

export async function fetchToday(): Promise<TodayDto> {
  const api = await getApi();
  const res = await api.get('/attendance/today');
  return res as unknown as TodayDto;
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummaryDto> {
  const api = await getApi();
  const res = await api.get('/analytics/summary');
  return res as unknown as AnalyticsSummaryDto;
}

export async function fetchLiveStatus(): Promise<LiveStatusMetricsDto> {
  const api = await getApi();
  const res = await api.get('/activity/live-status');
  return res as unknown as LiveStatusMetricsDto;
}

export async function fetchJobPortalAnalytics(scope: 'currentShift' | 'custom' = 'currentShift', from?: string, to?: string): Promise<JobPortalAnalyticsDto> {
  const api = await getApi();
  const res = await api.get('/analytics/job-portals', { params: { scope, from, to } });
  return res as unknown as JobPortalAnalyticsDto;
}

export async function fetchDailyCounts(filter: DailyCountsFilter = {}): Promise<DailyCountItem[]> {
  const api = await getApi();
  const res = await api.get('/analytics/daily-counts', { params: filter });
  return res as unknown as DailyCountItem[];
}

export async function fetchCurrentBreak(): Promise<any> {
  const api = await getApi();
  const res = await api.get('/attendance/current-break');
  return res;
}

export async function fetchShift(): Promise<ShiftDto> {
  const api = await getApi();
  const res = await api.get('/shifts/me');
  return res as unknown as ShiftDto;
}

export async function fetchDayDetail(dateISO: string): Promise<DayDetailDto> {
  const api = await getApi();
  const res = await api.get(`/attendance/${dateISO}`);
  return res as unknown as DayDetailDto;
}

export async function fetchMonthSummary(month: string): Promise<MonthSummaryDto> {
  const api = await getApi();
  const res = await api.get('/attendance/month-summary', { params: { month } });
  return res as unknown as MonthSummaryDto;
}

export interface HistoryFilter {
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface HistoryItem {
  id: string;
  userId: string;
  businessDate: string;
  firstLoginAt: string | null;
  lastLogoutAt: string | null;
  totalLoggedInSec: number;
  totalProductiveSec: number;
  totalBreakSec: number;
  shortBreakSec: number;
  dinnerBreakSec: number;
  briefingSec: number;
  meetingSec: number;
  systemIssueSec: number;
  onlineSec: number;
  lateByMinutes: number;
  earlyByMinutes: number;
  penaltyMinutes: number;
  expectedLogoutAt: string | null;
  status: AttendanceStatus;
  remarks: string | null;
}

export async function fetchHistory(filter: HistoryFilter = {}): Promise<Paginated<HistoryItem>> {
  const api = await getApi();
  const res = await api.get('/attendance/history', {
    params: {
      page: filter.page ?? 1,
      pageSize: filter.pageSize ?? 20,
      fromDate: filter.fromDate,
      toDate: filter.toDate,
    },
  });
  return res as unknown as Paginated<HistoryItem>;
}

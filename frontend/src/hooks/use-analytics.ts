import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ApiSuccess, DailyCount, DashboardRow, GlobalSummary, JobPortalAnalytics, RecruiterBreakdown } from '@/types';

export interface DashboardParams {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export function useDashboardOverview(params: DashboardParams) {
  return useQuery({
    queryKey: ['dashboard', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<DashboardRow[]>>('/analytics/dashboard', { params });
      return data;
    },
  });
}

export function useRecruiterBreakdown(id: string | null) {
  return useQuery({
    queryKey: ['recruiter-breakdown', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<RecruiterBreakdown>>(`/analytics/dashboard/${id}/breakdown`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useGlobalSummary() {
  return useQuery({
    queryKey: ['analytics-summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<GlobalSummary>>('/analytics/summary');
      return data.data;
    },
  });
}

export function useJobPortalAnalytics() {
  return useQuery({
    queryKey: ['job-portal-analytics'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<JobPortalAnalytics>>('/analytics/job-portals');
      return data.data;
    },
  });
}

export function useDailyCounts(params: { recruiterId?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ['daily-counts', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<DailyCount[]>>('/analytics/daily-counts', { params });
      return data.data;
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ApiSuccess, Recruiter, RecruiterStats, Role } from '@/types';

export interface RecruiterListParams {
  search?: string;
  role?: Role;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useRecruiters(params: RecruiterListParams) {
  return useQuery({
    queryKey: ['recruiters', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<Recruiter[]>>('/recruiters', { params });
      return data;
    },
  });
}

export function useRecruiterStats(id: string | null) {
  return useQuery({
    queryKey: ['recruiter-stats', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<RecruiterStats>>(`/recruiters/${id}/stats`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useMyRecruiterStats() {
  return useQuery({
    queryKey: ['recruiter-stats', 'me'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<RecruiterStats>>('/recruiters/me/stats');
      return data.data;
    },
  });
}

export function useCreateRecruiter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; email: string; password: string; role?: Role }) => {
      const { data } = await apiClient.post<ApiSuccess<Recruiter>>('/recruiters', input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruiters'] }),
  });
}

export function useUpdateRecruiter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; email?: string; role?: Role }) => {
      const { data } = await apiClient.patch<ApiSuccess<Recruiter>>(`/recruiters/${id}`, input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruiters'] }),
  });
}

export function useToggleRecruiterStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data } = await apiClient.patch<ApiSuccess<Recruiter>>(`/recruiters/${id}/status`, { isActive });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruiters'] }),
  });
}

export function useDeleteRecruiter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/recruiters/${id}`);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruiters'] }),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ApiSuccess } from '@/types';

export interface SystemUpdateItem {
  id: string;
  title: string;
  version: string | null;
  description: string;
  pdfUrl: string | null;
  pdfOriginalName: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  isRead: boolean;
}

export interface UpdatesData {
  unreadCount: number;
  updates: SystemUpdateItem[];
}

export function useUpdates() {
  return useQuery({
    queryKey: ['system-updates'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<UpdatesData>>('/updates');
      return data.data;
    },
    refetchInterval: 120000, // Refetch every 2 minutes for new update badges
  });
}

export function useMarkUpdateAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updateId: string) => {
      const { data } = await apiClient.post<ApiSuccess<{ success: boolean }>>(`/updates/${updateId}/read`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-updates'] });
    },
  });
}

export function useCreateUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await apiClient.post<ApiSuccess<SystemUpdateItem>>('/updates', formData, {
        headers: { 'Content-Type': undefined },
      });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-updates'] });
    },
  });
}

export function useDeleteUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updateId: string) => {
      const { data } = await apiClient.delete<ApiSuccess<{ success: boolean }>>(`/updates/${updateId}`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-updates'] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ApiSuccess, ClientProfile } from '@/types';

export interface ProfileListParams {
  search?: string;
  technology?: string;
  assignedRecruiterId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useProfiles(params: ProfileListParams) {
  return useQuery({
    queryKey: ['profiles', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<ClientProfile[]>>('/profiles', { params });
      return data;
    },
  });
}

export function useProfile(id: string | null) {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<ClientProfile>>(`/profiles/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export interface CreateProfileInput {
  candidateName: string;
  email: string;
  phone: string;
  technology: string;
  notes?: string;
  assignedRecruiterId?: string | null;
  assignedRecruiterIds?: string[];
}

export function useCreateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProfileInput) => {
      const { data } = await apiClient.post<ApiSuccess<ClientProfile>>('/profiles', input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<CreateProfileInput>) => {
      const { data } = await apiClient.patch<ApiSuccess<ClientProfile>>(`/profiles/${id}`, input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useAssignRecruiter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assignedRecruiterIds }: { id: string; assignedRecruiterIds: string[] }) => {
      const { data } = await apiClient.patch<ApiSuccess<ClientProfile>>(`/profiles/${id}/assign`, { assignedRecruiterIds });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/profiles/${id}`);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useBulkAssignProfiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileIds, assignedRecruiterIds }: { profileIds: string[]; assignedRecruiterIds: string[] }) => {
      const { data } = await apiClient.post<ApiSuccess<{ updatedCount: number }>>('/profiles/bulk-assign', {
        profileIds,
        assignedRecruiterIds,
      });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useBulkDeleteProfiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profileIds: string[]) => {
      const { data } = await apiClient.post<ApiSuccess<{ deletedCount: number }>>('/profiles/bulk-delete', {
        profileIds,
      });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ApiSuccess, ApplicationStatus, JobApplication, JobPortal } from '@/types';

export interface ApplicationListParams {
  search?: string;
  profileId?: string;
  recruiterId?: string;
  status?: ApplicationStatus;
  jobPortal?: JobPortal;
  businessDateFrom?: string;
  businessDateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useApplications(params: ApplicationListParams) {
  return useQuery({
    queryKey: ['applications', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<JobApplication[]>>('/applications', { params });
      return data;
    },
  });
}

export interface CreateApplicationInput {
  profileId: string;
  jobLink: string;
  companyName: string;
  jobTitle: string;
  jobPortal: JobPortal;
  applicationCompleted?: boolean;
  status?: ApplicationStatus;
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateApplicationInput) => {
      const { data } = await apiClient.post<ApiSuccess<JobApplication>>('/applications', {
        ...input,
        applicationCompleted: input.applicationCompleted ?? true,
      });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['recruiter-stats'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['analytics-summary'] });
    },
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; status?: ApplicationStatus }) => {
      const { data } = await apiClient.patch<ApiSuccess<JobApplication>>(`/applications/${id}`, input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  });
}

export function useCheckDuplicate() {
  return useMutation({
    mutationFn: async ({ profileId, jobLink }: { profileId: string; jobLink: string }) => {
      const { data } = await apiClient.get<ApiSuccess<{ isDuplicate: boolean; normalizedJobLink: string; appliedByRecruiter?: { id: string; name: string; email: string } | null }>>(
        '/applications/check-duplicate',
        { params: { profileId, jobLink } },
      );
      return data.data;
    },
  });
}

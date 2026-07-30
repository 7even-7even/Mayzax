import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ApiSuccess } from '@/types';

export interface OnboardingEducation {
  qualification: string;
  fieldOfStudy: string;
  specialization: string;
  instituteName: string;
  honors?: string;
  startDate: string;
  endDate?: string;
  currentlyOngoing: boolean;
}

export interface OnboardingAddress {
  state: string;
  country: string;
  fromDate: string;
  toDate: string;
}

export interface ClientOnboarding {
  id: string;
  fullName: string;
  gender: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  education: OnboardingEducation[];
  technology: string;
  skills: string;
  visaStatus: string;
  entryToUS?: string | null;
  currentLocation: string;
  addressHistory: OnboardingAddress[];
  hasExperience: boolean;
  experienceDetails?: string | null;
  certifications?: string | null;
  resumeUrl?: string | null;
  resumeFileName?: string | null;
  declared: boolean;
  planSelected: string;
  amountPaid: number;
  paymentRef: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: string | null;
  approvedById?: string | null;
  generatedProfileId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useCreateOnboarding() {
  return useMutation({
    mutationFn: async (input: Omit<ClientOnboarding, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'generatedProfileId' | 'approvedAt' | 'approvedById'>) => {
      const { data } = await apiClient.post<ApiSuccess<ClientOnboarding>>('/onboarding', input);
      return data.data;
    },
  });
}

export function useUploadResume() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('resume', file);
      const { data } = await apiClient.post<ApiSuccess<{ url: string; fileName: string }>>('/onboarding/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data.data;
    },
  });
}

export function useOnboardingDetail(id: string | null) {
  return useQuery({
    queryKey: ['onboarding-detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<ClientOnboarding>>(`/onboarding/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export interface OnboardingListParams {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  page?: number;
  pageSize?: number;
}

export function useOnboardingList(params: OnboardingListParams = {}) {
  return useQuery({
    queryKey: ['onboardings', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<ClientOnboarding[]>>('/onboarding', { params });
      return data;
    },
  });
}

export function useApproveOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<ApiSuccess<{ onboarding: ClientOnboarding }>>(`/onboarding/${id}/approve`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboardings'] });
      qc.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

export function useRejectOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<ApiSuccess<ClientOnboarding>>(`/onboarding/${id}/reject`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboardings'] });
    },
  });
}

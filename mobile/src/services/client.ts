import { getApi } from './api';

export interface ClientStats {
  totalApps: number;
  appsToday: number;
  statuses: {
    inReview: number;
    interviews: number;
    offers: number;
  };
}

export async function fetchClientStats(): Promise<ClientStats> {
  const api = await getApi();
  const res = await api.get('/applications/client-stats');
  return res as unknown as ClientStats;
}

export async function fetchClientApplications(params: { page?: number; pageSize?: number } = {}): Promise<any> {
  const api = await getApi();
  const res = await api.get('/applications', { params });
  return res;
}

export async function fetchClientInterviews(profileId: string): Promise<any[]> {
  const api = await getApi();
  const res = await api.get(`/profiles/${profileId}/interviews`);
  return res as unknown as any[];
}

export async function fetchClientPayments(profileId: string): Promise<any[]> {
  const api = await getApi();
  const res = await api.get(`/profiles/${profileId}/payment-history`);
  return res as unknown as any[];
}

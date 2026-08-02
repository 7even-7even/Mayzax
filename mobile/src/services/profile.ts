import { getApi } from './api';
import type { MeUser } from '@/types/api';

export async function fetchProfile(): Promise<MeUser> {
  const api = await getApi();
  const res = await api.get('/auth/me');
  return res as unknown as MeUser;
}

import { getApi } from './api';
import type { NotificationItem, Paginated } from '@/types/api';

export async function fetchNotifications(page = 1, pageSize = 30): Promise<Paginated<NotificationItem> & { unreadCount: number }> {
  const api = await getApi();
  const res = await api.get('/notifications', { params: { page, pageSize } });
  return res as unknown as Paginated<NotificationItem> & { unreadCount: number };
}

export async function markNotificationRead(id: string): Promise<void> {
  const api = await getApi();
  await api.post(`/notifications/${id}/read`);
}

export async function markAllRead(): Promise<void> {
  const api = await getApi();
  await api.post('/notifications/read-all');
}

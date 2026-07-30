import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as notificationsService from './notifications.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '20'), 10) || 20));
  const result = await notificationsService.listNotifications(req.user!.sub, page, pageSize);
  res.json({ success: true, data: result.items, unreadCount: result.unreadCount, pagination: result.pagination });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationsService.markRead(req.user!.sub, req.params.id);
  res.json({ success: true, data: { message: 'Marked as read' } });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationsService.markAllRead(req.user!.sub);
  res.json({ success: true, data: { message: 'All marked as read' } });
});

import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { changeStatusSchema, activityHistoryQuerySchema, productivityQuerySchema } from './activity.validation';
import * as activityService from './activity.service';

function actor(req: Request) {
  const user = req.user!;
  return {
    id: user.sub,
    role: user.role,
    name: user.email.split('@')[0],
    email: user.email,
  };
}

export const changeStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, optionalNote } = changeStatusSchema.parse(req.body);
  const user = req.user!;
  const result = await activityService.changeStatus(user.sub, status, optionalNote, user.role);
  res.status(200).json({ success: true, data: result });
});

export const getCurrentStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await activityService.getCurrentStatus(user.sub, user.role);
  res.status(200).json({ success: true, data: result });
});

export const heartbeat = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await activityService.processHeartbeat(user.sub, user.role);
  res.status(200).json({ success: true, data: result });
});

export const getTodayActivity = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await activityService.getTodayActivity(user.sub);
  res.status(200).json({ success: true, data: result });
});

export const getActivityHistory = asyncHandler(async (req: Request, res: Response) => {
  const query = activityHistoryQuerySchema.parse(req.query);
  const result = await activityService.getActivityHistory(query, actor(req));
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

export const getActivityUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await activityService.getActivityUsers(actor(req));
  res.status(200).json({ success: true, data: result });
});

export const getLiveStatus = asyncHandler(async (req: Request, res: Response) => {
  const result = await activityService.getLiveStatusMetrics(actor(req));
  res.status(200).json({ success: true, data: result });
});

export const getProductivity = asyncHandler(async (req: Request, res: Response) => {
  const query = productivityQuerySchema.parse(req.query);
  const result = await activityService.getProductivityMetrics(query, actor(req));
  res.status(200).json({ success: true, data: result });
});

export const getAttendanceReport = asyncHandler(async (req: Request, res: Response) => {
  const query = productivityQuerySchema.parse(req.query);
  const result = await activityService.getAttendanceReport(query, actor(req));
  res.status(200).json({ success: true, data: result });
});

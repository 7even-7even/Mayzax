import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/apiError';
import * as attendanceService from './attendance.service';
import { getBusinessDateString } from '@/utils/businessDate';

export const getToday = asyncHandler(async (req: Request, res: Response) => {
  const data = await attendanceService.getTodayForUser(req.user!.sub);
  res.json({ success: true, data });
});

export const getCurrentBreak = asyncHandler(async (req: Request, res: Response) => {
  const data = await attendanceService.getCurrentBreakForUser(req.user!.sub);
  res.json({ success: true, data });
});

export const getForDate = asyncHandler(async (req: Request, res: Response) => {
  const date = req.params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw ApiError.badRequest('Invalid date. Expected YYYY-MM-DD');
  }
  // Disallow future dates
  const requested = new Date(`${date}T00:00:00Z`);
  const today = new Date(`${getBusinessDateString(new Date())}T00:00:00Z`);
  if (requested > today) {
    throw ApiError.badRequest('Cannot view attendance for future dates');
  }
  const data = await attendanceService.getDayDetail(req.user!.sub, date);
  res.json({ success: true, data });
});

export const getMonthSummary = asyncHandler(async (req: Request, res: Response) => {
  const month = typeof req.query.month === 'string' && req.query.month
    ? req.query.month
    : getBusinessDateString(new Date()).slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw ApiError.badRequest('Invalid month. Expected YYYY-MM');
  }
  const data = await attendanceService.getMonthSummary(req.user!.sub, month);
  res.json({ success: true, data });
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '20'), 10) || 20));
  const fromDate = typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined;
  const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : undefined;
  const data = await attendanceService.getHistory(req.user!.sub, { fromDate, toDate, page, pageSize });
  res.json({ success: true, data: data.items, pagination: data.pagination });
});

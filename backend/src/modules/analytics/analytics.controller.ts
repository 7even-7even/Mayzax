import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as analyticsService from './analytics.service';

export const getDashboardOverview = asyncHandler(async (req: Request, res: Response) => {
  const result = await analyticsService.getDashboardOverview(req.query as any);
  res.status(200).json({ success: true, data: result.items, currentBusinessDate: result.currentBusinessDate, pagination: result.pagination });
});

export const getRecruiterBreakdown = asyncHandler(async (req: Request, res: Response) => {
  const result = await analyticsService.getRecruiterBreakdown(req.params.id);
  res.status(200).json({ success: true, data: result });
});

export const getDailyCounts = asyncHandler(async (req: Request, res: Response) => {
  const result = await analyticsService.getDailyCounts(req.query as any);
  res.status(200).json({ success: true, data: result });
});

export const getJobPortalAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const result = await analyticsService.getJobPortalAnalytics({ id: req.user!.sub, role: req.user!.role }, req.query as any);
  res.status(200).json({ success: true, data: result });
});

export const getGlobalSummary = asyncHandler(async (_req: Request, res: Response) => {
  const result = await analyticsService.getGlobalSummary();
  res.status(200).json({ success: true, data: result });
});

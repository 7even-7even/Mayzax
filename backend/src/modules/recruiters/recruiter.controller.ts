import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as recruiterService from './recruiter.service';

export const createRecruiter = asyncHandler(async (req: Request, res: Response) => {
  const recruiter = await recruiterService.createRecruiter(req.body, req.user!.sub, { ip: req.ip, userAgent: req.headers['user-agent'] });
  res.status(201).json({ success: true, data: recruiter });
});

export const updateRecruiter = asyncHandler(async (req: Request, res: Response) => {
  const recruiter = await recruiterService.updateRecruiter(req.params.id, req.body, req.user!.sub, { ip: req.ip, userAgent: req.headers['user-agent'] });
  res.status(200).json({ success: true, data: recruiter });
});

export const setActiveStatus = asyncHandler(async (req: Request, res: Response) => {
  const recruiter = await recruiterService.setRecruiterActiveStatus(req.params.id, req.body.isActive, req.user!.sub, { ip: req.ip, userAgent: req.headers['user-agent'] });
  res.status(200).json({ success: true, data: recruiter });
});

export const deleteRecruiter = asyncHandler(async (req: Request, res: Response) => {
  const result = await recruiterService.softDeleteRecruiter(req.params.id, req.user!.sub, { ip: req.ip, userAgent: req.headers['user-agent'] });
  res.status(200).json({ success: true, data: result });
});

export const listRecruiters = asyncHandler(async (req: Request, res: Response) => {
  const result = await recruiterService.listRecruiters(req.query as any);
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

export const getRecruiterStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await recruiterService.getRecruiterStats(req.params.id);
  res.status(200).json({ success: true, data: stats });
});

export const getMyRecruiterStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await recruiterService.getRecruiterStats(req.user!.sub);
  res.status(200).json({ success: true, data: stats });
});

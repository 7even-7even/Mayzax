import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as profileService from './profile.service';

function actor(req: Request) {
  return { id: req.user!.sub, role: req.user!.role };
}
function meta(req: Request) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] as string | undefined };
}

export const createProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await profileService.createProfile(req.body, actor(req), meta(req));
  res.status(201).json({ success: true, data: profile });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await profileService.updateProfile(req.params.id, req.body, actor(req), meta(req));
  res.status(200).json({ success: true, data: profile });
});

export const deleteProfile = asyncHandler(async (req: Request, res: Response) => {
  const result = await profileService.deleteProfile(req.params.id, actor(req), meta(req));
  res.status(200).json({ success: true, data: result });
});

export const assignRecruiter = asyncHandler(async (req: Request, res: Response) => {
  const recruiterIds = req.body.assignedRecruiterIds ?? (req.body.assignedRecruiterId ? [req.body.assignedRecruiterId] : []);
  const profile = await profileService.assignRecruiter(req.params.id, recruiterIds, actor(req), meta(req));
  res.status(200).json({ success: true, data: profile });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await profileService.getProfile(req.params.id, actor(req));
  res.status(200).json({ success: true, data: profile });
});

export const listProfiles = asyncHandler(async (req: Request, res: Response) => {
  const result = await profileService.listProfiles(req.query as any, actor(req));
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

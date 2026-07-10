import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/utils/asyncHandler';
import * as applicationService from './application.service';

function actor(req: Request) {
  return { id: req.user!.sub, role: req.user!.role };
}
function meta(req: Request) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] as string | undefined };
}

export const createApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await applicationService.createApplication(req.body, actor(req), meta(req));
  res.status(201).json({ success: true, data: application });
});

export const updateApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await applicationService.updateApplication(req.params.id, req.body, actor(req), meta(req));
  res.status(200).json({ success: true, data: application });
});

export const getApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await applicationService.getApplication(req.params.id, actor(req));
  res.status(200).json({ success: true, data: application });
});

export const listApplications = asyncHandler(async (req: Request, res: Response) => {
  const result = await applicationService.listApplications(req.query as any, actor(req));
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

const duplicateCheckSchema = z.object({
  profileId: z.string().uuid(),
  jobLink: z.string().url(),
});

export const checkDuplicate = asyncHandler(async (req: Request, res: Response) => {
  const { profileId, jobLink } = duplicateCheckSchema.parse(req.query);
  const result = await applicationService.checkDuplicate(profileId, jobLink, actor(req));
  res.status(200).json({ success: true, data: result });
});

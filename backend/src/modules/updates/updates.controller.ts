import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { createUpdateSchema } from './updates.validation';
import * as updatesService from './updates.service';

export const getUpdates = asyncHandler(async (req: Request, res: Response) => {
  const result = await updatesService.getUpdatesForUser(req.user!.sub);
  res.status(200).json({ success: true, data: result });
});

export const createUpdate = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createUpdateSchema.parse(req.body);
  const result = await updatesService.createUpdate(req.user!.sub, parsed, req.file);
  res.status(201).json({ success: true, data: result });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await updatesService.markUpdateAsRead(req.user!.sub, req.params.id);
  res.status(200).json({ success: true, data: result });
});

export const deleteUpdate = asyncHandler(async (req: Request, res: Response) => {
  const result = await updatesService.deleteUpdate(req.params.id);
  res.status(200).json({ success: true, data: result });
});

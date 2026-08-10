import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as profileChangesService from './profile-changes.service';
import {
  createChangeRequestSchema,
  reviewChangeRequestSchema,
  listChangeRequestsQuerySchema,
} from './profile-changes.validation';
import { Role } from '@prisma/client';

// POST /profile-changes/profiles/:profileId  — client submits a change request
export const submitChangeRequest = asyncHandler(async (req: Request, res: Response) => {
  const actor = { id: req.user!.sub, role: req.user!.role as Role };
  const profileId = req.params.profileId;
  const input = createChangeRequestSchema.parse(req.body);
  const meta = { ip: req.ip, userAgent: req.get('user-agent') };
  const result = await profileChangesService.submitChangeRequest(profileId, input, actor, meta);
  res.status(201).json({ success: true, data: result });
});

// POST /profile-changes/profiles/:profileId/upgrade-plan — client requests a plan upgrade
export const requestPlanUpgrade = asyncHandler(async (req: Request, res: Response) => {
  const actor = { id: req.user!.sub, role: req.user!.role as Role };
  const profileId = req.params.profileId;
  const { targetPlan } = req.body as { targetPlan: string };
  if (!['Basic', 'Gold', 'Premium'].includes(targetPlan)) {
    res.status(400).json({ success: false, error: 'Invalid target plan' });
    return;
  }
  const meta = { ip: req.ip, userAgent: req.get('user-agent') };
  const result = await profileChangesService.submitPlanUpgradeRequest(profileId, targetPlan, actor, meta);
  res.status(201).json({ success: true, data: result });
});

// GET /profile-changes — Admin lists all change requests
export const listChangeRequests = asyncHandler(async (req: Request, res: Response) => {
  const actor = { id: req.user!.sub, role: req.user!.role as Role };
  const query = listChangeRequestsQuerySchema.parse(req.query);
  const result = await profileChangesService.listChangeRequests(query, actor);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

// GET /profile-changes/my-profile/:profileId/pending — client checks own pending request
export const getMyPendingRequest = asyncHandler(async (req: Request, res: Response) => {
  const { profileId } = req.params;
  const result = await profileChangesService.getPendingRequestForProfile(profileId);
  res.json({ success: true, data: result ?? null });
});

// POST /profile-changes/:id/approve — Admin approves
export const approveChangeRequest = asyncHandler(async (req: Request, res: Response) => {
  const actor = { id: req.user!.sub, role: req.user!.role as Role };
  const meta = { ip: req.ip, userAgent: req.get('user-agent') };
  const result = await profileChangesService.approveChangeRequest(req.params.id, actor, meta);
  res.json({ success: true, ...result });
});

// POST /profile-changes/:id/reject — Admin rejects
export const rejectChangeRequest = asyncHandler(async (req: Request, res: Response) => {
  const actor = { id: req.user!.sub, role: req.user!.role as Role };
  const input = reviewChangeRequestSchema.parse(req.body);
  const meta = { ip: req.ip, userAgent: req.get('user-agent') };
  const result = await profileChangesService.rejectChangeRequest(req.params.id, input, actor, meta);
  res.json({ success: true, ...result });
});

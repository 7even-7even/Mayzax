import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as verificationService from './verification.service';

function actor(req: Request) {
  return { id: req.user!.sub, role: req.user!.role };
}

export const verifyEvidence = asyncHandler(async (req: Request, res: Response) => {
  const result = await verificationService.verifyEvidence(req.body, actor(req));
  res.status(200).json({ success: true, data: result });
});

export const getVerificationByHash = asyncHandler(async (req: Request, res: Response) => {
  const { hash } = req.params;
  const result = await verificationService.getVerificationByHash(hash, actor(req));
  res.status(200).json({ success: true, data: result });
});

export const listVerifications = asyncHandler(async (req: Request, res: Response) => {
  const list = await verificationService.listVerifications(actor(req).id, 20);
  res.status(200).json({ success: true, data: list });
});

export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const result = await verificationService.createSession(req.body, actor(req));
  res.status(201).json({ success: true, data: result });
});

export const addEvents = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const result = await verificationService.addEvents(sessionId, req.body.events);
  res.status(200).json({ success: true, data: result });
});

export const finalizeSession = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const result = await verificationService.finalizeSession(sessionId);
  res.status(200).json({ success: true, data: result });
});

export const checkApplicationUrl = asyncHandler(async (req: Request, res: Response) => {
  const result = await verificationService.checkApplicationUrl(req.body.applicationUrl, actor(req));
  res.status(200).json({ success: true, data: result });
});


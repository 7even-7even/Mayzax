import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as onboardingService from './onboarding.service';
import { OnboardingStatus } from '@prisma/client';

export const createOnboarding = asyncHandler(async (req: Request, res: Response) => {
  const onboarding = await onboardingService.createOnboarding(req.body);
  res.status(201).json({ success: true, data: onboarding });
});

export const uploadResume = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
    return;
  }
  
  // Return the relative file path for storing in the database
  const relativePath = `uploads/resumes/${req.file.filename}`;
  res.status(200).json({
    success: true,
    data: {
      url: relativePath,
      fileName: req.file.originalname,
    },
  });
});

export const getOnboardingById = asyncHandler(async (req: Request, res: Response) => {
  const onboarding = await onboardingService.getOnboardingById(req.params.id);
  res.status(200).json({ success: true, data: onboarding });
});

export const listOnboardings = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as OnboardingStatus | undefined;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined;

  const result = await onboardingService.listOnboardings({ status, page, pageSize });
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

export const approveOnboarding = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user!.sub;
  const result = await onboardingService.approveOnboarding(req.params.id, adminId);
  res.status(200).json({ success: true, data: result });
});

export const rejectOnboarding = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user!.sub;
  const result = await onboardingService.rejectOnboarding(req.params.id, adminId);
  res.status(200).json({ success: true, data: result });
});

export const checkDuplicate = asyncHandler(async (req: Request, res: Response) => {
  const email = req.query.email as string | undefined;
  const phone = req.query.phone as string | undefined;
  const result = await onboardingService.checkDuplicate(email, phone);
  res.status(200).json({ success: true, data: result });
});


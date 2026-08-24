import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as inquiriesService from './inquiries.service';
import { z } from 'zod';

export const listInquiries = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined;
  const search = req.query.search as string | undefined;

  const result = await inquiriesService.listInquiries({ page, pageSize, search });
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

export const getInquiryById = asyncHandler(async (req: Request, res: Response) => {
  const item = await inquiriesService.getInquiryById(req.params.id);
  res.status(200).json({ success: true, data: item });
});

const createInquirySchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  serviceInterested: z.string().min(1),
  details: z.string().min(1),
});

export const submitInquiry = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createInquirySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid request body', issues: parsed.error.issues });
    return;
  }
  const record = await inquiriesService.createInquiry(parsed.data);
  res.status(201).json({ success: true, data: record });
});

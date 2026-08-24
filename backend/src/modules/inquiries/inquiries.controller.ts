import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as inquiriesService from './inquiries.service';

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

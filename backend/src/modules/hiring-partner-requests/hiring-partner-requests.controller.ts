import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as hiringPartnerRequestsService from './hiring-partner-requests.service';

export const listHiringPartnerRequests = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined;
  const search = req.query.search as string | undefined;

  const result = await hiringPartnerRequestsService.listHiringPartnerRequests({ page, pageSize, search });
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

export const getHiringPartnerRequestById = asyncHandler(async (req: Request, res: Response) => {
  const item = await hiringPartnerRequestsService.getHiringPartnerRequestById(req.params.id);
  res.status(200).json({ success: true, data: item });
});

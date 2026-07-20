import { z } from 'zod';
import { UserStatus } from '@prisma/client';

export const userStatusEnum = z.nativeEnum(UserStatus);

export const changeStatusSchema = z.object({
  status: userStatusEnum,
  optionalNote: z.string().trim().max(500).optional().nullable(),
});

export const activityHistoryQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fromDate must be YYYY-MM-DD').optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'toDate must be YYYY-MM-DD').optional(),
  status: userStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const productivityQuerySchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fromDate must be YYYY-MM-DD').optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'toDate must be YYYY-MM-DD').optional(),
  recruiterId: z.string().uuid().optional(),
});

import { z } from 'zod';

export const createChangeRequestSchema = z.object({
  changes: z.record(z.unknown()).refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be changed',
  }),
});

export const reviewChangeRequestSchema = z.object({
  rejectionNote: z.string().max(500).optional(),
});

export const listChangeRequestsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  profileId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
});

export type CreateChangeRequestInput = z.infer<typeof createChangeRequestSchema>;
export type ReviewChangeRequestInput = z.infer<typeof reviewChangeRequestSchema>;
export type ListChangeRequestsQuery = z.infer<typeof listChangeRequestsQuerySchema>;

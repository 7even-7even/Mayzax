import { z } from 'zod';

export const createProfileSchema = z.object({
  candidateName: z.string().min(2, 'Candidate name must be at least 2 characters').max(150),
  email: z.string().email('A valid email is required'),
  phone: z
    .string()
    .min(7, 'Phone number is too short')
    .max(20, 'Phone number is too long')
    .regex(/^[+0-9\s()-]+$/, 'Phone number contains invalid characters'),
  technology: z.string().min(1, 'Technology is required').max(100),
  notes: z.string().max(5000).optional().nullable(),
  assignedRecruiterId: z.string().uuid().optional().nullable(),
});

export const updateProfileSchema = createProfileSchema.partial();

export const listProfilesQuerySchema = z.object({
  search: z.string().optional(),
  technology: z.string().optional(),
  assignedRecruiterId: z.string().uuid().optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['candidateName', 'technology', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
});

export const assignRecruiterSchema = z.object({
  assignedRecruiterId: z.string().uuid().nullable(),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ListProfilesQuery = z.infer<typeof listProfilesQuerySchema>;

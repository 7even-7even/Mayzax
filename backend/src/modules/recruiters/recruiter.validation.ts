import { z } from 'zod';

export const createRecruiterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().email('A valid email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  role: z.enum(['ADMIN', 'TEAM_LEADER', 'RECRUITER']).default('RECRUITER'),
  createdById: z.string().uuid().nullable().optional(),
});

export const updateRecruiterSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'TEAM_LEADER', 'RECRUITER']).optional(),
  createdById: z.string().uuid().nullable().optional(),
});

export const teamNameSchema = z.object({
  teamName: z.string().max(100).optional().nullable(),
});

export const toggleActiveSchema = z.object({
  isActive: z.boolean(),
});

export const listRecruitersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'TEAM_LEADER', 'RECRUITER']).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastActiveAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  createdById: z.string().uuid().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
});

export type CreateRecruiterInput = z.infer<typeof createRecruiterSchema>;
export type UpdateRecruiterInput = z.infer<typeof updateRecruiterSchema>;
export type ListRecruitersQuery = z.infer<typeof listRecruitersQuerySchema>;
export type TeamNameInput = z.infer<typeof teamNameSchema>;

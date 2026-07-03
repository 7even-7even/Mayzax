import { z } from 'zod';

export const applicationStatusEnum = z.enum([
  'APPLIED',
  'IN_REVIEW',
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEWED',
  'OFFERED',
  'REJECTED',
  'WITHDRAWN',
  'ON_HOLD',
]);

export const jobPortalEnum = z.enum([
  'LINKEDIN',
  'INDEED',
  'NAUKRI',
  'DICE',
  'MONSTER',
  'ZIPRECRUITER',
  'GLASSDOOR',
  'COMPANY_WEBSITE',
  'CAREERBUILDER',
  'OTHER',
]);

export const createApplicationSchema = z.object({
  profileId: z.string().uuid('A valid profile is required'),
  jobLink: z.string().url('A valid job link URL is required').max(2048),
  companyName: z.string().min(1, 'Company name is required').max(200),
  jobTitle: z.string().min(1, 'Job title is required').max(200),
  jobPortal: jobPortalEnum.default('OTHER'),
  status: applicationStatusEnum.default('APPLIED'),
  appliedAt: z.coerce.date().optional(),
});

export const updateApplicationSchema = z.object({
  status: applicationStatusEnum.optional(),
  companyName: z.string().min(1).max(200).optional(),
  jobTitle: z.string().min(1).max(200).optional(),
  jobPortal: jobPortalEnum.optional(),
});

export const listApplicationsQuerySchema = z.object({
  search: z.string().optional(),
  profileId: z.string().uuid().optional(),
  recruiterId: z.string().uuid().optional(),
  status: applicationStatusEnum.optional(),
  jobPortal: jobPortalEnum.optional(),
  businessDateFrom: z.string().optional(), // YYYY-MM-DD
  businessDateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['appliedAt', 'businessDate', 'companyName', 'jobTitle', 'createdAt']).default('appliedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;

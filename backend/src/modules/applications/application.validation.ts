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
  'GLASSDOOR',
  'JOBRIGHT',
  'SIMPLIFY',
  'SIMPLYHIRED',
  'WELLFOUND',
  'HANDSHAKE',
  'NAUKRI',
  'DICE',
  'MONSTER',
  'ZIPRECRUITER',
  'COMPANY_WEBSITE',
  'CAREERBUILDER',
  'LEVER',
  'GREENHOUSE',
  'SPEEDY_APPLY',
  'THE_MUSE',
  'Y_COMBINATOR',
  'CAREER_SITE',
  'OTHER',
]);

function isPlaceholderJobUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return (
      ['example.com', 'example.org', 'example.net', 'localhost', '127.0.0.1'].includes(host) ||
      /placeholder|dummy|unused|test-job|sample-job/i.test(url)
    );
  } catch {
    return true;
  }
}

const applicationCompletedSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === '') return true;
    if (value === 'true' || value === 'on') return true;
    return value;
  },
  z.literal(true, { errorMap: () => ({ message: 'Confirm the application was completed before saving the link' }) }),
);

export const createApplicationSchema = z.object({
  profileId: z.string().uuid('A valid profile is required'),
  jobLink: z
    .string()
    .url('A valid job link URL is required')
    .max(2048)
    .refine((url) => !isPlaceholderJobUrl(url), 'Please submit the real completed application link, not a placeholder/test link'),
  companyName: z.string().trim().max(200).default(''),
  jobTitle: z.string().trim().max(200).default(''),
  jobPortal: jobPortalEnum.default('OTHER'),
  applicationCompleted: applicationCompletedSchema,
  status: applicationStatusEnum.default('APPLIED'),
  appliedAt: z.coerce.date().optional(),
  verified: z.boolean().default(false).optional(),
  verificationMethod: z.string().trim().max(100).nullable().optional(),
});

export const updateApplicationSchema = z.object({
  status: applicationStatusEnum.optional(),
  companyName: z.string().trim().max(200).optional(),
  jobTitle: z.string().trim().max(200).optional(),
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

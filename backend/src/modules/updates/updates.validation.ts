import { z } from 'zod';

export const createUpdateSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  version: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  description: z.string().trim().min(5, 'Description must be at least 5 characters'),
  pdfUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  pdfOriginalName: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  roles: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val.split(',').map((r) => r.trim()).filter(Boolean);
        }
      }
      return val;
    }, z.array(z.enum(['ADMIN', 'TEAM_LEADER', 'RECRUITER', 'RESUME_ASSIST', 'SALES_EXEC', 'CLIENT'])))
    .optional()
    .default([]),
});

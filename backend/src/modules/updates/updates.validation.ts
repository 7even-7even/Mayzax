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
});

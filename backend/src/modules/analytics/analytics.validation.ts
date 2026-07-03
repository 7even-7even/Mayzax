import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  search: z.string().optional(),
  sortBy: z.enum(['name', 'assignedProfiles', 'totalApplications', 'lastActiveAt']).default('totalApplications'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const dailyCountsQuerySchema = z.object({
  recruiterId: z.string().uuid().optional(),
  from: z.string().optional(), // YYYY-MM-DD business date
  to: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type DailyCountsQuery = z.infer<typeof dailyCountsQuerySchema>;

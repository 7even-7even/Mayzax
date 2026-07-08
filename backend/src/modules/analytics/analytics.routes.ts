import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { dashboardQuerySchema, dailyCountsQuerySchema, idParamSchema } from './analytics.validation';
import * as analyticsController from './analytics.controller';

const router = Router();

router.use(requireAuth);

// Recruiters get their own scoped portal analytics; admins get all applications.
router.get('/job-portals', analyticsController.getJobPortalAnalytics);

router.use(requireRole(Role.ADMIN));

router.get('/summary', analyticsController.getGlobalSummary);
router.get('/dashboard', validate({ query: dashboardQuerySchema }), analyticsController.getDashboardOverview);
router.get('/dashboard/:id/breakdown', validate({ params: idParamSchema }), analyticsController.getRecruiterBreakdown);
router.get('/daily-counts', validate({ query: dailyCountsQuerySchema }), analyticsController.getDailyCounts);

export default router;

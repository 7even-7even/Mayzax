import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '@/middleware/auth';
import * as activityController from './activity.controller';

const router = Router();

router.use(requireAuth);

// Recruiter & TL actions
router.post('/status', activityController.changeStatus);
router.get('/current', activityController.getCurrentStatus);
router.post('/heartbeat', activityController.heartbeat);
router.get('/today', activityController.getTodayActivity);
router.get('/history', activityController.getActivityHistory);
router.get('/users', activityController.getActivityUsers);

// Admin & TL monitoring endpoints
router.get('/live-status', requireRole(Role.ADMIN, Role.TEAM_LEADER), activityController.getLiveStatus);
router.get('/productivity', requireRole(Role.ADMIN, Role.TEAM_LEADER), activityController.getProductivity);
router.get('/attendance', requireRole(Role.ADMIN, Role.TEAM_LEADER), activityController.getAttendanceReport);

export default router;

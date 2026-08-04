import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole, disallowMobile } from '@/middleware/auth';
import * as activityController from './activity.controller';

const router = Router();

router.use(requireAuth);

// Mutating endpoints — desktop/web only. Mobile companion cannot change status or send heartbeats.
router.post('/status', disallowMobile, activityController.changeStatus);
router.post('/heartbeat', disallowMobile, activityController.heartbeat);

// Read endpoints available to both web and mobile
router.get('/current', activityController.getCurrentStatus);
router.get('/today', activityController.getTodayActivity);
router.get('/history', activityController.getActivityHistory);
router.get('/users', activityController.getActivityUsers);

// Admin & TL monitoring endpoints
router.get('/live-status', requireRole(Role.ADMIN, Role.TEAM_LEADER), activityController.getLiveStatus);
router.get('/productivity', requireRole(Role.ADMIN, Role.TEAM_LEADER, Role.RECRUITER, Role.RESUME_ASSIST, Role.SALES_EXEC), activityController.getProductivity);
router.get('/attendance', requireRole(Role.ADMIN, Role.TEAM_LEADER), activityController.getAttendanceReport);

export default router;

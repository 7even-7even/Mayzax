import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';
import * as attendanceController from './attendance.controller';

const router = Router();
router.use(requireAuth);

router.get('/today', attendanceController.getToday);
router.get('/current-break', attendanceController.getCurrentBreak);
router.get('/history', attendanceController.getHistory);
router.get('/month-summary', attendanceController.getMonthSummary);
router.get('/:date', attendanceController.getForDate);

export default router;

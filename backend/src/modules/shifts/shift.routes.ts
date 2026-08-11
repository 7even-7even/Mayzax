import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';
import * as shiftController from './shift.controller';

const router = Router();

// Public — no auth needed; used by frontend to sync shift calculation logic
router.get('/config', shiftController.getShiftConfig);

router.use(requireAuth);

router.get('/me', shiftController.getMyShift);

export default router;

import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';
import * as shiftController from './shift.controller';

const router = Router();
router.use(requireAuth);

router.get('/me', shiftController.getMyShift);

export default router;

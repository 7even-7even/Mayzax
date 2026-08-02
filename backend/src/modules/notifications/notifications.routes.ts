import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { z } from 'zod';
import * as notificationsController from './notifications.controller';

const router = Router();
router.use(requireAuth);

router.get('/', notificationsController.list);
router.post('/read-all', notificationsController.markAllRead);
router.post('/:id/read', notificationsController.markRead);

export default router;

import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '@/middleware/auth';
import { pdfUpload } from '@/middleware/upload';
import * as updatesController from './updates.controller';

const router = Router();

router.use(requireAuth);

router.get('/', updatesController.getUpdates);
router.post('/:id/read', updatesController.markAsRead);

// Admin only endpoints
router.post('/', requireRole(Role.ADMIN), pdfUpload.single('pdfFile'), updatesController.createUpdate);
router.delete('/:id', requireRole(Role.ADMIN), updatesController.deleteUpdate);

export default router;

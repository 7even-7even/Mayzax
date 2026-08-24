import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '@/middleware/auth';
import * as inquiriesController from './inquiries.controller';

const router = Router();

// Public — no auth required
router.post('/', inquiriesController.submitInquiry);

// Admins only
router.use(requireAuth, requireRole(Role.ADMIN));

router.get('/', inquiriesController.listInquiries);
router.get('/:id', inquiriesController.getInquiryById);

export default router;

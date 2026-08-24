import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '@/middleware/auth';
import * as hiringPartnerRequestsController from './hiring-partner-requests.controller';

const router = Router();

// Admins only
router.use(requireAuth, requireRole(Role.ADMIN));

router.get('/', hiringPartnerRequestsController.listHiringPartnerRequests);
router.get('/:id', hiringPartnerRequestsController.getHiringPartnerRequestById);

export default router;

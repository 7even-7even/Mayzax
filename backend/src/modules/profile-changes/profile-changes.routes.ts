import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '@/middleware/auth';
import * as controller from './profile-changes.controller';

const router = Router();

// All routes require auth
router.use(requireAuth);

// CLIENT: submit a change request for their profile
router.post('/profiles/:profileId', requireRole(Role.CLIENT), controller.submitChangeRequest);

// CLIENT: request plan upgrade
router.post('/profiles/:profileId/upgrade-plan', requireRole(Role.CLIENT), controller.requestPlanUpgrade);

// CLIENT / ADMIN: check pending request for a profile
router.get('/my-profile/:profileId/pending', controller.getMyPendingRequest);

// ADMIN only: list all change requests
router.get('/', requireRole(Role.ADMIN), controller.listChangeRequests);

// ADMIN only: approve/reject
router.post('/:id/approve', requireRole(Role.ADMIN), controller.approveChangeRequest);
router.post('/:id/reject', requireRole(Role.ADMIN), controller.rejectChangeRequest);

export default router;

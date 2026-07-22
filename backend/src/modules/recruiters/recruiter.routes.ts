import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import {
  createRecruiterSchema,
  updateRecruiterSchema,
  toggleActiveSchema,
  listRecruitersQuerySchema,
  idParamSchema,
  teamNameSchema,
} from './recruiter.validation';
import * as recruiterController from './recruiter.controller';

const router = Router();

router.get('/me/stats', requireAuth, recruiterController.getMyRecruiterStats);
router.patch('/me/team-name', requireAuth, requireRole(Role.TEAM_LEADER), validate({ body: teamNameSchema }), recruiterController.updateMyTeamName);

router.use(requireAuth, requireRole(Role.ADMIN, Role.TEAM_LEADER));

router.get('/', validate({ query: listRecruitersQuerySchema }), recruiterController.listRecruiters);
router.post('/', validate({ body: createRecruiterSchema }), recruiterController.createRecruiter);
router.get('/:id/stats', validate({ params: idParamSchema }), recruiterController.getRecruiterStats);
router.patch('/:id', validate({ params: idParamSchema, body: updateRecruiterSchema }), recruiterController.updateRecruiter);
router.patch('/:id/status', validate({ params: idParamSchema, body: toggleActiveSchema }), recruiterController.setActiveStatus);
router.delete('/:id', validate({ params: idParamSchema }), recruiterController.deleteRecruiter);

export default router;

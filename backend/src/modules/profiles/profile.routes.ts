import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import {
  createProfileSchema,
  updateProfileSchema,
  listProfilesQuerySchema,
  idParamSchema,
  assignRecruiterSchema,
} from './profile.validation';
import * as profileController from './profile.controller';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: listProfilesQuerySchema }), profileController.listProfiles);
router.get('/:id', validate({ params: idParamSchema }), profileController.getProfile);
router.post('/', requireRole(Role.ADMIN, Role.TEAM_LEADER, Role.RECRUITER), validate({ body: createProfileSchema }), profileController.createProfile);
router.patch('/:id', requireRole(Role.ADMIN, Role.TEAM_LEADER, Role.RECRUITER), validate({ params: idParamSchema, body: updateProfileSchema }), profileController.updateProfile);
router.patch(
  '/:id/assign',
  requireRole(Role.ADMIN, Role.TEAM_LEADER),
  validate({ params: idParamSchema, body: assignRecruiterSchema }),
  profileController.assignRecruiter,
);
router.delete('/:id', requireRole(Role.ADMIN), validate({ params: idParamSchema }), profileController.deleteProfile);

export default router;

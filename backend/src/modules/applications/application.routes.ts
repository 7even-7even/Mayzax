import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import {
  createApplicationSchema,
  updateApplicationSchema,
  listApplicationsQuerySchema,
  idParamSchema,
} from './application.validation';
import * as applicationController from './application.controller';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: listApplicationsQuerySchema }), applicationController.listApplications);
router.get('/check-duplicate', applicationController.checkDuplicate);
router.get('/:id', validate({ params: idParamSchema }), applicationController.getApplication);
router.post('/', validate({ body: createApplicationSchema }), applicationController.createApplication);
router.patch('/:id', validate({ params: idParamSchema, body: updateApplicationSchema }), applicationController.updateApplication);

export default router;

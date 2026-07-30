import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { resumeUpload } from '@/middleware/upload';
import {
  createOnboardingSchema,
  onboardingIdParamSchema,
  updateOnboardingStatusSchema,
} from './onboarding.validation';
import * as onboardingController from './onboarding.controller';

const router = Router();

// Public routes for self-onboarding clients
router.post('/', validate({ body: createOnboardingSchema }), onboardingController.createOnboarding);
router.post('/upload', resumeUpload.single('resume'), onboardingController.uploadResume);
router.get('/check-duplicate', onboardingController.checkDuplicate);
router.get('/:id', validate({ params: onboardingIdParamSchema }), onboardingController.getOnboardingById);

// Admin-only verification routes
router.use(requireAuth, requireRole(Role.ADMIN));
router.get('/', onboardingController.listOnboardings);
router.patch('/:id/approve', validate({ params: onboardingIdParamSchema }), onboardingController.approveOnboarding);
router.patch('/:id/reject', validate({ params: onboardingIdParamSchema }), onboardingController.rejectOnboarding);

export default router;

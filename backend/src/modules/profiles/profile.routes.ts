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
  bulkAssignProfilesSchema,
  bulkDeleteProfilesSchema,
  mergeProfilesSchema,
  bulkArchiveProfilesSchema,
} from './profile.validation';
import * as profileController from './profile.controller';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: listProfilesQuerySchema }), profileController.listProfiles);
router.post(
  '/bulk-assign',
  requireRole(Role.ADMIN, Role.TEAM_LEADER),
  validate({ body: bulkAssignProfilesSchema }),
  profileController.bulkAssignProfiles,
);
router.post(
  '/bulk-delete',
  requireRole(Role.ADMIN),
  validate({ body: bulkDeleteProfilesSchema }),
  profileController.bulkDeleteProfiles,
);
router.post(
  '/bulk-archive',
  requireRole(Role.ADMIN),
  validate({ body: bulkArchiveProfilesSchema }),
  profileController.bulkArchiveProfiles,
);
router.get('/:id', validate({ params: idParamSchema }), profileController.getProfile);
router.post('/', requireRole(Role.ADMIN, Role.TEAM_LEADER), validate({ body: createProfileSchema }), profileController.createProfile);
router.patch('/:id', requireRole(Role.ADMIN, Role.TEAM_LEADER, Role.RECRUITER, Role.CLIENT, Role.RESUME_ASSIST), validate({ params: idParamSchema, body: updateProfileSchema }), profileController.updateProfile);
router.patch(
  '/:id/assign',
  requireRole(Role.ADMIN, Role.TEAM_LEADER),
  validate({ params: idParamSchema, body: assignRecruiterSchema }),
  profileController.assignRecruiter,
);
router.delete('/:id', requireRole(Role.ADMIN), validate({ params: idParamSchema }), profileController.deleteProfile);
router.post(
  '/:id/reset-password',
  requireRole(Role.ADMIN),
  validate({ params: idParamSchema }),
  profileController.resetPassword,
);

// Payment history (CLIENT can access their own, Admin/TL can see any)
router.get(
  '/:id/payment-history',
  validate({ params: idParamSchema }),
  profileController.getPaymentHistory,
);

// Download PDF receipt
router.get(
  '/:id/payment-receipt',
  validate({ params: idParamSchema }),
  profileController.downloadPaymentReceipt,
);

// Pay/Record installment payment
router.post(
  '/:id/payments/:paymentId/pay',
  requireRole(Role.ADMIN, Role.TEAM_LEADER),
  profileController.payInstallment,
);

// Unblock/Reactivate payment-blocked client profile
router.post(
  '/:id/unblock-payment',
  requireRole(Role.ADMIN, Role.TEAM_LEADER),
  validate({ params: idParamSchema }),
  profileController.unblockPayment,
);

// Archive client profile
router.post(
  '/:id/archive',
  requireRole(Role.ADMIN),
  validate({ params: idParamSchema }),
  profileController.archiveProfile,
);

// Unarchive/Restore client profile
router.post(
  '/:id/unarchive',
  requireRole(Role.ADMIN),
  validate({ params: idParamSchema }),
  profileController.unarchiveProfile,
);

// Merge client profiles
router.post(
  '/merge',
  requireRole(Role.ADMIN),
  validate({ body: mergeProfilesSchema }),
  profileController.mergeProfiles,
);

// Admin post/update client payment details explicitly
router.post(
  '/:id/post-payment',
  requireRole(Role.ADMIN, Role.TEAM_LEADER),
  validate({ params: idParamSchema }),
  profileController.postPaymentDetails,
);

// Interviews & Rounds Management
router.get(
  '/:id/interviews',
  validate({ params: idParamSchema }),
  profileController.getInterviews,
);
router.post(
  '/:id/interviews',
  requireRole(Role.ADMIN, Role.TEAM_LEADER),
  validate({ params: idParamSchema }),
  profileController.createInterview,
);
router.put(
  '/:id/interviews/:interviewId',
  requireRole(Role.ADMIN, Role.TEAM_LEADER),
  profileController.updateInterview,
);
router.delete(
  '/:id/interviews/:interviewId',
  requireRole(Role.ADMIN, Role.TEAM_LEADER),
  profileController.deleteInterview,
);

export default router;


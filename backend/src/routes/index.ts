import { Router } from 'express';
import authRoutes from '@/modules/auth/auth.routes';
import recruiterRoutes from '@/modules/recruiters/recruiter.routes';
import profileRoutes from '@/modules/profiles/profile.routes';
import applicationRoutes from '@/modules/applications/application.routes';
import analyticsRoutes from '@/modules/analytics/analytics.routes';
import activityRoutes from '@/modules/activity/activity.routes';
import updatesRoutes from '@/modules/updates/updates.routes';
import onboardingRoutes from '@/modules/onboarding/onboarding.routes';
import shiftRoutes from '@/modules/shifts/shift.routes';
import devicesRoutes from '@/modules/devices/devices.routes';
import notificationsRoutes from '@/modules/notifications/notifications.routes';
import attendanceRoutes from '@/modules/attendance/attendance.routes';
import verificationRoutes from '@/modules/verification/verification.routes';
import profileChangesRoutes from '@/modules/profile-changes/profile-changes.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

router.use('/auth', authRoutes);
router.use('/recruiters', recruiterRoutes);
router.use('/profiles', profileRoutes);
router.use('/applications', applicationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/activity', activityRoutes);
router.use('/updates', updatesRoutes);
router.use('/onboarding', onboardingRoutes);

// Companion mobile + shared read-only APIs
router.use('/shifts', shiftRoutes);
router.use('/devices', devicesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/attendance', attendanceRoutes);

// Enterprise Verification v2
router.use('/verifications', verificationRoutes);

// Profile Change Requests (client profile update approvals)
router.use('/profile-changes', profileChangesRoutes);

export default router;

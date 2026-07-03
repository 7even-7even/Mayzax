import { Router } from 'express';
import authRoutes from '@/modules/auth/auth.routes';
import recruiterRoutes from '@/modules/recruiters/recruiter.routes';
import profileRoutes from '@/modules/profiles/profile.routes';
import applicationRoutes from '@/modules/applications/application.routes';
import analyticsRoutes from '@/modules/analytics/analytics.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

router.use('/auth', authRoutes);
router.use('/recruiters', recruiterRoutes);
router.use('/profiles', profileRoutes);
router.use('/applications', applicationRoutes);
router.use('/analytics', analyticsRoutes);

export default router;

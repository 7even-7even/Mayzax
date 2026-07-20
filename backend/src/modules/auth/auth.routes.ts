import { Router } from 'express';
import { validate } from '@/middleware/validate';
import { requireAuth } from '@/middleware/auth';
import { authRateLimiter } from '@/middleware/rateLimiter';
import {
  loginSchema,
  signupSchema,
  changePasswordSchema,
  updateProfileSchema,
  securityQuestionSchema,
  forgotPasswordQuestionSchema,
  forgotPasswordResetSchema,
} from './auth.validation';
import * as authController from './auth.controller';

const router = Router();

router.post('/signup', authRateLimiter, validate({ body: signupSchema }), authController.signup);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password/question', authRateLimiter, validate({ body: forgotPasswordQuestionSchema }), authController.forgotPasswordQuestion);
router.post('/forgot-password/reset', authRateLimiter, validate({ body: forgotPasswordResetSchema }), authController.forgotPasswordReset);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);
router.patch('/profile', requireAuth, validate({ body: updateProfileSchema }), authController.updateProfile);
router.post('/security-question', requireAuth, validate({ body: securityQuestionSchema }), authController.setSecurityQuestion);
router.post('/change-password', requireAuth, validate({ body: changePasswordSchema }), authController.changePassword);

export default router;

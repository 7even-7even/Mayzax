import { Router } from 'express';
import { validate } from '@/middleware/validate';
import { requireAuth } from '@/middleware/auth';
import { authRateLimiter } from '@/middleware/rateLimiter';
import { loginSchema, signupSchema, changePasswordSchema } from './auth.validation';
import * as authController from './auth.controller';

const router = Router();

router.post('/signup', authRateLimiter, validate({ body: signupSchema }), authController.signup);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', authRateLimiter, authController.refresh);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);
router.post('/change-password', requireAuth, validate({ body: changePasswordSchema }), authController.changePassword);

export default router;

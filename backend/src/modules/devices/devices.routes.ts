import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { z } from 'zod';
import * as devicesController from './devices.controller';

const router = Router();
router.use(requireAuth);

const registerDeviceSchema = z.object({
  fcmToken: z.string().min(1),
  platform: z.enum(['ANDROID', 'IOS', 'WEB']),
  deviceName: z.string().optional().nullable(),
  deviceModel: z.string().optional().nullable(),
  appVersion: z.string().optional().nullable(),
  osVersion: z.string().optional().nullable(),
  pushToken: z.string().optional().nullable(),
});

router.post(
  '/register',
  validate({ body: registerDeviceSchema }),
  devicesController.registerDevice,
);

router.get('/', devicesController.listDevices);
router.delete('/:id', devicesController.removeDevice);
router.post('/:id/ping', devicesController.pingDevice);

export default router;

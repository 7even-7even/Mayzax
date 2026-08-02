import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/apiError';
import * as devicesService from './devices.service';

export const registerDevice = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const { fcmToken, platform, deviceName, deviceModel, appVersion, osVersion, pushToken } = req.body;
  const device = await devicesService.registerDevice({
    userId,
    fcmToken,
    platform,
    deviceName: deviceName ?? null,
    deviceModel: deviceModel ?? null,
    appVersion: appVersion ?? null,
    osVersion: osVersion ?? null,
    pushToken: pushToken ?? null,
  });
  res.json({ success: true, data: { id: device.id } });
});

export const listDevices = asyncHandler(async (req: Request, res: Response) => {
  const devices = await devicesService.listDevices(req.user!.sub);
  res.json({ success: true, data: devices });
});

export const removeDevice = asyncHandler(async (req: Request, res: Response) => {
  const removed = await devicesService.removeDevice(req.user!.sub, req.params.id);
  if (!removed) throw ApiError.notFound('Device not found');
  res.json({ success: true, data: { message: 'Device removed' } });
});

export const pingDevice = asyncHandler(async (req: Request, res: Response) => {
  // Optional: update lastSeen; primarily for heartbeat from mobile
  const fcmToken = typeof req.body?.fcmToken === 'string' ? req.body.fcmToken : undefined;
  await devicesService.touchDevice(req.user!.sub, fcmToken);
  res.json({ success: true, data: { ok: true } });
});

import { DevicePlatform } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface RegisterDeviceInput {
  userId: string;
  fcmToken: string;
  platform: DevicePlatform;
  deviceName?: string | null;
  deviceModel?: string | null;
  appVersion?: string | null;
  osVersion?: string | null;
  pushToken?: string | null;
}

export async function registerDevice(input: RegisterDeviceInput) {
  const existing = await prisma.deviceToken.findUnique({ where: { fcmToken: input.fcmToken } });
  if (existing) {
    return prisma.deviceToken.update({
      where: { id: existing.id },
      data: {
        userId: input.userId,
        platform: input.platform,
        deviceName: input.deviceName ?? existing.deviceName,
        deviceModel: input.deviceModel ?? existing.deviceModel,
        appVersion: input.appVersion ?? existing.appVersion,
        osVersion: input.osVersion ?? existing.osVersion,
        pushToken: input.pushToken ?? existing.pushToken,
        lastSeen: new Date(),
      },
    });
  }
  return prisma.deviceToken.create({
    data: {
      userId: input.userId,
      fcmToken: input.fcmToken,
      platform: input.platform,
      deviceName: input.deviceName,
      deviceModel: input.deviceModel,
      appVersion: input.appVersion,
      osVersion: input.osVersion,
      pushToken: input.pushToken,
      lastSeen: new Date(),
    },
  });
}

export async function listDevices(userId: string) {
  return prisma.deviceToken.findMany({
    where: { userId },
    orderBy: { lastSeen: 'desc' },
    select: {
      id: true,
      platform: true,
      deviceName: true,
      deviceModel: true,
      appVersion: true,
      lastSeen: true,
      createdAt: true,
    },
  });
}

export async function removeDevice(userId: string, deviceId: string) {
  const existing = await prisma.deviceToken.findFirst({ where: { id: deviceId, userId } });
  if (!existing) return null;
  await prisma.deviceToken.delete({ where: { id: deviceId } });
  return existing;
}

export async function touchDevice(userId: string, fcmToken?: string) {
  if (!fcmToken) return;
  await prisma.deviceToken.updateMany({
    where: { userId, fcmToken },
    data: { lastSeen: new Date() },
  });
}

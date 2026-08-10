import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as devicesService from '../../../backend/src/modules/devices/devices.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { DevicePlatform } from '@prisma/client';

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    deviceToken: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

describe('Devices - Registration & Management Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DEV-REG-001: Should register a new device token successfully', async () => {
    const input = {
      userId: 'user-123',
      fcmToken: 'fcm-new-token',
      platform: DevicePlatform.IOS,
      deviceName: "John's iPhone",
    };

    (prisma.deviceToken.findUnique as any).mockResolvedValue(null);
    (prisma.deviceToken.create as any).mockResolvedValue({
      id: 'device-id-999',
      fcmToken: 'fcm-new-token',
      deviceName: "John's iPhone",
    });

    const result = await devicesService.registerDevice(input);

    expect(result.deviceName).toBe("John's iPhone");
    expect(prisma.deviceToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-123',
        fcmToken: 'fcm-new-token',
        platform: DevicePlatform.IOS,
        deviceName: "John's iPhone",
      }),
    });
  });

  it('DEV-REG-002: Should update existing token on re-registration', async () => {
    const input = {
      userId: 'user-123',
      fcmToken: 'fcm-existing-token',
      platform: DevicePlatform.IOS,
      deviceName: "John's iPhone Updated",
    };

    (prisma.deviceToken.findUnique as any).mockResolvedValue({
      id: 'existing-id-111',
      fcmToken: 'fcm-existing-token',
      deviceName: "John's iPhone",
    });
    (prisma.deviceToken.update as any).mockResolvedValue({
      id: 'existing-id-111',
      deviceName: "John's iPhone Updated",
    });

    const result = await devicesService.registerDevice(input);

    expect(result.deviceName).toBe("John's iPhone Updated");
    expect(prisma.deviceToken.update).toHaveBeenCalledWith({
      where: { id: 'existing-id-111' },
      data: expect.objectContaining({
        deviceName: "John's iPhone Updated",
      }),
    });
  });

  it('DEV-MGMT-003: Should block deleting a device owned by another user', async () => {
    (prisma.deviceToken.findFirst as any).mockResolvedValue(null);

    const result = await devicesService.removeDevice('user-123', 'other-users-device-uuid');

    expect(result).toBeNull();
    expect(prisma.deviceToken.delete).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as notificationsService from '../../../backend/src/modules/notifications/notifications.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { NotificationType } from '@prisma/client';

// Mock Firebase push
vi.mock('../../../backend/src/lib/firebase', () => ({
  sendPush: vi.fn(),
}));

// Mock BullMQ queue
vi.mock('../../../backend/src/lib/queue', () => ({
  enqueue: vi.fn().mockResolvedValue(undefined),
  Jobs: {
    DispatchNotification: 'DispatchNotification',
  },
}));

// Mock logger
vi.mock('../../../backend/src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    deviceToken: {
      deleteMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

import { sendPush } from '../../../backend/src/lib/firebase';
import { enqueue } from '../../../backend/src/lib/queue';

describe('Notifications - Creation, Dispatch & Read Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('NOTIF-CRE-001: Should create a notification record and enqueue BullMQ dispatch job', async () => {
    (prisma.notification.create as any).mockResolvedValue({
      id: 'notif-uuid-abc',
      userId: 'user-123',
      type: NotificationType.COMPANY_NOTICE,
      title: 'Test Alert',
      body: 'This is a test.',
      readAt: null,
    });

    const result = await notificationsService.createNotification({
      userId: 'user-123',
      type: NotificationType.COMPANY_NOTICE,
      title: 'Test Alert',
      body: 'This is a test.',
    });

    expect(result.id).toBe('notif-uuid-abc');
    expect(prisma.notification.create).toHaveBeenCalled();
    expect(enqueue).toHaveBeenCalledWith('DispatchNotification', { notificationId: 'notif-uuid-abc' }, undefined);
  });

  it('NOTIF-FCM-001: Should dispatch push to all registered device tokens', async () => {
    (prisma.notification.findUnique as any).mockResolvedValue({
      id: 'notif-uuid-abc',
      type: NotificationType.COMPANY_NOTICE,
      title: 'Test',
      body: 'Body',
      data: {},
      readAt: null,
      user: {
        deviceTokens: [
          { id: 'dev-1', fcmToken: 'fcm-token-one' },
          { id: 'dev-2', fcmToken: 'fcm-token-two' },
        ],
      },
    });

    (sendPush as any).mockResolvedValue({ success: true });
    (prisma.notification.update as any).mockResolvedValue({});

    await notificationsService.dispatchNotification('notif-uuid-abc');

    expect(sendPush).toHaveBeenCalledTimes(2);
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-uuid-abc' },
      data: { pushSentAt: expect.any(Date) },
    });
  });

  it('NOTIF-FCM-002: Should skip dispatch if notification is already read', async () => {
    (prisma.notification.findUnique as any).mockResolvedValue({
      id: 'notif-uuid-read',
      readAt: new Date(), // Already read!
      user: { deviceTokens: [{ id: 'dev-1', fcmToken: 'fcm-token-one' }] },
    });

    await notificationsService.dispatchNotification('notif-uuid-read');

    expect(sendPush).not.toHaveBeenCalled();
  });

  it('NOTIF-FCM-003: Should prune invalid FCM tokens after failed push delivery', async () => {
    (prisma.notification.findUnique as any).mockResolvedValue({
      id: 'notif-uuid-abc',
      type: NotificationType.COMPANY_NOTICE,
      title: 'Test',
      body: 'Body',
      data: {},
      readAt: null,
      user: {
        deviceTokens: [
          { id: 'invalid-dev-id', fcmToken: 'stale-fcm-token' },
        ],
      },
    });

    // Firebase rejects this token as invalid
    (sendPush as any).mockResolvedValue({ success: false, invalidToken: true });
    (prisma.notification.update as any).mockResolvedValue({});
    (prisma.deviceToken.deleteMany as any).mockResolvedValue({ count: 1 });

    await notificationsService.dispatchNotification('notif-uuid-abc');

    expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['invalid-dev-id'] } },
    });
  });

  it('NOTIF-READ-001: Should mark a single notification as read', async () => {
    (prisma.notification.updateMany as any).mockResolvedValue({ count: 1 });

    const result = await notificationsService.markRead('user-123', 'notif-uuid-abc');

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'notif-uuid-abc', userId: 'user-123', readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it('NOTIF-READ-002: Should mark all unread notifications as read for the user', async () => {
    (prisma.notification.updateMany as any).mockResolvedValue({ count: 5 });

    await notificationsService.markAllRead('user-123');

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it('NOTIF-FAN-001: Should fan-out company notice to all active users', async () => {
    const activeUsers = [
      { id: 'user-a' },
      { id: 'user-b' },
      { id: 'user-c' },
    ];

    (prisma.user.findMany as any).mockResolvedValue(activeUsers);
    (prisma.notification.create as any).mockResolvedValue({ id: 'some-notif-id' });

    await notificationsService.fanOutNotice('Company Announcement', 'Important update for all staff.');

    // Called once per active user
    expect(prisma.notification.create).toHaveBeenCalledTimes(3);

    // Each call targets COMPANY_NOTICE type
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: NotificationType.COMPANY_NOTICE }),
    });
  });
});

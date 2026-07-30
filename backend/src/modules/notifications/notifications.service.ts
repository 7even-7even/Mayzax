import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendPush } from '@/lib/firebase';
import { enqueue, Jobs } from '@/lib/queue';
import { logger } from '@/lib/logger';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: number;
  pushAfter?: Date; // schedule push at future time
}

export async function createNotification(input: CreateNotificationInput) {
  const record = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: (input.data ?? {}) as Prisma.InputJsonValue,
      priority: input.priority ?? 0,
    },
  });
  // Dispatch push asynchronously via BullMQ (or immediate fallback)
  const delay = input.pushAfter ? Math.max(0, input.pushAfter.getTime() - Date.now()) : 0;
  enqueue(
    Jobs.DispatchNotification,
    { notificationId: record.id },
    delay > 0 ? { delay } : undefined,
  ).catch((err) => {
    logger.error({ err, notificationId: record.id }, 'Failed to enqueue notification dispatch');
  });
  return record;
}

export async function dispatchNotification(notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: { user: { include: { deviceTokens: true } } },
  });
  if (!notification) return;
  if (notification.readAt) return; // user already saw it

  const tokens = notification.user.deviceTokens;
  if (!tokens.length) {
    return;
  }

  const dataStringified: Record<string, string> = {
    notificationId: notification.id,
    type: notification.type,
    ...(notification.data as Record<string, any> ?? {}),
  };
  // Ensure all values are strings (FCM requirement)
  Object.keys(dataStringified).forEach((k) => {
    const v = (dataStringified as any)[k];
    if (typeof v !== 'string') dataStringified[k] = JSON.stringify(v);
  });

  const channelId = channelForType(notification.type);
  const invalidTokenIds: string[] = [];
  const invalidTokens: string[] = [];
  for (const device of tokens) {
    const result = await sendPush({
      token: device.fcmToken,
      title: notification.title,
      body: notification.body,
      data: dataStringified,
      androidChannelId: channelId,
    });
    if (!result.success && result.invalidToken) {
      invalidTokenIds.push(device.id);
      invalidTokens.push(device.fcmToken);
    }
  }

  await prisma.notification.update({
    where: { id: notification.id },
    data: { pushSentAt: new Date() },
  });

  if (invalidTokenIds.length) {
    await prisma.deviceToken.deleteMany({ where: { id: { in: invalidTokenIds } } });
    logger.warn({ count: invalidTokenIds.length, tokens: invalidTokens }, 'Pruned invalid FCM tokens');
  }
}

function channelForType(type: NotificationType): string {
  switch (type) {
    case NotificationType.COMPANY_NOTICE:
      return 'mayzax_announcements';
    case NotificationType.BREAK_EXPIRED:
    case NotificationType.BREAK_2MIN:
    case NotificationType.BREAK_5MIN:
      return 'mayzax_attendance';
    case NotificationType.SHIFT_ENDING_5MIN:
    case NotificationType.SHIFT_ENDING_15MIN:
    case NotificationType.SHIFT_START_REMINDER:
    case NotificationType.ATTENDANCE_REMINDER:
    case NotificationType.PENALTY_NOTICE:
      return 'mayzax_attendance';
    default:
      return 'mayzax_default';
  }
}

export async function listNotifications(userId: string, page: number, pageSize: number) {
  const skip = (page - 1) * pageSize;
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return {
    items,
    unreadCount: unread,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function markRead(userId: string, id: string) {
  return prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

/** Fan out a company notice to all active users as in-app notifications. */
export async function fanOutNotice(title: string, body: string, data?: Record<string, any>) {
  const users = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true },
  });
  for (const u of users) {
    // Best-effort fan-out; don't let one failure break others.
    await createNotification({
      userId: u.id,
      type: NotificationType.COMPANY_NOTICE,
      title,
      body,
      data,
    }).catch((err) => {
      logger.error({ err, userId: u.id }, 'Failed to fan out notice');
    });
  }
}

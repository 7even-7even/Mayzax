import { prisma } from '@/lib/prisma';
import { ApiError } from '@/utils/apiError';
import { UpdatesResponse } from './updates.types';

export async function getUpdatesForUser(userId: string): Promise<UpdatesResponse> {
  const updates = await prisma.systemUpdate.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      readLogs: { where: { userId } },
    },
  });

  let unreadCount = 0;
  const items = updates.map((update) => {
    const isRead = update.readLogs.length > 0;
    if (!isRead) unreadCount++;
    return {
      id: update.id,
      title: update.title,
      version: update.version,
      description: update.description,
      pdfUrl: update.pdfUrl,
      pdfOriginalName: update.pdfOriginalName,
      createdAt: update.createdAt,
      updatedAt: update.updatedAt,
      createdBy: update.createdBy,
      isRead,
    };
  });

  return { unreadCount, updates: items };
}

export async function createUpdate(
  userId: string,
  data: { title: string; version?: string | null; description: string; pdfUrl?: string | null; pdfOriginalName?: string | null },
  file?: Express.Multer.File
) {
  let pdfUrl: string | null = data.pdfUrl ?? null;
  let pdfOriginalName: string | null = data.pdfOriginalName ?? null;

  if (file) {
    pdfUrl = `/uploads/updates/${file.filename}`;
    pdfOriginalName = file.originalname;
  } else if (pdfUrl) {
    if (pdfUrl.includes('drive.google.com') || pdfUrl.includes('docs.google.com')) {
      pdfOriginalName = 'Google Drive Document';
    } else if (!pdfOriginalName) {
      pdfOriginalName = 'Documentation Link';
    }
  }

  const update = await prisma.systemUpdate.create({
    data: {
      title: data.title,
      version: data.version ?? null,
      description: data.description,
      pdfUrl,
      pdfOriginalName,
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  // Creator automatically marks it as read
  await prisma.userUpdateRead.create({
    data: {
      updateId: update.id,
      userId,
    },
  });

  return { ...update, isRead: true };
}

export async function markUpdateAsRead(userId: string, updateId: string) {
  const update = await prisma.systemUpdate.findUnique({ where: { id: updateId } });
  if (!update) throw ApiError.notFound('Update not found');

  await prisma.userUpdateRead.upsert({
    where: { updateId_userId: { updateId, userId } },
    create: { updateId, userId },
    update: { readAt: new Date() },
  });

  return { success: true };
}

export async function deleteUpdate(updateId: string) {
  const update = await prisma.systemUpdate.findUnique({ where: { id: updateId } });
  if (!update) throw ApiError.notFound('Update not found');

  await prisma.systemUpdate.delete({ where: { id: updateId } });
  return { success: true };
}

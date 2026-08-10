import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as updatesService from '../../../backend/src/modules/updates/updates.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { Role } from '@prisma/client';

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    systemUpdate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    userUpdateRead: {
      create: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe('Updates - System Announcements Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UPD-GET-001: Should retrieve scoped system updates and filter by role', async () => {
    const userId = 'user-rec-123';
    const role = Role.RECRUITER;

    (prisma.systemUpdate.findMany as any).mockResolvedValue([
      {
        id: 'update-1',
        title: 'Recruiter Update',
        roles: [Role.RECRUITER],
        readLogs: [],
        createdBy: { id: 'admin-id', name: 'Admin User', email: 'admin@mayzax.com' },
      },
    ]);

    const result = await updatesService.getUpdatesForUser(userId, role);

    expect(result.unreadCount).toBe(1);
    expect(result.updates.length).toBe(1);
    expect(result.updates[0].title).toBe('Recruiter Update');
    expect(prisma.systemUpdate.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { roles: { has: Role.RECRUITER } },
          { roles: { equals: [] } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: expect.any(Object),
    });
  });

  it('UPD-GET-002: Should create update and resolve Google Drive attachment names', async () => {
    const userId = 'admin-id-123';
    const data = {
      title: 'Portal Launch',
      description: 'We have launched the companion app.',
      pdfUrl: 'https://drive.google.com/file/d/123/view',
    };

    (prisma.systemUpdate.create as any).mockResolvedValue({
      id: 'update-uuid-abc',
      title: 'Portal Launch',
      pdfUrl: 'https://drive.google.com/file/d/123/view',
      pdfOriginalName: 'Google Drive Document',
      createdBy: { id: 'admin-id-123' },
    });
    (prisma.userUpdateRead.create as any).mockResolvedValue({});

    const result = await updatesService.createUpdate(userId, data);

    expect(result.pdfOriginalName).toBe('Google Drive Document');
    expect(prisma.systemUpdate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Portal Launch',
        pdfOriginalName: 'Google Drive Document',
      }),
      include: expect.any(Object),
    });
  });

  it('UPD-READ-001: Should mark update as read successfully', async () => {
    const userId = 'user-rec-123';
    const updateId = 'update-uuid-abc';

    (prisma.systemUpdate.findUnique as any).mockResolvedValue({ id: updateId });
    (prisma.userUpdateRead.upsert as any).mockResolvedValue({});

    const result = await updatesService.markUpdateAsRead(userId, updateId);

    expect(result.success).toBe(true);
    expect(prisma.userUpdateRead.upsert).toHaveBeenCalledWith({
      where: { updateId_userId: { updateId, userId } },
      create: { updateId, userId },
      update: expect.any(Object),
    });
  });

  it('UPD-READ-002: Should throw 404 Not Found when marking non-existent update as read', async () => {
    const userId = 'user-rec-123';

    (prisma.systemUpdate.findUnique as any).mockResolvedValue(null);

    await expect(
      updatesService.markUpdateAsRead(userId, 'non-existent-uuid')
    ).rejects.toThrow('Update not found');
  });
});

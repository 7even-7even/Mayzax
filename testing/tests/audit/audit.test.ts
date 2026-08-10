import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeAuditLog } from '../../../backend/src/modules/shared/audit.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { logger } from '../../../backend/src/lib/logger';

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('../../../backend/src/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('Shared - Audit Trails Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AUD-MGMT-001: Should create a new audit log record successfully in DB', async () => {
    const input = {
      userId: 'user-123',
      action: 'RECRUITER_CREATED',
      entity: 'User',
      entityId: 'new-user-id',
      metadata: { role: 'RECRUITER' },
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    };

    (prisma.auditLog.create as any).mockResolvedValue({});

    await writeAuditLog(input);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        action: 'RECRUITER_CREATED',
        entity: 'User',
        entityId: 'new-user-id',
        metadata: { role: 'RECRUITER' },
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      },
    });
  });

  it('AUD-MGMT-002: Should swallow errors when DB insertion throws, logging it instead', async () => {
    const input = {
      action: 'RECRUITER_CREATED',
      entity: 'User',
    };

    const dbError = new Error('Database connection failed');
    (prisma.auditLog.create as any).mockRejectedValue(dbError);

    // Call should resolve successfully (does not throw)
    await expect(writeAuditLog(input)).resolves.not.toThrow();

    // Verify error was logged
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: dbError }),
      'Failed to write audit log'
    );
  });
});

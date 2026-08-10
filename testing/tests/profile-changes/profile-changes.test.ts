import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as profileChangesService from '../../../backend/src/modules/profile-changes/profile-changes.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { Role } from '@prisma/client';

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    clientProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    clientProfileChangeRequest: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    clientPayment: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)), // Mock transaction to run callback immediately
  },
}));

// Mock Audit Log
vi.mock('../../../backend/src/modules/shared/audit.service', () => ({
  writeAuditLog: vi.fn(),
}));

describe('Profile Changes - Submissions & Reviews Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PR-SUB-001: Should submit details change request successfully and sanitize unallowed fields', async () => {
    const actor = { id: 'user-client-123', role: Role.CLIENT };
    const input = {
      changes: {
        candidateName: 'John Candidate Updated',
        phone: '+1999999999',
        currentSalary: '120000', // Unallowed field
      },
    };

    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-client-123',
      clientProfileId: 'profile-uuid-123',
    });

    (prisma.clientProfileChangeRequest.findFirst as any).mockResolvedValue(null);
    (prisma.clientProfileChangeRequest.create as any).mockResolvedValue({
      id: 'request-uuid-abc',
      profileId: 'profile-uuid-123',
      changes: {
        candidateName: 'John Candidate Updated',
        phone: '+1999999999',
      },
    });

    const result = await profileChangesService.submitChangeRequest('profile-uuid-123', input, actor);

    expect(result.id).toBe('request-uuid-abc');
    expect(prisma.clientProfileChangeRequest.create).toHaveBeenCalledWith({
      data: {
        profileId: 'profile-uuid-123',
        requestedById: 'user-client-123',
        changes: {
          candidateName: 'John Candidate Updated',
          phone: '+1999999999',
        },
      },
      include: expect.any(Object),
    });
  });

  it('PR-UPG-001: Should reject plan downgrade request', async () => {
    const actor = { id: 'user-client-123', role: Role.CLIENT };

    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-client-123',
      clientProfileId: 'profile-uuid-123',
    });

    // Current plan is Gold
    (prisma.clientProfile.findUnique as any).mockResolvedValue({
      id: 'profile-uuid-123',
      planSelected: 'Gold',
    });

    await expect(
      profileChangesService.submitPlanUpgradeRequest('profile-uuid-123', 'Basic', actor)
    ).rejects.toThrow('Target plan must be higher than current plan');
  });

  it('PR-UPG-002: Approve plan upgrade generates price difference payment installment', async () => {
    const actor = { id: 'admin-id-123', role: Role.ADMIN };

    // Mock change request to upgrade Basic -> Premium
    (prisma.clientProfileChangeRequest.findUnique as any).mockResolvedValue({
      id: 'request-id-upgrade',
      profileId: 'profile-uuid-123',
      status: 'PENDING',
      changes: {
        _type: 'PLAN_UPGRADE',
        targetPlan: 'Premium',
      },
    });

    // Mock current paid payment of 1500 (Basic plan price)
    (prisma.clientPayment.findMany as any).mockResolvedValue([
      { id: 'payment-1', amount: 1500, status: 'PAID' },
    ]);

    const result = await profileChangesService.approveChangeRequest('request-id-upgrade', actor);

    expect(result.message).toBe('Change request approved and profile updated');

    // Verify upgrade profile data updates
    expect(prisma.clientProfile.update).toHaveBeenCalledWith({
      where: { id: 'profile-uuid-123' },
      data: {
        planSelected: 'Premium',
        amountPaid: 3500,
      },
    });

    // Verify payment created for price difference: 3500 (Premium) - 1500 (Paid) = 2000
    expect(prisma.clientPayment.create).toHaveBeenCalledWith({
      data: {
        profileId: 'profile-uuid-123',
        amount: 2000,
        status: 'PENDING',
        dueDate: expect.any(Date),
        installmentNo: 2,
      },
    });
  });
});

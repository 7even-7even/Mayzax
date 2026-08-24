import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as profileService from '../../../backend/src/modules/profiles/profile.service';
import * as repo from '../../../backend/src/modules/profiles/profile.repository';
import { prisma } from '../../../backend/src/lib/prisma';
import { Role } from '@prisma/client';

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    clientProfile: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock Repository
vi.mock('../../../backend/src/modules/profiles/profile.repository', () => ({
  create: vi.fn(),
  update: vi.fn(),
  findActiveById: vi.fn(),
  replaceRecruiterAssignments: vi.fn(),
  softDelete: vi.fn(),
}));

// Mock Audit Log
vi.mock('../../../backend/src/modules/shared/audit.service', () => ({
  writeAuditLog: vi.fn(),
}));

describe('Profiles - Creation & Management Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PROF-CRE-001: Should allow Admin to create profile successfully', async () => {
    const actor = { id: 'admin-id-123', role: Role.ADMIN };
    const input = {
      candidateName: 'John Candidate',
      email: 'john.candidate@mayzax.com',
      phone: '+1234567890',
      technology: 'React/Node',
      assignedRecruiterId: 'recruiter-uuid-123',
    };

    // Mock assertRecruitersExist check
    (prisma.user.findMany as any).mockResolvedValue([
      { id: 'recruiter-uuid-123', isActive: true },
    ]);

    // Mock duplicate check returns null
    (prisma.clientProfile.findFirst as any).mockResolvedValue(null);

    // Mock DB create
    (repo.create as any).mockResolvedValue({
      id: 'profile-uuid-abc',
      candidateName: 'John Candidate',
      email: 'john.candidate@mayzax.com',
    });

    // Mock User create
    (prisma.user.create as any).mockResolvedValue({
      id: 'user-uuid-xyz',
      name: 'John Candidate',
      email: 'john.candidate@mayzax.com',
    });

    // Mock refreshed profile
    (repo.findActiveById as any).mockResolvedValue({
      id: 'profile-uuid-abc',
      candidateName: 'John Candidate',
      email: 'john.candidate@mayzax.com',
    });

    const result = await profileService.createProfile(input, actor);

    expect(result.candidateName).toBe('John Candidate');
    expect(repo.create).toHaveBeenCalled();
  });

  it('PROF-CRE-002: Should throw 400 Bad Request when duplicate email or phone matches', async () => {
    const actor = { id: 'admin-id-123', role: Role.ADMIN };
    const input = {
      candidateName: 'John Candidate',
      email: 'john.candidate@mayzax.com',
      phone: '+1234567890',
      technology: 'React/Node',
      assignedRecruiterId: 'recruiter-uuid-123',
    };

    (prisma.user.findMany as any).mockResolvedValue([
      { id: 'recruiter-uuid-123', isActive: true },
    ]);

    // Mock duplicate matches
    (prisma.clientProfile.findFirst as any).mockResolvedValue({
      id: 'existing-id-999',
    });

    await expect(
      profileService.createProfile(input, actor)
    ).rejects.toThrow('Existing Client with same Email/Phone Number');
  });

  it('PROF-MGMT-001: Should block recruiter from updating unassigned profile details', async () => {
    const actor = { id: 'recruiter-a', role: Role.RECRUITER };
    const targetProfileId = 'profile-b';

    // Mock profile belongs to recruiter-b
    (repo.findActiveById as any).mockResolvedValue({
      id: 'profile-b',
      assignedRecruiterId: 'recruiter-b',
      assignedRecruiterAssignments: [],
    });

    await expect(
      profileService.updateProfile(targetProfileId, { technology: 'React' }, actor)
    ).rejects.toThrow('You can only edit profiles assigned to you');
  });

  it('PROF-MGMT-002: Should block recruiter from editing candidate name', async () => {
    const actor = { id: 'recruiter-a', role: Role.RECRUITER };
    const targetProfileId = 'profile-a';

    // Mock profile belongs to recruiter-a
    (repo.findActiveById as any).mockResolvedValue({
      id: 'profile-a',
      candidateName: 'Original Name',
      assignedRecruiterId: 'recruiter-a',
      assignedRecruiterAssignments: [],
    });

    await expect(
      profileService.updateProfile(targetProfileId, { candidateName: 'Hacked Name' }, actor)
    ).rejects.toThrow('Recruiters are not allowed to edit candidate name');
  });

  it('PROF-DEL-001: Should soft-delete corresponding client user when profile is deleted', async () => {
    const actor = { id: 'admin-id-123', role: Role.ADMIN };
    const profileId = 'profile-abc-123';

    (repo.findActiveById as any).mockResolvedValue({
      id: profileId,
      candidateName: 'John Candidate',
    });

    (prisma.user.findFirst as any).mockResolvedValue({
      id: 'client-user-xyz',
      role: Role.CLIENT,
      clientProfileId: profileId,
    });

    await profileService.deleteProfile(profileId, actor);

    expect(repo.softDelete).toHaveBeenCalledWith(profileId);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'client-user-xyz' },
      data: {
        deletedAt: expect.any(Date),
        isActive: false,
      },
    });
  });
});

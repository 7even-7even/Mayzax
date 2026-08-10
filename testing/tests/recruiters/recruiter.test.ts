import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as recruiterService from '../../../backend/src/modules/recruiters/recruiter.service';
import * as repo from '../../../backend/src/modules/recruiters/recruiter.repository';
import { prisma } from '../../../backend/src/lib/prisma';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    user: {
      updateMany: vi.fn(),
    },
    clientProfile: {
      updateMany: vi.fn(),
    },
    clientProfileAssignment: {
      deleteMany: vi.fn(),
    },
  },
}));

// Mock Audit service
vi.mock('../../../backend/src/modules/shared/audit.service', () => ({
  writeAuditLog: vi.fn(),
}));

// Mock Recruiter Repository
vi.mock('../../../backend/src/modules/recruiters/recruiter.repository', () => ({
  findByEmail: vi.fn(),
  createUser: vi.fn(),
  findActiveById: vi.fn(),
  updateUser: vi.fn(),
  setActiveStatus: vi.fn(),
  softDeleteUser: vi.fn(),
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
  },
  hash: vi.fn().mockResolvedValue('hashed_password'),
}));

describe('Recruiter Management Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('REC-MGMT-001: Should allow Admin to create recruiter successfully', async () => {
    const actor = { id: 'admin-id', role: Role.ADMIN };
    const input = {
      name: 'Jane Doe',
      email: 'jane.doe@mayzax.com',
      password: 'Password123!',
      role: Role.RECRUITER,
    };

    (repo.findByEmail as any).mockResolvedValue(null);
    (repo.createUser as any).mockResolvedValue({
      id: 'recruiter-id-123',
      name: 'Jane Doe',
      email: 'jane.doe@mayzax.com',
      role: Role.RECRUITER,
      isActive: true,
    });

    const result = await recruiterService.createRecruiter(input, actor);

    expect(result).toBeDefined();
    expect(result.email).toBe('jane.doe@mayzax.com');
    expect(repo.createUser).toHaveBeenCalled();
  });

  it('REC-MGMT-003: Should block Admin from deactivating own account', async () => {
    const actor = { id: 'admin-id', role: Role.ADMIN };
    const selfUser = { id: 'admin-id', role: Role.ADMIN };

    (repo.findActiveById as any).mockResolvedValue(selfUser);

    await expect(
      recruiterService.setRecruiterActiveStatus('admin-id', false, actor)
    ).rejects.toThrow('You cannot deactivate your own account');
  });

  it('REC-MGMT-004: Recruiter role demotion handles team cleanups', async () => {
    const actor = { id: 'admin-id', role: Role.ADMIN };
    const targetTL = { id: 'tl-id', role: Role.TEAM_LEADER, email: 'tl@mayzax.com' };

    (repo.findActiveById as any).mockResolvedValue(targetTL);
    (prisma.user.updateMany as any).mockResolvedValue({});
    (repo.updateUser as any).mockResolvedValue({
      id: 'tl-id',
      role: Role.RECRUITER,
      email: 'tl@mayzax.com',
    });

    const result = await recruiterService.updateRecruiter('tl-id', { role: Role.RECRUITER }, actor);

    expect(result.role).toBe(Role.RECRUITER);
    // Verify team recruiters are unassigned
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { createdById: 'tl-id' },
      data: { createdById: null },
    });
  });

  it('REC-MGMT-005: Soft delete recruiter cleanups assignments', async () => {
    const actor = { id: 'admin-id', role: Role.ADMIN };
    const targetRecruiter = { id: 'rec-123', role: Role.RECRUITER, email: 'rec@mayzax.com' };

    (repo.findActiveById as any).mockResolvedValue(targetRecruiter);
    (repo.softDeleteUser as any).mockResolvedValue({});
    (prisma.clientProfile.updateMany as any).mockResolvedValue({});
    (prisma.clientProfileAssignment.deleteMany as any).mockResolvedValue({});

    const result = await recruiterService.softDeleteRecruiter('rec-123', actor);

    expect(result.message).toBe('Recruiter deleted successfully');
    expect(repo.softDeleteUser).toHaveBeenCalledWith('rec-123');
    // Verify profile cleanup
    expect(prisma.clientProfile.updateMany).toHaveBeenCalledWith({
      where: { assignedRecruiterId: 'rec-123' },
      data: { assignedRecruiterId: null },
    });
  });

  it('REC-MGMT-006: Should allow Admin to update recruiter details successfully', async () => {
    const actor = { id: 'admin-id', role: Role.ADMIN };
    const targetRecruiter = { id: 'rec-123', role: Role.RECRUITER, email: 'rec@mayzax.com' };

    (repo.findActiveById as any).mockResolvedValue(targetRecruiter);
    (repo.findByEmail as any).mockResolvedValue(null);
    (repo.updateUser as any).mockResolvedValue({
      id: 'rec-123',
      name: 'Jane Smith',
      email: 'jane.smith@mayzax.com',
    });

    const result = await recruiterService.updateRecruiter(
      'rec-123',
      { name: 'Jane Smith', email: 'jane.smith@mayzax.com' },
      actor
    );

    expect(result.name).toBe('Jane Smith');
    expect(result.email).toBe('jane.smith@mayzax.com');
  });

  it('REC-MGMT-008: Team Leader blocked viewing stats of unmanaged recruiter', async () => {
    const tlActor = { id: 'tl-a-id', role: Role.TEAM_LEADER };
    const targetUser = { id: 'rec-b-id', role: Role.RECRUITER, createdById: 'tl-b-id' };

    (repo.findActiveById as any).mockResolvedValue(targetUser);

    await expect(
      recruiterService.getRecruiterStats('rec-b-id', tlActor)
    ).rejects.toThrow('You can only view stats for recruiters managed by your team');
  });
});

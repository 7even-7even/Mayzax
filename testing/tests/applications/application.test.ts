import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as applicationService from '../../../backend/src/modules/applications/application.service';
import * as repo from '../../../backend/src/modules/applications/application.repository';
import { prisma } from '../../../backend/src/lib/prisma';
import { Role } from '@prisma/client';

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    clientProfile: {
      findFirst: vi.fn(),
    },
    verificationLog: {
      findUnique: vi.fn(),
    },
    jobApplication: {
      create: vi.fn(),
    },
  },
}));

// Mock Repository
vi.mock('../../../backend/src/modules/applications/application.repository', () => ({
  findByProfileAndNormalizedLink: vi.fn(),
  create: vi.fn(),
}));

// Mock Audit Log
vi.mock('../../../backend/src/modules/shared/audit.service', () => ({
  writeAuditLog: vi.fn(),
}));

describe('Applications - Submission Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('APP-SUB-001: Should create a new application and normalize link successfully', async () => {
    const actor = { id: 'recruiter-id-123', role: Role.RECRUITER };
    const input = {
      profileId: 'profile-uuid-123',
      jobLink: 'https://www.linkedin.com/jobs/view/12345/?refId=abc&trackingId=xyz',
      companyName: 'Tech Corp',
      jobTitle: 'Node Developer',
      applicationCompleted: true as const,
    };

    // Mock client profile verification
    (prisma.clientProfile.findFirst as any).mockResolvedValue({
      id: 'profile-uuid-123',
      candidateName: 'Jane Candidate',
    });

    // Mock duplicate check returns null
    (repo.findByProfileAndNormalizedLink as any).mockResolvedValue(null);

    // Mock DB creation
    (repo.create as any).mockResolvedValue({
      id: 'app-id-789',
      profileId: 'profile-uuid-123',
      normalizedJobLink: 'linkedin.com/jobs/view/12345',
      companyName: 'Tech Corp',
      jobTitle: 'Node Developer',
      jobPortal: 'LINKEDIN',
    });

    const result = await applicationService.createApplication(input, actor);

    expect(result.normalizedJobLink).toBe('linkedin.com/jobs/view/12345');
    expect(result.jobPortal).toBe('LINKEDIN');
    expect(repo.create).toHaveBeenCalled();
  });

  it('APP-SUB-002: Should throw 409 Conflict when submitting duplicate application', async () => {
    const actor = { id: 'recruiter-id-123', role: Role.RECRUITER };
    const input = {
      profileId: 'profile-uuid-123',
      jobLink: 'https://www.linkedin.com/jobs/view/12345',
      companyName: 'Tech Corp',
      jobTitle: 'Node Developer',
      applicationCompleted: true as const,
    };

    (prisma.clientProfile.findFirst as any).mockResolvedValue({
      id: 'profile-uuid-123',
      candidateName: 'Jane Candidate',
    });

    // Mock duplicate exists
    (repo.findByProfileAndNormalizedLink as any).mockResolvedValue({
      id: 'existing-app-id',
      recruiter: { id: 'rec-1', name: 'Other Recruiter', email: 'other@mayzax.com' },
    });

    await expect(
      applicationService.createApplication(input, actor)
    ).rejects.toThrow(/already applied/);
  });
});

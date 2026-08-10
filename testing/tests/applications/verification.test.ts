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

// Mock env config
vi.mock('../../../backend/src/config/env', () => ({
  env: {
    VERIFICATION_HASH_TTL_MS: 900000,
    REQUIRE_HASH_FOR_VERIFIED: false,
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

describe('Applications - Extension Verification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockHash = 'a'.repeat(64); // 64 character hex hash

  it('APP-VER-002: Should throw 400 Bad Request when verification hash is expired (TTL check)', async () => {
    const actor = { id: 'recruiter-id-123', role: Role.RECRUITER };
    const input = {
      profileId: 'profile-uuid-123',
      jobLink: 'https://linkedin.com/jobs/view/12345',
      verificationHash: mockHash,
      applicationCompleted: true as const,
    };

    (prisma.clientProfile.findFirst as any).mockResolvedValue({
      id: 'profile-uuid-123',
      candidateName: 'Jane Candidate',
    });

    (repo.findByProfileAndNormalizedLink as any).mockResolvedValue(null);

    // Mock expired verification log (created 20 mins ago, TTL = 15 mins)
    (prisma.verificationLog.findUnique as any).mockResolvedValue({
      verificationHash: mockHash,
      recruiterId: 'recruiter-id-123',
      createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago
      normalizedJobLink: 'linkedin.com/jobs/view/12345',
      confidence: 'HIGH',
      score: 90,
      isReplay: false,
    });

    await expect(
      applicationService.createApplication(input, actor)
    ).rejects.toThrow(/Verification hash expired/);
  });

  it('APP-VER-003: Should throw 400 Bad Request when verification hash is already used (Replay Protection)', async () => {
    const actor = { id: 'recruiter-id-123', role: Role.RECRUITER };
    const input = {
      profileId: 'profile-uuid-123',
      jobLink: 'https://linkedin.com/jobs/view/12345',
      verificationHash: mockHash,
      applicationCompleted: true as const,
    };

    (prisma.clientProfile.findFirst as any).mockResolvedValue({
      id: 'profile-uuid-123',
      candidateName: 'Jane Candidate',
    });

    (repo.findByProfileAndNormalizedLink as any).mockResolvedValue(null);

    // Mock replayed/already used log
    (prisma.verificationLog.findUnique as any).mockResolvedValue({
      verificationHash: mockHash,
      recruiterId: 'recruiter-id-123',
      createdAt: new Date(),
      normalizedJobLink: 'linkedin.com/jobs/view/12345',
      confidence: 'HIGH',
      score: 90,
      isReplay: true, // Already used!
    });

    await expect(
      applicationService.createApplication(input, actor)
    ).rejects.toThrow(/possible replay attack/);
  });
});

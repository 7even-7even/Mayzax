import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as verificationService from '../../../backend/src/modules/verification/verification.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { Role, JobPortal } from '@prisma/client';

// Mock env config BEFORE everything else
vi.mock('../../../backend/src/config/env', () => ({
  env: {
    VERIFICATION_TIMESTAMP_TOLERANCE_MS: 900000,
    MIN_EXTENSION_VERSION: '1.0.0',
    VERIFICATION_HMAC_SECRET: 'test-secret-key-32chars-minimum-ok',
    VERIFICATION_THRESHOLD: 40,
  },
}));

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    verificationLog: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Verifications - Evidence Verification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEvidence = {
    hostname: 'linkedin.com',
    pathname: '/jobs/view/12345',
    fullUrl: 'https://www.linkedin.com/jobs/view/12345',
    portal: 'LINKEDIN',
    verificationTimestamp: Date.now(),
    applicationReference: 'REF-999-ABC',
    htmlContent: '<html><body>Your application has been submitted successfully</body></html>',
    evidenceVersion: '2.0',
    https: true,
    title: 'Successful Application',
    headings: ['Application Submitted'],
    confirmationText: 'Your application has been submitted',
    historyManipulationDetected: false,
    extra: {},
  };

  it('VER-SUB-001: Should successfully verify valid evidence and generate verification details', async () => {
    const requester = { id: 'recruiter-id-123', role: Role.RECRUITER };
    const input = {
      evidence: mockEvidence,
    };

    (prisma.verificationLog.findUnique as any).mockResolvedValue(null);
    (prisma.verificationLog.findFirst as any).mockResolvedValue(null);
    (prisma.verificationLog.create as any).mockResolvedValue({});

    const result = await verificationService.verifyEvidence(input, requester);

    expect(result.verified).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.verificationHash).toBeDefined();
    expect(result.verificationHash.length).toBe(64); // SHA-256 length
    expect(prisma.verificationLog.create).toHaveBeenCalled();
  });

  it('VER-REP-001: Re-submitting identical evidence by same recruiter returns isReplay true', async () => {
    const requester = { id: 'recruiter-id-123', role: Role.RECRUITER };
    const input = {
      evidence: mockEvidence,
    };

    // Mock existing identical verification log in DB
    (prisma.verificationLog.findUnique as any).mockResolvedValue({
      id: 'existing-log-id',
      recruiterId: 'recruiter-id-123',
      confidence: 'HIGH',
      score: 95,
      portal: JobPortal.LINKEDIN,
      reference: 'REF-999-ABC',
      isReplay: false,
      fraudSignals: [],
    });

    const result = await verificationService.verifyEvidence(input, requester);

    expect(result.isReplay).toBe(true);
    expect(result.score).toBe(95);
    expect(result.fraudSignals).toContain('REPLAY_DETECTED');
    expect(prisma.verificationLog.create).not.toHaveBeenCalled();
  });

  it('VER-REP-002: Flag duplicate application reference codes submitted by different recruiters', async () => {
    const requester = { id: 'recruiter-b-id', role: Role.RECRUITER };
    const input = {
      evidence: mockEvidence,
    };

    (prisma.verificationLog.findUnique as any).mockResolvedValue(null);
    (prisma.verificationLog.create as any).mockResolvedValue({});

    // Mock existing log with SAME reference code but DIFFERENT recruiter
    (prisma.verificationLog.findFirst as any).mockResolvedValue({
      id: 'other-log-id',
      recruiterId: 'recruiter-a-id',
      reference: 'REF-999-ABC',
    });

    const result = await verificationService.verifyEvidence(input, requester);

    expect(result.fraudSignals).toContain('DUPLICATE_REFERENCE_DIFFERENT_RECRUITER');
  });
});

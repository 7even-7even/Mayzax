import { describe, it, expect } from 'vitest';
import { canonicalizeEvidence } from '../hashing/canonicalize';
import { generateVerificationHash, verifyHash, isValidHashFormat } from '../hashing/hash.service';
import { VerificationEvidence } from '../types/verification.types';
import { JobPortal } from '@prisma/client';

const mockEvidence: VerificationEvidence = {
  portal: 'GREENHOUSE' as JobPortal,
  hostname: 'boards.greenhouse.io',
  pathname: '/company/jobs/123/confirmation',
  fullUrl: 'https://boards.greenhouse.io/company/jobs/123/confirmation?gh_jid=456',
  normalizedUrl: 'boards.greenhouse.io/company/jobs/123/confirmation?gh_jid=456',
  title: 'Application Submitted',
  headings: ['Application Submitted', 'Thank you for applying'],
  confirmationText: 'Your application for Software Engineer has been submitted. Reference APP-123',
  applicationReference: 'APP-123',
  detectedButtons: [],
  domFingerprint: {
    hasConfirmationCard: true,
    hasSuccessBanner: true,
    expectedContainersFound: 2,
    unexpectedApplyButtonPresent: false,
  },
  verificationTimestamp: Date.now(),
  extensionVersion: '2.0.0',
  https: true,
};

describe('canonicalizeEvidence', () => {
  it('should produce deterministic JSON', () => {
    const c1 = canonicalizeEvidence(mockEvidence);
    const c2 = canonicalizeEvidence(mockEvidence);
    expect(c1).toBe(c2);
  });

  it('should normalize casing and whitespace', () => {
    const ev1 = { ...mockEvidence, hostname: 'Boards.Greenhouse.IO', title: '  Application   Submitted  ' };
    const ev2 = { ...mockEvidence, hostname: 'boards.greenhouse.io', title: 'application submitted' };
    const c1 = canonicalizeEvidence(ev1 as VerificationEvidence);
    const c2 = canonicalizeEvidence(ev2 as VerificationEvidence);
    expect(c1).toBe(c2);
  });

  it('should sort headings', () => {
    const ev1 = { ...mockEvidence, headings: ['Thank you', 'Application Submitted'] };
    const ev2 = { ...mockEvidence, headings: ['Application Submitted', 'Thank you'] };
    expect(canonicalizeEvidence(ev1 as any)).toBe(canonicalizeEvidence(ev2 as any));
  });
});

describe('generateVerificationHash', () => {
  it('should generate valid hex 64 char hash', () => {
    const canonical = canonicalizeEvidence(mockEvidence);
    const hash = generateVerificationHash(canonical, 'test-secret-min-16-chars-long');
    expect(isValidHashFormat(hash)).toBe(true);
    expect(hash.length).toBe(64);
  });

  it('should be deterministic with same secret', () => {
    const canonical = canonicalizeEvidence(mockEvidence);
    const secret = 'deterministic-secret-32-chars-long';
    const h1 = generateVerificationHash(canonical, secret);
    const h2 = generateVerificationHash(canonical, secret);
    expect(h1).toBe(h2);
  });

  it('should differ with different secrets', () => {
    const canonical = canonicalizeEvidence(mockEvidence);
    const h1 = generateVerificationHash(canonical, 'secret-one-32-chars-long-test-1');
    const h2 = generateVerificationHash(canonical, 'secret-two-32-chars-long-test-2');
    expect(h1).not.toBe(h2);
  });

  it('verifyHash should validate correctly', () => {
    const secret = 'verify-test-secret-32-chars-long';
    const canonical = canonicalizeEvidence(mockEvidence);
    const hash = generateVerificationHash(canonical, secret);
    expect(verifyHash(mockEvidence, hash, secret)).toBe(true);
    expect(verifyHash(mockEvidence, hash, 'wrong-secret-32-chars-long--')).toBe(false);
  });
});

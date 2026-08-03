import { describe, it, expect } from 'vitest';
import { VerificationScorer } from '../scoring/scorer.service';
import { VerificationEvidence } from '../types/verification.types';
import { JobPortal } from '@prisma/client';

function makeEvidence(overrides: Partial<VerificationEvidence> = {}): VerificationEvidence {
  return {
    portal: 'GREENHOUSE' as JobPortal,
    hostname: 'boards.greenhouse.io',
    pathname: '/company/jobs/123/confirmation',
    fullUrl: 'https://boards.greenhouse.io/company/jobs/123/confirmation',
    normalizedUrl: 'boards.greenhouse.io/company/jobs/123/confirmation',
    title: 'Application Submitted',
    headings: ['Application Submitted', 'Thank you for applying'],
    confirmationText: 'Your application for Engineer has been submitted. Reference APP-123. Thank you for applying.',
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
    ...overrides,
  } as VerificationEvidence;
}

describe('VerificationScorer', () => {
  const scorer = new VerificationScorer();

  it('should score high for valid greenhouse evidence', () => {
    const evidence = makeEvidence();
    const result = scorer.score(evidence);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('should reject insecure http', () => {
    const evidence = makeEvidence({ https: false } as any);
    const result = scorer.score(evidence);
    expect(result.score).toBe(0);
    expect(result.fraudSignals).toContain('UNSUPPORTED_DOMAIN_OR_INSECURE');
  });

  it('should reject blocked hostname', () => {
    const evidence = makeEvidence({ hostname: '127.0.0.1' } as any);
    const result = scorer.score(evidence);
    expect(result.score).toBe(0);
  });

  it('should penalize apply button still visible', () => {
    const evidence = makeEvidence({
      detectedButtons: [{ text: 'Apply', disabled: false, visible: true }],
    } as any);
    const result = scorer.score(evidence);
    expect(result.fraudSignals).toContain('APPLY_BUTTON_STILL_ENABLED');
    // Base 100 minus 15 penalty = 85, allow <=90
    expect(result.score).toBeLessThanOrEqual(90);
    expect(result.score).toBeLessThan(100);
  });

  it('should detect history manipulation', () => {
    const evidence = makeEvidence({ historyManipulationDetected: true } as any);
    const result = scorer.score(evidence);
    expect(result.fraudSignals).toContain('HISTORY_MANIPULATION_DETECTED');
  });

  it('should penalize short time on page', () => {
    const evidence = makeEvidence({ timeOnPageMs: 1000 } as any);
    const result = scorer.score(evidence);
    expect(result.fraudSignals).toContain('SHORT_TIME_ON_PAGE');
  });

  it('should handle missing headings', () => {
    const evidence = makeEvidence({ headings: [], confirmationText: 'some random text' } as any);
    const result = scorer.score(evidence);
    expect(result.score).toBeLessThan(80);
  });

  it('should cap generic portal at 60 without strong evidence', () => {
    const evidence = makeEvidence({
      portal: 'OTHER' as JobPortal,
      hostname: 'example.com',
      pathname: '/careers/apply',
      applicationReference: null,
      domFingerprint: {
        hasConfirmationCard: false,
        hasSuccessBanner: false,
        expectedContainersFound: 0,
        unexpectedApplyButtonPresent: false,
      },
    } as any);
    const result = scorer.score(evidence);
    // Should be capped
    expect(result.score).toBeLessThanOrEqual(60);
  });
});

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

  it('should penalize apply button still visible — very weak signal per v1.1', () => {
    const evidence = makeEvidence({
      detectedButtons: [{ text: 'Apply', disabled: false, visible: true }],
    } as any);
    const result = scorer.score(evidence);
    // v1.1: Apply button is very weak signal, many positives outweigh -> neutralized
    const allText = [...result.reasons, ...(result.neutralEvidence || []), ...(result.weakNegativeEvidence || []), ...(result.positiveEvidence || [])].join(' ');
    expect(allText).toMatch(/Apply button/i);
    expect(result.fraudSignals).toContain('APPLY_BUTTON_STILL_VISIBLE_WEAK');
    // Score should remain high (>=85) to avoid false negatives, not heavily penalized (-2 only)
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.score).toBeLessThanOrEqual(100);

    // Test with low positive signals — should still be weak penalty
    const lowEvidence = makeEvidence({
      title: 'Random Page',
      headings: [],
      confirmationText: '',
      applicationReference: null,
      hostname: 'example.com',
      pathname: '/random',
      detectedButtons: [{ text: 'Apply', disabled: false, visible: true }],
      domFingerprint: {
        hasConfirmationCard: false,
        hasSuccessBanner: false,
        expectedContainersFound: 0,
        unexpectedApplyButtonPresent: true,
      },
    } as any);
    const lowResult = scorer.score(lowEvidence);
    expect(lowResult.fraudSignals).toContain('APPLY_BUTTON_STILL_VISIBLE_WEAK');
    expect(lowResult.score).toBeLessThanOrEqual(5);
  });

  it('should detect history manipulation — kept as fraud indicator', () => {
    const evidence = makeEvidence({ historyManipulationDetected: true } as any);
    const result = scorer.score(evidence);
    expect(result.fraudSignals).toContain('HISTORY_MANIPULATION_DETECTED');
  });

  it('should handle short time on page — minimal influence per v1.1', () => {
    const evidence = makeEvidence({ timeOnPageMs: 1000 } as any);
    const result = scorer.score(evidence);
    // v1.1: Short time is minimal influence, not strong fraudSignal
    // For 1000ms, should be weak negative, not SHORT_TIME_ON_PAGE
    expect(result.score).toBeGreaterThanOrEqual(80); // Should still be high
    // Very short time <500ms should be flagged as VERY_SHORT
    const veryShort = makeEvidence({ timeOnPageMs: 400 } as any);
    const veryShortResult = scorer.score(veryShort);
    expect(veryShortResult.fraudSignals).toContain('VERY_SHORT_TIME_ON_PAGE');
  });

  it('should handle missing headings — zero impact per v1.1 (reduce false negatives)', () => {
    const evidence = makeEvidence({ headings: [], confirmationText: 'Your application has been submitted. Thank you for applying.' } as any);
    const result = scorer.score(evidence);
    // v1.1: Missing heading = 0 impact, not large negative — should still score high if other evidence present
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.positiveEvidence?.length).toBeGreaterThan(0);
  });

  it('should cap generic portal at 90 without strong evidence (increased from 60 per v1.1)', () => {
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
    // v1.1: Generic cap increased to 90 for smarter generic plugin
    expect(result.score).toBeLessThanOrEqual(90);
  });
});

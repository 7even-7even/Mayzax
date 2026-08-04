import { describe, it, expect } from 'vitest';
import { EvidenceValidator } from '../evidence/evidence.validator';
import { JobPortal } from '@prisma/client';

function makeEvidence(overrides: any = {}) {
  return {
    portal: 'GREENHOUSE',
    hostname: 'boards.greenhouse.io',
    pathname: '/company/jobs/123/confirmation',
    fullUrl: 'https://boards.greenhouse.io/company/jobs/123/confirmation',
    normalizedUrl: 'boards.greenhouse.io/company/jobs/123/confirmation',
    title: 'Application Submitted',
    headings: ['Application Submitted'],
    confirmationText: 'Your application has been submitted',
    applicationReference: null,
    detectedButtons: [],
    domFingerprint: {
      hasConfirmationCard: true,
      hasSuccessBanner: false,
      expectedContainersFound: 1,
      unexpectedApplyButtonPresent: false,
    },
    verificationTimestamp: Date.now(),
    extensionVersion: '2.0.0',
    https: true,
    ...overrides,
  };
}

describe('EvidenceValidator', () => {
  const validator = new EvidenceValidator();

  it('should validate correct evidence', () => {
    const ev = makeEvidence();
    const result = validator.validate(ev);
    expect(result.valid).toBe(true);
  });

  it('should reject http', () => {
    const ev = makeEvidence({ https: false, fullUrl: 'http://boards.greenhouse.io/confirmation' });
    const result = validator.validate(ev);
    expect(result.valid).toBe(false);
    expect(result.fraudSignals).toContain('INSECURE_PROTOCOL');
  });

  it('should reject blocked hostname', () => {
    const ev = makeEvidence({ hostname: '127.0.0.1', fullUrl: 'https://127.0.0.1/confirmation' });
    const result = validator.validate(ev);
    expect(result.valid).toBe(false);
  });

  it('should reject stale timestamp', () => {
    const ev = makeEvidence({ verificationTimestamp: Date.now() - 10 * 60 * 1000 }); // 10min ago
    const result = validator.validate(ev);
    expect(result.valid).toBe(false);
    expect(result.fraudSignals).toContain('STALE_TIMESTAMP');
  });

  it('should flag future timestamp', () => {
    const ev = makeEvidence({ verificationTimestamp: Date.now() + 10 * 60 * 1000 });
    const result = validator.validate(ev);
    expect(result.fraudSignals).toContain('FUTURE_TIMESTAMP');
  });

  it('should flag hostname mismatch', () => {
    const ev = makeEvidence({ hostname: 'boards.greenhouse.io', fullUrl: 'https://jobs.lever.co/confirmation' });
    const result = validator.validate(ev);
    expect(result.fraudSignals).toContain('HOSTNAME_MISMATCH');
  });

  it('should reject empty evidence', () => {
    const ev = makeEvidence({ title: '', headings: [], confirmationText: '' });
    const result = validator.validate(ev);
    expect(result.valid).toBe(false);
    expect(result.fraudSignals).toContain('EMPTY_EVIDENCE');
  });
});

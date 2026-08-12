import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VerificationEngine } from '../../../extension/src/verification/engine/VerificationEngine';
import { SubmissionEvidence } from '../../../extension/src/verification/types';

// Mock env config
vi.mock('../../../backend/src/config/env', () => ({
  env: {
    VERIFICATION_TIMESTAMP_TOLERANCE_MS: 900000,
    MIN_EXTENSION_VERSION: '1.0.0',
    VERIFICATION_HMAC_SECRET: 'test-secret-key-32chars-minimum-ok',
  },
}));

// Mock browser / chrome globals
const chromeMock = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
    onMessageExternal: { addListener: vi.fn() },
    onStartup: { addListener: vi.fn() },
    onInstalled: { addListener: vi.fn() }
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(true),
      remove: vi.fn().mockResolvedValue(true)
    }
  }
};
vi.stubGlobal('chrome', chromeMock);

// Stub JSDOM-like elements if needed
const documentMock = {
  title: 'Job Application Page',
  documentElement: { lang: 'en' },
  referrer: '',
  querySelectorAll: vi.fn().mockReturnValue([]),
  querySelector: vi.fn().mockReturnValue(null),
} as unknown as Document;

describe('Post-Submission Verification Engine Tests', () => {
  let engine: VerificationEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new VerificationEngine();
  });

  const hasReason = (reasons: string[], substring: string) => {
    return reasons.some(r => r.includes(substring));
  };

  it('Test 1 — Temporary success toast', async () => {
    const evidence: SubmissionEvidence = {
      submitDetected: true,
      requestObserved: true,
      responseObserved: true,
      confirmationDetected: true,
      confirmationText: 'Application submitted successfully',
      formResetDetected: true,
      dashboardDetected: false,
      newApplicationDetected: false,
      updatedApplicationDetected: false,
      timestamp: Date.now()
    };

    const result = await engine.verify(documentMock, 'https://example.com/apply', '1.1.0', evidence);
    
    expect(result.verified).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(hasReason(result.reasons, 'Post-submission success message/toast observed')).toBe(true);
    expect(hasReason(result.reasons, 'Post-submission form reset detected')).toBe(true);
  });

  it('Test 2 — No success UI, successful network response', async () => {
    const evidence: SubmissionEvidence = {
      submitDetected: true,
      requestObserved: true,
      responseObserved: true,
      responseStatus: 200,
      confirmationDetected: false,
      formResetDetected: true,
      dashboardDetected: false,
      newApplicationDetected: false,
      updatedApplicationDetected: false,
      timestamp: Date.now()
    };

    const result = await engine.verify(documentMock, 'https://example.com/apply', '1.1.0', evidence);

    expect(result.verified).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(hasReason(result.reasons, 'Successful post-submission network response observed')).toBe(true);
    expect(hasReason(result.reasons, 'Post-submission form reset detected')).toBe(true);
  });

  it('Test 3 — Dashboard redirect + new application', async () => {
    const evidence: SubmissionEvidence = {
      submitDetected: true,
      requestObserved: true,
      responseObserved: true,
      redirectDetected: true,
      redirectUrl: 'https://example.com/dashboard',
      confirmationDetected: false,
      formResetDetected: false,
      dashboardDetected: true,
      newApplicationDetected: true,
      updatedApplicationDetected: false,
      timestamp: Date.now()
    };

    const result = await engine.verify(documentMock, 'https://example.com/apply', '1.1.0', evidence);

    expect(result.verified).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(hasReason(result.reasons, 'Post-submission dashboard application matched')).toBe(true);
  });

  it('Test 4 — Dashboard redirect + existing application updated', async () => {
    const evidence: SubmissionEvidence = {
      submitDetected: true,
      requestObserved: true,
      responseObserved: true,
      redirectDetected: true,
      redirectUrl: 'https://example.com/dashboard',
      confirmationDetected: false,
      formResetDetected: false,
      dashboardDetected: true,
      newApplicationDetected: false,
      updatedApplicationDetected: true,
      timestamp: Date.now()
    };

    const result = await engine.verify(documentMock, 'https://example.com/apply', '1.1.0', evidence);

    expect(result.verified).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(hasReason(result.reasons, 'Post-submission dashboard application matched')).toBe(true);
  });

  it('Test 5 — Dashboard redirect but no matching application', async () => {
    const evidence: SubmissionEvidence = {
      submitDetected: true,
      requestObserved: true,
      responseObserved: true,
      redirectDetected: true,
      redirectUrl: 'https://example.com/dashboard',
      confirmationDetected: false,
      formResetDetected: false,
      dashboardDetected: true,
      newApplicationDetected: false,
      updatedApplicationDetected: false,
      timestamp: Date.now()
    };

    const result = await engine.verify(documentMock, 'https://example.com/apply', '1.1.0', evidence);

    // Should NOT automatically verify without matching application or other signals
    expect(result.verified).toBe(false);
  });

  it('Test 6 — Form reset without submission', async () => {
    const evidence: SubmissionEvidence = {
      submitDetected: false,
      requestObserved: false,
      responseObserved: false,
      redirectDetected: false,
      confirmationDetected: false,
      formResetDetected: true,
      dashboardDetected: false,
      newApplicationDetected: false,
      updatedApplicationDetected: false,
      timestamp: Date.now()
    };

    const result = await engine.verify(documentMock, 'https://example.com/apply', '1.1.0', evidence);

    // Form reset alone is not enough
    expect(result.verified).toBe(false);
  });

  it('Test 7 — HTTP 200 but application failed', async () => {
    const evidence: SubmissionEvidence = {
      submitDetected: true,
      requestObserved: true,
      responseObserved: true,
      responseStatus: 200,
      confirmationDetected: false,
      formResetDetected: false,
      dashboardDetected: false,
      newApplicationDetected: false,
      updatedApplicationDetected: false,
      timestamp: Date.now()
    };

    const result = await engine.verify(documentMock, 'https://example.com/apply', '1.1.0', evidence);

    // Network status alone without confirmation toast or form reset should not mark verified
    expect(result.verified).toBe(false);
  });

  it('Test 8 — Existing application already present', async () => {
    const evidence: SubmissionEvidence = {
      submitDetected: true,
      requestObserved: true,
      responseObserved: true,
      redirectDetected: true,
      redirectUrl: 'https://example.com/dashboard',
      confirmationDetected: false,
      formResetDetected: false,
      dashboardDetected: true,
      newApplicationDetected: false,
      updatedApplicationDetected: false,
      timestamp: Date.now()
    };

    const result = await engine.verify(documentMock, 'https://example.com/apply', '1.1.0', evidence);

    // If application already exists, and we submit again but no state change or new app detected, do not verify based on that
    expect(result.verified).toBe(false);
  });
});

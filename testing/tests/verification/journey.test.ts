import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as verificationService from '../../../backend/src/modules/verification/verification.service';
import { prisma } from '../../../backend/src/lib/prisma';

// Mock env config
vi.mock('../../../backend/src/config/env', () => ({
  env: {
    VERIFICATION_TIMESTAMP_TOLERANCE_MS: 900000,
    MIN_EXTENSION_VERSION: '1.0.0',
    VERIFICATION_HMAC_SECRET: 'test-secret-key-32chars-minimum-ok',
    VERIFICATION_THRESHOLD: 60,
  },
}));

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    verificationSession: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    verificationEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    verificationLog: {
      findFirst: vi.fn(),
    },
  },
}));

describe('Verification Journey Engine & API Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Scoring Engine (calculateJourneyScore)', () => {
    it('0 evidence — score should be 10 (session observed only)', () => {
      const session = { portal: 'OTHER', jobId: null, jobUrl: null };
      const events: any[] = [];
      const result = verificationService.calculateJourneyScore(session, events);
      expect(result.score).toBe(10);
      expect(result.evidence.portalDetected).toBe(false);
      expect(result.evidence.applicationObserved).toBe(true);
    });

    it('portal only — score should be 20 (portal + session)', () => {
      const session = { portal: 'GREENHOUSE', jobId: null, jobUrl: null };
      const events: any[] = [];
      const result = verificationService.calculateJourneyScore(session, events);
      expect(result.score).toBe(20);
      expect(result.evidence.portalDetected).toBe(true);
      expect(result.evidence.applicationObserved).toBe(true);
    });

    it('partial journey — portal + session + job + form interaction = 40', () => {
      const session = { portal: 'GREENHOUSE', jobId: '400123', jobUrl: 'https://example.com' };
      const events = [
        { type: 'FORM_INTERACTION' }
      ];
      const result = verificationService.calculateJourneyScore(session, events);
      expect(result.score).toBe(40);
    });

    it('complete journey without application reference = 90', () => {
      const session = { portal: 'GREENHOUSE', jobId: '400123', jobUrl: 'https://example.com', applicationId: null };
      const events = [
        { type: 'FORM_INTERACTION' },
        { type: 'REQUIRED_FIELDS_COMPLETED' },
        { type: 'RESUME_UPLOADED' },
        { type: 'SUBMIT_CLICKED' },
        { type: 'SUBMISSION_CONFIRMED' }
      ];
      const result = verificationService.calculateJourneyScore(session, events);
      expect(result.score).toBe(90);
    });

    it('complete journey = 100', () => {
      const session = { portal: 'GREENHOUSE', jobId: '400123', jobUrl: 'https://example.com', applicationId: 'app-999' };
      const events = [
        { type: 'FORM_INTERACTION' },
        { type: 'REQUIRED_FIELDS_COMPLETED' },
        { type: 'RESUME_UPLOADED' },
        { type: 'SUBMIT_CLICKED' },
        { type: 'SUBMISSION_CONFIRMED' },
        { type: 'APPLICATION_REFERENCE_DETECTED' }
      ];
      const result = verificationService.calculateJourneyScore(session, events);
      expect(result.score).toBe(100);
    });
  });

  describe('Session Management & Idempotency', () => {
    const requester = { id: 'recruiter-id-123', role: 'RECRUITER' };

    it('creates new session if it does not exist', async () => {
      (prisma.verificationSession.findUnique as any).mockResolvedValue(null);
      (prisma.verificationSession.create as any).mockResolvedValue({ sessionId: 'session-123', status: 'IN_PROGRESS' });

      const input = {
        sessionId: 'session-123',
        portal: 'GREENHOUSE',
        jobUrl: 'https://boards.greenhouse.io/spacex/jobs/400123',
      };

      const result = await verificationService.createSession(input, requester);
      expect(result.sessionId).toBe('session-123');
      expect(prisma.verificationSession.create).toHaveBeenCalled();
    });

    it('recovers existing session on duplicate call', async () => {
      const existing = { sessionId: 'session-123', status: 'IN_PROGRESS' };
      (prisma.verificationSession.findUnique as any).mockResolvedValue(existing);

      const input = {
        sessionId: 'session-123',
        portal: 'GREENHOUSE',
      };

      const result = await verificationService.createSession(input, requester);
      expect(result.sessionId).toBe('session-123');
      expect(prisma.verificationSession.create).not.toHaveBeenCalled();
    });

    it('adds events idempotently, ignoring duplicates', async () => {
      (prisma.verificationEvent.findUnique as any).mockResolvedValueOnce({ eventId: 'evt_1' }); // first is duplicate
      (prisma.verificationEvent.findUnique as any).mockResolvedValueOnce(null); // second is new
      (prisma.verificationEvent.create as any).mockResolvedValue({ eventId: 'evt_2' });

      const eventsInput = [
        { eventId: 'evt_1', sessionId: 'session-123', type: 'FORM_INTERACTION', timestamp: '2026-08-18T20:00:00Z' },
        { eventId: 'evt_2', sessionId: 'session-123', type: 'RESUME_UPLOADED', timestamp: '2026-08-18T20:01:00Z' }
      ];

      const result = await verificationService.addEvents('session-123', eventsInput);
      expect(result.length).toBe(2);
      expect(prisma.verificationEvent.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('CRM Verification Check & Matching Flow', () => {
    const requester = { id: 'recruiter-id-123', role: 'RECRUITER' };

    it('returns score based on session evidence when URL matched', async () => {
      const mockSession = {
        sessionId: 'session-123',
        portal: 'GREENHOUSE',
        jobId: '400123',
        jobUrl: 'https://boards.greenhouse.io/spacex/jobs/400123',
        events: [
          { type: 'FORM_INTERACTION' },
          { type: 'SUBMIT_CLICKED' },
          { type: 'SUBMISSION_CONFIRMED' }
        ]
      };

      (prisma.verificationSession.findFirst as any).mockResolvedValue(mockSession);
      (prisma.verificationLog.findFirst as any).mockResolvedValue(null);

      const result = await verificationService.checkApplicationUrl('https://boards.greenhouse.io/spacex/jobs/400123', requester);
      
      expect(result.verified).toBe(true);
      expect(result.score).toBe(70); // portal(10) + session(10) + job(10) + form(10) + submit(15) + confirmed(15)
      expect(result.evidence.submitClicked).toBe(true);
      expect(result.evidence.submissionConfirmed).toBe(true);
    });
  });
});

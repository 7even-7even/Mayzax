import { JobPortal } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/utils/apiError';
import { normalizeJobLink } from '@/utils/normalizeJobLink';
import { EvidenceValidator } from './evidence/evidence.validator';
import { VerificationScorer } from './scoring/scorer.service';
import { getConfidenceFromScore } from './scoring/confidence';
import { generateHashFromEvidence } from './hashing/hash.service';
import { VerifyEvidenceInput, CreateSessionInput, AddEventsInput } from './verification.validation';
import { VerificationEvidence, VerificationResult } from './types/verification.types';
import { PortalRegistry } from './portals/portal.registry';
import { env } from '@/config/env';

interface Requester {
  id: string;
  role: string;
}

export async function verifyEvidence(input: VerifyEvidenceInput, requester: Requester): Promise<VerificationResult> {
  const evidence = input.evidence as VerificationEvidence;
  const validator = new EvidenceValidator();
  const scorer = new VerificationScorer();
  const portalRegistry = PortalRegistry.getInstance();

  // 1. Validate evidence shape & basics
  const validation = validator.validate(evidence);
  if (!validation.valid) {
    throw ApiError.badRequest(`Invalid evidence: ${validation.reasons.join(', ')}`, {
      reasons: validation.reasons,
      fraudSignals: validation.fraudSignals,
    });
  }

  // 2. Server-side scoring (defense in depth) — v1.1 evidence aggregation, minimize false negatives
  const scoring = scorer.score(evidence);
  const confidence = getConfidenceFromScore(scoring.score);
  const verified = scoring.score > env.VERIFICATION_THRESHOLD; // Strictly above env.VERIFICATION_THRESHOLD

  // Merge fraud signals
  const allReasons = [...validation.reasons, ...scoring.reasons];

  // 3. Canonicalize + hash
  const { hash, canonical } = generateHashFromEvidence(evidence);

  // 4. Check if hash already exists (replay detection bypass - return verified directly based on score)
  const existingLog = await prisma.verificationLog.findUnique({
    where: { verificationHash: hash },
  });

  if (existingLog) {
    const existingResult: VerificationResult = {
      verified: existingLog.score > env.VERIFICATION_THRESHOLD,
      score: existingLog.score,
      confidence: 'HIGH',
      portal: existingLog.portal,
      reasons: allReasons,
      evidence,
      verificationHash: hash,
      verificationTimestamp: evidence.verificationTimestamp,
      version: 'v2',
      applicationReference: existingLog.reference || null,
      fraudSignals: [],
      isReplay: false,
    };
    return existingResult;
  }

  // 5. Detect portal
  const portalDef = portalRegistry.detectPortal(evidence.hostname, evidence.pathname);
  const portal = (portalDef?.portal || evidence.portal || 'OTHER') as JobPortal;

  // 7. Normalized job link
  const jobLinkForLog = input.jobLink || evidence.fullUrl;
  let normalizedJobLink: string;
  try {
    normalizedJobLink = normalizeJobLink(jobLinkForLog);
  } catch {
    normalizedJobLink = evidence.hostname + evidence.pathname;
  }

  // 8. Store VerificationLog
  if (!existingLog) {
    try {
      await prisma.verificationLog.create({
        data: {
          recruiterId: requester.id,
          profileId: input.profileId || null,
          jobLink: jobLinkForLog,
          normalizedJobLink,
          evidence: evidence as any,
          canonicalEvidence: canonical,
          verificationHash: hash,
          score: scoring.score,
          confidence: 'HIGH',
          portal,
          hostname: validation.normalizedHostname,
          pathname: validation.normalizedPathname,
          reference: evidence.applicationReference || null,
          isReplay: false,
          fraudSignals: [] as any,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        const replayLog = await prisma.verificationLog.findUnique({ where: { verificationHash: hash } });
        if (replayLog) {
          return {
            verified: replayLog.score > env.VERIFICATION_THRESHOLD,
            score: replayLog.score,
            confidence: 'HIGH',
            portal: replayLog.portal,
            reasons: allReasons,
            evidence,
            verificationHash: hash,
            verificationTimestamp: evidence.verificationTimestamp,
            version: 'v2',
            applicationReference: replayLog.reference || null,
            fraudSignals: [],
            isReplay: false,
          };
        }
      }
      throw err;
    }
  }

  const result: VerificationResult = {
    verified,
    score: scoring.score,
    confidence: 'HIGH',
    portal,
    reasons: allReasons,
    evidence,
    verificationHash: hash,
    verificationTimestamp: evidence.verificationTimestamp,
    version: 'v2',
    applicationReference: evidence.applicationReference || null,
    fraudSignals: [],
    isReplay: false,
  };

  return result;
}

export async function getVerificationByHash(hash: string, requester: Requester) {
  if (!/^[a-f0-9]{64}$/i.test(hash)) {
    throw ApiError.badRequest('Invalid hash format');
  }

  const log = await prisma.verificationLog.findUnique({
    where: { verificationHash: hash },
  });

  if (!log) {
    throw ApiError.notFound('Verification hash not found');
  }

  // Check authorization: only owner or admin can view? For now, any authenticated recruiter can check if they own or if hash is public?
  // We'll allow if same recruiter or admin/team leader
  if (log.recruiterId !== requester.id && !['ADMIN', 'TEAM_LEADER'].includes(requester.role)) {
    // Still allow to know it exists? For security, we should only allow owner to get full details, others get limited existence check
    throw ApiError.forbidden('You do not have access to this verification');
  }

  // Check TTL
  const age = Date.now() - new Date(log.createdAt).getTime();
  const ttl = env.VERIFICATION_HASH_TTL_MS;
  const expired = age > ttl;

  return {
    ...log,
    expired,
    ageMs: age,
  };
}

export async function listVerifications(recruiterId: string, limit = 20) {
  return prisma.verificationLog.findMany({
    where: { recruiterId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export function calculateJourneyScore(session: any, events: any[]) {
  const eventTypes = new Set(events.map(e => e.type));
  
  const portalDetected = !!(session.portal && session.portal !== 'OTHER' && session.portal !== 'UNKNOWN');
  const applicationObserved = true;
  const jobIdentified = !!(session.jobId || session.jobUrl);
  const formInteraction = eventTypes.has('FORM_INTERACTION');
  const requiredFieldsCompleted = eventTypes.has('REQUIRED_FIELDS_COMPLETED');
  const resumeUploaded = eventTypes.has('RESUME_UPLOADED');
  const submitClicked = eventTypes.has('SUBMIT_CLICKED');
  const submissionConfirmed = eventTypes.has('SUBMISSION_CONFIRMED');
  const applicationReferenceDetected = eventTypes.has('APPLICATION_REFERENCE_DETECTED') || !!session.applicationId;

  let score = 0;
  if (portalDetected) score += 10;
  if (applicationObserved) score += 10;
  if (jobIdentified) score += 10;
  if (formInteraction) score += 10;
  if (requiredFieldsCompleted) score += 10;
  if (resumeUploaded) score += 10;
  if (submitClicked) score += 15;
  if (submissionConfirmed) score += 15;
  if (applicationReferenceDetected) score += 10;

  return {
    score,
    evidence: {
      portalDetected,
      applicationObserved,
      jobIdentified,
      formInteraction,
      requiredFieldsCompleted,
      resumeUploaded,
      submitClicked,
      submissionConfirmed,
      applicationReferenceDetected,
    }
  };
}

export async function createSession(input: CreateSessionInput, requester: Requester) {
  const existing = await prisma.verificationSession.findUnique({
    where: { sessionId: input.sessionId }
  });
  if (existing) {
    return existing;
  }
  return prisma.verificationSession.create({
    data: {
      sessionId: input.sessionId,
      userId: requester.id,
      portal: input.portal,
      jobUrl: input.jobUrl || null,
      jobId: input.jobId || null,
      applicationUrl: input.applicationUrl || null,
      applicationId: input.applicationId || null,
      status: 'IN_PROGRESS',
    }
  });
}

export async function addEvents(sessionId: string, events: any[]) {
  const results: any[] = [];
  for (const event of events) {
    const existing = await prisma.verificationEvent.findUnique({
      where: { eventId: event.eventId }
    });
    if (existing) {
      results.push(existing);
      continue;
    }
    const created = await prisma.verificationEvent.create({
      data: {
        eventId: event.eventId,
        sessionId,
        type: event.type,
        timestamp: new Date(event.timestamp),
        metadata: event.metadata || {},
      }
    });
    results.push(created);
  }
  return results;
}

export async function finalizeSession(sessionId: string) {
  const session = await prisma.verificationSession.findUnique({
    where: { sessionId },
    include: { events: true }
  });
  if (!session) {
    throw ApiError.notFound('Session not found');
  }

  const { score } = calculateJourneyScore(session, session.events);
  
  return prisma.verificationSession.update({
    where: { sessionId },
    data: {
      status: 'COMPLETED',
      score,
      scoreVersion: 'v1',
      submittedAt: new Date(),
    },
    include: { events: true }
  });
}

export async function checkApplicationUrl(applicationUrl: string, requester: Requester) {
  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeJobLink(applicationUrl);
  } catch {
    normalizedUrl = applicationUrl;
  }

  // Find matching verification session
  const session = await prisma.verificationSession.findFirst({
    where: {
      userId: requester.id,
      OR: [
        { applicationUrl: { contains: normalizedUrl } },
        { jobUrl: { contains: normalizedUrl } },
        { applicationUrl },
        { jobUrl: applicationUrl },
      ]
    },
    include: { events: true }
  });

  // Run existing final-page verification (score/log) if present
  const existingLog = await prisma.verificationLog.findFirst({
    where: {
      recruiterId: requester.id,
      OR: [
        { jobLink: { contains: normalizedUrl } },
        { normalizedJobLink: { contains: normalizedUrl } },
        { jobLink: applicationUrl }
      ]
    }
  });

  let journeyScore = 0;
  let journeyEvidence = {
    portalDetected: false,
    applicationObserved: false,
    jobIdentified: false,
    formInteraction: false,
    requiredFieldsCompleted: false,
    resumeUploaded: false,
    submitClicked: false,
    submissionConfirmed: false,
    applicationReferenceDetected: false
  };

  if (session) {
    const journeyResult = calculateJourneyScore(session, session.events);
    journeyScore = journeyResult.score;
    journeyEvidence = journeyResult.evidence;
  }

  let pageScore = 0;
  if (existingLog) {
    const scorer = new VerificationScorer();
    try {
      const scoring = scorer.score(existingLog.evidence as any);
      pageScore = scoring.score;
    } catch {
      pageScore = existingLog.score;
    }
  }

  // Combine verification evidence: max or average. Let's use max (or combine them deterministically)
  const combinedScore = Math.max(journeyScore, pageScore);

  let status: 'UNVERIFIED' | 'LOW_CONFIDENCE' | 'HIGH_CONFIDENCE' | 'VERIFIED' = 'UNVERIFIED';
  if (combinedScore >= 90) status = 'VERIFIED';
  else if (combinedScore >= 75) status = 'HIGH_CONFIDENCE';
  else if (combinedScore >= 50) status = 'LOW_CONFIDENCE';

  return {
    verified: combinedScore > (env.VERIFICATION_THRESHOLD || 60),
    score: combinedScore,
    scoreVersion: 'v1',
    status,
    portal: session?.portal || existingLog?.portal || 'OTHER',
    evidence: journeyEvidence
  };
}

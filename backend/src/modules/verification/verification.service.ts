import { JobPortal } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/utils/apiError';
import { normalizeJobLink } from '@/utils/normalizeJobLink';
import { EvidenceValidator } from './evidence/evidence.validator';
import { VerificationScorer } from './scoring/scorer.service';
import { getConfidenceFromScore } from './scoring/confidence';
import { generateHashFromEvidence } from './hashing/hash.service';
import { VerifyEvidenceInput } from './verification.validation';
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
  const allFraudSignals = [...new Set([...validation.fraudSignals, ...scoring.fraudSignals])];
  const allReasons = [...validation.reasons, ...scoring.reasons];

  // 3. Canonicalize + hash
  const { hash, canonical } = generateHashFromEvidence(evidence);

  // 4. Check if hash already exists (replay detection)
  const existingLog = await prisma.verificationLog.findUnique({
    where: { verificationHash: hash },
  });

  if (existingLog) {
    // If same recruiter and same hash, it's a replay
    if (existingLog.recruiterId === requester.id) {
      const existingResult: VerificationResult = {
        verified: existingLog.confidence === 'HIGH',
        score: existingLog.score,
        confidence: existingLog.confidence as any,
        portal: existingLog.portal,
        reasons: [...(existingLog.fraudSignals ? (existingLog.fraudSignals as any) : []), 'Replay detected — hash already exists'],
        evidence,
        verificationHash: hash,
        verificationTimestamp: evidence.verificationTimestamp,
        version: 'v2',
        applicationReference: existingLog.reference || null,
        fraudSignals: [...allFraudSignals, 'REPLAY_DETECTED'],
        isReplay: true,
      };
      return existingResult;
    }
    // Different recruiter same evidence — possible duplicate reference reuse, flag but allow?
    // We'll still treat as new but note fraud signal
    allFraudSignals.push('HASH_COLLISION_DIFFERENT_RECRUITER');
    allReasons.push('Same verification hash previously used by different recruiter');
  }

  // 5. Detect portal
  const portalDef = portalRegistry.detectPortal(evidence.hostname, evidence.pathname);
  const portal = (portalDef?.portal || evidence.portal || 'OTHER') as JobPortal;

  // 6. Check reference duplicate across logs
  if (evidence.applicationReference) {
    const refDup = await prisma.verificationLog.findFirst({
      where: {
        reference: evidence.applicationReference,
        portal,
      },
    });
    if (refDup && refDup.recruiterId !== requester.id) {
      allFraudSignals.push('DUPLICATE_REFERENCE_DIFFERENT_RECRUITER');
      allReasons.push(`Reference ${evidence.applicationReference} previously used by another recruiter`);
    }
  }

  // 7. Normalized job link
  const jobLinkForLog = input.jobLink || evidence.fullUrl;
  let normalizedJobLink: string;
  try {
    normalizedJobLink = normalizeJobLink(jobLinkForLog);
  } catch {
    normalizedJobLink = evidence.hostname + evidence.pathname;
  }

  // 8. Store VerificationLog if not replay
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
          confidence,
          portal,
          hostname: validation.normalizedHostname,
          pathname: validation.normalizedPathname,
          reference: evidence.applicationReference || null,
          isReplay: false,
          fraudSignals: allFraudSignals as any,
        },
      });
    } catch (err: any) {
      // Race condition: hash unique constraint
      if (err?.code === 'P2002') {
        // Treat as replay
        const replayLog = await prisma.verificationLog.findUnique({ where: { verificationHash: hash } });
        if (replayLog) {
          return {
            verified: replayLog.confidence === 'HIGH',
            score: replayLog.score,
            confidence: replayLog.confidence as any,
            portal: replayLog.portal,
            reasons: allReasons,
            evidence,
            verificationHash: hash,
            verificationTimestamp: evidence.verificationTimestamp,
            version: 'v2',
            applicationReference: replayLog.reference || null,
            fraudSignals: [...allFraudSignals, 'REPLAY_RACE'],
            isReplay: true,
          };
        }
      }
      throw err;
    }
  }

  const result: VerificationResult = {
    verified,
    score: scoring.score,
    confidence,
    portal,
    reasons: allReasons,
    evidence,
    verificationHash: hash,
    verificationTimestamp: evidence.verificationTimestamp,
    version: 'v2',
    applicationReference: evidence.applicationReference || null,
    fraudSignals: allFraudSignals,
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

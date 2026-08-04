import { Prisma, Role } from '@prisma/client';
import { ApiError } from '@/utils/apiError';
import { normalizeJobLink } from '@/utils/normalizeJobLink';
import { detectJobPortalFromUrl } from '@/utils/detectJobPortal';
import { getBusinessDate } from '@/utils/businessDate';
import { writeAuditLog } from '@/modules/shared/audit.service';
import { prisma } from '@/lib/prisma';
import { env } from '@/config/env';
import * as repo from './application.repository';
import { CreateApplicationInput, UpdateApplicationInput, ListApplicationsQuery } from './application.validation';

interface Requester {
  id: string;
  role: Role;
}
interface Meta {
  ip?: string;
  userAgent?: string;
}

/**
 * Creates a job application with strict duplicate protection for (profile, job link).
 *
 * Defense in depth:
 *  1. Normalize the job link (strip tracking params, casing, trailing slash, etc.)
 *  2. Pre-check for an existing (profileId, normalizedJobLink) row and return a
 *     friendly 409 Conflict before hitting the DB write path.
 *  3. Rely on the DB-level UNIQUE(profile_id, normalized_job_link) constraint as
 *     the final, race-condition-proof guard - if two requests slip past the
 *     pre-check simultaneously, Postgres itself rejects the second insert and
 *     we translate that into the same friendly 409 response.
 */
export async function createApplication(input: CreateApplicationInput, actor: Requester, meta?: Meta) {
  const profile = await prisma.clientProfile.findFirst({
    where: {
      id: input.profileId,
      deletedAt: null,
      ...(actor.role === Role.RECRUITER
        ? {
            OR: [
              { assignedRecruiterId: actor.id },
              { assignedRecruiterAssignments: { some: { recruiterId: actor.id } } },
            ],
          }
        : actor.role === Role.TEAM_LEADER
        ? {
            OR: [
              { assignedRecruiterId: actor.id },
              { assignedRecruiterAssignments: { some: { recruiterId: actor.id } } },
              { assignedRecruiter: { createdById: actor.id } },
              { assignedRecruiterAssignments: { some: { recruiter: { createdById: actor.id } } } },
            ],
          }
        : {}),
    },
  });
  if (!profile) throw ApiError.notFound('Client profile not found');

  const normalizedJobLink = normalizeJobLink(input.jobLink);
  const detectedPortal = detectJobPortalFromUrl(input.jobLink);
  const jobPortal = (input.jobPortal === 'OTHER' && detectedPortal !== 'OTHER' ? detectedPortal : input.jobPortal) as any;
  const appliedAt = input.appliedAt ?? new Date();
  const businessDate = getBusinessDate(appliedAt);

  // Layer 1: application-level pre-check for a clear, fast error message.
  const existing = await repo.findByProfileAndNormalizedLink(input.profileId, normalizedJobLink);
  if (existing) {
    throw ApiError.conflict(
      `This profile has already applied to this job. Duplicate submissions for the same profile are not allowed.`,
      {
        existingApplicationId: existing.id,
        candidateName: profile.candidateName,
        appliedByRecruiter: existing.recruiter ? { id: existing.recruiter.id, name: existing.recruiter.name, email: existing.recruiter.email } : null,
      },
    );
  }

  // Enterprise v1 verification handling
  let verificationLog: any = null;
  let finalVerified = input.verified ?? false;
  let finalVerificationMethod = input.verificationMethod ?? null;
  let finalScore: number | null = null;
  let finalConfidence: string | null = null;
  let finalEvidence: any = null;
  let finalPortal: string | null = null;
  let finalTimestamp: Date | null = null;
  let finalReference: string | null = null;
  let finalHash: string | null = input.verificationHash || null;

  if (input.verificationHash) {
    // Validate hash exists and belongs to recruiter
    verificationLog = await prisma.verificationLog.findUnique({
      where: { verificationHash: input.verificationHash },
    });
    if (!verificationLog) {
      throw ApiError.badRequest('Invalid verification hash — not found. Please re-verify via extension.', {
        verificationHash: input.verificationHash,
      });
    }
    if (verificationLog.recruiterId !== actor.id && actor.role === Role.RECRUITER) {
      throw ApiError.forbidden('Verification hash does not belong to you');
    }
    // Check TTL
    const age = Date.now() - new Date(verificationLog.createdAt).getTime();
    if (age > env.VERIFICATION_HASH_TTL_MS) {
      throw ApiError.badRequest('Verification hash expired — please re-verify via extension', {
        ageMs: age,
        ttlMs: env.VERIFICATION_HASH_TTL_MS,
      });
    }
    // Check normalized link matches (prevent reuse for different job)
    const logNormalized = verificationLog.normalizedJobLink;
    if (logNormalized !== normalizedJobLink) {
      // Allow slight mismatch? For strict security, require exact match or at least same hostname
      // We'll allow if same hostname but warn — here we require exact for HIGH confidence
      if (verificationLog.confidence === 'HIGH') {
        throw ApiError.badRequest('Verification hash does not match this job link — hash was generated for different job', {
          expectedNormalized: logNormalized,
          providedNormalized: normalizedJobLink,
        });
      }
    }

    // Server is source of truth for verified status
    finalVerified = verificationLog.confidence === 'HIGH' && verificationLog.score >= 80;
    finalScore = verificationLog.score;
    finalConfidence = verificationLog.confidence;
    finalEvidence = verificationLog.evidence;
    finalPortal = verificationLog.portal;
    finalTimestamp = new Date(verificationLog.createdAt);
    finalReference = verificationLog.reference || input.applicationReference || null;
    finalVerificationMethod = `Extension v2 (${verificationLog.portal}) - Score ${verificationLog.score}%`;

    if (verificationLog.isReplay) {
      throw ApiError.badRequest('This verification has already been used — possible replay attack detected', {
        hash: input.verificationHash,
        isReplay: true,
      });
    }
  } else {
    // If REQUIRE_HASH_FOR_VERIFIED is true and client claims verified true without hash, reject
    if (env.REQUIRE_HASH_FOR_VERIFIED && input.verified) {
      throw ApiError.badRequest('Verification hash required for verified applications — please verify via extension v2', {
        requireHash: true,
      });
    }
    // If no hash, force verified=false unless legacy allowed
    if (!env.REQUIRE_HASH_FOR_VERIFIED && input.verified) {
      // Legacy path — allow but log warning
      finalVerified = false; // downgrade to false since no hash proof, or keep true for backward compat? We'll keep false for security
      // To maintain backward compat during migration, allow verified=true without hash but set confidence LOW
      // Actually per spec, during migration we still allow but mark as legacy
      // We'll allow verified=false enforcement only if REQUIRE_HASH is false and we want to warn
      // For now, if no hash but verified true, we downgrade to false and require manual review
      if (input.verified) {
        finalVerified = false;
        finalVerificationMethod = 'Legacy — no hash proof';
        finalConfidence = 'LOW';
        finalScore = 0;
      }
    }
  }

  if (input.applicationReference) {
    finalReference = input.applicationReference;
  }

  try {
    // Layer 2: DB-level UNIQUE(profile_id, normalized_job_link) constraint - the
    // authoritative guard against race conditions (e.g. two rapid duplicate submits).
    const application = await repo.create({
      profileId: input.profileId,
      recruiterId: actor.id,
      jobLink: input.jobLink,
      normalizedJobLink,
      companyName: input.companyName,
      jobTitle: input.jobTitle,
      jobPortal,
      status: input.status,
      appliedAt,
      businessDate,
      verified: finalVerified,
      verificationMethod: finalVerificationMethod,
      verificationHash: finalHash,
      verificationVersion: finalHash ? 'v2' : null,
      verificationScore: finalScore,
      verificationConfidence: finalConfidence,
      verificationEvidence: finalEvidence,
      verificationPortal: finalPortal,
      verificationTimestamp: finalTimestamp,
      applicationReference: finalReference,
    } as any);

    await writeAuditLog({
      userId: actor.id,
      action: 'APPLICATION_CREATED',
      entity: 'JobApplication',
      entityId: application.id,
      metadata: { profileId: input.profileId, companyName: input.companyName, jobTitle: input.jobTitle },
      ...meta,
    });

    return application;
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw ApiError.conflict(
        'This profile has already applied to this job. Duplicate submissions for the same profile are not allowed.',
      );
    }
    throw err;
  }
}

export async function updateApplication(id: string, input: UpdateApplicationInput, actor: Requester, meta?: Meta) {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Job application not found');

  if (actor.role === Role.RECRUITER && existing.recruiterId !== actor.id) {
    throw ApiError.forbidden('You can only update your own applications');
  }

  if (actor.role === Role.TEAM_LEADER) {
    const recruiter = await prisma.user.findFirst({
      where: { id: existing.recruiterId, createdById: actor.id, deletedAt: null }
    });
    if (!recruiter) {
      throw ApiError.forbidden('You can only update applications submitted by recruiters in your team');
    }
  }

  const updated = await repo.update(id, input);

  await writeAuditLog({
    userId: actor.id,
    action: 'APPLICATION_UPDATED',
    entity: 'JobApplication',
    entityId: id,
    metadata: input,
    ...meta,
  });

  return updated;
}

export async function getApplication(id: string, actor: Requester) {
  const application = await repo.findById(id);
  if (!application) throw ApiError.notFound('Job application not found');

  if (actor.role === Role.RECRUITER) {
    const assignedRecruiterIds = [
      ...(application.profile.assignedRecruiterId ? [application.profile.assignedRecruiterId] : []),
      ...(application.profile.assignedRecruiterAssignments?.map((row) => row.recruiterId) ?? []),
    ];
    if (application.recruiterId !== actor.id && !assignedRecruiterIds.includes(actor.id)) {
      throw ApiError.forbidden('You do not have access to this application');
    }
  } else if (actor.role === Role.TEAM_LEADER) {
    const candidateRecruiterIds = [
      application.recruiterId,
      ...(application.profile.assignedRecruiterId ? [application.profile.assignedRecruiterId] : []),
      ...(application.profile.assignedRecruiterAssignments?.map((row) => row.recruiterId) ?? []),
    ];
    const teamUser = await prisma.user.findFirst({
      where: {
        id: { in: candidateRecruiterIds },
        createdById: actor.id,
        deletedAt: null
      }
    });
    if (!teamUser) {
      throw ApiError.forbidden('You do not have access to this application');
    }
  }

  return application;
}

export async function listApplications(query: ListApplicationsQuery, actor: Requester) {
  if (actor.role === Role.TEAM_LEADER && query.recruiterId && query.recruiterId !== actor.id) {
    const recruiter = await prisma.user.findFirst({
      where: { id: query.recruiterId, createdById: actor.id, deletedAt: null }
    });
    if (!recruiter) {
      throw ApiError.forbidden('You can only filter by recruiters in your own team');
    }
  }

  const [items, total] = await repo.list(query, actor);
  return {
    items,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

/** Pre-flight duplicate check endpoint, useful for instant UI feedback before submit. */
export async function checkDuplicate(profileId: string, jobLink: string, actor: Requester) {
  const profile = await prisma.clientProfile.findFirst({
    where: {
      id: profileId,
      deletedAt: null,
      ...(actor.role === Role.RECRUITER
        ? {
            OR: [
              { assignedRecruiterId: actor.id },
              { assignedRecruiterAssignments: { some: { recruiterId: actor.id } } },
            ],
          }
        : actor.role === Role.TEAM_LEADER
        ? {
            OR: [
              { assignedRecruiterId: actor.id },
              { assignedRecruiterAssignments: { some: { recruiterId: actor.id } } },
              { assignedRecruiter: { createdById: actor.id } },
              { assignedRecruiterAssignments: { some: { recruiter: { createdById: actor.id } } } },
            ],
          }
        : {}),
    },
  });
  if (!profile) throw ApiError.notFound('Client profile not found');

  const normalizedJobLink = normalizeJobLink(jobLink);
  const existing = await repo.findByProfileAndNormalizedLink(profileId, normalizedJobLink);
  return {
    isDuplicate: !!existing,
    normalizedJobLink,
    existingApplicationId: existing?.id ?? null,
    appliedByRecruiter: existing?.recruiter
      ? { id: existing.recruiter.id, name: existing.recruiter.name, email: existing.recruiter.email }
      : null,
  };
}

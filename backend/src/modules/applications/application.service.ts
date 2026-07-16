import { Prisma, Role } from '@prisma/client';
import { ApiError } from '@/utils/apiError';
import { normalizeJobLink } from '@/utils/normalizeJobLink';
import { detectJobPortalFromUrl } from '@/utils/detectJobPortal';
import { getBusinessDate } from '@/utils/businessDate';
import { writeAuditLog } from '@/modules/shared/audit.service';
import { prisma } from '@/lib/prisma';
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
    });

    await writeAuditLog({
      userId: actor.id,
      action: 'APPLICATION_CREATED',
      entity: 'JobApplication',
      entityId: application.id,
      metadata: { profileId: input.profileId, companyName: input.companyName, jobTitle: input.jobTitle },
      ...meta,
    });

    return application;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
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
  if (actor.role === Role.TEAM_LEADER && query.recruiterId) {
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

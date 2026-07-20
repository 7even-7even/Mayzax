import { Role } from '@prisma/client';
import { ApiError } from '@/utils/apiError';
import { writeAuditLog } from '@/modules/shared/audit.service';
import * as repo from './profile.repository';
import { prisma } from '@/lib/prisma';
import { CreateProfileInput, UpdateProfileInput, ListProfilesQuery } from './profile.validation';

interface Requester {
  id: string;
  role: Role;
}

interface Meta {
  ip?: string;
  userAgent?: string;
}

async function assertRecruitersExist(recruiterIds: string[], actor?: Requester) {
  const uniqueIds = [...new Set(recruiterIds)];
  if (uniqueIds.length === 0) throw ApiError.badRequest('Assign at least 1 recruiter');
  if (uniqueIds.length > 5) throw ApiError.badRequest('You can assign up to 5 recruiters');

  const recruiters = await prisma.user.findMany({
    where: {
      id: { in: uniqueIds },
      deletedAt: null,
      role: { in: [Role.RECRUITER, Role.TEAM_LEADER] },
      ...(actor?.role === Role.TEAM_LEADER ? { createdById: actor.id } : {}),
    },
    select: { id: true, isActive: true },
  });

  if (recruiters.length !== uniqueIds.length) {
    throw ApiError.badRequest(
      actor?.role === Role.TEAM_LEADER
        ? 'One or more assigned recruiters were not found or do not belong to your team'
        : 'One or more assigned recruiters were not found'
    );
  }
  const inactive = recruiters.find((r) => !r.isActive);
  if (inactive) throw ApiError.badRequest('Cannot assign profile to an inactive recruiter');
}

async function isProfileInTeam(profileId: string, teamLeaderId: string): Promise<boolean> {
  const profile = await prisma.clientProfile.findFirst({
    where: {
      id: profileId,
      deletedAt: null,
      OR: [
        { assignedRecruiter: { createdById: teamLeaderId } },
        { assignedRecruiterAssignments: { some: { recruiter: { createdById: teamLeaderId } } } },
      ],
    },
  });
  return !!profile;
}

async function syncProfileAssignments(profileId: string, recruiterIds: string[]) {
  const uniqueIds = [...new Set(recruiterIds)];
  const primaryRecruiterId = uniqueIds[0] ?? null;
  await repo.replaceRecruiterAssignments(profileId, uniqueIds);
  await repo.update(profileId, { assignedRecruiterId: primaryRecruiterId } as any);
}

export async function createProfile(input: CreateProfileInput, actor: Requester, meta?: Meta) {
  const recruiterIds = actor.role === Role.RECRUITER
    ? [actor.id]
    : input.assignedRecruiterIds ?? (input.assignedRecruiterId ? [input.assignedRecruiterId] : []);
  await assertRecruitersExist(recruiterIds, actor);

  const profile = await repo.create({
    candidateName: input.candidateName,
    email: input.email,
    phone: input.phone,
    technology: input.technology,
    notes: input.notes ?? null,
    assignedRecruiterId: recruiterIds[0] ?? null,
  });

  if (recruiterIds.length > 0) {
    await syncProfileAssignments(profile.id, recruiterIds);
  }

  const refreshed = await repo.findActiveById(profile.id);

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILE_CREATED',
    entity: 'ClientProfile',
    entityId: profile.id,
    metadata: { candidateName: profile.candidateName },
    ...meta,
  });

  return refreshed ?? profile;
}

export async function updateProfile(id: string, input: UpdateProfileInput, actor: Requester, meta?: Meta) {
  const existing = await repo.findActiveById(id);
  if (!existing) throw ApiError.notFound('Client profile not found');

  const assignedRecruiterIds = [
    ...(existing.assignedRecruiterId ? [existing.assignedRecruiterId] : []),
    ...(existing.assignedRecruiterAssignments?.map((row) => row.recruiterId) ?? []),
  ];

  if (actor.role === Role.RECRUITER && !assignedRecruiterIds.includes(actor.id)) {
    throw ApiError.forbidden('You can only edit profiles assigned to you');
  }

  if (actor.role === Role.TEAM_LEADER) {
    const inTeam = await isProfileInTeam(id, actor.id);
    if (!inTeam) throw ApiError.forbidden('You can only edit profiles belonging to your team');
  }

  if (input.assignedRecruiterIds !== undefined || input.assignedRecruiterId !== undefined) {
    if (actor.role === Role.RECRUITER) {
      throw ApiError.forbidden('Only admins and team leaders can reassign profiles');
    }
    const recruiterIds = input.assignedRecruiterIds ?? (input.assignedRecruiterId ? [input.assignedRecruiterId] : []);
    await assertRecruitersExist(recruiterIds, actor);
    await syncProfileAssignments(id, recruiterIds);
  }

  const rest = { ...(input as any) };
  delete rest.assignedRecruiterId;
  delete rest.assignedRecruiterIds;
  await repo.update(id, rest);
  const refreshed = await repo.findActiveById(id);

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILE_UPDATED',
    entity: 'ClientProfile',
    entityId: id,
    metadata: input,
    ...meta,
  });

  return refreshed ?? existing;
}

export async function deleteProfile(id: string, actor: Requester, meta?: Meta) {
  const existing = await repo.findActiveById(id);
  if (!existing) throw ApiError.notFound('Client profile not found');

  if (actor.role === Role.TEAM_LEADER) {
    throw ApiError.forbidden('Team Leaders cannot delete client profiles');
  }

  await repo.softDelete(id);

  await writeAuditLog({ userId: actor.id, action: 'PROFILE_DELETED', entity: 'ClientProfile', entityId: id, ...meta });

  return { message: 'Profile deleted successfully' };
}

export async function assignRecruiter(id: string, assignedRecruiterIds: string[], actor: Requester, meta?: Meta) {
  const existing = await repo.findActiveById(id);
  if (!existing) throw ApiError.notFound('Client profile not found');

  if (actor.role === Role.TEAM_LEADER) {
    const inTeam = await isProfileInTeam(id, actor.id);
    if (!inTeam) throw ApiError.forbidden('You can only reassign profiles belonging to your team');
  }

  await assertRecruitersExist(assignedRecruiterIds, actor);
  await syncProfileAssignments(id, assignedRecruiterIds);

  const updated = await repo.findActiveById(id);
  if (!updated) throw ApiError.notFound('Client profile not found');

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILE_REASSIGNED',
    entity: 'ClientProfile',
    entityId: id,
    metadata: { assignedRecruiterIds },
    ...meta,
  });

  return updated;
}

export async function getProfile(id: string, actor: Requester) {
  const profile = await repo.findActiveById(id);
  if (!profile) throw ApiError.notFound('Client profile not found');

  const assignedRecruiterIds = [
    ...(profile.assignedRecruiterId ? [profile.assignedRecruiterId] : []),
    ...(profile.assignedRecruiterAssignments?.map((row) => row.recruiterId) ?? []),
  ];
  if (actor.role === Role.RECRUITER && !assignedRecruiterIds.includes(actor.id)) {
    throw ApiError.forbidden('You do not have access to this profile');
  }

  if (actor.role === Role.TEAM_LEADER) {
    const inTeamOrSelf = await prisma.clientProfile.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { assignedRecruiterId: actor.id },
          { assignedRecruiterAssignments: { some: { recruiterId: actor.id } } },
          { assignedRecruiter: { createdById: actor.id } },
          { assignedRecruiterAssignments: { some: { recruiter: { createdById: actor.id } } } },
        ],
      },
    });
    if (!inTeamOrSelf) {
      throw ApiError.forbidden('You do not have access to this profile');
    }
  }

  return profile;
}

export async function listProfiles(query: ListProfilesQuery, actor: Requester) {
  if (actor.role === Role.TEAM_LEADER && query.assignedRecruiterId && query.assignedRecruiterId !== actor.id) {
    const recruiter = await prisma.user.findFirst({
      where: { id: query.assignedRecruiterId, createdById: actor.id, deletedAt: null }
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

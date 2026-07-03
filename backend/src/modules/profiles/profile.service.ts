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

async function assertRecruiterExists(recruiterId: string | null | undefined) {
  if (!recruiterId) return;
  const recruiter = await prisma.user.findFirst({ where: { id: recruiterId, deletedAt: null, role: Role.RECRUITER } });
  if (!recruiter) throw ApiError.badRequest('Assigned recruiter not found');
  if (!recruiter.isActive) throw ApiError.badRequest('Cannot assign profile to an inactive recruiter');
}

export async function createProfile(input: CreateProfileInput, actor: Requester, meta?: Meta) {
  await assertRecruiterExists(input.assignedRecruiterId);

  const profile = await repo.create({
    candidateName: input.candidateName,
    email: input.email,
    phone: input.phone,
    technology: input.technology,
    notes: input.notes ?? null,
    assignedRecruiterId: input.assignedRecruiterId ?? null,
  });

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILE_CREATED',
    entity: 'ClientProfile',
    entityId: profile.id,
    metadata: { candidateName: profile.candidateName },
    ...meta,
  });

  return profile;
}

export async function updateProfile(id: string, input: UpdateProfileInput, actor: Requester, meta?: Meta) {
  const existing = await repo.findActiveById(id);
  if (!existing) throw ApiError.notFound('Client profile not found');

  if (actor.role === Role.RECRUITER && existing.assignedRecruiterId !== actor.id) {
    throw ApiError.forbidden('You can only edit profiles assigned to you');
  }

  if (input.assignedRecruiterId !== undefined) {
    if (actor.role === Role.RECRUITER) {
      throw ApiError.forbidden('Only admins can reassign profiles');
    }
    await assertRecruiterExists(input.assignedRecruiterId);
  }

  const updated = await repo.update(id, input as any);

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILE_UPDATED',
    entity: 'ClientProfile',
    entityId: id,
    metadata: input,
    ...meta,
  });

  return updated;
}

export async function deleteProfile(id: string, actor: Requester, meta?: Meta) {
  const existing = await repo.findActiveById(id);
  if (!existing) throw ApiError.notFound('Client profile not found');

  await repo.softDelete(id);

  await writeAuditLog({ userId: actor.id, action: 'PROFILE_DELETED', entity: 'ClientProfile', entityId: id, ...meta });

  return { message: 'Profile deleted successfully' };
}

export async function assignRecruiter(id: string, assignedRecruiterId: string | null, actor: Requester, meta?: Meta) {
  const existing = await repo.findActiveById(id);
  if (!existing) throw ApiError.notFound('Client profile not found');

  await assertRecruiterExists(assignedRecruiterId);

  const updated = await repo.update(id, { assignedRecruiterId });

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILE_REASSIGNED',
    entity: 'ClientProfile',
    entityId: id,
    metadata: { assignedRecruiterId },
    ...meta,
  });

  return updated;
}

export async function getProfile(id: string, actor: Requester) {
  const profile = await repo.findActiveById(id);
  if (!profile) throw ApiError.notFound('Client profile not found');

  if (actor.role === Role.RECRUITER && profile.assignedRecruiterId !== actor.id) {
    throw ApiError.forbidden('You do not have access to this profile');
  }

  return profile;
}

export async function listProfiles(query: ListProfilesQuery, actor: Requester) {
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

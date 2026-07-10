import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/utils/apiError';
import { hashPassword } from '@/modules/auth/auth.service';
import { getBusinessDateString } from '@/utils/businessDate';
import * as repo from './recruiter.repository';
import { CreateRecruiterInput, UpdateRecruiterInput, ListRecruitersQuery } from './recruiter.validation';
import { writeAuditLog } from '@/modules/shared/audit.service';

export async function createRecruiter(input: CreateRecruiterInput, actorId: string, meta?: { ip?: string; userAgent?: string }) {
  const existing = await repo.findByEmail(input.email);
  if (existing) throw ApiError.conflict('A user with this email already exists');

  const passwordHash = await hashPassword(input.password);
  const user = await repo.createUser({
    name: input.name,
    email: input.email,
    passwordHash,
    role: (input.role as Role) ?? Role.RECRUITER,
    createdById: actorId,
  });

  await writeAuditLog({
    userId: actorId,
    action: 'RECRUITER_CREATED',
    entity: 'User',
    entityId: user.id,
    metadata: { name: user.name, email: user.email, role: user.role },
    ...meta,
  });

  return sanitizeUser(user);
}

export async function updateRecruiter(id: string, input: UpdateRecruiterInput, actorId: string, meta?: { ip?: string; userAgent?: string }) {
  const user = await repo.findActiveById(id);
  if (!user) throw ApiError.notFound('Recruiter not found');

  if (input.email && input.email.toLowerCase() !== user.email) {
    const existing = await repo.findByEmail(input.email);
    if (existing) throw ApiError.conflict('A user with this email already exists');
  }

  const updated = await repo.updateUser(id, input);

  await writeAuditLog({
    userId: actorId,
    action: 'RECRUITER_UPDATED',
    entity: 'User',
    entityId: id,
    metadata: input,
    ...meta,
  });

  return sanitizeUser(updated);
}

export async function setRecruiterActiveStatus(id: string, isActive: boolean, actorId: string, meta?: { ip?: string; userAgent?: string }) {
  const user = await repo.findActiveById(id);
  if (!user) throw ApiError.notFound('Recruiter not found');
  if (user.id === actorId && !isActive) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }

  const updated = await repo.setActiveStatus(id, isActive);

  await writeAuditLog({
    userId: actorId,
    action: isActive ? 'RECRUITER_ACTIVATED' : 'RECRUITER_DEACTIVATED',
    entity: 'User',
    entityId: id,
    ...meta,
  });

  return sanitizeUser(updated);
}

export async function softDeleteRecruiter(id: string, actorId: string, meta?: { ip?: string; userAgent?: string }) {
  const user = await repo.findActiveById(id);
  if (!user) throw ApiError.notFound('Recruiter not found');
  if (user.id === actorId) throw ApiError.badRequest('You cannot delete your own account');

  await repo.softDeleteUser(id);

  // Unassign their profiles so work can be reassigned
  await prisma.clientProfile.updateMany({
    where: { assignedRecruiterId: id },
    data: { assignedRecruiterId: null },
  });
  await prisma.clientProfileAssignment.deleteMany({ where: { recruiterId: id } });

  await writeAuditLog({
    userId: actorId,
    action: 'RECRUITER_DELETED',
    entity: 'User',
    entityId: id,
    ...meta,
  });

  return { message: 'Recruiter deleted successfully' };
}

export async function listRecruiters(query: ListRecruitersQuery) {
  const [users, total] = await repo.listRecruiters(query);
  return {
    items: users,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

/**
 * Detailed stats for a single recruiter:
 * - total assigned profiles
 * - total applications submitted (all-time)
 * - applications submitted in current business shift
 * - profile-wise counts
 * - last active timestamp
 */
export async function getRecruiterStats(id: string) {
  const user = await repo.findActiveById(id);
  if (!user) throw ApiError.notFound('Recruiter not found');

  const todayBusinessDate = getBusinessDateString(new Date());

  const [assignedProfiles, totalApplications, currentShiftApplications] = await Promise.all([
    prisma.clientProfile.findMany({
      where: {
        deletedAt: null,
        OR: [
          { assignedRecruiterId: id },
          { assignedRecruiterAssignments: { some: { recruiterId: id } } },
        ],
      },
      select: { id: true, candidateName: true, technology: true },
      orderBy: { candidateName: 'asc' },
    }),
    prisma.jobApplication.count({ where: { recruiterId: id } }),
    prisma.jobApplication.count({
      where: { recruiterId: id, businessDate: new Date(`${todayBusinessDate}T00:00:00.000Z`) },
    }),
  ]);

  const profileIds = assignedProfiles.map((p) => p.id);
  const [applicationsByProfile, currentShiftApplicationsByProfile] = profileIds.length
    ? await Promise.all([
        prisma.jobApplication.groupBy({
          by: ['profileId'],
          where: { recruiterId: id, profileId: { in: profileIds } },
          _count: { _all: true },
        }),
        prisma.jobApplication.groupBy({
          by: ['profileId'],
          where: {
            recruiterId: id,
            profileId: { in: profileIds },
            businessDate: new Date(`${todayBusinessDate}T00:00:00.000Z`),
          },
          _count: { _all: true },
        }),
      ])
    : [[], []];
  const applicationCountMap = new Map(applicationsByProfile.map((row) => [row.profileId, row._count._all]));
  const currentShiftApplicationCountMap = new Map(
    currentShiftApplicationsByProfile.map((row) => [row.profileId, row._count._all]),
  );

  return {
    recruiter: sanitizeUser(user),
    assignedProfilesCount: assignedProfiles.length,
    totalApplications,
    currentShiftApplications,
    currentBusinessDate: todayBusinessDate,
    profileWiseCounts: assignedProfiles.map((profile) => ({
      profileId: profile.id,
      candidateName: profile.candidateName,
      technology: profile.technology,
      applicationCount: applicationCountMap.get(profile.id) ?? 0,
      totalApplications: applicationCountMap.get(profile.id) ?? 0,
      currentShiftApplicationCount: currentShiftApplicationCountMap.get(profile.id) ?? 0,
      currentShiftApplications: currentShiftApplicationCountMap.get(profile.id) ?? 0,
    })),
    lastActiveAt: user.lastActiveAt,
  };
}

function sanitizeUser<T extends { passwordHash?: string }>(user: T) {
  const { passwordHash, ...rest } = user as any;
  return rest;
}

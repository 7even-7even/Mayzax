import { Role, JobPortal } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/utils/apiError';
import { hashPassword } from '@/modules/auth/auth.service';
import { getBusinessDateString } from '@/utils/businessDate';
import { calculateAdjustedCounts } from '../analytics/analytics.service';
import * as repo from './recruiter.repository';
import { CreateRecruiterInput, UpdateRecruiterInput, ListRecruitersQuery, TeamNameInput } from './recruiter.validation';
import { writeAuditLog } from '@/modules/shared/audit.service';

interface Requester {
  id: string;
  role: Role;
}

export async function createRecruiter(
  input: CreateRecruiterInput,
  actor: Requester,
  meta?: { ip?: string; userAgent?: string }
) {
  if (actor.role !== Role.ADMIN) {
    throw ApiError.forbidden('Only admins can create users');
  }

  const existing = await repo.findByEmail(input.email);
  if (existing) throw ApiError.conflict('A user with this email already exists');

  const passwordHash = await hashPassword(input.password);
  const user = await repo.createUser({
    name: input.name,
    email: input.email,
    passwordHash,
    role: (input.role as Role) ?? Role.RECRUITER,
    createdById: input.createdById || null,
  });

  await writeAuditLog({
    userId: actor.id,
    action: 'RECRUITER_CREATED',
    entity: 'User',
    entityId: user.id,
    metadata: { name: user.name, email: user.email, role: user.role },
    ...meta,
  });

  return sanitizeUser(user);
}

export async function updateRecruiter(
  id: string,
  input: UpdateRecruiterInput,
  actor: Requester,
  meta?: { ip?: string; userAgent?: string }
) {
  const user = await repo.findActiveById(id);
  if (!user) throw ApiError.notFound('Recruiter not found');

  const updatePayload = { ...input } as any;
  if (actor.role !== Role.ADMIN) {
    throw ApiError.forbidden('Only admins can update users');
  }

  if (input.email && input.email.toLowerCase() !== user.email) {
    const existing = await repo.findByEmail(input.email);
    if (existing) throw ApiError.conflict('A user with this email already exists');
  }

  // Handle TL demotion to Recruiter
  const isDemotion = user.role === Role.TEAM_LEADER && input.role === Role.RECRUITER;
  if (isDemotion) {
    // 1. All managed team recruiters will go unassigned (createdById = null)
    await prisma.user.updateMany({
      where: { createdById: id },
      data: { createdById: null },
    });
    // 2. Set teamName to null
    updatePayload.teamName = null;
  }

  const updated = await repo.updateUser(id, updatePayload);

  await writeAuditLog({
    userId: actor.id,
    action: 'RECRUITER_UPDATED',
    entity: 'User',
    entityId: id,
    metadata: input,
    ...meta,
  });

  return sanitizeUser(updated);
}

export async function setRecruiterActiveStatus(
  id: string,
  isActive: boolean,
  actor: Requester,
  meta?: { ip?: string; userAgent?: string }
) {
  const user = await repo.findActiveById(id);
  if (!user) throw ApiError.notFound('Recruiter not found');

  if (actor.role !== Role.ADMIN) {
    throw ApiError.forbidden('Only admins can change user status');
  }

  if (user.id === actor.id && !isActive) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }

  const updated = await repo.setActiveStatus(id, isActive);

  await writeAuditLog({
    userId: actor.id,
    action: isActive ? 'RECRUITER_ACTIVATED' : 'RECRUITER_DEACTIVATED',
    entity: 'User',
    entityId: id,
    ...meta,
  });

  return sanitizeUser(updated);
}

export async function softDeleteRecruiter(
  id: string,
  actor: Requester,
  meta?: { ip?: string; userAgent?: string }
) {
  const user = await repo.findActiveById(id);
  if (!user) throw ApiError.notFound('Recruiter not found');

  if (actor.role !== Role.ADMIN) {
    throw ApiError.forbidden('Only admins can delete users');
  }

  if (user.id === actor.id) throw ApiError.badRequest('You cannot delete your own account');

  await repo.softDeleteUser(id);

  // Unassign their profiles so work can be reassigned
  await prisma.clientProfile.updateMany({
    where: { assignedRecruiterId: id },
    data: { assignedRecruiterId: null },
  });
  await prisma.clientProfileAssignment.deleteMany({ where: { recruiterId: id } });

  await writeAuditLog({
    userId: actor.id,
    action: 'RECRUITER_DELETED',
    entity: 'User',
    entityId: id,
    ...meta,
  });

  return { message: 'Recruiter deleted successfully' };
}

export async function listRecruiters(query: ListRecruitersQuery, actor: Requester) {
  const repoQuery: any = { ...query };
  if (actor.role === Role.TEAM_LEADER) {
    repoQuery.teamLeaderId = actor.id;
  } else if (actor.role === Role.RECRUITER || actor.role === Role.RESUME_ASSIST || actor.role === Role.SALES_EXEC) {
    const user = await prisma.user.findUnique({ where: { id: actor.id } });
    if (user?.createdById) {
      repoQuery.teamLeaderId = user.createdById;
    } else {
      repoQuery.teamLeaderId = actor.id;
    }
  }

  const [users, total] = await repo.listRecruiters(repoQuery as any);
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
export async function getRecruiterStats(id: string, actor: Requester) {
  const user = await repo.findActiveById(id);
  if (!user) throw ApiError.notFound('Recruiter not found');

  if (actor.role === Role.TEAM_LEADER && user.createdById !== actor.id && user.id !== actor.id) {
    throw ApiError.forbidden('You can only view stats for recruiters managed by your team');
  }

  const todayBusinessDate = getBusinessDateString(new Date());

  const isTargetTeamLeader = user.role === Role.TEAM_LEADER;

  const [assignedProfiles, totalPortalCounts, shiftPortalCounts] = await Promise.all([
    prisma.clientProfile.findMany({
      where: {
        deletedAt: null,
        OR: isTargetTeamLeader
          ? [
              { assignedRecruiterId: id },
              { assignedRecruiter: { createdById: id } },
              { assignedRecruiterAssignments: { some: { recruiterId: id } } },
              { assignedRecruiterAssignments: { some: { recruiter: { createdById: id } } } },
            ]
          : [
              { assignedRecruiterId: id },
              { assignedRecruiterAssignments: { some: { recruiterId: id } } },
            ],
      },
      select: { id: true, candidateName: true, technology: true },
      orderBy: { candidateName: 'asc' },
    }),
    prisma.jobApplication.groupBy({
      by: ['jobPortal'],
      where: isTargetTeamLeader
        ? {
            recruiter: {
              deletedAt: null,
              OR: [{ id }, { createdById: id }],
            },
          }
        : { recruiterId: id },
      _count: { _all: true },
    }),
    prisma.jobApplication.groupBy({
      by: ['jobPortal'],
      where: isTargetTeamLeader
        ? {
            recruiter: {
              deletedAt: null,
              OR: [{ id }, { createdById: id }],
            },
            businessDate: new Date(`${todayBusinessDate}T00:00:00.000Z`),
          }
        : { recruiterId: id, businessDate: new Date(`${todayBusinessDate}T00:00:00.000Z`) },
      _count: { _all: true },
    }),
  ]);

  const totalStats = calculateAdjustedCounts(totalPortalCounts.map(r => ({ jobPortal: r.jobPortal as JobPortal, count: r._count._all })));
  const shiftStats = calculateAdjustedCounts(shiftPortalCounts.map(r => ({ jobPortal: r.jobPortal as JobPortal, count: r._count._all })));

  const rawTotalApplications = totalPortalCounts.reduce((acc, r) => acc + r._count._all, 0);
  const rawCurrentShiftApplications = shiftPortalCounts.reduce((acc, r) => acc + r._count._all, 0);

  const profileIds = assignedProfiles.map((p) => p.id);
  const [applicationsByProfile, currentShiftApplicationsByProfile] = profileIds.length
    ? await Promise.all([
        prisma.jobApplication.groupBy({
          by: ['profileId', 'jobPortal'],
          where: isTargetTeamLeader
            ? {
                recruiter: {
                  deletedAt: null,
                  OR: [{ id }, { createdById: id }],
                },
                profileId: { in: profileIds },
              }
            : { recruiterId: id, profileId: { in: profileIds } },
          _count: { _all: true },
        }),
        prisma.jobApplication.groupBy({
          by: ['profileId', 'jobPortal'],
          where: isTargetTeamLeader
            ? {
                recruiter: {
                  deletedAt: null,
                  OR: [{ id }, { createdById: id }],
                },
                profileId: { in: profileIds },
                businessDate: new Date(`${todayBusinessDate}T00:00:00.000Z`),
              }
            : {
                recruiterId: id,
                profileId: { in: profileIds },
                businessDate: new Date(`${todayBusinessDate}T00:00:00.000Z`),
              },
          _count: { _all: true },
        }),
      ])
    : [[], []];

  const allTimeProfilePortals = new Map<string, { jobPortal: JobPortal; count: number }[]>();
  for (const row of applicationsByProfile) {
    const list = allTimeProfilePortals.get(row.profileId) || [];
    list.push({ jobPortal: row.jobPortal as JobPortal, count: row._count._all });
    allTimeProfilePortals.set(row.profileId, list);
  }

  const shiftProfilePortals = new Map<string, { jobPortal: JobPortal; count: number }[]>();
  for (const row of currentShiftApplicationsByProfile) {
    const list = shiftProfilePortals.get(row.profileId) || [];
    list.push({ jobPortal: row.jobPortal as JobPortal, count: row._count._all });
    shiftProfilePortals.set(row.profileId, list);
  }

  const membersCount = user.role === Role.TEAM_LEADER
    ? (await prisma.user.count({ where: { createdById: id, deletedAt: null } })) + 1
    : undefined;

  const teamLeader = user.role === Role.RECRUITER && user.createdBy
    ? { id: user.createdBy.id, name: user.createdBy.name, email: user.createdBy.email, teamName: user.createdBy.teamName }
    : null;

  return {
    recruiter: sanitizeUser(user),
    assignedProfilesCount: assignedProfiles.length,
    totalApplications: totalStats.total,
    rawTotalApplications,
    ashbyRemainder: totalStats.ashbyRemainder,
    currentShiftApplications: shiftStats.total,
    rawCurrentShiftApplications,
    ashbyShiftRemainder: shiftStats.ashbyRemainder,
    currentBusinessDate: todayBusinessDate,
    profileWiseCounts: assignedProfiles.map((profile) => {
      const pTotalStats = calculateAdjustedCounts(allTimeProfilePortals.get(profile.id) || []);
      const pShiftStats = calculateAdjustedCounts(shiftProfilePortals.get(profile.id) || []);
      const rawApplicationCount = (allTimeProfilePortals.get(profile.id) || []).reduce((acc, r) => acc + r.count, 0);
      const rawCurrentShiftApplicationCount = (shiftProfilePortals.get(profile.id) || []).reduce((acc, r) => acc + r.count, 0);
      return {
        profileId: profile.id,
        candidateName: profile.candidateName,
        technology: profile.technology,
        applicationCount: pTotalStats.total,
        totalApplications: pTotalStats.total,
        rawApplicationCount,
        rawTotalApplications: rawApplicationCount,
        currentShiftApplicationCount: pShiftStats.total,
        currentShiftApplications: pShiftStats.total,
        rawCurrentShiftApplicationCount,
        rawCurrentShiftApplications: rawCurrentShiftApplicationCount,
      };
    }),
    lastActiveAt: user.lastActiveAt,
    teamLeader,
    membersCount,
  };
}

export async function updateMyTeamName(userId: string, input: TeamNameInput) {
  const user = await repo.findActiveById(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role !== Role.TEAM_LEADER) throw ApiError.forbidden('Only Team Leaders can set a team name');

  const updated = await repo.updateUser(userId, { teamName: input.teamName ?? null });
  return sanitizeUser(updated);
}

export async function resetRecruiterPassword(id: string, actor: Requester) {
  if (actor.role !== Role.ADMIN) {
    throw ApiError.forbidden('Only admins can reset passwords');
  }

  const user = await repo.findActiveById(id);
  if (!user) throw ApiError.notFound('Recruiter not found');

  const defaultPasswordHash = await hashPassword('Pass@123');

  const updated = await prisma.user.update({
    where: { id },
    data: {
      passwordHash: defaultPasswordHash,
      securityQuestion: null,
      securityAnswerHash: null,
    },
  });

  return sanitizeUser(updated);
}

function sanitizeUser<T extends { passwordHash?: string }>(user: T) {
  const { passwordHash, ...rest } = user as any;
  return rest;
}

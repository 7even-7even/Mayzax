import { Role, Prisma, JobPortal } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/utils/apiError';
import { getBusinessDateString, getShiftWindowText } from '@/utils/businessDate';
import { DashboardQuery, DailyCountsQuery, JobPortalAnalyticsQuery } from './analytics.validation';

const ANALYTICS_JOB_PORTALS = [
  'LINKEDIN',
  'INDEED',
  'GLASSDOOR',
  'JOBRIGHT',
  'SIMPLIFY',
  'SIMPLYHIRED',
  'WELLFOUND',
  'HANDSHAKE',
  'SPEEDY_APPLY',
  'THE_MUSE',
  'Y_COMBINATOR',
  'LEVER',
  'GREENHOUSE',
  'CAREER_SITE',
  'OTHER',
] as JobPortal[];

/**
 * Admin dashboard: per-recruiter rollups.
 * - Recruiter Name
 * - Assigned Profiles
 * - Total Applications
 * - Profile-wise application counts (fetched lazily per-recruiter via getRecruiterBreakdown)
 * - Last active time
 * Supports search, sorting, filtering, pagination.
 */
export async function getDashboardOverview(query: DashboardQuery, actor: { id: string; role: Role }) {
  const recruiters = await prisma.user.findMany({
    where: {
      role: Role.RECRUITER,
      deletedAt: null,
      ...(actor.role === Role.TEAM_LEADER ? { createdById: actor.id } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      lastActiveAt: true,
      createdAt: true,
      _count: { select: { applications: true } },
    },
  });

  const todayBusinessDate = getBusinessDateString(new Date());
  const businessDateFilter = new Date(`${todayBusinessDate}T00:00:00.000Z`);

  const currentShiftCounts = await prisma.jobApplication.groupBy({
    by: ['recruiterId'],
    where: { businessDate: businessDateFilter },
    _count: { _all: true },
  });
  const shiftCountMap = new Map(currentShiftCounts.map((r) => [r.recruiterId, r._count._all]));

  const assignedProfileCounts = await Promise.all(
    recruiters.map((recruiter) =>
      prisma.clientProfile.count({
        where: {
          deletedAt: null,
          OR: [
            { assignedRecruiterId: recruiter.id },
            { assignedRecruiterAssignments: { some: { recruiterId: recruiter.id } } },
          ],
        },
      }),
    ),
  );

  let rows = recruiters.map((r, index) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    isActive: r.isActive,
    assignedProfiles: assignedProfileCounts[index],
    totalApplications: r._count.applications,
    currentShiftApplications: shiftCountMap.get(r.id) ?? 0,
    lastActiveAt: r.lastActiveAt,
  }));

  // Sort
  rows.sort((a, b) => {
    const dir = query.sortOrder === 'asc' ? 1 : -1;
    const av = a[query.sortBy as keyof typeof a];
    const bv = b[query.sortBy as keyof typeof b];
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });

  const total = rows.length;
  const start = (query.page - 1) * query.pageSize;
  rows = rows.slice(start, start + query.pageSize);

  return {
    items: rows,
    currentBusinessDate: todayBusinessDate,
    pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
  };
}

/** Expandable recruiter view: profile-wise application counts for a given recruiter. */
export async function getRecruiterBreakdown(recruiterId: string, actor: { id: string; role: Role }) {
  if (actor.role === Role.TEAM_LEADER) {
    const recruiter = await prisma.user.findFirst({
      where: { id: recruiterId, createdById: actor.id, deletedAt: null },
    });
    if (!recruiter) {
      throw ApiError.forbidden('You can only access recruiter stats for your own team');
    }
  }

  const todayBusinessDate = getBusinessDateString(new Date());
  const businessDateFilter = new Date(`${todayBusinessDate}T00:00:00.000Z`);

  const [assignedProfiles, totalProfileWise, currentShiftProfileWise, recentApplications] = await Promise.all([
    prisma.clientProfile.findMany({
      where: {
        deletedAt: null,
        OR: [
          { assignedRecruiterId: recruiterId },
          { assignedRecruiterAssignments: { some: { recruiterId } } },
        ],
      },
      select: { id: true, candidateName: true, technology: true },
      orderBy: { candidateName: 'asc' },
    }),
    prisma.jobApplication.groupBy({
      by: ['profileId'],
      where: { recruiterId },
      _count: { _all: true },
    }),
    prisma.jobApplication.groupBy({
      by: ['profileId'],
      where: { recruiterId, businessDate: businessDateFilter },
      _count: { _all: true },
    }),
    prisma.jobApplication.findMany({
      where: { recruiterId },
      orderBy: { appliedAt: 'desc' },
      take: 10,
      include: { profile: { select: { id: true, candidateName: true } } },
    }),
  ]);

  const totalCountMap = new Map(totalProfileWise.map((row) => [row.profileId, row._count._all]));
  const currentShiftCountMap = new Map(currentShiftProfileWise.map((row) => [row.profileId, row._count._all]));

  return {
    profileWiseCounts: assignedProfiles.map((profile) => ({
      profileId: profile.id,
      candidateName: profile.candidateName,
      technology: profile.technology,
      applicationCount: totalCountMap.get(profile.id) ?? 0,
      totalApplications: totalCountMap.get(profile.id) ?? 0,
      currentShiftApplicationCount: currentShiftCountMap.get(profile.id) ?? 0,
      currentShiftApplications: currentShiftCountMap.get(profile.id) ?? 0,
    })),
    recentApplications,
    currentBusinessDate: todayBusinessDate,
  };
}

/**
 * Daily counts grouped by business date - powers trend charts.
 * Uses raw SQL for efficient DB-side date grouping.
 */
export async function getDailyCounts(query: DailyCountsQuery, actor: { id: string; role: Role }) {
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date(Date.now() - 30 * 86400000);
  const to = query.to ? new Date(`${query.to}T00:00:00.000Z`) : new Date();

  let recruiterFilter = query.recruiterId
    ? Prisma.sql`AND "recruiterId" = ${query.recruiterId}`
    : Prisma.empty;

  if (actor.role === Role.TEAM_LEADER) {
    if (query.recruiterId) {
      const recruiter = await prisma.user.findFirst({
        where: { id: query.recruiterId, createdById: actor.id, deletedAt: null }
      });
      if (!recruiter) {
        throw ApiError.forbidden('You can only access stats for your own team recruiters');
      }
    } else {
      const teamRecruiters = await prisma.user.findMany({
        where: { createdById: actor.id, deletedAt: null },
        select: { id: true }
      });
      const teamRecruiterIds = teamRecruiters.map(r => r.id);
      if (teamRecruiterIds.length === 0) {
        return [];
      }
      recruiterFilter = Prisma.sql`AND "recruiterId" IN (${Prisma.join(teamRecruiterIds)})`;
    }
  }

  const rows = await prisma.$queryRaw<Array<{ businessDate: Date; count: bigint }>>(Prisma.sql`
    SELECT "businessDate", COUNT(*)::bigint as count
    FROM "job_applications"
    WHERE "businessDate" >= ${from} AND "businessDate" <= ${to}
    ${recruiterFilter}
    GROUP BY "businessDate"
    ORDER BY "businessDate" ASC
  `);

  return rows.map((r) => ({
    businessDate: r.businessDate.toISOString().slice(0, 10),
    count: Number(r.count),
  }));
}

export async function getJobPortalAnalytics(actor: { id: string; role: Role }, query: JobPortalAnalyticsQuery) {
  let where: Prisma.JobApplicationWhereInput = {};
  if (actor.role === Role.RECRUITER) {
    where = { recruiterId: actor.id };
  } else if (actor.role === Role.TEAM_LEADER) {
    const teamRecruiters = await prisma.user.findMany({
      where: { createdById: actor.id, deletedAt: null },
      select: { id: true }
    });
    const teamRecruiterIds = teamRecruiters.map(r => r.id);
    where = { recruiterId: { in: teamRecruiterIds } };
  }

  const currentBusinessDate = getBusinessDateString(new Date());

  if (query.scope === 'currentShift') {
    where.businessDate = new Date(`${currentBusinessDate}T00:00:00.000Z`);
  } else if (query.scope === 'custom' && (query.from || query.to)) {
    where.businessDate = {
      ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
      ...(query.to ? { lte: new Date(`${query.to}T00:00:00.000Z`) } : {}),
    };
  }

  const groupedCounts = await prisma.jobApplication.groupBy({
    by: ['jobPortal'],
    where,
    _count: { _all: true },
  });

  const countMap = new Map(groupedCounts.map((row) => [row.jobPortal, row._count._all]));
  const totalApplications = groupedCounts.reduce((sum, row) => sum + row._count._all, 0);
  const trackedPortalSet = new Set(ANALYTICS_JOB_PORTALS);
  const legacyOtherCount = groupedCounts
    .filter((row) => !trackedPortalSet.has(row.jobPortal))
    .reduce((sum, row) => sum + row._count._all, 0);

  return {
    totalApplications,
    currentBusinessDate,
    filter: { scope: query.scope, from: query.from ?? null, to: query.to ?? null },
    portals: ANALYTICS_JOB_PORTALS.map((portal) => ({ 
      portal,
      count: (countMap.get(portal) ?? 0) + (portal === JobPortal.OTHER ? legacyOtherCount : 0),
    })),
  };
}

export async function getGlobalSummary(actor: { id: string; role: Role }) {
  const todayBusinessDate = getBusinessDateString(new Date());
  const businessDateFilter = new Date(`${todayBusinessDate}T00:00:00.000Z`);

  const isTeamLeader = actor.role === Role.TEAM_LEADER;

  const [
    totalRecruiters,
    activeRecruiters,
    totalProfiles,
    totalApplications,
    todayApplications,
    teamLeaders,
    myTotalApplications,
    myTodayApplications,
    teamOpenLogs,
    teamApplicationsToday,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        role: Role.RECRUITER,
        deletedAt: null,
        ...(isTeamLeader ? { createdById: actor.id } : {}),
      },
    }),
    prisma.user.count({
      where: {
        role: Role.RECRUITER,
        deletedAt: null,
        isActive: true,
        ...(isTeamLeader ? { createdById: actor.id } : {}),
      },
    }),
    prisma.clientProfile.count({
      where: {
        deletedAt: null,
        ...(isTeamLeader
          ? {
              OR: [
                { assignedRecruiter: { createdById: actor.id } },
                { assignedRecruiterAssignments: { some: { recruiter: { createdById: actor.id } } } },
              ],
            }
          : {}),
      },
    }),
    prisma.jobApplication.count({
      where: isTeamLeader ? { recruiter: { createdById: actor.id } } : {},
    }),
    prisma.jobApplication.count({
      where: {
        businessDate: businessDateFilter,
        ...(isTeamLeader ? { recruiter: { createdById: actor.id } } : {}),
      },
    }),
    // Fetch TLs with their member count (Admin only; TL sees just themselves)
    isTeamLeader
      ? Promise.resolve([] as { id: string; name: string; teamName: string | null; _count: { createdUsers: number } }[])
      : prisma.user.findMany({
          where: { role: Role.TEAM_LEADER, deletedAt: null, isActive: true },
          select: {
            id: true,
            name: true,
            teamName: true,
            _count: { select: { createdUsers: { where: { deletedAt: null } } } },
          },
          orderBy: { name: 'asc' },
        }),
    prisma.jobApplication.count({
      where: { recruiterId: actor.id },
    }),
    prisma.jobApplication.count({
      where: {
        recruiterId: actor.id,
        businessDate: businessDateFilter,
      },
    }),
    prisma.activityLog.findMany({
      where: {
        user: {
          role: Role.RECRUITER,
          deletedAt: null,
          ...(isTeamLeader ? { createdById: actor.id } : {}),
        },
        endedAt: null,
      },
      select: {
        status: true,
      },
    }),
    prisma.jobApplication.groupBy({
      by: ['recruiterId'],
      where: {
        businessDate: businessDateFilter,
        recruiter: {
          role: Role.RECRUITER,
          deletedAt: null,
          ...(isTeamLeader ? { createdById: actor.id } : {}),
        },
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const activeMemberCount = teamOpenLogs.filter((log) => log.status === 'ACTIVE').length;
  const onBreakMemberCount = teamOpenLogs.filter(
    (log) => log.status === 'SHORT_BREAK' || log.status === 'DINNER_BREAK'
  ).length;

  let topPerformer = '-';
  if (teamApplicationsToday.length > 0) {
    const top = teamApplicationsToday.reduce((prev, current) =>
      prev._count._all > current._count._all ? prev : current
    );
    const topUser = await prisma.user.findUnique({
      where: { id: top.recruiterId },
      select: { name: true },
    });
    if (topUser) {
      topPerformer = `${topUser.name} (${top._count._all})`;
    }
  }

  const teams = teamLeaders.map((tl) => ({
    tlId: tl.id,
    tlName: tl.name,
    teamName: tl.teamName ?? null,
    memberCount: tl._count.createdUsers,
  }));

  return {
    totalRecruiters,
    activeRecruiters,
    totalProfiles,
    totalApplications,
    currentShiftApplications: todayApplications,
    currentBusinessDate: todayBusinessDate,
    shiftWindowText: getShiftWindowText(),
    totalTeams: teams.length,
    teams,
    myTotalApplications,
    myCurrentShiftApplications: myTodayApplications,
    activeMemberCount,
    onBreakMemberCount,
    topPerformer,
  };
}



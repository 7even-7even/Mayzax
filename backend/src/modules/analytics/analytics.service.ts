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
  'EASY_APPLY',
  'THE_MUSE',
  'Y_COMBINATOR',
  'LEVER',
  'GREENHOUSE',
  'CAREER_SITE',
  'ASHBY',
  'OTHER',
] as JobPortal[];

export function calculateAdjustedCounts(portalCounts: { jobPortal: JobPortal; count: number }[]) {
  let total = 0;
  let ashbyRaw = 0;
  let easyApplyRaw = 0;
  for (const item of portalCounts) {
    if (item.jobPortal === 'ASHBY') {
      ashbyRaw += item.count;
    } else if (item.jobPortal === 'EASY_APPLY') {
      easyApplyRaw += item.count;
    } else {
      total += item.count;
    }
  }
  total += Math.floor(ashbyRaw / 10);
  total += Math.floor(easyApplyRaw / 2);
  const ashbyRemainder = ashbyRaw % 10;
  const easyApplyRemainder = easyApplyRaw % 2;
  return { total, ashbyRemainder, ashbyRaw, easyApplyRemainder, easyApplyRaw };
}

export async function getAdjustedApplicationCounts(where: Prisma.JobApplicationWhereInput) {
  const updatedWhere: Prisma.JobApplicationWhereInput = {
    ...where,
    recruiter: {
      isActive: true,
      deletedAt: null,
      ...(where.recruiter as any || {}),
    },
  };
  const grouped = await prisma.jobApplication.groupBy({
    by: ['jobPortal'],
    where: updatedWhere,
    _count: { _all: true },
  });
  const rawCounts = grouped.map((g) => ({
    jobPortal: g.jobPortal as JobPortal,
    count: g._count._all,
  }));
  return calculateAdjustedCounts(rawCounts).total;
}


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
      isActive: true,
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

  const allTimeCountsGrouped = await prisma.jobApplication.groupBy({
    by: ['recruiterId', 'jobPortal'],
    where: { recruiter: { isActive: true, deletedAt: null } },
    _count: { _all: true },
  });

  const currentShiftCountsGrouped = await prisma.jobApplication.groupBy({
    by: ['recruiterId', 'jobPortal'],
    where: { 
      businessDate: businessDateFilter,
      recruiter: { isActive: true, deletedAt: null }
    },
    _count: { _all: true },
  });

  const allTimeRecruiterPortals = new Map<string, { jobPortal: JobPortal; count: number }[]>();
  for (const row of allTimeCountsGrouped) {
    const list = allTimeRecruiterPortals.get(row.recruiterId) || [];
    list.push({ jobPortal: row.jobPortal as JobPortal, count: row._count._all });
    allTimeRecruiterPortals.set(row.recruiterId, list);
  }

  const shiftRecruiterPortals = new Map<string, { jobPortal: JobPortal; count: number }[]>();
  for (const row of currentShiftCountsGrouped) {
    const list = shiftRecruiterPortals.get(row.recruiterId) || [];
    list.push({ jobPortal: row.jobPortal as JobPortal, count: row._count._all });
    shiftRecruiterPortals.set(row.recruiterId, list);
  }

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

  const allTimeInterviewCallsGrouped = await prisma.interviewCall.groupBy({
    by: ['recruiterId'],
    where: { recruiter: { isActive: true, deletedAt: null } },
    _count: { _all: true },
  });

  const currentShiftInterviewCallsGrouped = await prisma.interviewCall.groupBy({
    by: ['recruiterId'],
    where: {
      businessDate: businessDateFilter,
      recruiter: { isActive: true, deletedAt: null },
    },
    _count: { _all: true },
  });

  const allTimeInterviewCallsMap = new Map<string, number>(
    allTimeInterviewCallsGrouped.map((row) => [row.recruiterId, row._count._all])
  );

  const shiftInterviewCallsMap = new Map<string, number>(
    currentShiftInterviewCallsGrouped.map((row) => [row.recruiterId, row._count._all])
  );

  let rows = recruiters.map((r, index) => {
    const totalStats = calculateAdjustedCounts(allTimeRecruiterPortals.get(r.id) || []);
    const shiftStats = calculateAdjustedCounts(shiftRecruiterPortals.get(r.id) || []);
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      isActive: r.isActive,
      assignedProfiles: assignedProfileCounts[index],
      totalApplications: totalStats.total,
      ashbyRemainder: totalStats.ashbyRemainder,
      easyApplyRemainder: totalStats.easyApplyRemainder,
      currentShiftApplications: shiftStats.total,
      ashbyShiftRemainder: shiftStats.ashbyRemainder,
      easyApplyShiftRemainder: shiftStats.easyApplyRemainder,
      totalInterviewCalls: allTimeInterviewCallsMap.get(r.id) || 0,
      currentShiftInterviewCalls: shiftInterviewCallsMap.get(r.id) || 0,
      lastActiveAt: r.lastActiveAt,
    };
  });


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
  const recruiter = await prisma.user.findFirst({
    where: { 
      id: recruiterId, 
      deletedAt: null, 
      isActive: true,
      ...(actor.role === Role.TEAM_LEADER ? { createdById: actor.id } : {}),
    },
  });
  if (!recruiter) {
    if (actor.role === Role.TEAM_LEADER) {
      throw ApiError.forbidden('You can only access recruiter stats for your own team');
    }
    throw ApiError.notFound('Recruiter not found or is inactive');
  }

  const todayBusinessDate = getBusinessDateString(new Date());
  const businessDateFilter = new Date(`${todayBusinessDate}T00:00:00.000Z`);

  const [assignedProfiles, totalProfileWise, currentShiftProfileWise, recentApplications, totalCallsWise, shiftCallsWise] = await Promise.all([
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
      by: ['profileId', 'jobPortal'],
      where: { recruiterId },
      _count: { _all: true },
    }),
    prisma.jobApplication.groupBy({
      by: ['profileId', 'jobPortal'],
      where: { recruiterId, businessDate: businessDateFilter },
      _count: { _all: true },
    }),
    prisma.jobApplication.findMany({
      where: { recruiterId },
      orderBy: { appliedAt: 'desc' },
      take: 10,
      include: { profile: { select: { id: true, candidateName: true } } },
    }),
    prisma.interviewCall.groupBy({
      by: ['profileId'],
      where: { recruiterId },
      _count: { _all: true },
    }),
    prisma.interviewCall.groupBy({
      by: ['profileId'],
      where: { recruiterId, businessDate: businessDateFilter },
      _count: { _all: true },
    }),
  ]);

  const allTimeProfilePortals = new Map<string, { jobPortal: JobPortal; count: number }[]>();
  for (const row of totalProfileWise) {
    const list = allTimeProfilePortals.get(row.profileId) || [];
    list.push({ jobPortal: row.jobPortal as JobPortal, count: row._count._all });
    allTimeProfilePortals.set(row.profileId, list);
  }

  const shiftProfilePortals = new Map<string, { jobPortal: JobPortal; count: number }[]>();
  for (const row of currentShiftProfileWise) {
    const list = shiftProfilePortals.get(row.profileId) || [];
    list.push({ jobPortal: row.jobPortal as JobPortal, count: row._count._all });
    shiftProfilePortals.set(row.profileId, list);
  }

  const totalCallsMap = new Map<string, number>(totalCallsWise.map((row) => [row.profileId, row._count._all]));
  const shiftCallsMap = new Map<string, number>(shiftCallsWise.map((row) => [row.profileId, row._count._all]));

  return {
    profileWiseCounts: assignedProfiles.map((profile) => {
      const totalStats = calculateAdjustedCounts(allTimeProfilePortals.get(profile.id) || []);
      const shiftStats = calculateAdjustedCounts(shiftProfilePortals.get(profile.id) || []);
      return {
        profileId: profile.id,
        candidateName: profile.candidateName,
        technology: profile.technology,
        applicationCount: totalStats.total,
        totalApplications: totalStats.total,
        currentShiftApplicationCount: shiftStats.total,
        currentShiftApplications: shiftStats.total,
        totalInterviewCalls: totalCallsMap.get(profile.id) || 0,
        currentShiftInterviewCalls: shiftCallsMap.get(profile.id) || 0,
      };
    }),
    recentApplications,
    currentBusinessDate: todayBusinessDate,
  };
}

/**
 * Daily counts grouped by business date - powers trend charts.
 * Uses raw SQL for efficient DB-side date grouping.
 */
export async function getDailyCounts(query: DailyCountsQuery & { teamId?: string }, actor: { id: string; role: Role }) {
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date(Date.now() - 30 * 86400000);
  const to = query.to ? new Date(`${query.to}T00:00:00.000Z`) : new Date();

  let allowedRecruiterIds: string[] | null = null;

  if (actor.role === Role.RECRUITER) {
    allowedRecruiterIds = [actor.id];
  } else if (actor.role === Role.TEAM_LEADER) {
    const teamRecruiters = await prisma.user.findMany({
      where: { createdById: actor.id, deletedAt: null, isActive: true },
      select: { id: true }
    });
    allowedRecruiterIds = [actor.id, ...teamRecruiters.map(r => r.id)];
  }

  let filteredIds: string[] = [];

  if (query.recruiterId) {
    if (allowedRecruiterIds && !allowedRecruiterIds.includes(query.recruiterId)) {
      throw ApiError.forbidden('You can only access stats for your own team recruiters');
    }
    filteredIds = [query.recruiterId];
  } else if (query.teamId) {
    if (actor.role === Role.TEAM_LEADER && query.teamId !== actor.id) {
      throw ApiError.forbidden('You can only access stats for your own team');
    }
    const teamRecruiters = await prisma.user.findMany({
      where: { createdById: query.teamId, deletedAt: null, isActive: true },
      select: { id: true }
    });
    filteredIds = [query.teamId, ...teamRecruiters.map(r => r.id)];
  } else if (allowedRecruiterIds) {
    filteredIds = allowedRecruiterIds;
  }

  let recruiterFilter = Prisma.empty;
  if (filteredIds.length > 0) {
    recruiterFilter = Prisma.sql`AND ja."recruiterId" IN (${Prisma.join(filteredIds)})`;
  } else if (actor.role !== Role.ADMIN) {
    return [];
  }

  const rows = (await (prisma as any).$queryRaw(Prisma.sql`
    SELECT ja."businessDate", ja."jobPortal", COUNT(*)::bigint as count
    FROM "job_applications" ja
    INNER JOIN "users" u ON ja."recruiterId" = u."id"
    WHERE ja."businessDate" >= ${from} AND ja."businessDate" <= ${to}
      AND u."isActive" = true AND u."deletedAt" IS NULL
      ${recruiterFilter}
    GROUP BY ja."businessDate", ja."jobPortal"
    ORDER BY ja."businessDate" ASC
  `)) as Array<{ businessDate: Date; jobPortal: JobPortal; count: bigint }>;

  const datePortalMap = new Map<string, { jobPortal: JobPortal; count: number }[]>();
  for (const r of rows) {
    const dateStr = r.businessDate.toISOString().slice(0, 10);
    const list = datePortalMap.get(dateStr) || [];
    list.push({ jobPortal: r.jobPortal, count: Number(r.count) });
    datePortalMap.set(dateStr, list);
  }

  const result: Array<{ businessDate: string; count: number }> = [];
  for (const [dateStr, portals] of datePortalMap.entries()) {
    const stats = calculateAdjustedCounts(portals);
    result.push({
      businessDate: dateStr,
      count: stats.total,
    });
  }

  result.sort((a, b) => a.businessDate.localeCompare(b.businessDate));
  return result;
}

export async function getJobPortalAnalytics(actor: { id: string; role: Role }, query: JobPortalAnalyticsQuery & { recruiterId?: string; teamId?: string }) {
  let allowedRecruiterIds: string[] | null = null;

  if (actor.role === Role.RECRUITER) {
    allowedRecruiterIds = [actor.id];
  } else if (actor.role === Role.TEAM_LEADER) {
    const teamRecruiters = await prisma.user.findMany({
      where: { createdById: actor.id, deletedAt: null, isActive: true },
      select: { id: true }
    });
    allowedRecruiterIds = [actor.id, ...teamRecruiters.map(r => r.id)];
  }

  let filteredIds: string[] = [];

  if (query.recruiterId) {
    if (allowedRecruiterIds && !allowedRecruiterIds.includes(query.recruiterId)) {
      throw ApiError.forbidden('You can only access stats for your own team recruiters');
    }
    filteredIds = [query.recruiterId];
  } else if (query.teamId) {
    if (actor.role === Role.TEAM_LEADER && query.teamId !== actor.id) {
      throw ApiError.forbidden('You can only access stats for your own team');
    }
    const teamRecruiters = await prisma.user.findMany({
      where: { createdById: query.teamId, deletedAt: null, isActive: true },
      select: { id: true }
    });
    filteredIds = [query.teamId, ...teamRecruiters.map(r => r.id)];
  } else if (allowedRecruiterIds) {
    filteredIds = allowedRecruiterIds;
  }

  let where: Prisma.JobApplicationWhereInput = {
    recruiter: { isActive: true, deletedAt: null },
  };
  if (filteredIds.length > 0) {
    where.recruiterId = { in: filteredIds };
  } else if (actor.role !== Role.ADMIN) {
    return {
      totalApplications: 0,
      currentBusinessDate: getBusinessDateString(new Date()),
      filter: { scope: query.scope, from: query.from ?? null, to: query.to ?? null },
      portals: ANALYTICS_JOB_PORTALS.map((portal) => ({ portal, count: 0 })),
    };
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
  
  const rawPortalCounts = groupedCounts.map((row) => ({
    jobPortal: row.jobPortal as JobPortal,
    count: row._count._all,
  }));
  const adjustedStats = calculateAdjustedCounts(rawPortalCounts);
  const totalApplications = adjustedStats.total;

  const trackedPortalSet = new Set(ANALYTICS_JOB_PORTALS);
  const legacyOtherCount = groupedCounts
    .filter((row) => !trackedPortalSet.has(row.jobPortal))
    .reduce((sum, row) => sum + row._count._all, 0);

  return {
    totalApplications,
    currentBusinessDate,
    filter: { scope: query.scope, from: query.from ?? null, to: query.to ?? null },
    portals: ANALYTICS_JOB_PORTALS.map((portal) => {
      let count = (countMap.get(portal) ?? 0) + (portal === JobPortal.OTHER ? legacyOtherCount : 0);
      if (portal === 'ASHBY') {
        count = Math.floor(count / 10);
      } else if (portal === 'EASY_APPLY') {
        count = Math.floor(count / 2);
      }
      return { portal, count };
    }),
  };
}

export async function getGlobalSummary(actor: { id: string; role: Role }) {
  if (actor.role === Role.RECRUITER) {
    const todayBusinessDate = getBusinessDateString(new Date());
    const businessDateFilter = new Date(`${todayBusinessDate}T00:00:00.000Z`);
    const [myTotalApplications, myTodayApplications] = await Promise.all([
      getAdjustedApplicationCounts({ recruiterId: actor.id }),
      getAdjustedApplicationCounts({
        recruiterId: actor.id,
        businessDate: businessDateFilter,
      }),
    ]);

    return {
      totalRecruiters: 0,
      activeRecruiters: 0,
      totalProfiles: 0,
      totalApplications: 0,
      currentShiftApplications: 0,
      currentBusinessDate: todayBusinessDate,
      shiftWindowText: getShiftWindowText(),
      totalTeams: 0,
      teams: [],
      myTotalApplications,
      myCurrentShiftApplications: myTodayApplications,
      activeMemberCount: 0,
      onBreakMemberCount: 0,
      topPerformer: '-',
      roleBreakdown: {},
    };
  }

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
        deletedAt: null,
        isActive: true,
        ...(isTeamLeader
          ? {
              OR: [
                { id: actor.id },
                { createdById: actor.id, role: Role.RECRUITER },
              ],
            }
          : {}),
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        isActive: true,
        ...(isTeamLeader
          ? {
              OR: [
                { id: actor.id },
                { createdById: actor.id, role: Role.RECRUITER },
              ],
            }
          : { role: Role.RECRUITER }),
      },
    }),
    prisma.clientProfile.count({
      where: {
        deletedAt: null,
        OR: [
          { assignedRecruiterId: null },
          { assignedRecruiter: { isActive: true, deletedAt: null } }
        ],
        ...(isTeamLeader
          ? {
              OR: [
                { assignedRecruiterId: actor.id },
                { assignedRecruiter: { createdById: actor.id, isActive: true, deletedAt: null } },
                { assignedRecruiterAssignments: { some: { recruiterId: actor.id } } },
                { assignedRecruiterAssignments: { some: { recruiter: { createdById: actor.id, isActive: true, deletedAt: null } } } },
              ],
            }
          : {}),
      },
    }),
    getAdjustedApplicationCounts(isTeamLeader
      ? {
          OR: [
            { recruiterId: actor.id },
            { recruiter: { createdById: actor.id } },
          ],
        }
      : {}),
    getAdjustedApplicationCounts({
      businessDate: businessDateFilter,
      ...(isTeamLeader
        ? {
            OR: [
              { recruiterId: actor.id },
              { recruiter: { createdById: actor.id } },
            ],
          }
        : {}),
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
            _count: { select: { createdUsers: { where: { deletedAt: null, isActive: true } } } },
          },
          orderBy: { name: 'asc' },
        }),
    getAdjustedApplicationCounts({ recruiterId: actor.id }),
    getAdjustedApplicationCounts({
      recruiterId: actor.id,
      businessDate: businessDateFilter,
    }),
    prisma.activityLog.findMany({
      where: {
        user: {
          deletedAt: null,
          isActive: true,
          ...(isTeamLeader
            ? { OR: [{ id: actor.id }, { createdById: actor.id }] }
            : { role: { in: [Role.RECRUITER, Role.TEAM_LEADER] } }),
        },
        endedAt: null,
      },
      select: {
        status: true,
      },
    }),
    prisma.jobApplication.groupBy({
      by: ['recruiterId', 'jobPortal'],
      where: {
        businessDate: businessDateFilter,
        recruiter: {
          deletedAt: null,
          isActive: true,
          ...(isTeamLeader
            ? { OR: [{ id: actor.id }, { createdById: actor.id }] }
            : { role: { in: [Role.RECRUITER, Role.TEAM_LEADER] } }),
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
  let topPerformerId: string | null = null;
  if (teamApplicationsToday.length > 0) {
    const recruiterPortalCounts = new Map<string, { jobPortal: JobPortal; count: number }[]>();
    for (const row of teamApplicationsToday) {
      const list = recruiterPortalCounts.get(row.recruiterId) || [];
      list.push({ jobPortal: row.jobPortal as JobPortal, count: row._count._all });
      recruiterPortalCounts.set(row.recruiterId, list);
    }
    let topRecruiterId = '';
    let topCount = -1;
    for (const recruiterId of recruiterPortalCounts.keys()) {
      const stats = calculateAdjustedCounts(recruiterPortalCounts.get(recruiterId)!);
      if (stats.total > topCount) {
        topCount = stats.total;
        topRecruiterId = recruiterId;
      }
    }
    if (topRecruiterId) {
      topPerformerId = topRecruiterId;
      const topUser = await prisma.user.findUnique({
        where: { id: topRecruiterId },
        select: { name: true },
      });
      if (topUser) {
        topPerformer = `${topUser.name} (${topCount})`;
      }
    }
  }

  const teamStats = await Promise.all(
    teamLeaders.map(async (tl) => {
      const [totalCount, todayCount] = await Promise.all([
        getAdjustedApplicationCounts({
          OR: [
            { recruiterId: tl.id },
            { recruiter: { createdById: tl.id } },
          ],
        }),
        getAdjustedApplicationCounts({
          businessDate: businessDateFilter,
          OR: [
            { recruiterId: tl.id },
            { recruiter: { createdById: tl.id } },
          ],
        }),
      ]);
      return { tlId: tl.id, totalCount, todayCount };
    })
  );

  const teamStatsMap = new Map(teamStats.map((s) => [s.tlId, s]));

  const teams = teamLeaders.map((tl) => {
    const stats = teamStatsMap.get(tl.id);
    return {
      tlId: tl.id,
      tlName: tl.name,
      teamName: tl.teamName ?? null,
      memberCount: tl._count.createdUsers,
      totalApplications: stats?.totalCount ?? 0,
      currentApplications: stats?.todayCount ?? 0,
    };
  });

  const roleGroups = await prisma.user.groupBy({
    by: ['role'],
    where: {
      deletedAt: null,
      ...(isTeamLeader ? { createdById: actor.id } : {}),
    },
    _count: {
      role: true,
    },
  });

  const roleBreakdown = roleGroups.reduce((acc, curr) => {
    acc[curr.role] = curr._count.role;
    return acc;
  }, {} as Record<string, number>);

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
    topPerformerId,
    roleBreakdown,
  };
}



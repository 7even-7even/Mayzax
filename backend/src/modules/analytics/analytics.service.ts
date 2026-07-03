import { Role, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getBusinessDateString } from '@/utils/businessDate';
import { DashboardQuery, DailyCountsQuery } from './analytics.validation';

/**
 * Admin dashboard: per-recruiter rollups.
 * - Recruiter Name
 * - Assigned Profiles
 * - Total Applications
 * - Profile-wise application counts (fetched lazily per-recruiter via getRecruiterBreakdown)
 * - Last active time
 * Supports search, sorting, filtering, pagination.
 */
export async function getDashboardOverview(query: DashboardQuery) {
  const recruiters = await prisma.user.findMany({
    where: {
      role: Role.RECRUITER,
      deletedAt: null,
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
      _count: { select: { assignedProfiles: true, applications: true } },
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

  let rows = recruiters.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    isActive: r.isActive,
    assignedProfiles: r._count.assignedProfiles,
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
export async function getRecruiterBreakdown(recruiterId: string) {
  const [profileWise, recentApplications] = await Promise.all([
    prisma.jobApplication.groupBy({
      by: ['profileId'],
      where: { recruiterId },
      _count: { _all: true },
    }),
    prisma.jobApplication.findMany({
      where: { recruiterId },
      orderBy: { appliedAt: 'desc' },
      take: 10,
      include: { profile: { select: { id: true, candidateName: true } } },
    }),
  ]);

  const profileIds = profileWise.map((p) => p.profileId);
  const profiles = await prisma.clientProfile.findMany({
    where: { id: { in: profileIds } },
    select: { id: true, candidateName: true, technology: true },
  });
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return {
    profileWiseCounts: profileWise.map((row) => ({
      profileId: row.profileId,
      candidateName: profileMap.get(row.profileId)?.candidateName ?? 'Unknown',
      technology: profileMap.get(row.profileId)?.technology ?? null,
      applicationCount: row._count._all,
    })),
    recentApplications,
  };
}

/**
 * Daily counts grouped by business date - powers trend charts.
 * Uses raw SQL for efficient DB-side date grouping.
 */
export async function getDailyCounts(query: DailyCountsQuery) {
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date(Date.now() - 30 * 86400000);
  const to = query.to ? new Date(`${query.to}T00:00:00.000Z`) : new Date();

  const recruiterFilter = query.recruiterId
    ? Prisma.sql`AND "recruiterId" = ${query.recruiterId}`
    : Prisma.empty;

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

export async function getGlobalSummary() {
  const todayBusinessDate = getBusinessDateString(new Date());
  const businessDateFilter = new Date(`${todayBusinessDate}T00:00:00.000Z`);

  const [totalRecruiters, activeRecruiters, totalProfiles, totalApplications, todayApplications] = await Promise.all([
    prisma.user.count({ where: { role: Role.RECRUITER, deletedAt: null } }),
    prisma.user.count({ where: { role: Role.RECRUITER, deletedAt: null, isActive: true } }),
    prisma.clientProfile.count({ where: { deletedAt: null } }),
    prisma.jobApplication.count(),
    prisma.jobApplication.count({ where: { businessDate: businessDateFilter } }),
  ]);

  return {
    totalRecruiters,
    activeRecruiters,
    totalProfiles,
    totalApplications,
    currentShiftApplications: todayApplications,
    currentBusinessDate: todayBusinessDate,
  };
}

import { Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ListApplicationsQuery } from './application.validation';

export function findByProfileAndNormalizedLink(profileId: string, normalizedJobLink: string) {
  return prisma.jobApplication.findUnique({
    where: { unique_profile_joblink: { profileId, normalizedJobLink } },
    include: { recruiter: { select: { id: true, name: true, email: true } } },
  });
}

type JobApplicationCreateInputWithLoosePortal = Omit<Prisma.JobApplicationUncheckedCreateInput, 'jobPortal'> & {
  jobPortal?: unknown;
};

type JobApplicationUpdateInputWithLoosePortal = Omit<Prisma.JobApplicationUpdateInput, 'jobPortal'> & {
  jobPortal?: unknown;
};

export function create(data: JobApplicationCreateInputWithLoosePortal) {
  return prisma.jobApplication.create({
    data: data as Prisma.JobApplicationUncheckedCreateInput,
    include: {
      profile: { select: { id: true, candidateName: true, technology: true } },
      recruiter: { select: { id: true, name: true, email: true } },
    },
  });
}

export function findById(id: string) {
  return prisma.jobApplication.findUnique({
    where: { id },
    include: {
      profile: {
        select: {
          id: true,
          candidateName: true,
          technology: true,
          assignedRecruiterId: true,
          assignedRecruiterAssignments: { select: { recruiterId: true } },
        },
      },
      recruiter: { select: { id: true, name: true, email: true } },
    },
  });
}

export function update(id: string, data: JobApplicationUpdateInputWithLoosePortal) {
  return prisma.jobApplication.update({
    where: { id },
    data: data as Prisma.JobApplicationUpdateInput,
    include: {
      profile: { select: { id: true, candidateName: true, technology: true } },
      recruiter: { select: { id: true, name: true, email: true } },
    },
  });
}

export function buildWhereClause(
  query: ListApplicationsQuery,
  requester: { id: string; role: Role },
): Prisma.JobApplicationWhereInput {
  const conditions: Prisma.JobApplicationWhereInput[] = [];

  if (query.profileId) conditions.push({ profileId: query.profileId });
  if (query.status) conditions.push({ status: query.status });
  if (query.jobPortal) conditions.push({ jobPortal: query.jobPortal as any });

  if (query.search) {
    conditions.push({
      OR: [
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { jobTitle: { contains: query.search, mode: 'insensitive' } },
        { jobLink: { contains: query.search, mode: 'insensitive' } },
        { profile: { candidateName: { contains: query.search, mode: 'insensitive' } } },
        { recruiter: { name: { contains: query.search, mode: 'insensitive' } } },
      ],
    });
  }

  if (requester.role === Role.RECRUITER) {
    conditions.push({
      OR: [
        { recruiterId: requester.id },
        {
          profile: {
            OR: [
              { assignedRecruiterId: requester.id },
              { assignedRecruiterAssignments: { some: { recruiterId: requester.id } } },
            ],
          },
        },
      ],
    });
  } else if (query.recruiterId) {
    conditions.push({ recruiterId: query.recruiterId });
  }

  if (query.businessDateFrom || query.businessDateTo) {
    conditions.push({
      businessDate: {
        ...(query.businessDateFrom ? { gte: new Date(`${query.businessDateFrom}T00:00:00.000Z`) } : {}),
        ...(query.businessDateTo ? { lte: new Date(`${query.businessDateTo}T00:00:00.000Z`) } : {}),
      },
    });
  }

  return conditions.length ? { AND: conditions } : {};
}

export function list(query: ListApplicationsQuery, requester: { id: string; role: Role }) {
  const where = buildWhereClause(query, requester);
  const orderBy: Prisma.JobApplicationOrderByWithRelationInput = { [query.sortBy]: query.sortOrder };

  return prisma.$transaction([
    prisma.jobApplication.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        profile: { select: { id: true, candidateName: true, technology: true } },
        recruiter: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.jobApplication.count({ where }),
  ]);
}

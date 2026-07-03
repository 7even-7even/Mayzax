import { Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ListApplicationsQuery } from './application.validation';

export function findByProfileAndNormalizedLink(profileId: string, normalizedJobLink: string) {
  return prisma.jobApplication.findUnique({
    where: { unique_profile_joblink: { profileId, normalizedJobLink } },
  });
}

export function create(data: Prisma.JobApplicationUncheckedCreateInput) {
  return prisma.jobApplication.create({
    data,
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
      profile: { select: { id: true, candidateName: true, technology: true, assignedRecruiterId: true } },
      recruiter: { select: { id: true, name: true, email: true } },
    },
  });
}

export function update(id: string, data: Prisma.JobApplicationUpdateInput) {
  return prisma.jobApplication.update({
    where: { id },
    data,
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
  const where: Prisma.JobApplicationWhereInput = {
    ...(query.profileId ? { profileId: query.profileId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.jobPortal ? { jobPortal: query.jobPortal } : {}),
    ...(query.search
      ? {
          OR: [
            { companyName: { contains: query.search, mode: 'insensitive' } },
            { jobTitle: { contains: query.search, mode: 'insensitive' } },
            { jobLink: { contains: query.search, mode: 'insensitive' } },
            { profile: { candidateName: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  if (requester.role === Role.RECRUITER) {
    where.recruiterId = requester.id;
  } else if (query.recruiterId) {
    where.recruiterId = query.recruiterId;
  }

  if (query.businessDateFrom || query.businessDateTo) {
    where.businessDate = {
      ...(query.businessDateFrom ? { gte: new Date(`${query.businessDateFrom}T00:00:00.000Z`) } : {}),
      ...(query.businessDateTo ? { lte: new Date(`${query.businessDateTo}T00:00:00.000Z`) } : {}),
    };
  }

  return where;
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

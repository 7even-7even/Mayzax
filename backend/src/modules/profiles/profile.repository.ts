import { Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ListProfilesQuery } from './profile.validation';

export function findActiveById(id: string) {
  return prisma.clientProfile.findFirst({
    where: { id, deletedAt: null },
    include: {
      assignedRecruiter: { select: { id: true, name: true, email: true } },
      assignedRecruiterAssignments: {
        include: { recruiter: { select: { id: true, name: true, email: true } } },
      },
    },
  });
}

export function findRecruiterAssignments(profileId: string) {
  return prisma.clientProfileAssignment.findMany({
    where: { profileId },
    include: { recruiter: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export function create(data: {
  candidateName: string;
  email: string;
  phone: string;
  technology: string;
  notes?: string | null;
  assignedRecruiterId?: string | null;
}) {
  return prisma.clientProfile.create({
    data,
    include: {
      assignedRecruiter: { select: { id: true, name: true, email: true } },
      assignedRecruiterAssignments: {
        include: { recruiter: { select: { id: true, name: true, email: true } } },
      },
    },
  });
}

export function update(id: string, data: Partial<Prisma.ClientProfileUncheckedUpdateInput>) {
  return prisma.clientProfile.update({ where: { id }, data });
}

export function replaceRecruiterAssignments(profileId: string, recruiterIds: string[]) {
  if (recruiterIds.length === 0) {
    return prisma.clientProfileAssignment.deleteMany({ where: { profileId } });
  }

  return prisma.$transaction([
    prisma.clientProfileAssignment.deleteMany({ where: { profileId } }),
    prisma.clientProfileAssignment.createMany({
      data: recruiterIds.map((recruiterId) => ({ profileId, recruiterId })),
      skipDuplicates: true,
    }),
  ]);
}

export function softDelete(id: string) {
  return prisma.clientProfile.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
}

/**
 * Builds the WHERE clause honoring role-based visibility:
 * Admins see all profiles; Recruiters only see profiles assigned to them.
 */
export function buildWhereClause(
  query: ListProfilesQuery,
  requester: { id: string; role: Role },
): Prisma.ClientProfileWhereInput {
  const conditions: Prisma.ClientProfileWhereInput[] = [{ deletedAt: null }];

  if (query.isActive !== undefined) {
    conditions.push({ isActive: query.isActive });
  }

  if (query.technology) {
    conditions.push({ technology: { equals: query.technology, mode: 'insensitive' } });
  }

  if (query.search) {
    conditions.push({
      OR: [
        { candidateName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { technology: { contains: query.search, mode: 'insensitive' } },
      ],
    });
  }

  if (requester.role === Role.RECRUITER) {
    conditions.push({
      OR: [
        { assignedRecruiterId: requester.id },
        { assignedRecruiterAssignments: { some: { recruiterId: requester.id } } },
      ],
    });
  } else if (query.assignedRecruiterId) {
    conditions.push({ assignedRecruiterId: query.assignedRecruiterId });
  }

  return { AND: conditions };
}

export function list(query: ListProfilesQuery, requester: { id: string; role: Role }) {
  const where = buildWhereClause(query, requester);
  const orderBy: Prisma.ClientProfileOrderByWithRelationInput = { [query.sortBy]: query.sortOrder };

  return prisma.$transaction([
    prisma.clientProfile.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        assignedRecruiter: { select: { id: true, name: true, email: true } },
        assignedRecruiterAssignments: {
          include: { recruiter: { select: { id: true, name: true, email: true } } },
        },
      },
    }),
    prisma.clientProfile.count({ where }),
  ]);
}

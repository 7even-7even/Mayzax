import { Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ListProfilesQuery } from './profile.validation';

export function findActiveById(id: string) {
  return prisma.clientProfile.findFirst({
    where: { id, deletedAt: null },
    include: { assignedRecruiter: { select: { id: true, name: true, email: true } } },
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
  return prisma.clientProfile.create({ data });
}

export function update(id: string, data: Partial<Prisma.ClientProfileUncheckedUpdateInput>) {
  return prisma.clientProfile.update({ where: { id }, data });
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
  const where: Prisma.ClientProfileWhereInput = {
    deletedAt: null,
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.technology ? { technology: { equals: query.technology, mode: 'insensitive' } } : {}),
    ...(query.search
      ? {
          OR: [
            { candidateName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search, mode: 'insensitive' } },
            { technology: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  if (requester.role === Role.RECRUITER) {
    where.assignedRecruiterId = requester.id;
  } else if (query.assignedRecruiterId) {
    where.assignedRecruiterId = query.assignedRecruiterId;
  }

  return where;
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
      include: { assignedRecruiter: { select: { id: true, name: true, email: true } } },
    }),
    prisma.clientProfile.count({ where }),
  ]);
}

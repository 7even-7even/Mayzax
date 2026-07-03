import { Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ListRecruitersQuery } from './recruiter.validation';

export function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export function findActiveById(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

export function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdById: string;
}) {
  return prisma.user.create({
    data: { ...data, email: data.email.toLowerCase() },
  });
}

export function updateUser(id: string, data: Partial<{ name: string; email: string; role: Role }>) {
  return prisma.user.update({
    where: { id },
    data: data.email ? { ...data, email: data.email.toLowerCase() } : data,
  });
}

export function setActiveStatus(id: string, isActive: boolean) {
  return prisma.user.update({ where: { id }, data: { isActive } });
}

export function softDeleteUser(id: string) {
  return prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}

export function listRecruiters(query: ListRecruitersQuery) {
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(query.role ? { role: query.role } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.UserOrderByWithRelationInput = { [query.sortBy]: query.sortOrder };

  return prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);
}

import { prisma } from '@/lib/prisma';

export async function listHiringPartnerRequests(params: { page?: number; pageSize?: number; search?: string }) {
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params.search) {
    where.OR = [
      { company: { contains: params.search, mode: 'insensitive' } },
      { contactName: { contains: params.search, mode: 'insensitive' } },
      { workEmail: { contains: params.search, mode: 'insensitive' } },
      { roleType: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.hiringPartnerRequest.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.hiringPartnerRequest.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getHiringPartnerRequestById(id: string) {
  const item = await prisma.hiringPartnerRequest.findUnique({
    where: { id },
  });
  if (!item) {
    throw new Error('Hiring partner request not found');
  }
  return item;
}

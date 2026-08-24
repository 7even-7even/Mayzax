import { prisma } from '@/lib/prisma';

export async function listInquiries(params: { page?: number; pageSize?: number; search?: string }) {
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params.search) {
    where.OR = [
      { fullName: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } },
      { serviceInterested: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inquiry.count({ where }),
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

export async function getInquiryById(id: string) {
  const item = await prisma.inquiry.findUnique({
    where: { id },
  });
  if (!item) {
    throw new Error('Inquiry not found');
  }
  return item;
}

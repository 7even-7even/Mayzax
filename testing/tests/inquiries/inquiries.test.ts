import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as inquiriesService from '../../../backend/src/modules/inquiries/inquiries.service';
import { prisma } from '../../../backend/src/lib/prisma';

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    inquiry: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe('Inquiries Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('INQ-001: Should list inquiries with pagination', async () => {
    const mockInquiries = [
      { id: '1', fullName: 'John Doe', email: 'john@example.com', serviceInterested: 'Placement', details: 'Help' },
    ];
    (prisma.inquiry.findMany as any).mockResolvedValue(mockInquiries);
    (prisma.inquiry.count as any).mockResolvedValue(1);

    const result = await inquiriesService.listInquiries({ page: 1, pageSize: 10 });

    expect(result.items).toEqual(mockInquiries);
    expect(result.pagination.total).toBe(1);
    expect(prisma.inquiry.findMany).toHaveBeenCalledWith({
      where: {},
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
  });

  it('INQ-002: Should filter list with search query', async () => {
    (prisma.inquiry.findMany as any).mockResolvedValue([]);
    (prisma.inquiry.count as any).mockResolvedValue(0);

    await inquiriesService.listInquiries({ search: 'React' });

    expect(prisma.inquiry.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { fullName: { contains: 'React', mode: 'insensitive' } },
          { email: { contains: 'React', mode: 'insensitive' } },
          { serviceInterested: { contains: 'React', mode: 'insensitive' } },
        ],
      },
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
  });

  it('INQ-003: Should retrieve enquiry details by ID', async () => {
    const mockInquiry = { id: '123', fullName: 'Jane Doe' };
    (prisma.inquiry.findUnique as any).mockResolvedValue(mockInquiry);

    const result = await inquiriesService.getInquiryById('123');

    expect(result).toEqual(mockInquiry);
    expect(prisma.inquiry.findUnique).toHaveBeenCalledWith({
      where: { id: '123' },
    });
  });

  it('INQ-004: Should throw error if enquiry details not found', async () => {
    (prisma.inquiry.findUnique as any).mockResolvedValue(null);

    await expect(inquiriesService.getInquiryById('not-exist')).rejects.toThrow('Inquiry not found');
  });
});

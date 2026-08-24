import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as hiringPartnerRequestsService from '../../../backend/src/modules/hiring-partner-requests/hiring-partner-requests.service';
import { prisma } from '../../../backend/src/lib/prisma';

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    hiringPartnerRequest: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe('Hiring Partner Requests Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('HPR-001: Should list hiring partner requests with pagination', async () => {
    const mockRequests = [
      { id: '1', company: 'Acme', contactName: 'Jane Smith', workEmail: 'jane@acme.com', roleType: 'Permanent', hiresNeeded: '1-2', details: 'Full stack' },
    ];
    (prisma.hiringPartnerRequest.findMany as any).mockResolvedValue(mockRequests);
    (prisma.hiringPartnerRequest.count as any).mockResolvedValue(1);

    const result = await hiringPartnerRequestsService.listHiringPartnerRequests({ page: 1, pageSize: 10 });

    expect(result.items).toEqual(mockRequests);
    expect(result.pagination.total).toBe(1);
    expect(prisma.hiringPartnerRequest.findMany).toHaveBeenCalledWith({
      where: {},
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
  });

  it('HPR-002: Should filter list with search query', async () => {
    (prisma.hiringPartnerRequest.findMany as any).mockResolvedValue([]);
    (prisma.hiringPartnerRequest.count as any).mockResolvedValue(0);

    await hiringPartnerRequestsService.listHiringPartnerRequests({ search: 'Acme' });

    expect(prisma.hiringPartnerRequest.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { company: { contains: 'Acme', mode: 'insensitive' } },
          { contactName: { contains: 'Acme', mode: 'insensitive' } },
          { workEmail: { contains: 'Acme', mode: 'insensitive' } },
          { roleType: { contains: 'Acme', mode: 'insensitive' } },
        ],
      },
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
  });

  it('HPR-003: Should retrieve hiring partner request details by ID', async () => {
    const mockRequest = { id: '123', company: 'Acme' };
    (prisma.hiringPartnerRequest.findUnique as any).mockResolvedValue(mockRequest);

    const result = await hiringPartnerRequestsService.getHiringPartnerRequestById('123');

    expect(result).toEqual(mockRequest);
    expect(prisma.hiringPartnerRequest.findUnique).toHaveBeenCalledWith({
      where: { id: '123' },
    });
  });

  it('HPR-004: Should throw error if hiring partner request details not found', async () => {
    (prisma.hiringPartnerRequest.findUnique as any).mockResolvedValue(null);

    await expect(hiringPartnerRequestsService.getHiringPartnerRequestById('not-exist')).rejects.toThrow('Hiring partner request not found');
  });
});

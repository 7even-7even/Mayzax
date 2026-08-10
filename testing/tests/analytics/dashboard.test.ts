import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as analyticsService from '../../../backend/src/modules/analytics/analytics.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { Role } from '@prisma/client';

vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    jobApplication: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    clientProfile: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('Analytics - Dashboard Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ANA-DASH-002: Should scope dashboard overview to Team Leader managed recruiters', async () => {
    const actor = { id: 'tl-id', role: Role.TEAM_LEADER };
    const query = { page: 1, pageSize: 20, sortBy: 'totalApplications' as const, sortOrder: 'desc' as const };

    (prisma.user.findMany as any).mockResolvedValue([
      { id: 'rec-1', name: 'Recruiter 1', email: 'rec1@test.com', isActive: true, lastActiveAt: null, _count: { applications: 10 } },
    ]);
    (prisma.jobApplication.groupBy as any).mockResolvedValue([]);
    (prisma.clientProfile.count as any).mockResolvedValue(5);

    const result = await analyticsService.getDashboardOverview(query, actor);

    expect(result.items.length).toBe(1);
    expect(result.items[0].name).toBe('Recruiter 1');
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        role: Role.RECRUITER,
        deletedAt: null,
        createdById: 'tl-id',
      },
      select: expect.any(Object),
    });
  });

  it('ANA-DASH-003: Should block Team Leader from viewing unmanaged recruiter breakdown', async () => {
    const actor = { id: 'tl-id', role: Role.TEAM_LEADER };

    (prisma.user.findFirst as any).mockResolvedValue(null);

    await expect(
      analyticsService.getRecruiterBreakdown('unmanaged-recruiter-id', actor)
    ).rejects.toThrow('You can only access recruiter stats for your own team');
  });
});

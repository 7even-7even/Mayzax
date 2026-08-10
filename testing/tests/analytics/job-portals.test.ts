import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as analyticsService from '../../../backend/src/modules/analytics/analytics.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { Role, JobPortal } from '@prisma/client';

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    jobApplication: {
      groupBy: vi.fn(),
    },
  },
}));

describe('Analytics - Job Portals Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ANA-PORTAL-001: Should scope job portal counts to current recruiter', async () => {
    const actor = { id: 'recruiter-id-123', role: Role.RECRUITER };
    const query = { scope: 'all' as const };

    const mockGroupedCounts = [
      { jobPortal: JobPortal.LINKEDIN, _count: { _all: 5 } },
      { jobPortal: JobPortal.INDEED, _count: { _all: 5 } },
    ];

    (prisma.jobApplication.groupBy as any).mockResolvedValue(mockGroupedCounts);

    const result = await analyticsService.getJobPortalAnalytics(actor, query);

    expect(result.totalApplications).toBe(10);
    expect(prisma.jobApplication.groupBy).toHaveBeenCalledWith({
      by: ['jobPortal'],
      where: { recruiterId: { in: ['recruiter-id-123'] } },
      _count: { _all: true },
    });
  });
});

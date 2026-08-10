import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as analyticsService from '../../../backend/src/modules/analytics/analytics.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { Role } from '@prisma/client';

vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    user: {
      count: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    clientProfile: {
      count: vi.fn(),
    },
    jobApplication: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    activityLog: {
      findMany: vi.fn(),
    },
  },
}));

describe('Analytics - Global Summary Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ANA-SUM-001: Recruiter summary loads only personal metrics', async () => {
    const actor = { id: 'rec-123', role: Role.RECRUITER };

    (prisma.jobApplication.count as any).mockResolvedValueOnce(15); // myTotalApplications
    (prisma.jobApplication.count as any).mockResolvedValueOnce(5);  // myTodayApplications

    const result = await analyticsService.getGlobalSummary(actor);

    expect(result.myTotalApplications).toBe(15);
    expect(result.myCurrentShiftApplications).toBe(5);
    expect(result.totalApplications).toBe(0); // Scoped to 0
    expect(result.totalRecruiters).toBe(0);
  });

  it('ANA-SUM-002: Admin summary calculates active states and top performer', async () => {
    const actor = { id: 'admin-id', role: Role.ADMIN };

    (prisma.user.count as any).mockResolvedValue(5); // totalRecruiters
    (prisma.user.count as any).mockResolvedValue(4); // activeRecruiters
    (prisma.clientProfile.count as any).mockResolvedValue(10);
    (prisma.jobApplication.count as any)
      .mockResolvedValueOnce(100) // totalApplications
      .mockResolvedValueOnce(20)  // todayApplications
      .mockResolvedValueOnce(15)  // myTotalApplications
      .mockResolvedValueOnce(5);  // myTodayApplications

    // Top performer mock calls
    const mockTodayApplicationsList = [
      { recruiterId: 'top-rec-id', _count: { _all: 5 } },
    ];
    (prisma.jobApplication.groupBy as any).mockResolvedValue(mockTodayApplicationsList);
    (prisma.user.findUnique as any).mockResolvedValue({ name: 'Top Performer Recruiter' });

    (prisma.user.findMany as any).mockResolvedValue([]); // teamLeaders count
    (prisma.activityLog.findMany as any).mockResolvedValue([
      { status: 'ACTIVE' },
      { status: 'ACTIVE' },
      { status: 'SHORT_BREAK' },
    ]);
    (prisma.user.groupBy as any).mockResolvedValue([]);

    const result = await analyticsService.getGlobalSummary(actor);

    expect(result.totalApplications).toBe(100);
    expect(result.activeMemberCount).toBe(2);
    expect(result.onBreakMemberCount).toBe(1);
    expect(result.topPerformer).toBe('Top Performer Recruiter (5)');
  });
});

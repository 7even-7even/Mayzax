import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as analyticsService from '../../../backend/src/modules/analytics/analytics.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { Role } from '@prisma/client';

// Mock Prisma client with $queryRaw support
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

describe('Analytics - Daily Counts Trend Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ANA-TREND-001: Should retrieve daily trend counts using queryRaw', async () => {
    const actor = { id: 'admin-id', role: Role.ADMIN };
    const query = { recruiterId: 'recruiter-id-123', from: '2026-08-01', to: '2026-08-03' };

    const mockDbResult = [
      { businessDate: new Date('2026-08-01T00:00:00.000Z'), count: 3n },
      { businessDate: new Date('2026-08-02T00:00:00.000Z'), count: 5n },
    ];

    (prisma.$queryRaw as any).mockResolvedValue(mockDbResult);

    const result = await analyticsService.getDailyCounts(query, actor);

    expect(result.length).toBe(2);
    expect(result[0].businessDate).toBe('2026-08-01');
    expect(result[0].count).toBe(3);
  });
});

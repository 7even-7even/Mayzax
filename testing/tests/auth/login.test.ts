import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authService from '../../../backend/src/modules/auth/auth.service';
import { prisma } from '../../../backend/src/lib/prisma';
import bcrypt from 'bcryptjs';
import { ClientType } from '@prisma/client';

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
    },
  },
}));



// Mock Activity Service to avoid side effects
vi.mock('../../../backend/src/modules/activity/activity.service', () => ({
  handleLoginEvent: vi.fn(),
  handleLogoutEvent: vi.fn(),
}));

describe('Authentication - Login Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AUTH-LOGIN-001/002: Should successfully authenticate with valid credentials', async () => {
    const mockUser = {
      id: 'user-id-123',
      name: 'Test Recruiter',
      email: 'recruiter@mayzax.com',
      passwordHash: 'hashedpassword',
      role: 'RECRUITER',
      isActive: true,
      deletedAt: null,
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    (prisma.refreshToken.create as any).mockResolvedValue({});
    (prisma.user.update as any).mockResolvedValue(mockUser);

    const result = await authService.login(
      { email: 'recruiter@mayzax.com', password: 'Password123' },
      { ip: '127.0.0.1', userAgent: 'JestTest', clientType: ClientType.WEB }
    );

    expect(result).toBeDefined();
    expect(result.user.email).toBe('recruiter@mayzax.com');
    expect(result.tokens.accessToken).toBeDefined();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'recruiter@mayzax.com' },
      include: expect.any(Object),
    });
  });

  it('AUTH-LOGIN-003: Should reject login with invalid password', async () => {
    const mockUser = {
      id: 'user-id-123',
      name: 'Test Recruiter',
      email: 'recruiter@mayzax.com',
      passwordHash: 'hashedpassword',
      role: 'RECRUITER',
      isActive: true,
      deletedAt: null,
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    await expect(
      authService.login(
        { email: 'recruiter@mayzax.com', password: 'WrongPassword' },
        { ip: '127.0.0.1', clientType: ClientType.WEB }
      )
    ).rejects.toThrow('Invalid email or password');
  });

  it('AUTH-LOGIN-004: Should reject login with unregistered email', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    await expect(
      authService.login(
        { email: 'unregistered@mayzax.com', password: 'Password123' },
        { ip: '127.0.0.1', clientType: ClientType.WEB }
      )
    ).rejects.toThrow('Invalid email or password');
  });

  it('AUTH-LOGIN-005: Should prevent deactivated accounts from logging in', async () => {
    const mockUser = {
      id: 'user-id-123',
      name: 'Test Recruiter',
      email: 'recruiter@mayzax.com',
      passwordHash: 'hashedpassword',
      role: 'RECRUITER',
      isActive: false,
      deletedAt: null,
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    await expect(
      authService.login(
        { email: 'recruiter@mayzax.com', password: 'Password123' },
        { ip: '127.0.0.1', clientType: ClientType.WEB }
      )
    ).rejects.toThrow('Your account has been deactivated. Please contact an administrator.');
  });
});

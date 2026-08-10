import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as onboardingService from '../../../backend/src/modules/onboarding/onboarding.service';
import { prisma } from '../../../backend/src/lib/prisma';
import { OnboardingStatus, Role } from '@prisma/client';

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-pass-123'),
  },
}));

// Mock logger
vi.mock('../../../backend/src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

// Mock Prisma
vi.mock('../../../backend/src/lib/prisma', () => ({
  prisma: {
    clientProfile: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    clientOnboarding: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    clientPayment: {
      create: vi.fn(),
    },
    user: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

const baseOnboardingInput = {
  fullName: 'Jane Smith',
  email: 'jane.smith@example.com',
  phone: '+12025550100',
  technology: 'Python/Django',
  skills: 'Python, Django',
  planSelected: 'Gold',
  amountPaid: 2500,
  paymentRef: 'TXN-ABC-001',
  declared: true,
  dateOfBirth: '1995-06-15',
  gender: 'Female',
  visaStatus: 'H1B',
  currentLocation: 'New York, NY',
  education: [],
  addressHistory: [],
  hasExperience: false,
};

describe('Onboarding - Submission & Admin Approval Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ONB-SUB-001: Should create a new PENDING onboarding application successfully', async () => {
    (prisma.clientProfile.findFirst as any).mockResolvedValue(null);
    (prisma.clientOnboarding.findFirst as any).mockResolvedValue(null);
    (prisma.clientOnboarding.create as any).mockResolvedValue({
      id: 'onb-uuid-123',
      fullName: 'Jane Smith',
      email: 'jane.smith@example.com',
      status: OnboardingStatus.PENDING,
    });

    const result = await onboardingService.createOnboarding(baseOnboardingInput as any);

    expect(result.status).toBe(OnboardingStatus.PENDING);
    expect(prisma.clientOnboarding.create).toHaveBeenCalled();
  });

  it('ONB-SUB-002: Should block submission if active ClientProfile already exists with same email', async () => {
    (prisma.clientProfile.findFirst as any).mockResolvedValue({
      id: 'existing-profile-id',
    });

    await expect(
      onboardingService.createOnboarding(baseOnboardingInput as any)
    ).rejects.toThrow('A client profile with this Email or Phone Number already exists.');
  });

  it('ONB-SUB-003: Should block submission if PENDING onboarding already exists with same phone', async () => {
    (prisma.clientProfile.findFirst as any).mockResolvedValue(null);
    (prisma.clientOnboarding.findFirst as any).mockResolvedValue({
      id: 'existing-onb-id',
      status: OnboardingStatus.PENDING,
    });

    await expect(
      onboardingService.createOnboarding(baseOnboardingInput as any)
    ).rejects.toThrow('An onboarding application with this Email or Phone Number is already pending review.');
  });

  it('ONB-APR-001: Should approve onboarding — create ClientProfile, User, and PAID payment record', async () => {
    const adminId = 'admin-id-123';

    (prisma.clientOnboarding.findUnique as any).mockResolvedValue({
      id: 'onb-uuid-123',
      fullName: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+12025550100',
      technology: 'Python/Django',
      skills: 'Python, Django',
      status: OnboardingStatus.PENDING,
      planSelected: 'Gold',
      amountPaid: 2500,
      paymentRef: 'TXN-ABC-001',
      education: [],
      addressHistory: [],
      hasExperience: false,
    });

    (prisma.clientProfile.create as any).mockResolvedValue({
      id: 'profile-new-uuid',
      candidateName: 'Jane Smith',
    });

    (prisma.clientPayment.create as any).mockResolvedValue({});
    (prisma.user.create as any).mockResolvedValue({});
    (prisma.clientOnboarding.update as any).mockResolvedValue({
      id: 'onb-uuid-123',
      status: OnboardingStatus.APPROVED,
    });

    const result = await onboardingService.approveOnboarding('onb-uuid-123', adminId);

    expect(result.onboarding.status).toBe(OnboardingStatus.APPROVED);
    expect(prisma.clientProfile.create).toHaveBeenCalled();
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ role: Role.CLIENT }),
    });

    // Full payment (2500 >= 2500): exactly 1 PAID payment
    expect(prisma.clientPayment.create).toHaveBeenCalledTimes(1);
    expect(prisma.clientPayment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'PAID', amount: 2500, installmentNo: 1 }),
    });
  });

  it('ONB-APR-002: Should generate PAID + PENDING installment records for partial payment', async () => {
    const adminId = 'admin-id-123';

    (prisma.clientOnboarding.findUnique as any).mockResolvedValue({
      id: 'onb-uuid-partial',
      fullName: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+12025550100',
      technology: 'Python/Django',
      status: OnboardingStatus.PENDING,
      planSelected: 'Gold', // Price: 2500
      amountPaid: 500,      // Only partial payment
      paymentRef: 'TXN-PARTIAL-001',
      education: [],
      addressHistory: [],
      hasExperience: false,
    });

    (prisma.clientProfile.create as any).mockResolvedValue({ id: 'profile-partial-uuid' });
    (prisma.clientPayment.create as any).mockResolvedValue({});
    (prisma.user.create as any).mockResolvedValue({});
    (prisma.clientOnboarding.update as any).mockResolvedValue({
      id: 'onb-uuid-partial',
      status: OnboardingStatus.APPROVED,
    });

    await onboardingService.approveOnboarding('onb-uuid-partial', adminId);

    // Should create 2 payments: 1 PAID + 1 PENDING
    expect(prisma.clientPayment.create).toHaveBeenCalledTimes(2);
    expect(prisma.clientPayment.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({ status: 'PAID', amount: 500, installmentNo: 1 }),
    });
    expect(prisma.clientPayment.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({ status: 'PENDING', amount: 2000, installmentNo: 2 }),
    });
  });

  it('ONB-APR-003: Should block re-approving an already APPROVED application', async () => {
    (prisma.clientOnboarding.findUnique as any).mockResolvedValue({
      id: 'onb-uuid-done',
      status: OnboardingStatus.APPROVED,
    });

    await expect(
      onboardingService.approveOnboarding('onb-uuid-done', 'admin-id-123')
    ).rejects.toThrow(/already APPROVED/);
  });

  it('ONB-REJ-001: Should reject a pending onboarding application', async () => {
    (prisma.clientOnboarding.findUnique as any).mockResolvedValue({
      id: 'onb-uuid-pending',
      status: OnboardingStatus.PENDING,
    });

    (prisma.clientOnboarding.update as any).mockResolvedValue({
      id: 'onb-uuid-pending',
      status: OnboardingStatus.REJECTED,
    });

    const result = await onboardingService.rejectOnboarding('onb-uuid-pending', 'admin-id-123');

    expect(result.status).toBe(OnboardingStatus.REJECTED);
    expect(prisma.clientOnboarding.update).toHaveBeenCalledWith({
      where: { id: 'onb-uuid-pending' },
      data: expect.objectContaining({ status: OnboardingStatus.REJECTED }),
    });
  });
});

import { OnboardingStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/utils/apiError';
import { CreateOnboardingInput } from './onboarding.validation';

export async function createOnboarding(input: CreateOnboardingInput) {
  // 1. Check if active profile with same email or phone number already exists
  const existingProfile = await prisma.clientProfile.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { email: { equals: input.email, mode: 'insensitive' as const } },
        { phone: input.phone },
      ],
    },
  });
  if (existingProfile) {
    throw ApiError.badRequest('A client profile with this Email or Phone Number already exists.');
  }

  // 2. Check if a pending onboarding application with same email or phone number exists
  const existingOnboarding = await prisma.clientOnboarding.findFirst({
    where: {
      status: OnboardingStatus.PENDING,
      OR: [
        { email: { equals: input.email, mode: 'insensitive' as const } },
        { phone: input.phone },
      ],
    },
  });
  if (existingOnboarding) {
    throw ApiError.badRequest('An onboarding application with this Email or Phone Number is already pending review.');
  }

  const onboarding = await prisma.clientOnboarding.create({
    data: {
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      education: input.education as any,
      technology: input.technology,
      skills: input.skills,
      visaStatus: input.visaStatus,
      entryToUS: input.entryToUS || null,
      currentLocation: input.currentLocation,
      addressHistory: input.addressHistory as any,
      hasExperience: input.hasExperience,
      experienceDetails: input.experienceDetails || null,
      certifications: input.certifications || null,
      resumeUrl: input.resumeUrl || null,
      resumeFileName: input.resumeFileName || null,
      declared: input.declared,
      planSelected: input.planSelected,
      amountPaid: input.amountPaid,
      paymentRef: input.paymentRef,
    },
  });

  return onboarding;
}

export async function getOnboardingById(id: string) {
  const onboarding = await prisma.clientOnboarding.findUnique({
    where: { id },
  });
  if (!onboarding) throw ApiError.notFound('Onboarding registration not found');
  return onboarding;
}

export async function listOnboardings(query: { status?: OnboardingStatus; page?: number; pageSize?: number }) {
  const status = query.status;
  const page = query.page || 1;
  const pageSize = query.pageSize || 10;

  const where = status ? { status } : {};

  const [items, total] = await Promise.all([
    prisma.clientOnboarding.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.clientOnboarding.count({ where }),
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

export async function approveOnboarding(id: string, adminId: string) {
  const onboarding = await prisma.clientOnboarding.findUnique({
    where: { id },
  });
  if (!onboarding) throw ApiError.notFound('Onboarding registration not found');
  if (onboarding.status !== OnboardingStatus.PENDING) {
    throw ApiError.badRequest(`Cannot approve an onboarding application that is already ${onboarding.status}`);
  }

  // 1. Create a new ClientProfile using the onboarding details
  const eduList = onboarding.education as any[];
  const eduSummary = eduList
    ?.map((e: any) => `${e.qualification} in ${e.fieldOfStudy} (${e.specialization}) from ${e.instituteName} (${e.startDate} to ${e.currentlyOngoing ? 'Present' : (e.endDate || 'N/A')})${e.honors ? ` [Honors: ${e.honors}]` : ''}`)
    .join('\n');
  
  const addrList = onboarding.addressHistory as any[];
  const addrSummary = addrList
    ?.map((a: any, idx: number) => `Address #${idx + 1}: State: ${a.state}, Country: ${a.country} (${a.fromDate} - ${a.toDate})`)
    .join('\n');

  const notesText = [
    `--- ONBOARDING INFORMATION ---`,
    `Date of Birth: ${onboarding.dateOfBirth}`,
    `Gender: ${onboarding.gender}`,
    `Visa Status: ${onboarding.visaStatus}`,
    onboarding.entryToUS ? `US Entry: ${onboarding.entryToUS}` : null,
    `Current Location: ${onboarding.currentLocation}`,
    `\n[Education]\n${eduSummary || 'None'}`,
    onboarding.certifications ? `\n[Certifications]\n${onboarding.certifications}` : null,
    onboarding.hasExperience ? `\n[Experience]\n${onboarding.experienceDetails || 'Yes'}` : null,
    addrSummary ? `\n[Address History]\n${addrSummary}` : null,
    `\n[Resume Attachment]\n${onboarding.resumeFileName || 'None'}`,
    `\n[Payment Details]\nPlan: ${onboarding.planSelected}, Amount Paid: $${onboarding.amountPaid}, Transaction Ref: ${onboarding.paymentRef}`,
  ]
    .filter(Boolean)
    .join('\n');

  const profile = await prisma.clientProfile.create({
    data: {
      candidateName: onboarding.fullName,
      email: onboarding.email,
      phone: onboarding.phone,
      technology: onboarding.technology,
      notes: null,
      isActive: true,
      dateOfBirth: onboarding.dateOfBirth,
      gender: onboarding.gender,
      visaStatus: onboarding.visaStatus,
      entryToUS: onboarding.entryToUS,
      currentLocation: onboarding.currentLocation,
      education: onboarding.education || undefined,
      addressHistory: onboarding.addressHistory || undefined,
      hasExperience: onboarding.hasExperience,
      experienceDetails: onboarding.experienceDetails,
      certifications: onboarding.certifications,
      resumeUrl: onboarding.resumeUrl,
      resumeFileName: onboarding.resumeFileName,
      planSelected: onboarding.planSelected,
      amountPaid: onboarding.amountPaid,
      paymentRef: onboarding.paymentRef,
      skills: onboarding.skills,
    },
  });

  // 2. Create User for Client login
  const passwordHash = await bcrypt.hash('Client@123', 12);
  await prisma.user.create({
    data: {
      name: onboarding.fullName,
      email: onboarding.email.toLowerCase(),
      passwordHash,
      role: Role.CLIENT,
      isActive: true,
      clientProfileId: profile.id,
    },
  });

  // 3. Update Onboarding status to APPROVED
  const updatedOnboarding = await prisma.clientOnboarding.update({
    where: { id },
    data: {
      status: OnboardingStatus.APPROVED,
      approvedAt: new Date(),
      approvedById: adminId,
      generatedProfileId: profile.id,
    },
  });

  return { onboarding: updatedOnboarding, profile };
}

export async function rejectOnboarding(id: string, adminId: string) {
  const onboarding = await prisma.clientOnboarding.findUnique({
    where: { id },
  });
  if (!onboarding) throw ApiError.notFound('Onboarding registration not found');
  if (onboarding.status !== OnboardingStatus.PENDING) {
    throw ApiError.badRequest(`Cannot reject an onboarding application that is already ${onboarding.status}`);
  }

  const updatedOnboarding = await prisma.clientOnboarding.update({
    where: { id },
    data: {
      status: OnboardingStatus.REJECTED,
      approvedAt: new Date(),
      approvedById: adminId,
    },
  });

  return updatedOnboarding;
}

export async function checkDuplicate(email?: string, phone?: string) {
  const orConditions: any[] = [];
  if (email) orConditions.push({ email: { equals: email, mode: 'insensitive' as const } });
  if (phone) orConditions.push({ phone: phone });

  if (orConditions.length === 0) return { exists: false };

  const existingProfile = await prisma.clientProfile.findFirst({
    where: {
      deletedAt: null,
      OR: orConditions,
    },
  });
  if (existingProfile) {
    return {
      exists: true,
      message: 'A client profile with this Email or Phone Number already exists.',
    };
  }

  const existingOnboarding = await prisma.clientOnboarding.findFirst({
    where: {
      status: OnboardingStatus.PENDING,
      OR: orConditions,
    },
  });
  if (existingOnboarding) {
    return {
      exists: true,
      message: 'An onboarding application with this Email or Phone Number is already pending review.',
    };
  }

  return { exists: false };
}


import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { ClientType, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/utils/apiError';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  parseExpiryToMs,
} from './token.service';
import { env } from '@/config/env';
import {
  LoginInput,
  SignupInput,
  ChangePasswordInput,
  UpdateProfileInput,
  SecurityQuestionInput,
  ForgotPasswordQuestionInput,
  ForgotPasswordResetInput,
} from './auth.validation';
import * as recruiterRepo from '@/modules/recruiters/recruiter.repository';
import { handleLoginEvent, handleLogoutEvent } from '@/modules/activity/activity.service';

const BCRYPT_ROUNDS = 12;

function sanitizeUser(user: {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: any;
  isActive?: boolean;
  lastActiveAt?: Date | null;
  createdAt?: Date;
  securityQuestion?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  department?: string | null;
  location?: string | null;
  designation?: string | null;
  employeeId?: string | null;
  joinDate?: Date | null;
  shiftPreference?: string | null;
  skills?: string[];
  linkedInUrl?: string | null;
  displayColor?: string | null;
  teamName?: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    ...(user.isActive !== undefined ? { isActive: user.isActive } : {}),
    ...(user.lastActiveAt !== undefined ? { lastActiveAt: user.lastActiveAt } : {}),
    ...(user.createdAt !== undefined ? { createdAt: user.createdAt } : {}),
    securityQuestion: user.securityQuestion ?? null,
    hasSecurityQuestion: !!user.securityQuestion,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    department: user.department ?? null,
    location: user.location ?? null,
    designation: user.designation ?? null,
    employeeId: user.employeeId ?? null,
    joinDate: user.joinDate ?? null,
    shiftPreference: user.shiftPreference ?? null,
    skills: user.skills ?? [],
    linkedInUrl: user.linkedInUrl ?? null,
    displayColor: user.displayColor ?? null,
    teamName: (user as any).teamName ?? null,
  };
}

function normalizeSecurityAnswer(answer: string) {
  return answer.trim().toLowerCase();
}

async function hashSecurityAnswer(answer: string): Promise<string> {
  return bcrypt.hash(normalizeSecurityAnswer(answer), BCRYPT_ROUNDS);
}

async function compareSecurityAnswer(answer: string, hash: string): Promise<boolean> {
  return bcrypt.compare(normalizeSecurityAnswer(answer), hash);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

interface SessionMeta {
  ip?: string;
  userAgent?: string | null;
  clientType?: ClientType;
  deviceName?: string | null;
}

async function issueTokenPair(
  userId: string,
  role: any,
  email: string,
  meta: SessionMeta,
) {
  const tokenId = randomUUID();
  const clientType = meta.clientType ?? ClientType.WEB;
  const refreshToken = signRefreshToken({ userId, tokenId });
  const accessToken = signAccessToken({ id: userId, role, email, clientType });

  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      userId,
      tokenHash: hashToken(refreshToken),
      ip: meta.ip,
      userAgent: meta.userAgent ?? null,
      clientType,
      deviceName: meta.deviceName ?? null,
      expiresAt: new Date(Date.now() + parseExpiryToMs(env.JWT_REFRESH_EXPIRES_IN)),
    },
  });

  return { accessToken, refreshToken };
}

export async function login(input: LoginInput, meta: SessionMeta) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });

  if (!user || user.deletedAt) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated. Please contact an administrator.');
  }

  const isValid = await comparePassword(input.password, user.passwordHash);
  if (!isValid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const tokens = await issueTokenPair(user.id, user.role, user.email, meta);

  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });

  // IMPORTANT: Only start attendance tracking for WEB clients.
  // Mobile companion is read-only and must never affect attendance.
  if (meta.clientType !== ClientType.MOBILE) {
    await handleLoginEvent(user.id, user.role);
  }

  return {
    tokens,
    user: sanitizeUser(user),
  };
}

export async function signupRecruiter(input: SignupInput, meta: SessionMeta) {
  const existing = await recruiterRepo.findByEmail(input.email);
  if (existing) {
    throw ApiError.conflict('A user with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await recruiterRepo.createUser({
    name: input.name,
    email: input.email,
    passwordHash,
    role: Role.RECRUITER,
    createdById: null,
  });

  const tokens = await issueTokenPair(user.id, user.role, user.email, meta);

  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });

  if (meta.clientType !== ClientType.MOBILE) {
    await handleLoginEvent(user.id, user.role);
  }

  return {
    tokens,
    user: sanitizeUser(user),
  };
}

export async function refreshSession(refreshTokenRaw: string, meta: SessionMeta) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshTokenRaw);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const tokenHash = hashToken(refreshTokenRaw);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.userId !== payload.sub) {
    throw ApiError.unauthorized('Refresh token not recognized');
  }

  if (stored.revokedAt) {
    const timeSinceRevocation = Date.now() - stored.revokedAt.getTime();
    if (timeSinceRevocation > 10000) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw ApiError.unauthorized('Refresh token has already been used. All sessions revoked for security.');
    }
  }

  if (stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token expired');
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || user.deletedAt || !user.isActive) {
    throw ApiError.unauthorized('Account is no longer active');
  }

  // Use the stored token's clientType as the source of truth (don't trust header)
  const effectiveMeta: SessionMeta = {
    ...meta,
    clientType: stored.clientType,
  };

  // Rotate: revoke old, issue new
  const newTokens = await issueTokenPair(user.id, user.role, user.email, effectiveMeta);
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: {
      revokedAt: new Date(),
      replacedByTokenHash: hashToken(newTokens.refreshToken),
    },
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });

  // Only restore ACTIVE attendance status for web clients.
  if (stored.clientType !== ClientType.MOBILE) {
    await handleLoginEvent(user.id, user.role);
  }

  return {
    tokens: newTokens,
    user: sanitizeUser(user),
  };
}

export async function logout(refreshTokenRaw: string | undefined, clientType: ClientType = ClientType.WEB) {
  if (!refreshTokenRaw) return;
  const tokenHash = hashToken(refreshTokenRaw);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: { userId: true, clientType: true, user: { select: { role: true } } },
  });

  if (storedToken?.user) {
    // Only trigger attendance logout events for web client tokens
    if (storedToken.clientType !== ClientType.MOBILE) {
      await handleLogoutEvent(storedToken.userId, storedToken.user.role);
    }
  }

  // Also ignore clientType argument if the token is known to be mobile (defense in depth)
  void clientType;

  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastActiveAt: true,
      createdAt: true,
      securityQuestion: true,
      avatarUrl: true,
      bio: true,
      department: true,
      location: true,
      designation: true,
      employeeId: true,
      joinDate: true,
      shiftPreference: true,
      skills: true,
      linkedInUrl: true,
      displayColor: true,
      teamName: true,
      reportingManager: {
        select: { id: true, name: true, email: true },
      },
    },
  });
  if (!user || !user.isActive) throw ApiError.notFound('User not found');
  const { reportingManager, ...rest } = user as any;
  return { ...sanitizeUser(rest), reportingManager: reportingManager ?? null };
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');

  const isValid = await comparePassword(input.currentPassword, user.passwordHash);
  if (!isValid) throw ApiError.badRequest('Current password is incorrect');

  const newHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

  // Revoke all existing sessions after password change
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) throw ApiError.notFound('User not found');

  if (input.email && input.email.toLowerCase() !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) throw ApiError.conflict('A user with this email already exists');
  }

  if (input.employeeId && input.employeeId.trim() !== '' && input.employeeId.trim() !== user.employeeId) {
    const existingEmp = await prisma.user.findUnique({ where: { employeeId: input.employeeId.trim() } });
    if (existingEmp) throw ApiError.conflict('Employee ID already exists');
  }

  const clean = (v: string | null | undefined) => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const t = v.trim();
    return t === '' ? null : t;
  };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email.toLowerCase() } : {}),
      ...(input.phone !== undefined ? { phone: clean(input.phone) } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: clean(input.avatarUrl) } : {}),
      ...(input.bio !== undefined ? { bio: clean(input.bio) } : {}),
      ...(input.department !== undefined ? { department: clean(input.department) } : {}),
      ...(input.location !== undefined ? { location: clean(input.location) } : {}),
      ...(input.designation !== undefined ? { designation: clean(input.designation) } : {}),
      ...(input.employeeId !== undefined ? { employeeId: clean(input.employeeId) } : {}),
      ...(input.shiftPreference !== undefined ? { shiftPreference: clean(input.shiftPreference) } : {}),
      ...(input.linkedInUrl !== undefined ? { linkedInUrl: clean(input.linkedInUrl) } : {}),
      ...(input.displayColor !== undefined ? { displayColor: clean(input.displayColor) } : {}),
      ...(input.skills !== undefined ? { skills: input.skills } : {}),
    },
  });

  return sanitizeUser(updated as any);
}

export async function setSecurityQuestion(userId: string, input: SecurityQuestionInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) throw ApiError.notFound('User not found');

  const securityAnswerHash = await hashSecurityAnswer(input.securityAnswer);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      securityQuestion: input.securityQuestion.trim(),
      securityAnswerHash,
    },
  });

  return sanitizeUser(updated);
}

export async function getForgotPasswordQuestion(input: ForgotPasswordQuestionInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || user.deletedAt || !user.isActive) throw ApiError.notFound('No active account found for this email');
  if (!user.securityQuestion || !user.securityAnswerHash) {
    throw ApiError.badRequest('No security question is configured for this account. Please contact an administrator.');
  }

  return { email: user.email, securityQuestion: user.securityQuestion };
}

export async function resetPasswordWithSecurityAnswer(input: ForgotPasswordResetInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || user.deletedAt || !user.isActive) throw ApiError.notFound('No active account found for this email');
  if (!user.securityQuestion || !user.securityAnswerHash) {
    throw ApiError.badRequest('No security question is configured for this account. Please contact an administrator.');
  }

  const isValid = await compareSecurityAnswer(input.securityAnswer, user.securityAnswerHash);
  if (!isValid) throw ApiError.badRequest('Security answer is incorrect');

  const newHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
  await prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
}

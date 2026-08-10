import { describe, it, expect, vi } from 'vitest';
import * as tokenService from '../../../backend/src/modules/auth/token.service';
import { ClientType, Role } from '@prisma/client';

// Mock env parameters
vi.mock('../../../backend/src/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-access-secret-minimum-32-chars-long',
    JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-32-chars-long',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  },
}));

describe('Authentication - Token Service', () => {
  it('AUTH-TOKEN-001: Should sign and verify access token correctly', () => {
    const payload = {
      id: 'user-id-123',
      role: Role.RECRUITER,
      email: 'recruiter@mayzax.com',
      clientType: ClientType.WEB,
    };

    const token = tokenService.signAccessToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = tokenService.verifyAccessToken(token);
    expect(decoded.sub).toBe(payload.id);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.clientType).toBe(payload.clientType);
  });

  it('AUTH-TOKEN-003/004: Should fail verification for tampered/invalid signature secrets', () => {
    const payload = {
      id: 'user-id-123',
      role: Role.RECRUITER,
      email: 'recruiter@mayzax.com',
    };

    const token = tokenService.signAccessToken(payload);
    const tampered = token + 'tamper';

    expect(() => tokenService.verifyAccessToken(tampered)).toThrow();
  });

  it('AUTH-CLIENT-002: Should resolve correct ClientType from headers', () => {
    expect(tokenService.resolveClientType('mobile')).toBe(ClientType.MOBILE);
    expect(tokenService.resolveClientType('web')).toBe(ClientType.WEB);
    expect(tokenService.resolveClientType(undefined)).toBe(ClientType.WEB);
    expect(tokenService.resolveClientType('INVALID')).toBe(ClientType.WEB);
  });
});

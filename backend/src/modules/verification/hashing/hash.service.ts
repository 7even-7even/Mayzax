import crypto from 'crypto';
import { env } from '@/config/env';
import { canonicalizeEvidence } from './canonicalize';
import { VerificationEvidence } from '../types/verification.types';

export function generateVerificationHash(canonicalEvidence: string, secret?: string): string {
  const useSecret = secret || env.VERIFICATION_HMAC_SECRET;
  if (!useSecret || useSecret.length < 16) {
    throw new Error('VERIFICATION_HMAC_SECRET must be at least 16 characters');
  }
  return crypto.createHmac('sha256', useSecret).update(canonicalEvidence, 'utf8').digest('hex');
}

export function generateHashFromEvidence(evidence: VerificationEvidence, secret?: string): { hash: string; canonical: string } {
  const canonical = canonicalizeEvidence(evidence);
  const hash = generateVerificationHash(canonical, secret);
  return { hash, canonical };
}

export function verifyHash(evidence: VerificationEvidence, expectedHash: string, secret?: string): boolean {
  const { hash } = generateHashFromEvidence(evidence, secret);
  // timingSafeEqual to prevent timing attacks
  try {
    const hashBuf = Buffer.from(hash, 'hex');
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    if (hashBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, expectedBuf);
  } catch {
    return false;
  }
}

export function isValidHashFormat(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash);
}

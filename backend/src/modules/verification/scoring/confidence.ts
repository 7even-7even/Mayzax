import { env } from '@/config/env';
import { VerificationConfidence } from '../types/verification.types';

/**
 * Confidence Mapper — v1.1 Universal ATS Intelligence
 * Thresholds dynamically mapped via environment variables
 */

export function getConfidenceFromScore(score: number): VerificationConfidence {
  if (score > env.VERIFICATION_THRESHOLD) return 'HIGH';
  if (score >= 20) return 'MEDIUM';
  return 'LOW';
}

export function isVerifiedConfidence(confidence: VerificationConfidence): boolean {
  return confidence === 'HIGH';
}

export function mapScoreToConfidenceLevel(score: number): { confidence: VerificationConfidence; verified: boolean; label: string } {
  const confidence = getConfidenceFromScore(score);
  const verified = score > env.VERIFICATION_THRESHOLD;
  let label: string;
  if (score > env.VERIFICATION_THRESHOLD) label = 'VERIFIED';
  else if (score >= 20) label = 'POSSIBLE';
  else label = 'NOT_VERIFIED';

  return { confidence, verified, label };
}


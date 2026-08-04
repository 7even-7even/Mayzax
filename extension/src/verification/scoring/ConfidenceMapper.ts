import { VerificationConfidence } from '../types';

/**
 * Confidence Mapper — v1.1 Universal ATS Intelligence
 * Lowered thresholds to minimize false negatives
 * Verified at 40+ (was 65), Suspicious at 20+ (was 45)
 * Philosophy: Genuinely submitted applications should almost never be unverified
 */

export function getConfidenceFromScore(score: number): VerificationConfidence {
  if (score >= 40) return 'HIGH';
  if (score >= 20) return 'MEDIUM';
  return 'LOW';
}

export function isVerifiedScore(score: number): boolean {
  return score >= 40;
}

export interface ConfidenceMapping {
  confidence: VerificationConfidence;
  verified: boolean;
  label: string;
}

export function mapScoreToConfidence(score: number): ConfidenceMapping {
  const confidence = getConfidenceFromScore(score);
  const verified = isVerifiedScore(score);
  let label: string;
  if (score >= 40) label = 'VERIFIED';
  else if (score >= 30) label = 'VERY_LIKELY';
  else if (score >= 20) label = 'POSSIBLE';
  else label = 'NOT_VERIFIED';

  return { confidence, verified, label };
}

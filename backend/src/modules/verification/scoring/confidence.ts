import { VerificationConfidence } from '../types/verification.types';

/**
 * Confidence Mapper — v1.1 Universal ATS Intelligence
 * Lowered thresholds to minimize false negatives
 * Verified at 40+ HIGH (was 80), Suspicious at 20+ MEDIUM (was 50)
 */

export function getConfidenceFromScore(score: number): VerificationConfidence {
  if (score >= 40) return 'HIGH';
  if (score >= 20) return 'MEDIUM';
  return 'LOW';
}

export function isVerifiedConfidence(confidence: VerificationConfidence): boolean {
  return confidence === 'HIGH';
}

export function mapScoreToConfidenceLevel(score: number): { confidence: VerificationConfidence; verified: boolean; label: string } {
  const confidence = getConfidenceFromScore(score);
  const verified = score >= 40;
  let label: string;
  if (score >= 60) label = 'VERIFIED';
  else if (score >= 40) label = 'VERY_LIKELY';
  else if (score >= 20) label = 'POSSIBLE';
  else label = 'NOT_VERIFIED';

  return { confidence, verified, label };
}

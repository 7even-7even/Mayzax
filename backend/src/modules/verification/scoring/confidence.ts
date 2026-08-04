import { VerificationConfidence } from '../types/verification.types';

export function getConfidenceFromScore(score: number): VerificationConfidence {
  if (score >= 80) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}

export function isVerifiedConfidence(confidence: VerificationConfidence): boolean {
  return confidence === 'HIGH';
}

export function mapScoreToConfidenceLevel(score: number): { confidence: VerificationConfidence; verified: boolean; label: string } {
  const confidence = getConfidenceFromScore(score);
  const verified = score >= 80;
  let label: string;
  if (score >= 90) label = 'VERIFIED';
  else if (score >= 80) label = 'VERY_LIKELY';
  else if (score >= 50) label = 'POSSIBLE';
  else label = 'NOT_VERIFIED';

  return { confidence, verified, label };
}

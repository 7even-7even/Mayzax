import { VerificationConfidence } from '../types';

export function getConfidenceFromScore(score: number): VerificationConfidence {
  if (score >= 80) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}

export function isVerifiedScore(score: number): boolean {
  return score >= 80;
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
  if (score >= 90) label = 'VERIFIED';
  else if (score >= 80) label = 'VERY_LIKELY';
  else if (score >= 50) label = 'POSSIBLE';
  else label = 'NOT_VERIFIED';

  return { confidence, verified, label };
}

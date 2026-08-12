import { VerificationConfidence } from '../types';
import { VERIFICATION_THRESHOLD } from '../engine/EngineConfig';

/**
 * Confidence Mapper — v1.1 Universal ATS Intelligence
 * Thresholds dynamically mapped via environment variables
 */

export function getConfidenceFromScore(score: number): VerificationConfidence {
  if (score > VERIFICATION_THRESHOLD) return 'HIGH';
  if (score >= 20) return 'MEDIUM';
  return 'LOW';
}

export function isVerifiedScore(score: number): boolean {
  return score > VERIFICATION_THRESHOLD;
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
  if (score > VERIFICATION_THRESHOLD) label = 'VERIFIED';
  else if (score >= 20) label = 'POSSIBLE';
  else label = 'NOT_VERIFIED';

  return { confidence, verified, label };
}

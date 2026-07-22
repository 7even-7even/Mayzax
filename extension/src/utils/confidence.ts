import { ConfidenceLevel } from '../types';

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 90) return 'VERIFIED';
  if (score >= 70) return 'VERY_LIKELY';
  if (score >= 50) return 'POSSIBLE';
  return 'NOT_VERIFIED';
}

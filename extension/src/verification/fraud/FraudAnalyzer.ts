/**
 * Fraud Analyzer — v1.1 Universal ATS Intelligence
 * Separate from scoring, analyzes fraud signals
 * Philosophy: Fraud only slightly reduces confidence unless overwhelming evidence of tampering
 * Positive evidence dominates, fraud is weak reduction
 */

import { VerificationEvidence } from '../types';
import { FRAUD_PENALTIES, EVIDENCE_THRESHOLDS, THRESHOLDS } from '../engine/EngineConfig';
import { FAILURE_PHRASES } from '../utils/successPhrases';

export interface FraudAnalysisResult {
  fraudScore: number; // Negative score (penalty)
  fraudSignals: string[];
  failurePhrases: string[];
  isFraud: boolean;
  isOverwhelmingFailure: boolean;
  reasons: string[];
  weakNegativeEvidence: string[];
}

export class FraudAnalyzer {
  analyze(evidence: VerificationEvidence, currentScore: number): FraudAnalysisResult {
    const fraudSignals: string[] = [];
    const failurePhrases: string[] = [];
    const reasons: string[] = [];
    const weakNegativeEvidence: string[] = [];
    let fraudScore = 0; // Negative penalty, start at 0, subtract

    // ── History Manipulation — Keep as actual fraud indicator ────────────
    if (evidence.historyManipulationDetected) {
      const penalty = FRAUD_PENALTIES.HISTORY_MANIPULATION || -5;
      fraudScore += penalty;
      fraudSignals.push('HISTORY_MANIPULATION_DETECTED');
      reasons.push(`History manipulation detected — confidence reduced by ${Math.abs(penalty)}`);
      weakNegativeEvidence.push(`• History manipulation detected — possible pushState/replaceState spoofing`);
    }

    // ── Short Time on Page — Minimal influence ───────────────────────────
    // Spec: Either remove penalty or reduce to very small influence
    // Users often submit and immediately return — don't assume fraud
    if (evidence.timeOnPageMs !== undefined && evidence.timeOnPageMs < 2000) {
      const penalty = FRAUD_PENALTIES.SHORT_TIME_ON_PAGE || -1;
      fraudScore += penalty;
      // Only add as weak negative, not strong fraud
      weakNegativeEvidence.push(`• Page viewed for only ${evidence.timeOnPageMs}ms — minimal influence`);
      // Don't add to fraudSignals unless extremely short (<500ms) which is suspicious
      if (evidence.timeOnPageMs < 500) {
        fraudSignals.push('VERY_SHORT_TIME_ON_PAGE');
        reasons.push(`Very short time on page (${evidence.timeOnPageMs}ms) — possible automation`);
      }
    }

    // ── Apply Button Still Visible — Very weak signal ────────────────────
    // Spec: DO NOT automatically penalize pages simply because Apply button exists
    // Some ATS always display other jobs — treat button evidence as weak
    if (evidence.buttonEvidence?.hasNegative || evidence.domFingerprint?.unexpectedApplyButtonPresent) {
      const penalty = FRAUD_PENALTIES.APPLY_BUTTON_VISIBLE || -2;
      // Only apply if we have strong positive evidence otherwise? Actually spec says very weak
      // We'll apply minimal penalty only if no other positive signals
      const positiveCount = evidence.totalPositiveSignals || evidence.positiveSignals?.length || 0;
      if (positiveCount < 2) {
        fraudScore += penalty;
        weakNegativeEvidence.push(`• Apply button still visible — weak signal (many ATS show other jobs)`);
      } else {
        weakNegativeEvidence.push(`• Apply button still visible but ${positiveCount} positive signals outweigh — ignored`);
      }
    }

    // ── Failure Phrases — Actual failure indicators ──────────────────────
    // Check title, headings, body for failure phrases like "error", "failed", "submission failed"
    const allText = [
      evidence.title || '',
      (evidence.headings || []).join(' '),
      evidence.confirmationText || '',
      evidence.bodyEvidence?.confirmationText || '',
    ].join(' ').toLowerCase();

    let failureCount = 0;
    for (const pat of FAILURE_PHRASES) {
      if (pat.test(allText)) {
        failureCount++;
        failurePhrases.push(pat.source);
        weakNegativeEvidence.push(`• Failure phrase detected: "${pat.source}"`);
      }
    }

    if (failureCount === 1) {
      const penalty = FRAUD_PENALTIES.FAILURE_PHRASE || -10;
      fraudScore += penalty;
      fraudSignals.push('FAILURE_PHRASE_DETECTED');
      reasons.push(`Failure phrase detected: ${failurePhrases[0]} — confidence reduced by ${Math.abs(penalty)}`);
    } else if (failureCount >= 2) {
      const penalty = FRAUD_PENALTIES.OVERWHELMING_FAILURE || -30;
      fraudScore += penalty;
      fraudSignals.push('OVERWHELMING_FAILURE_PHRASES');
      reasons.push(`Multiple failure phrases detected (${failureCount}): ${failurePhrases.slice(0, 3).join(', ')} — strong negative`);
    }

    // ── Title/Heading Negative Check — Missing = 0, not penalty ──────────
    // Spec: Missing title match = zero or tiny impact, not large negative
    // Only failure phrases in title/heading should be penalized, which we already handled above
    // So no additional penalty for missing title/heading

    // ── No Metadata — No penalty ─────────────────────────────────────────
    // Spec: No metadata = 0, not penalty

    // ── Determine if fraud is overwhelming ────────────────────────────────
    const isOverwhelmingFailure = failureCount >= 3 || fraudScore <= -30;
    const isFraud = isOverwhelmingFailure || (fraudSignals.includes('HISTORY_MANIPULATION_DETECTED') && failureCount >= 1);

    return {
      fraudScore,
      fraudSignals,
      failurePhrases,
      isFraud,
      isOverwhelmingFailure,
      reasons,
      weakNegativeEvidence,
    };
  }

  /**
   * Apply fraud analysis to final score
   * Returns adjusted score, ensuring fraud only slightly reduces unless overwhelming
   */
  applyFraudPenalty(currentScore: number, fraudAnalysis: FraudAnalysisResult): { adjustedScore: number; verified: boolean; confidence: 'LOW' | 'MEDIUM' | 'HIGH' } {
    let adjustedScore = currentScore + fraudAnalysis.fraudScore; // fraudScore is negative

    // If overwhelming failure, cap score low
    if (fraudAnalysis.isOverwhelmingFailure) {
      adjustedScore = Math.min(adjustedScore, 20);
      return {
        adjustedScore: Math.max(0, adjustedScore),
        verified: false,
        confidence: 'LOW',
      };
    }

    // Otherwise, fraud only slightly reduces, don't drop below thresholds too aggressively
    adjustedScore = Math.max(0, adjustedScore);

    const verified = adjustedScore > THRESHOLDS.VERIFIED;
    const confidence = verified ? 'HIGH' : 'LOW';

    return {
      adjustedScore,
      verified,
      confidence,
    };
  }
}

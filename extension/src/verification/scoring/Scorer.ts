import { RuleContext, RuleOutcome, VerificationEvidence } from '../types';
import { VerificationRule } from '../types';
import { getConfidenceFromScore } from './ConfidenceMapper';
import { WeightedEvidenceScorer } from './WeightedEvidenceScorer';
import { THRESHOLDS } from '../engine/EngineConfig';

export interface ScoringResult {
  score: number;
  maxScore: number;
  reasons: string[];
  fraudSignals: string[];
  outcomes: RuleOutcome[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  verified: boolean;
  // v1.1 enhanced logging
  positiveEvidence?: string[];
  neutralEvidence?: string[];
  weakNegativeEvidence?: string[];
  evidenceBreakdown?: Record<string, number>;
}

/**
 * VerificationScorer — v1.1 Universal ATS Intelligence
 * Now evidence-driven: consumes normalized evidence, starts at 0 adds positive
 * Missing evidence = 0 (no penalty), positive dominates, fraud only slight reduction
 * Delegates to WeightedEvidenceScorer for universal evidence, falls back to legacy for backward compat
 */
export class VerificationScorer {
  private weightedScorer = new WeightedEvidenceScorer();

  score(outcomes: RuleOutcome[], evidence: VerificationEvidence): ScoringResult {
    // v1.1: If evidence has universal fields (evidenceScoreBreakdown, positiveSignals), use weighted evidence scoring
    const hasUniversalEvidence = evidence.evidenceScoreBreakdown || evidence.positiveSignals || evidence.urlEvidence;

    if (hasUniversalEvidence) {
      try {
        const weightedResult = this.weightedScorer.score(evidence);

        // Combine legacy outcomes reasons with weighted reasons for debugging
        const legacyReasons = outcomes.flatMap(o => o.reasons);
        const fraudFromLegacy = outcomes.flatMap(o => o.fraudSignals || []);

        return {
          score: weightedResult.score,
          maxScore: 100,
          reasons: weightedResult.reasons,
          fraudSignals: [...new Set([...(weightedResult.positiveEvidence ? [] : []), ...fraudFromLegacy])],
          outcomes,
          confidence: weightedResult.confidence,
          verified: weightedResult.verified,
          positiveEvidence: weightedResult.positiveEvidence,
          neutralEvidence: weightedResult.neutralEvidence,
          weakNegativeEvidence: weightedResult.weakNegativeEvidence,
          evidenceBreakdown: weightedResult.evidenceBreakdown,
        };
      } catch (err) {
        console.warn('[Mayzax v1.1] Weighted scoring failed, falling back to legacy', err);
        // Fall through to legacy
      }
    }

    // Legacy fallback — but updated to v1.1 philosophy: missing = 0, weak penalties
    const reasons: string[] = [];
    const fraudSignals: string[] = [];
    let totalScore = 0;
    const maxScore = 100;

    // Check for instant reject only for truly invalid domains (IP, localhost, insecure)
    // Not for unsupported generic domains — generic now allowed with cap 90
    const domainOutcome = outcomes.find(o => o.ruleId === 'DomainValidation');
    if (domainOutcome) {
      if (domainOutcome.fraudSignals?.includes('BLOCKED_HOSTNAME') || domainOutcome.fraudSignals?.includes('INSECURE_PROTOCOL')) {
        return {
          score: 0,
          maxScore,
          reasons: [...domainOutcome.reasons, 'Domain validation failed — blocked or insecure'],
          fraudSignals: [...(domainOutcome.fraudSignals || []), 'UNSUPPORTED_DOMAIN_OR_INSECURE'],
          outcomes,
          confidence: 'LOW',
          verified: false,
          positiveEvidence: [],
          neutralEvidence: domainOutcome.reasons,
          weakNegativeEvidence: [],
          evidenceBreakdown: { domain: 0 },
        };
      }
      // For generic domains, don't instant reject, just low score from that rule
    }

    // Evidence aggregation: start at 0, add positive, missing = 0
    for (const outcome of outcomes) {
      // Only add positive contributions, ignore missing (0) — no penalty for missing
      if (outcome.scoreContribution > 0) {
        totalScore += outcome.scoreContribution;
      }
      // For negative contributions, only apply if it's fraud-related and very weak
      if (outcome.scoreContribution < 0) {
        // Apply only 20% of negative penalty to minimize impact (except history manipulation)
        const isHistoryManipulation = outcome.fraudSignals?.includes('HISTORY_MANIPULATION_DETECTED');
        const weakPenalty = isHistoryManipulation ? outcome.scoreContribution : outcome.scoreContribution * 0.2;
        totalScore += weakPenalty;
      }
      reasons.push(...outcome.reasons);
      if (outcome.fraudSignals) fraudSignals.push(...outcome.fraudSignals);
    }

    // Minimal fraud penalties — v1.1 philosophy
    if (evidence.historyManipulationDetected) {
      totalScore -= 5; // Keep -5 for actual fraud
      fraudSignals.push('HISTORY_MANIPULATION_DETECTED');
      reasons.push('History manipulation detected — slight reduction');
    }
    if (evidence.timeOnPageMs !== undefined && evidence.timeOnPageMs < 1000) {
      totalScore -= 1; // Minimal from -5 to -1
      weakNegativeEvidencePush();
    }

    function weakNegativeEvidencePush() {
      // Placeholder to avoid unused
    }

    totalScore = Math.max(0, Math.min(totalScore, 100));

    // Generic portal cap increased to 90 (from 60) since generic now smarter
    if (evidence.portal === 'OTHER' || evidence.portal === 'COMPANY_WEBSITE' || evidence.portal === 'CAREER_SITE') {
      if (totalScore > 90 && !evidence.applicationReference && !evidence.referenceEvidence?.hasAnyReference) {
        if ((evidence.domFingerprint?.expectedContainersFound || 0) < 1 && (evidence.domFingerprint?.fingerprintScore || 0) < 2) {
          totalScore = Math.min(totalScore, 90);
          reasons.push('Generic portal capped at 90 without strong evidence (reference or fingerprint)');
        }
      }
    }

    const confidence = getConfidenceFromScore(totalScore);
    const verified = totalScore >= THRESHOLDS.VERIFIED;

    return {
      score: totalScore,
      maxScore,
      reasons,
      fraudSignals: [...new Set(fraudSignals)],
      outcomes,
      confidence,
      verified,
      positiveEvidence: reasons.filter(r => r.includes('✓') || r.toLowerCase().includes('matched') || r.toLowerCase().includes('detected')),
      neutralEvidence: [],
      weakNegativeEvidence: [],
      evidenceBreakdown: {},
    };
  }
}

/**
 * Evaluate all rules sequentially — kept for backward compatibility
 * New engine uses evidence-driven scoring directly, but legacy path still works
 */
export function evaluateRules(rules: VerificationRule[], context: RuleContext): RuleOutcome[] {
  const outcomes: RuleOutcome[] = [];
  for (const rule of rules) {
    try {
      // Try evidence-based evaluation first if available (v1.1)
      if (rule.evaluateEvidence && context.normalizedEvidence) {
        const outcome = rule.evaluateEvidence(context.normalizedEvidence, context.portalPlugin);
        outcomes.push(outcome);
        continue;
      }
      if (rule.evaluateEvidence && context.evidence) {
        const outcome = rule.evaluateEvidence(context.evidence as VerificationEvidence, context.portalPlugin);
        outcomes.push(outcome);
        continue;
      }
      const outcome = rule.evaluate(context);
      outcomes.push(outcome);
    } catch (err) {
      console.warn(`[Verification] Rule ${rule.id} failed:`, err);
      outcomes.push({
        ruleId: rule.id,
        passed: false,
        scoreContribution: 0,
        reasons: [`Rule ${rule.id} error: ${err}`],
        fraudSignals: ['RULE_EVALUATION_ERROR'],
      });
    }
  }
  return outcomes;
}


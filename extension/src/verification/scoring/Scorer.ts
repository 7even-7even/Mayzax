import { RuleContext, RuleOutcome, VerificationEvidence } from '../types';
import { VerificationRule } from '../types';
import { getConfidenceFromScore } from './ConfidenceMapper';

export interface ScoringResult {
  score: number;
  maxScore: number;
  reasons: string[];
  fraudSignals: string[];
  outcomes: RuleOutcome[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  verified: boolean;
}

export class VerificationScorer {
  score(outcomes: RuleOutcome[], evidence: VerificationEvidence): ScoringResult {
    const reasons: string[] = [];
    const fraudSignals: string[] = [];
    let totalScore = 0;
    const maxScore = 100;

    // Check for instant reject (domain failure)
    const domainOutcome = outcomes.find(o => o.ruleId === 'DomainValidation');
    if (domainOutcome && !domainOutcome.passed && domainOutcome.scoreContribution === 0) {
      return {
        score: 0,
        maxScore,
        reasons: [...domainOutcome.reasons, 'Domain validation failed — unsupported or insecure'],
        fraudSignals: [...(domainOutcome.fraudSignals || []), 'UNSUPPORTED_DOMAIN_OR_INSECURE'],
        outcomes,
        confidence: 'LOW',
        verified: false,
      };
    }

    for (const outcome of outcomes) {
      totalScore += outcome.scoreContribution;
      reasons.push(...outcome.reasons);
      if (outcome.fraudSignals) fraudSignals.push(...outcome.fraudSignals);
    }

    // Additional security penalties from evidence
    if (evidence.historyManipulationDetected) {
      totalScore -= 10;
      fraudSignals.push('HISTORY_MANIPULATION_DETECTED');
      reasons.push('History manipulation detected — confidence reduced');
    }
    if (evidence.timeOnPageMs !== undefined && evidence.timeOnPageMs < 3000) {
      totalScore -= 5;
      fraudSignals.push('SHORT_TIME_ON_PAGE');
      reasons.push(`Short time on page (${evidence.timeOnPageMs}ms) suspicious`);
    }

    totalScore = Math.max(0, Math.min(totalScore, 100));

    // Cap for generic portals
    if (evidence.portal === 'OTHER' || evidence.portal === 'COMPANY_WEBSITE' || evidence.portal === 'CAREER_SITE') {
      if (totalScore > 60 && !evidence.applicationReference && (evidence.domFingerprint?.expectedContainersFound || 0) < 2) {
        totalScore = Math.min(totalScore, 60);
        reasons.push('Generic portal capped at 60 without strong evidence');
      }
    }

    const confidence = getConfidenceFromScore(totalScore);
    const verified = totalScore >= 80;

    return {
      score: totalScore,
      maxScore,
      reasons,
      fraudSignals: [...new Set(fraudSignals)],
      outcomes,
      confidence,
      verified,
    };
  }
}

/**
 * Evaluate all rules sequentially
 */
export function evaluateRules(rules: VerificationRule[], context: RuleContext): RuleOutcome[] {
  const outcomes: RuleOutcome[] = [];
  for (const rule of rules) {
    try {
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

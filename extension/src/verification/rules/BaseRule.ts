import { VerificationRule, RuleContext, RuleOutcome, VerificationEvidence, PortalPlugin } from '../types';

export abstract class BaseVerificationRule implements VerificationRule {
  abstract readonly id: string;
  abstract readonly defaultWeight: number;
  abstract evaluate(context: RuleContext): RuleOutcome;

  /**
   * v1.1 Universal — evidence-driven evaluation
   * Consumes normalized evidence rather than raw DOM text
   * Default implementation delegates to evaluate(context) for backward compat,
   * but subclasses should override for evidence aggregation model
   */
  evaluateEvidence?(evidence: VerificationEvidence, plugin?: PortalPlugin): RuleOutcome;

  protected createOutcome(passed: boolean, score: number, reasons: string[], extras: Partial<RuleOutcome> = {}): RuleOutcome {
    return {
      ruleId: this.id,
      passed,
      scoreContribution: score,
      reasons,
      ...extras,
    };
  }

  protected evidenceOutcome(
    passed: boolean,
    score: number,
    reasons: string[],
    category: 'positive' | 'neutral' | 'negative' | 'fraud' = 'positive',
    extras: Partial<RuleOutcome> = {}
  ): RuleOutcome {
    return {
      ruleId: this.id,
      passed,
      scoreContribution: score,
      reasons,
      category,
      ...extras,
    };
  }
}


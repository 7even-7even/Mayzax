import { VerificationRule, RuleContext, RuleOutcome } from '../types';

export abstract class BaseVerificationRule implements VerificationRule {
  abstract readonly id: string;
  abstract readonly defaultWeight: number;
  abstract evaluate(context: RuleContext): RuleOutcome;

  protected createOutcome(passed: boolean, score: number, reasons: string[], extras: Partial<RuleOutcome> = {}): RuleOutcome {
    return {
      ruleId: this.id,
      passed,
      scoreContribution: score,
      reasons,
      ...extras,
    };
  }
}

import { BaseVerificationRule } from './BaseRule';
import { RuleContext, RuleOutcome } from '../types';

export class PortalComplianceRule extends BaseVerificationRule {
  readonly id = 'PortalCompliance';
  readonly defaultWeight = 5;

  evaluate(context: RuleContext): RuleOutcome {
    const { portalPlugin } = context;
    const reasons: string[] = [];

    if (!portalPlugin) {
      return this.createOutcome(false, 0, ['No portal definition matched']);
    }

    reasons.push(`Portal compliance for ${portalPlugin.displayName}`);
    let score = this.defaultWeight;
    if (portalPlugin.weightBonus) {
      const bonus = Math.min(portalPlugin.weightBonus, 5);
      score += bonus;
      reasons.push(`Portal bonus +${bonus} for ${portalPlugin.displayName}`);
    }

    return this.createOutcome(true, Math.min(score, 10), reasons);
  }
}

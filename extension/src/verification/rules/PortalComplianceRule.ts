import { BaseVerificationRule } from './BaseRule';
import { RuleContext, RuleOutcome, VerificationEvidence, PortalPlugin } from '../types';

export class PortalComplianceRule extends BaseVerificationRule {
  readonly id = 'PortalCompliance';
  readonly defaultWeight = 5;

  evaluateEvidence(evidence: VerificationEvidence, plugin?: PortalPlugin): RuleOutcome {
    if (!plugin) {
      return this.evidenceOutcome(false, 0, ['• No portal definition matched'], 'neutral');
    }

    const reasons = [`✓ Portal compliance for ${plugin.displayName}`];
    let score = this.defaultWeight;
    if (plugin.weightBonus) {
      const bonus = Math.min(plugin.weightBonus, 5);
      score += bonus;
      reasons.push(`✓ Portal bonus +${bonus} for ${plugin.displayName}`);
    }

    return this.evidenceOutcome(true, Math.min(score, 10), reasons, 'positive');
  }

  evaluate(context: RuleContext): RuleOutcome {
    if (context.evidence) {
      return this.evaluateEvidence(context.evidence as VerificationEvidence, context.portalPlugin);
    }

    const { portalPlugin } = context;
    if (!portalPlugin) {
      return this.evidenceOutcome(false, 0, ['• No portal definition matched'], 'neutral');
    }

    const reasons = [`✓ Portal compliance for ${portalPlugin.displayName}`];
    let score = this.defaultWeight;
    if (portalPlugin.weightBonus) {
      const bonus = Math.min(portalPlugin.weightBonus, 5);
      score += bonus;
      reasons.push(`✓ Portal bonus +${bonus} for ${portalPlugin.displayName}`);
    }

    return this.evidenceOutcome(true, Math.min(score, 10), reasons, 'positive');
  }
}

import { BaseVerificationRule } from './BaseRule';
import { RuleContext, RuleOutcome, VerificationEvidence } from '../types';
import { collectButtons } from '../utils/dom';

export class ApplyButtonRule extends BaseVerificationRule {
  readonly id = 'ApplyButton';
  readonly defaultWeight = 0; // v1.1: very weak signal, not automatic penalty

  evaluateEvidence(evidence: VerificationEvidence): RuleOutcome {
    // v1.1: DO NOT automatically penalize pages simply because Apply button exists
    // Some ATS always display other jobs — treat as weak signal, not penalty
    // Positive evidence dominates, this is weak negative at most

    const buttonEvidence = evidence.buttonEvidence;

    if (buttonEvidence) {
      if (buttonEvidence.hasPositive) {
        return this.evidenceOutcome(
          true,
          2,
          [`✓ Positive buttons: ${buttonEvidence.positiveButtons.map(b => b.text).slice(0, 2).join(', ')} — weak positive`],
          'positive'
        );
      }

      if (buttonEvidence.hasNegative) {
        // Very weak negative — many ATS show other jobs, so not strong penalty
        // Only -2 if no other positive signals, otherwise neutral
        const positiveCount = evidence.totalPositiveSignals || evidence.positiveSignals?.length || 0;
        if (positiveCount >= 3) {
          // Many positive signals outweigh Apply button — neutral
          return this.evidenceOutcome(
            true,
            0,
            [`• Apply button still visible but ${positiveCount} positive signals outweigh — weak neutral`],
            'neutral'
          );
        } else {
          return this.evidenceOutcome(
            false,
            -2,
            [`• Apply button still visible: ${buttonEvidence.negativeButtons.map(b => b.text).slice(0, 2).join(', ')} — very weak negative`],
            'neutral',
            { fraudSignals: ['APPLY_BUTTON_STILL_VISIBLE_WEAK'] }
          );
        }
      }
    }

    // Fallback: check detectedButtons
    const buttons = evidence.detectedButtons || [];
    const applyPattern = /apply|submit application|continue application|quick apply/i;
    const problematic = buttons.filter(b => applyPattern.test(b.text) && b.visible && !b.disabled);

    if (problematic.length > 0) {
      const positiveCount = evidence.totalPositiveSignals || 0;
      if (positiveCount >= 3) {
        return this.evidenceOutcome(true, 0, [`• Apply button visible but many positives outweigh — weak neutral`], 'neutral');
      }
      return this.evidenceOutcome(false, -2, [`• Apply button still visible: ${problematic.map(b => `"${b.text}"`).join(', ')} — very weak`], 'neutral', {
        fraudSignals: ['APPLY_BUTTON_STILL_VISIBLE_WEAK'],
      });
    }

    // No Apply button — weak positive, likely confirmation page
    return this.evidenceOutcome(true, 2, ['✓ No Apply button found — likely confirmation page — weak positive'], 'positive');
  }

  evaluate(context: RuleContext): RuleOutcome {
    if (context.evidence) {
      return this.evaluateEvidence(context.evidence as VerificationEvidence);
    }

    const { document } = context;
    const buttons = collectButtons(document);
    const applyPattern = /apply|submit application|continue application|quick apply/i;
    const problematic = buttons.filter(b => applyPattern.test(b.text) && b.visible && !b.disabled);

    if (problematic.length > 0) {
      return this.evidenceOutcome(
        false,
        -2,
        [`• Apply button still visible: ${problematic.map(b => `"${b.text}"`).join(', ')} — very weak negative`],
        'neutral',
        { fraudSignals: ['APPLY_BUTTON_STILL_VISIBLE_WEAK'] }
      );
    }

    const hasAnyApply = buttons.some(b => applyPattern.test(b.text));
    if (!hasAnyApply) {
      return this.evidenceOutcome(true, 2, ['✓ No Apply button found — likely confirmation page — weak positive'], 'positive');
    }

    return this.evidenceOutcome(true, 0, ['• Apply button check neutral'], 'neutral');
  }
}

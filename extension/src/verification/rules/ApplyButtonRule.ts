import { BaseVerificationRule } from './BaseRule';
import { RuleContext, RuleOutcome } from '../types';
import { collectButtons } from '../utils/dom';

export class ApplyButtonRule extends BaseVerificationRule {
  readonly id = 'ApplyButton';
  readonly defaultWeight = 0; // base 0, bonus if absent, penalty if present enabled

  evaluate(context: RuleContext): RuleOutcome {
    const { document } = context;
    const reasons: string[] = [];
    const fraudSignals: string[] = [];

    const buttons = collectButtons(document);

    // Find apply buttons that are still visible and enabled — strong fraud signal if on confirmation page
    const applyPattern = /apply|submit application|continue application|quick apply/i;
    const problematic = buttons.filter(b => applyPattern.test(b.text) && b.visible && !b.disabled);

    if (problematic.length > 0) {
      reasons.push(`Apply button still visible and enabled: ${problematic.map(b => `"${b.text}"`).join(', ')} — reduces confidence`);
      fraudSignals.push('APPLY_BUTTON_STILL_ENABLED');
      return this.createOutcome(false, -15, reasons, { fraudSignals });
    }

    const disabledApply = buttons.filter(b => applyPattern.test(b.text) && b.disabled);
    if (disabledApply.length > 0) {
      reasons.push(`Apply button present but disabled: ${disabledApply.map(b => b.text).join(', ')} — neutral`);
      return this.createOutcome(true, 0, reasons);
    }

    // If no apply button at all, bonus
    const hasAnyApply = buttons.some(b => applyPattern.test(b.text));
    if (!hasAnyApply) {
      reasons.push('No Apply button found — likely on confirmation page');
      return this.createOutcome(true, 5, reasons);
    }

    return this.createOutcome(true, 0, ['Apply button check neutral']);
  }
}

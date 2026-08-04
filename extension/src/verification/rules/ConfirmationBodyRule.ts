import { BaseVerificationRule } from './BaseRule';
import { RuleContext, RuleOutcome } from '../types';
import { collectConfirmationText } from '../utils/dom';

export class ConfirmationBodyRule extends BaseVerificationRule {
  readonly id = 'ConfirmationBody';
  readonly defaultWeight = 20;

  evaluate(context: RuleContext): RuleOutcome {
    const { document, portalPlugin } = context;
    const reasons: string[] = [];

    const confirmationText = collectConfirmationText(document);

    if (!confirmationText || confirmationText.length < 10) {
      return this.createOutcome(false, 0, ['Confirmation text empty or too short']);
    }

    let matches = 0;
    const patterns = portalPlugin?.confirmationPatterns?.length ? portalPlugin.confirmationPatterns : [
      /your application for .* has been submitted/i,
      /thank you for applying/i,
      /your application has been submitted/i,
      /we have received your application/i,
      /application submitted/i,
      /you have successfully submitted/i,
      /you have applied to/i,
    ];

    for (const pat of patterns) {
      if (pat.test(confirmationText)) {
        matches++;
        reasons.push(`Confirmation body matched ${pat}`);
      }
    }

    let score = 0;
    if (confirmationText.length > 50) {
      if (matches >= 2) score = 20;
      else if (matches === 1) score = 15;
      else if (/submitted|received|thank you|success/i.test(confirmationText)) {
        score = 10;
        reasons.push('Body contains generic success keywords — partial');
      } else {
        reasons.push('Confirmation body does not contain expected patterns');
      }
    } else {
      reasons.push(`Confirmation text too short: ${confirmationText.length} chars`);
    }

    // Avoid single-sentence reliance: require at least 2 sentences or multi-clause
    if (confirmationText.split(/[.!?]/).filter(s => s.trim().length > 10).length < 2 && score > 0) {
      reasons.push('Confirmation body has limited sentences — partial credit adjustment');
      score = Math.min(score, 15);
    }

    if (score === 0) {
      reasons.push(`No confirmation pattern matched. Text: ${confirmationText.slice(0, 200)}...`);
    }

    return this.createOutcome(score > 0, score, reasons, { matchedKeywords: [confirmationText.slice(0, 200)] });
  }
}

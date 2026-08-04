import { BaseVerificationRule } from './BaseRule';
import { RuleContext, RuleOutcome } from '../types';

const NEGATIVE_PATTERNS: RegExp[] = [
  /error/i,
  /failed/i,
  /submission failed/i,
  /validation failed/i,
  /required field/i,
  /resume missing/i,
  /draft/i,
  /incomplete/i,
  /cancelled/i,
  /unauthorized/i,
  /access denied/i,
  /session expired/i,
];

export class PageTitleRule extends BaseVerificationRule {
  readonly id = 'PageTitle';
  readonly defaultWeight = 15;

  evaluate(context: RuleContext): RuleOutcome {
    const { document, portalPlugin } = context;
    const title = (document.title || '').trim();
    const lowerTitle = title.toLowerCase();
    const reasons: string[] = [];

    if (!title) {
      return this.createOutcome(false, 0, ['Page title empty']);
    }

    // Negative check
    for (const neg of NEGATIVE_PATTERNS) {
      if (neg.test(title)) {
        return this.createOutcome(false, -20, [`Negative keyword in title: "${title}" matches ${neg}`], {
          fraudSignals: ['NEGATIVE_TITLE'],
        });
      }
    }

    // Portal-specific patterns
    if (portalPlugin && portalPlugin.titlePatterns.length > 0) {
      for (const pat of portalPlugin.titlePatterns) {
        if (pat.test(title)) {
          reasons.push(`Title matched portal pattern ${pat}: "${title}"`);
          return this.createOutcome(true, this.defaultWeight, reasons);
        }
      }
    }

    // Generic confirmation patterns (stricter than old keywords — require multi-word or stronger)
    const GENERIC_SUCCESS_PATTERNS: RegExp[] = [
      /application submitted/i,
      /application received/i,
      /application complete/i,
      /successfully applied/i,
      /thank you for applying/i,
      /your application has been submitted/i,
      /we have received your application/i,
      /submission successful/i,
      /you have successfully submitted/i,
      /your application has been received/i,
      /you have applied/i,
      /you applied to/i,
      /application confirmed/i,
    ];

    for (const pat of GENERIC_SUCCESS_PATTERNS) {
      if (pat.test(title)) {
        reasons.push(`Title matched generic success pattern ${pat}: "${title}"`);
        return this.createOutcome(true, this.defaultWeight, reasons);
      }
    }

    // Weak generic check — single words only get partial credit
    if (/submitted|received|thank you|confirmation/i.test(lowerTitle)) {
      reasons.push(`Title contains generic success keyword: "${title}" — partial credit`);
      return this.createOutcome(true, 8, reasons);
    }

    reasons.push(`Title does not match expected success patterns: "${title}"`);
    return this.createOutcome(false, 0, reasons);
  }
}

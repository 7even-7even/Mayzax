import { BaseVerificationRule } from './BaseRule';
import { RuleContext, RuleOutcome } from '../types';
import { collectHeadings } from '../utils/dom';

const NEGATIVE_PATTERNS: RegExp[] = [
  /error/i,
  /failed/i,
  /submission failed/i,
  /validation failed/i,
  /required field/i,
  /draft/i,
  /incomplete/i,
  /continue application/i,
];

export class HeadingRule extends BaseVerificationRule {
  readonly id = 'Heading';
  readonly defaultWeight = 20;

  evaluate(context: RuleContext): RuleOutcome {
    const { document, portalPlugin } = context;
    const reasons: string[] = [];
    const fraudSignals: string[] = [];

    const headings = collectHeadings(document);

    if (headings.length === 0) {
      return this.createOutcome(false, 0, ['No headings found']);
    }

    // Negative check
    for (const heading of headings) {
      for (const neg of NEGATIVE_PATTERNS) {
        if (neg.test(heading)) {
          return this.createOutcome(false, -10, [`Negative keyword in heading: "${heading}" matches ${neg}`], {
            fraudSignals: ['NEGATIVE_HEADING'],
          });
        }
      }
    }

    let matchedCount = 0;

    const patterns = portalPlugin?.headingPatterns?.length ? portalPlugin.headingPatterns : [
      /application submitted/i,
      /thank you for applying/i,
      /your application has been submitted/i,
      /application received/i,
      /submission successful/i,
      /you have successfully submitted/i,
      /you have applied/i,
    ];

    for (const heading of headings) {
      for (const pat of patterns) {
        if (pat.test(heading)) {
          matchedCount++;
          reasons.push(`Heading matched ${pat}: "${heading}"`);
          break;
        }
      }
    }

    let score = 0;
    if (matchedCount >= 2) score = 20;
    else if (matchedCount === 1) score = 15;
    else if (headings.some(h => /submitted|received|thank you|success/i.test(h))) {
      score = 10;
      reasons.push(`Headings contain generic success: ${headings.join(' | ')}`);
    } else {
      reasons.push(`No heading matched expected patterns. Found: ${headings.join(' | ')}`);
    }

    return this.createOutcome(score > 0, score, reasons, { fraudSignals: fraudSignals.length ? fraudSignals : undefined, matchedKeywords: headings });
  }
}

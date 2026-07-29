import { BaseRule } from './BaseRule';
import { RuleResult } from '../types';
import { POSITIVE_KEYWORDS } from '../utils/keywords';

export class AriaAlertRule extends BaseRule {
  readonly name = 'AriaAlertRule';
  readonly weight = 5;

  evaluate(doc: Document): RuleResult {
    const ariaRegions = Array.from(doc.querySelectorAll(
      '[aria-live], [role="status"], [role="alert"], [aria-relevant]'
    ));

    const matchedKeywords: string[] = [];

    for (const region of ariaRegions) {
      const text = (region.textContent || '').toLowerCase();
      for (const keyword of POSITIVE_KEYWORDS) {
        if (text.includes(keyword)) {
          if (!matchedKeywords.includes(keyword)) {
            matchedKeywords.push(keyword);
          }
        }
      }
    }

    return {
      ruleName: this.name,
      passed: matchedKeywords.length > 0,
      score: matchedKeywords.length > 0 ? this.weight : 0,
      matchedKeywords
    };
  }
}

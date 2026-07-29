import { BaseRule } from './BaseRule';
import { RuleResult } from '../types';
import { POSITIVE_KEYWORDS } from '../utils/keywords';

export class SuccessBannerRule extends BaseRule {
  readonly name = 'SuccessBannerRule';
  readonly weight = 20;

  evaluate(doc: Document): RuleResult {
    // Select elements that represent alerts, banners, messages, notifications
    const banners = Array.from(doc.querySelectorAll(
      '[role="alert"], .alert-success, .alert, .success-banner, .notification-success, .confirmation-message, .success-message'
    ));

    const matchedKeywords: string[] = [];

    for (const banner of banners) {
      const text = (banner.textContent || '').toLowerCase();
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

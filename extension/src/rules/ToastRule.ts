import { BaseRule } from './BaseRule';
import { RuleResult } from '../types';
import { POSITIVE_KEYWORDS } from '../utils/keywords';

export class ToastRule extends BaseRule {
  readonly name = 'ToastRule';
  readonly weight = 5;

  evaluate(doc: Document): RuleResult {
    const toasts = Array.from(doc.querySelectorAll(
      '.toast, .snackbar, .notification, [class*="toast-"], [class*="notification-"], [id*="toast"], [id*="notification"]'
    ));

    const matchedKeywords: string[] = [];

    for (const toast of toasts) {
      const text = (toast.textContent || '').toLowerCase();
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

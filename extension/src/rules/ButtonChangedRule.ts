import { BaseRule } from './BaseRule';
import { RuleResult } from '../types';

export class ButtonChangedRule extends BaseRule {
  readonly name = 'ButtonChangedRule';
  readonly weight = 10;

  evaluate(doc: Document): RuleResult {
    const buttons = Array.from(doc.querySelectorAll('button, input[type="submit"], [role="button"]'));
    const matchedKeywords: string[] = [];

    const targetKeywords = ['applied', 'submitted', 'completed', 'done', 'success'];

    for (const button of buttons) {
      const text = (button.textContent || button.getAttribute('value') || '').toLowerCase();
      // Check if button is disabled/inactive now and matches target confirmation state
      const isDisabled = button.hasAttribute('disabled') || button.classList.contains('disabled');
      
      for (const kw of targetKeywords) {
        if (text.includes(kw) && isDisabled) {
          if (!matchedKeywords.includes(kw)) {
            matchedKeywords.push(kw);
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

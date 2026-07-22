import { BaseRule } from './BaseRule';
import { RuleResult } from '../types';

export class MutationRule extends BaseRule {
  readonly name = 'MutationRule';
  readonly weight = 10;

  // Since this evaluation is running inside a synchronous check block,
  // we look for specific DOM markers that show a dynamic React/SPA layout change 
  // (e.g. root replacement components containing confirmation ids).
  evaluate(doc: Document): RuleResult {
    const dynamicRoots = doc.querySelector('#root, #__next, [data-reactroot], body');
    if (!dynamicRoots) {
      return { ruleName: this.name, passed: false, score: 0 };
    }

    const confirmationSelectors = [
      '[class*="Confirmation"]',
      '[class*="Success"]',
      '[id*="confirmation"]',
      '[id*="success"]',
      '[class*="thank-you"]'
    ];

    const hasDynamicConfirmation = confirmationSelectors.some(selector => 
      doc.querySelector(selector) !== null
    );

    return {
      ruleName: this.name,
      passed: hasDynamicConfirmation,
      score: hasDynamicConfirmation ? this.weight : 0
    };
  }
}

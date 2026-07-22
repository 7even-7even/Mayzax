import { BaseRule } from './BaseRule';
import { RuleResult } from '../types';
import { POSITIVE_KEYWORDS } from '../utils/keywords';

export class PageTitleRule extends BaseRule {
  readonly name = 'PageTitleRule';
  readonly weight = 10;

  evaluate(doc: Document): RuleResult {
    const title = (doc.title || '').toLowerCase();
    const matchedKeywords = POSITIVE_KEYWORDS.filter(kw => title.includes(kw));

    return {
      ruleName: this.name,
      passed: matchedKeywords.length > 0,
      score: matchedKeywords.length > 0 ? this.weight : 0,
      matchedKeywords
    };
  }
}

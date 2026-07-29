import { BaseRule } from './BaseRule';
import { RuleResult } from '../types';
import { POSITIVE_KEYWORDS, NEGATIVE_KEYWORDS } from '../utils/keywords';

export class HeadingContainsRule extends BaseRule {
  readonly name = 'HeadingContainsRule';
  readonly weight = 30;

  evaluate(doc: Document): RuleResult {
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3'));
    const matchedKeywords: string[] = [];

    // First check if any negative keywords appear in headings (disqualifies page)
    for (const heading of headings) {
      const text = (heading.textContent || '').toLowerCase();
      if (NEGATIVE_KEYWORDS.some(nk => text.includes(nk))) {
        return { ruleName: this.name, passed: false, score: 0 };
      }
    }

    // Check positive keywords
    for (const heading of headings) {
      const text = (heading.textContent || '').toLowerCase();
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

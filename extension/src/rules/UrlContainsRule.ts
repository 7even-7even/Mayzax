import { BaseRule } from './BaseRule';
import { RuleResult } from '../types';
import { URL_PATTERNS } from '../utils/keywords';

export class UrlContainsRule extends BaseRule {
  readonly name = 'UrlContainsRule';
  readonly weight = 20;

  evaluate(_doc: Document, url: string): RuleResult {
    try {
      const parsedUrl = new URL(url);
      const pathnameAndSearch = (parsedUrl.pathname + parsedUrl.search).toLowerCase();

      const matchedKeywords = URL_PATTERNS.filter(pattern => pathnameAndSearch.includes(pattern));

      return {
        ruleName: this.name,
        passed: matchedKeywords.length > 0,
        score: matchedKeywords.length > 0 ? this.weight : 0,
        matchedKeywords
      };
    } catch {
      return { ruleName: this.name, passed: false, score: 0 };
    }
  }
}

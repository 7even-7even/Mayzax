import { BaseRule } from '../rules/BaseRule';
import { HeadingContainsRule } from '../rules/HeadingContainsRule';
import { UrlContainsRule } from '../rules/UrlContainsRule';
import { SuccessBannerRule } from '../rules/SuccessBannerRule';
import { ButtonChangedRule } from '../rules/ButtonChangedRule';
import { ToastRule } from '../rules/ToastRule';
import { MutationRule } from '../rules/MutationRule';
import { AriaAlertRule } from '../rules/AriaAlertRule';
import { PageTitleRule } from '../rules/PageTitleRule';
import { JobPortal, DetectionResult } from '../types';

export abstract class BaseDetector {
  abstract readonly portal: JobPortal;
  
  // Rules composed by this detector
  protected rules: BaseRule[] = [
    new HeadingContainsRule(),
    new UrlContainsRule(),
    new SuccessBannerRule(),
    new ButtonChangedRule(),
    new ToastRule(),
    new MutationRule(),
    new AriaAlertRule(),
    new PageTitleRule()
  ];

  abstract canHandle(url: string): boolean;

  detectSuccess(doc: Document, url: string): DetectionResult {
    let totalScore = 0;
    const matchedRules: string[] = [];
    const matchedKeywordsSet = new Set<string>();

    for (const rule of this.rules) {
      const result = rule.evaluate(doc, url);
      if (result.passed) {
        totalScore += result.score;
        matchedRules.push(rule.name);
        if (result.matchedKeywords) {
          result.matchedKeywords.forEach(kw => matchedKeywordsSet.add(kw));
        }
      }
    }

    // Cap the maximum score at 100
    const confidenceScore = Math.min(totalScore, 100);
    const success = confidenceScore >= 50;

    return {
      success,
      confidenceScore,
      matchedRules,
      matchedKeywords: Array.from(matchedKeywordsSet)
    };
  }
}

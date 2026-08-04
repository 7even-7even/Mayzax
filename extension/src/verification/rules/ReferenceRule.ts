import { BaseVerificationRule } from './BaseRule';
import { RuleContext, RuleOutcome } from '../types';
import { extractReference } from '../utils/dom';

export class ReferenceRule extends BaseVerificationRule {
  readonly id = 'ApplicationReference';
  readonly defaultWeight = 15;

  private static readonly GENERIC_REFERENCE_PATTERNS: RegExp[] = [
    /application\s*(id|reference|number)\s*[:#]?\s*([A-Z0-9-]{6,})/i,
    /reference\s*number\s*[:#]?\s*([A-Z0-9-]+)/i,
    /jr\s*id\s*[:#]?\s*(\d+)/i,
    /candidate\s*number\s*[:#]?\s*([A-Z0-9-]+)/i,
    /submission\s*(id|number)?\s*[:#]?\s*([A-Z0-9-]{4,})/i,
    /requisition\s*id\s*[:#]?\s*([A-Z0-9-]+)/i,
    /confirmation\s*(id|number)?\s*[:#]?\s*([A-Z0-9-]+)/i,
  ];

  evaluate(context: RuleContext): RuleOutcome {
    const { document, portalPlugin } = context;
    const reasons: string[] = [];

    const patterns = portalPlugin?.referencePatterns?.length ? portalPlugin.referencePatterns : ReferenceRule.GENERIC_REFERENCE_PATTERNS;

    const reference = extractReference(document, patterns);

    if (!reference) {
      return this.createOutcome(false, 0, ['No application reference found']);
    }

    // Validate format
    if (/^[A-Z0-9-]{6,}$/i.test(reference.trim())) {
      reasons.push(`Application reference found: ${reference}`);
      return this.createOutcome(true, this.defaultWeight, reasons, { matchedKeywords: [reference] });
    }

    if (reference.length >= 4) {
      reasons.push(`Reference found but format weak: ${reference} — partial credit`);
      return this.createOutcome(true, 8, reasons, { matchedKeywords: [reference] });
    }

    return this.createOutcome(false, 0, [`Reference too short or invalid: ${reference}`]);
  }
}

import { BaseVerificationRule } from './BaseRule';
import { RuleContext, RuleOutcome, VerificationEvidence, PortalPlugin } from '../types';

export class PageTitleRule extends BaseVerificationRule {
  readonly id = 'PageTitle';
  readonly defaultWeight = 15;

  /**
   * v1.1 Evidence-driven — consumes normalized evidence, start at 0 add positive
   * Missing evidence = 0 (no penalty), not large negative
   * Failure phrases handled in FraudAnalyzer, not here
   */
  evaluateEvidence(evidence: VerificationEvidence, plugin?: PortalPlugin): RuleOutcome {
    const title = (evidence.title || '').trim();

    if (!title) {
      return this.evidenceOutcome(false, 0, ['• No title'], 'neutral');
    }

    // Use titleEvidence if available (from universal collector)
    if (evidence.titleEvidence) {
      if (evidence.titleEvidence.hasSuccess) {
        const matched = evidence.titleEvidence.matchedPhrases.slice(0, 2).join(', ');
        return this.evidenceOutcome(
          true,
          this.defaultWeight,
          [`✓ Confirmation title: "${title.slice(0, 80)}" — ${matched}`],
          'positive',
          { matchedKeywords: evidence.titleEvidence.matchedPhrases }
        );
      } else {
        // Missing = 0, not penalty (v1.1 philosophy)
        return this.evidenceOutcome(false, 0, [`• No success phrase in title: "${title.slice(0, 60)}"`], 'neutral');
      }
    }

    // Fallback: check title against portal patterns and generic success
    const patterns = plugin?.titlePatterns?.length ? plugin.titlePatterns : [];
    for (const pat of patterns) {
      if (pat.test(title)) {
        return this.evidenceOutcome(true, this.defaultWeight, [`✓ Title matched portal pattern ${pat}: "${title}"`], 'positive');
      }
    }

    // Generic check — if title contains any success keyword, give partial positive, not penalty
    if (/thank you|success|submitted|confirmation|applied|all done|you're all set|you are all set|received|complete/i.test(title.toLowerCase())) {
      return this.evidenceOutcome(true, 8, [`✓ Title contains generic success keyword: "${title}" — partial`], 'positive');
    }

    // Missing = 0 per v1.1
    return this.evidenceOutcome(false, 0, [`• Title does not match success patterns: "${title.slice(0, 60)}"`], 'neutral');
  }

  evaluate(context: RuleContext): RuleOutcome {
    // Legacy path delegates to evidence-driven if evidence available
    if (context.evidence) {
      return this.evaluateEvidence(context.evidence as VerificationEvidence, context.portalPlugin);
    }

    const { document, portalPlugin } = context;
    const title = (document.title || '').trim();

    if (!title) {
      return this.createOutcome(false, 0, ['• No title'], { category: 'neutral' } as any);
    }

    if (portalPlugin && portalPlugin.titlePatterns.length > 0) {
      for (const pat of portalPlugin.titlePatterns) {
        if (pat.test(title)) {
          return this.evidenceOutcome(true, this.defaultWeight, [`✓ Title matched portal pattern ${pat}: "${title}"`], 'positive');
        }
      }
    }

    const GENERIC_SUCCESS_PATTERNS: RegExp[] = [
      /application submitted/i,
      /application received/i,
      /thank you for applying/i,
      /your application has been submitted/i,
      /we have received your application/i,
      /submission successful/i,
      /you have successfully submitted/i,
      /all done/i,
      /you're all set/i,
      /you are all set/i,
    ];

    for (const pat of GENERIC_SUCCESS_PATTERNS) {
      if (pat.test(title)) {
        return this.evidenceOutcome(true, this.defaultWeight, [`✓ Title matched generic success pattern ${pat}: "${title}"`], 'positive');
      }
    }

    if (/submitted|received|thank you|confirmation/i.test(title.toLowerCase())) {
      return this.evidenceOutcome(true, 8, [`✓ Title contains generic success keyword: "${title}" — partial`], 'positive');
    }

    return this.evidenceOutcome(false, 0, [`• Title does not match success patterns: "${title.slice(0, 60)}"`], 'neutral');
  }
}


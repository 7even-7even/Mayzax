import { BaseVerificationRule } from './BaseRule';
import { RuleContext, RuleOutcome, VerificationEvidence, PortalPlugin } from '../types';
import { collectHeadings } from '../utils/dom';

export class HeadingRule extends BaseVerificationRule {
  readonly id = 'Heading';
  readonly defaultWeight = 20;

  evaluateEvidence(evidence: VerificationEvidence, plugin?: PortalPlugin): RuleOutcome {
    if (evidence.headingEvidence) {
      if (evidence.headingEvidence.hasSuccess) {
        const matched = evidence.headingEvidence.matchedSuccessPhrases.slice(0, 2).join(', ');
        const headingsText = evidence.headingEvidence.allHeadings.slice(0, 2).join(' | ').slice(0, 80);
        const count = evidence.headingEvidence.matchedSuccessPhrases.length;
        const score = count >= 2 ? this.defaultWeight : 15;
        return this.evidenceOutcome(
          true,
          score,
          [`✓ Confirmation heading: ${matched} — "${headingsText}"`],
          'positive',
          { matchedKeywords: evidence.headingEvidence.allHeadings }
        );
      } else {
        const found = evidence.headingEvidence.allHeadings.slice(0, 2).join(' | ').slice(0, 60) || 'none';
        return this.evidenceOutcome(false, 0, [`• No success heading, found: ${found}`], 'neutral', {
          matchedKeywords: evidence.headingEvidence.allHeadings,
        });
      }
    }

    const headings = evidence.headings || [];
    if (headings.length === 0) {
      return this.evidenceOutcome(false, 0, ['• No headings found'], 'neutral');
    }

    let matchedCount = 0;
    const patterns = plugin?.headingPatterns?.length ? plugin.headingPatterns : [
      /application submitted/i,
      /thank you for applying/i,
      /your application has been submitted/i,
      /application received/i,
    ];

    for (const heading of headings) {
      for (const pat of patterns) {
        if (pat.test(heading)) {
          matchedCount++;
          break;
        }
      }
    }

    if (matchedCount >= 2) {
      return this.evidenceOutcome(true, this.defaultWeight, [`✓ Headings matched ${matchedCount} success patterns`], 'positive', {
        matchedKeywords: headings,
      });
    } else if (matchedCount === 1) {
      return this.evidenceOutcome(true, 15, [`✓ Heading matched success pattern`], 'positive', { matchedKeywords: headings });
    } else if (headings.some(h => /submitted|received|thank you|success|all done|you're all set/i.test(h))) {
      return this.evidenceOutcome(true, 10, [`✓ Headings contain generic success: ${headings.slice(0, 2).join(' | ').slice(0, 60)}`], 'positive', {
        matchedKeywords: headings,
      });
    } else {
      return this.evidenceOutcome(false, 0, [`• No heading matched expected patterns. Found: ${headings.slice(0, 2).join(' | ').slice(0, 60) || 'none'}`], 'neutral', {
        matchedKeywords: headings,
      });
    }
  }

  evaluate(context: RuleContext): RuleOutcome {
    if (context.evidence) {
      return this.evaluateEvidence(context.evidence as VerificationEvidence, context.portalPlugin);
    }

    const { document, portalPlugin } = context;
    const headings = collectHeadings(document);

    if (headings.length === 0) {
      return this.evidenceOutcome(false, 0, ['• No headings found'], 'neutral');
    }

    let matchedCount = 0;
    const patterns = portalPlugin?.headingPatterns?.length ? portalPlugin.headingPatterns : [
      /application submitted/i,
      /thank you for applying/i,
      /your application has been submitted/i,
      /application received/i,
    ];

    for (const heading of headings) {
      for (const pat of patterns) {
        if (pat.test(heading)) {
          matchedCount++;
          break;
        }
      }
    }

    if (matchedCount >= 2) {
      return this.evidenceOutcome(true, this.defaultWeight, [`✓ Headings matched ${matchedCount} patterns`], 'positive', {
        matchedKeywords: headings,
      });
    } else if (matchedCount === 1) {
      return this.evidenceOutcome(true, 15, [`✓ Heading matched success pattern`], 'positive', { matchedKeywords: headings });
    } else if (headings.some(h => /submitted|received|thank you|success/i.test(h))) {
      return this.evidenceOutcome(true, 10, [`✓ Headings contain generic success`], 'positive', { matchedKeywords: headings });
    } else {
      return this.evidenceOutcome(false, 0, [`• No heading matched expected patterns. Found: ${headings.slice(0, 2).join(' | ').slice(0, 60) || 'none'}`], 'neutral', {
        matchedKeywords: headings,
      });
    }
  }
}

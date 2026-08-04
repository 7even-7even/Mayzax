import { BaseVerificationRule } from './BaseRule';
import { RuleContext, RuleOutcome, VerificationEvidence, PortalPlugin } from '../types';
import { collectConfirmationText } from '../utils/dom';

export class ConfirmationBodyRule extends BaseVerificationRule {
  readonly id = 'ConfirmationBody';
  readonly defaultWeight = 20;

  evaluateEvidence(evidence: VerificationEvidence, plugin?: PortalPlugin): RuleOutcome {
    if (evidence.bodyEvidence) {
      if (evidence.bodyEvidence.hasSuccess) {
        const matched = evidence.bodyEvidence.matchedSuccessPhrases.slice(0, 2).join(', ');
        const count = evidence.bodyEvidence.matchedSuccessPhrases.length;
        const score = count >= 2 ? this.defaultWeight : 15;
        return this.evidenceOutcome(
          true,
          score,
          [`✓ Confirmation body: ${matched} — "${evidence.bodyEvidence.confirmationText.slice(0, 100)}..."`],
          'positive',
          { matchedKeywords: [evidence.bodyEvidence.confirmationText.slice(0, 200)] }
        );
      } else if (evidence.bodyEvidence.confirmationText && evidence.bodyEvidence.confirmationText.length > 20) {
        // Check generic success even if not in matched phrases (fallback)
        if (/thank you|application received|submitted|success|confirmation|all done|you're all set|we have received|we will review|reference number/i.test(evidence.bodyEvidence.confirmationText.toLowerCase())) {
          return this.evidenceOutcome(true, 10, [`✓ Body contains generic success keywords — "${evidence.bodyEvidence.confirmationText.slice(0, 100)}..."`], 'positive');
        }
        return this.evidenceOutcome(false, 0, [`• Confirmation text present but no success phrase: length ${evidence.bodyEvidence.textLength}`], 'neutral');
      } else {
        return this.evidenceOutcome(false, 0, ['• Confirmation text empty or too short'], 'neutral');
      }
    }

    const confirmationText = evidence.confirmationText || '';
    if (!confirmationText || confirmationText.length < 10) {
      return this.evidenceOutcome(false, 0, ['• Confirmation text empty or too short'], 'neutral');
    }

    let matches = 0;
    const patterns = plugin?.confirmationPatterns?.length ? plugin.confirmationPatterns : [
      /your application for .* has been submitted/i,
      /thank you for applying/i,
      /your application has been submitted/i,
      /we have received your application/i,
      /application submitted/i,
    ];

    for (const pat of patterns) {
      if (pat.test(confirmationText)) matches++;
    }

    if (confirmationText.length > 30) {
      if (matches >= 2) {
        return this.evidenceOutcome(true, this.defaultWeight, [`✓ Confirmation body matched ${matches} patterns`], 'positive');
      } else if (matches === 1) {
        return this.evidenceOutcome(true, 15, [`✓ Confirmation body matched 1 pattern`], 'positive');
      } else if (/submitted|received|thank you|success|all done|you're all set|we have received|reference number/i.test(confirmationText)) {
        return this.evidenceOutcome(true, 10, [`✓ Body contains generic success keywords — partial`], 'positive');
      }
    }

    return this.evidenceOutcome(false, 0, [`• No confirmation pattern matched. Text: ${confirmationText.slice(0, 100)}...`], 'neutral');
  }

  evaluate(context: RuleContext): RuleOutcome {
    if (context.evidence) {
      return this.evaluateEvidence(context.evidence as VerificationEvidence, context.portalPlugin);
    }

    const { document, portalPlugin } = context;
    const confirmationText = collectConfirmationText(document);

    if (!confirmationText || confirmationText.length < 10) {
      return this.evidenceOutcome(false, 0, ['• Confirmation text empty or too short'], 'neutral');
    }

    let matches = 0;
    const patterns = portalPlugin?.confirmationPatterns?.length ? portalPlugin.confirmationPatterns : [
      /your application for .* has been submitted/i,
      /thank you for applying/i,
      /your application has been submitted/i,
    ];

    for (const pat of patterns) {
      if (pat.test(confirmationText)) matches++;
    }

    if (confirmationText.length > 30) {
      if (matches >= 2) return this.evidenceOutcome(true, this.defaultWeight, [`✓ Confirmation body matched ${matches} patterns`], 'positive');
      else if (matches === 1) return this.evidenceOutcome(true, 15, [`✓ Confirmation body matched`], 'positive');
      else if (/submitted|received|thank you|success/i.test(confirmationText)) {
        return this.evidenceOutcome(true, 10, [`✓ Body contains generic success keywords — partial`], 'positive');
      }
    }

    return this.evidenceOutcome(false, 0, [`• No confirmation pattern matched`], 'neutral');
  }
}

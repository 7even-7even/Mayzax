import { BaseVerificationRule } from './BaseRule';
import { RuleContext, RuleOutcome } from '../types';
import { checkDomFingerprint } from '../utils/dom';

export class DomFingerprintRule extends BaseVerificationRule {
  readonly id = 'DomFingerprint';
  readonly defaultWeight = 15;

  evaluate(context: RuleContext): RuleOutcome {
    const { document, portalPlugin } = context;
    const reasons: string[] = [];

    const expectedSelectors = portalPlugin?.expectedSelectors || [];

    const fingerprint = checkDomFingerprint(document, expectedSelectors);

    let score = 0;

    if (fingerprint.hasConfirmationCard) {
      score += 7;
      reasons.push('Confirmation card detected');
    }
    if (fingerprint.hasSuccessBanner) {
      score += 5;
      reasons.push('Success banner detected');
    }
    if (fingerprint.expectedContainersFound >= 2) {
      score += 8;
      reasons.push(`Expected containers found: ${fingerprint.expectedContainersFound} (${fingerprint.matchedSelectors.join(', ')})`);
    } else if (fingerprint.expectedContainersFound === 1) {
      score += 4;
      reasons.push(`1 expected container found: ${fingerprint.matchedSelectors[0]}`);
    } else if (expectedSelectors.length === 0) {
      // No expected selectors for generic — give partial if we have confirmation card
      if (fingerprint.hasConfirmationCard || fingerprint.hasSuccessBanner) {
        score += 5;
        reasons.push('Generic fingerprint: confirmation card/banner found');
      }
    } else {
      reasons.push(`No expected containers found. Missing: ${fingerprint.missingSelectors.join(', ')}`);
    }

    const capped = Math.min(score, this.defaultWeight);

    return this.createOutcome(capped > 0, capped, reasons);
  }
}

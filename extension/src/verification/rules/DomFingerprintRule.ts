import { BaseVerificationRule } from './BaseRule';
import { RuleContext, RuleOutcome, VerificationEvidence, PortalPlugin } from '../types';
import { checkDomFingerprint } from '../utils/dom';

export class DomFingerprintRule extends BaseVerificationRule {
  readonly id = 'DomFingerprint';
  readonly defaultWeight = 15;

  evaluateEvidence(evidence: VerificationEvidence, plugin?: PortalPlugin): RuleOutcome {
    // v1.1: Use universal DOM fingerprint evidence if available
    const domUniversal = (evidence as any).domFingerprint as any;
    const hasSuccessCard = domUniversal?.hasSuccessCard || domUniversal?.hasConfirmationCard;
    const hasSuccessBanner = domUniversal?.hasSuccessBanner || domUniversal?.hasConfirmationBanner;
    const fingerprintScore = domUniversal?.fingerprintScore || 0;
    const matchedFingerprints = domUniversal?.matchedFingerprints || [];

    let score = 0;
    const reasons: string[] = [];

    if (fingerprintScore > 0) {
      score = Math.min(fingerprintScore, this.defaultWeight);
      reasons.push(`✓ Success DOM: ${matchedFingerprints.slice(0, 3).join(', ')} (score ${fingerprintScore})`);
    } else {
      if (hasSuccessCard) {
        score += 7;
        reasons.push('✓ Confirmation card detected');
      }
      if (hasSuccessBanner) {
        score += 5;
        reasons.push('✓ Success banner detected');
      }
      if (domUniversal?.hasSuccessIcon) {
        score += 3;
        reasons.push('✓ Success icon detected');
      }
      if (domUniversal?.hasProgressCompleted) {
        score += 3;
        reasons.push('✓ Progress completed indicator detected');
      }
      if (domUniversal?.hasReceiptCard) {
        score += 5;
        reasons.push('✓ Receipt card detected');
      }
      if (domUniversal?.hasApplicationSummary) {
        score += 3;
        reasons.push('✓ Application summary detected');
      }
      if (domUniversal?.expectedContainersFound && domUniversal.expectedContainersFound >= 1) {
        score += 4;
        reasons.push(`✓ Expected containers found: ${domUniversal.expectedContainersFound}`);
      }
    }

    // v1.1: Missing fingerprint = 0, not penalty
    if (score === 0) {
      return this.evidenceOutcome(false, 0, ['• No success DOM fingerprints'], 'neutral');
    }

    const capped = Math.min(score, this.defaultWeight);
    return this.evidenceOutcome(true, capped, reasons, 'positive');
  }

  evaluate(context: RuleContext): RuleOutcome {
    if (context.evidence) {
      return this.evaluateEvidence(context.evidence as VerificationEvidence, context.portalPlugin);
    }

    const { document, portalPlugin } = context;
    const expectedSelectors = portalPlugin?.expectedSelectors || [];
    const fingerprint = checkDomFingerprint(document, expectedSelectors);

    let score = 0;
    const reasons: string[] = [];

    if (fingerprint.hasConfirmationCard) {
      score += 7;
      reasons.push('✓ Confirmation card detected');
    }
    if (fingerprint.hasSuccessBanner) {
      score += 5;
      reasons.push('✓ Success banner detected');
    }
    if (fingerprint.expectedContainersFound >= 2) {
      score += 8;
      reasons.push(`✓ Expected containers found: ${fingerprint.expectedContainersFound}`);
    } else if (fingerprint.expectedContainersFound === 1) {
      score += 4;
      reasons.push(`✓ 1 expected container found`);
    } else if (expectedSelectors.length === 0 && (fingerprint.hasConfirmationCard || fingerprint.hasSuccessBanner)) {
      score += 5;
      reasons.push('✓ Generic fingerprint: confirmation card/banner found');
    }

    if (score === 0) {
      return this.evidenceOutcome(false, 0, ['• No success DOM fingerprints'], 'neutral');
    }

    return this.evidenceOutcome(true, Math.min(score, this.defaultWeight), reasons, 'positive');
  }
}

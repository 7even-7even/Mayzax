import { BaseVerificationRule } from './BaseRule';
import { RuleContext, RuleOutcome, VerificationEvidence, PortalPlugin } from '../types';
import { extractReference } from '../utils/dom';

export class ReferenceRule extends BaseVerificationRule {
  readonly id = 'ApplicationReference';
  readonly defaultWeight = 20; // Increased from 15 — strongest positive indicator per spec

  private static readonly GENERIC_REFERENCE_PATTERNS: RegExp[] = [
    /application\s*(id|reference|number)\s*[:#]?\s*([A-Z0-9-]{4,})/i,
    /reference\s*number\s*[:#]?\s*([A-Z0-9-]+)/i,
    /candidate\s*id\s*[:#]?\s*([A-Z0-9-]+)/i,
    /submission\s*(id|number|reference)?\s*[:#]?\s*([A-Z0-9-]{4,})/i,
    /receipt\s*number\s*[:#]?\s*([A-Z0-9-]+)/i,
    /tracking\s*number\s*[:#]?\s*([A-Z0-9-]+)/i,
    /case\s*number\s*[:#]?\s*([A-Z0-9-]+)/i,
    /requisition\s*id\s*[:#]?\s*([A-Z0-9-]+)/i,
    /jr\s*id\s*[:#]?\s*(\d+)/i,
    /confirmation\s*(id|number|code)?\s*[:#]?\s*([A-Z0-9-]+)/i,
  ];

  evaluateEvidence(evidence: VerificationEvidence, plugin?: PortalPlugin): RuleOutcome {
    // v1.1: Reference is strongest positive indicator
    if (evidence.referenceEvidence?.hasAnyReference) {
      const ref = evidence.referenceEvidence.strongestReference;
      const count = evidence.referenceEvidence.allReferences.length;
      return this.evidenceOutcome(
        true,
        this.defaultWeight,
        [`✓ Reference ID: ${ref} (${count} found) — strongest positive`],
        'positive',
        { matchedKeywords: evidence.referenceEvidence.allReferences }
      );
    }

    if (evidence.applicationReference) {
      return this.evidenceOutcome(
        true,
        this.defaultWeight,
        [`✓ Application reference found: ${evidence.applicationReference} — strongest positive`],
        'positive',
        { matchedKeywords: [evidence.applicationReference] }
      );
    }

    // Fallback: try portal-specific patterns if referenceEvidence not available
    const patterns = plugin?.referencePatterns?.length ? plugin.referencePatterns : ReferenceRule.GENERIC_REFERENCE_PATTERNS;
    // Note: We don't have document here in evidence mode, so we check evidence fields
    // If evidence has confirmationText that contains reference-like pattern, we already captured in referenceEvidence
    // So missing reference = 0, not penalty (v1.1 philosophy: missing = 0)
    return this.evidenceOutcome(false, 0, ['• No application reference found'], 'neutral');
  }

  evaluate(context: RuleContext): RuleOutcome {
    if (context.evidence) {
      return this.evaluateEvidence(context.evidence as VerificationEvidence, context.portalPlugin);
    }

    const { document, portalPlugin } = context;
    const patterns = portalPlugin?.referencePatterns?.length ? portalPlugin.referencePatterns : ReferenceRule.GENERIC_REFERENCE_PATTERNS;
    const reference = extractReference(document, patterns);

    if (!reference) {
      // Missing reference = 0, not penalty (v1.1)
      return this.evidenceOutcome(false, 0, ['• No application reference found'], 'neutral');
    }

    if (/^[A-Z0-9-]{4,}$/i.test(reference.trim())) {
      return this.evidenceOutcome(true, this.defaultWeight, [`✓ Application reference found: ${reference} — strongest positive`], 'positive', {
        matchedKeywords: [reference],
      });
    }

    return this.evidenceOutcome(true, 10, [`✓ Reference found but format weak: ${reference} — partial`], 'positive', {
      matchedKeywords: [reference],
    });
  }
}

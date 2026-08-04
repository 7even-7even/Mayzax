import { VerificationEvidence } from '../types';
import { normalizeWhitespace, normalizeForHash, sortKeysRecursive } from '../utils/normalization';

/**
 * Evidence Normalization — v1.1 Universal ATS Intelligence
 * Normalizes evidence for consistent scoring and hashing
 * Consumes normalized evidence rather than raw DOM text
 */

export class EvidenceNormalizer {
  /**
   * Canonicalization for hashing — mirrors backend canonicalizeEvidence
   * Uses normalized evidence, not raw DOM
   */
  static canonicalize(evidence: VerificationEvidence): string {
    const subset: any = {
      portal: evidence.portal,
      hostname: normalizeForHash(evidence.hostname || ''),
      pathname: normalizeForHash(evidence.pathname || ''),
      normalizedUrl: normalizeForHash(evidence.normalizedUrl || ''),
      title: normalizeForHash(evidence.title || ''),
      headings: (evidence.headings || []).map(h => normalizeForHash(h)).sort(),
      confirmationText: normalizeForHash(evidence.confirmationText || ''),
      applicationReference: evidence.applicationReference ? normalizeForHash(evidence.applicationReference) : null,
      https: evidence.https,
      extensionVersion: evidence.extensionVersion,
      domFingerprint: {
        hasConfirmationCard: !!evidence.domFingerprint?.hasConfirmationCard,
        hasSuccessBanner: !!evidence.domFingerprint?.hasSuccessBanner,
        expectedContainersFound: evidence.domFingerprint?.expectedContainersFound || 0,
        unexpectedApplyButtonPresent: !!evidence.domFingerprint?.unexpectedApplyButtonPresent,
      },
      // v1.1 universal — include normalized universal evidence for stronger hash binding
      urlEvidence: {
        hasSuccessPath: !!evidence.urlEvidence?.hasSuccessPath,
        matchedPattern: evidence.urlEvidence?.matchedPattern ? normalizeForHash(evidence.urlEvidence.matchedPattern) : null,
      },
      referenceEvidence: {
        hasAnyReference: !!evidence.referenceEvidence?.hasAnyReference,
        strongestReference: evidence.referenceEvidence?.strongestReference ? normalizeForHash(evidence.referenceEvidence.strongestReference) : null,
      },
    };

    const sorted = sortKeysRecursive(subset);
    return JSON.stringify(sorted);
  }

  static normalizeForStorage(evidence: VerificationEvidence): VerificationEvidence {
    return {
      ...evidence,
      hostname: evidence.hostname.toLowerCase().replace(/^www\./, '').trim(),
      title: normalizeWhitespace(evidence.title),
      headings: evidence.headings.map(normalizeWhitespace).filter(Boolean),
      confirmationText: normalizeWhitespace(evidence.confirmationText),
      applicationReference: evidence.applicationReference ? normalizeWhitespace(evidence.applicationReference) : null,
      // Normalize universal fields
      positiveSignals: evidence.positiveSignals?.map(normalizeWhitespace) || [],
      neutralSignals: evidence.neutralSignals?.map(normalizeWhitespace) || [],
      negativeSignals: evidence.negativeSignals?.map(normalizeWhitespace) || [],
    };
  }

  /**
   * Normalize entire evidence object for weighted confidence engine
   * Returns normalized copy ready for scoring
   */
  static normalize(evidence: VerificationEvidence): VerificationEvidence {
    const normalized = this.normalizeForStorage(evidence);

    // Normalize title evidence
    if (normalized.titleEvidence) {
      normalized.titleEvidence.matchedPhrases = normalized.titleEvidence.matchedPhrases.map(normalizeWhitespace);
    }

    // Normalize heading evidence
    if (normalized.headingEvidence) {
      normalized.headingEvidence.allHeadings = normalized.headingEvidence.allHeadings.map(normalizeWhitespace);
      normalized.headingEvidence.matchedSuccessPhrases = normalized.headingEvidence.matchedSuccessPhrases.map(normalizeWhitespace);
    }

    // Normalize body evidence
    if (normalized.bodyEvidence) {
      normalized.bodyEvidence.matchedSuccessPhrases = normalized.bodyEvidence.matchedSuccessPhrases.map(normalizeWhitespace);
      normalized.bodyEvidence.confirmationText = normalizeWhitespace(normalized.bodyEvidence.confirmationText);
    }

    // Normalize meta evidence
    if (normalized.metaEvidence) {
      if (normalized.metaEvidence.ogTitle) normalized.metaEvidence.ogTitle = normalizeWhitespace(normalized.metaEvidence.ogTitle);
      if (normalized.metaEvidence.description) normalized.metaEvidence.description = normalizeWhitespace(normalized.metaEvidence.description);
    }

    // Normalize breadcrumb evidence
    if (normalized.breadcrumbEvidence) {
      normalized.breadcrumbEvidence.items = normalized.breadcrumbEvidence.items.map(normalizeWhitespace);
    }

    // Ensure evidence breakdown exists
    if (!normalized.evidenceScoreBreakdown) {
      normalized.evidenceScoreBreakdown = {};
    }

    return normalized;
  }

  /**
   * Create a debug-friendly normalized view for logging
   */
  static createDebugView(evidence: VerificationEvidence): string {
    const positive = evidence.positiveSignals || [];
    const neutral = evidence.neutralSignals || [];
    const negative = evidence.negativeSignals || [];
    const breakdown = evidence.evidenceScoreBreakdown || {};
    const totalScore = Object.values(breakdown).reduce((a, b) => a + (b as number), 0);

    let log = '\n=== Positive Evidence ===\n';
    log += positive.length > 0 ? positive.map(s => `  ${s}`).join('\n') : '  (none)';
    log += '\n\n=== Neutral Evidence ===\n';
    log += neutral.length > 0 ? neutral.map(s => `  ${s}`).join('\n') : '  (none)';
    log += '\n\n=== Weak Negative Evidence ===\n';
    log += negative.length > 0 ? negative.map(s => `  ${s}`).join('\n') : '  (none)';
    log += '\n\n=== Evidence Breakdown ===\n';
    for (const [key, val] of Object.entries(breakdown)) {
      log += `  ${key}: ${val}\n`;
    }
    log += `  TOTAL: ${totalScore}\n`;
    log += `  Positive signals: ${evidence.totalPositiveSignals || positive.length}\n`;

    return log;
  }
}

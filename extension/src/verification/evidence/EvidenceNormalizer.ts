import { VerificationEvidence } from '../types';

function normalizeWhitespace(text: string): string {
  return text.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeForHash(text: string): string {
  return normalizeWhitespace(text).toLowerCase();
}

function sortKeysRecursive(input: any): any {
  if (Array.isArray(input)) {
    return input.map(sortKeysRecursive);
  }
  if (input !== null && typeof input === 'object') {
    const sorted: any = {};
    Object.keys(input).sort().forEach(k => {
      const v = input[k];
      if (v === null || v === undefined || v === '') return;
      sorted[k] = sortKeysRecursive(v);
    });
    return sorted;
  }
  return input;
}

export class EvidenceNormalizer {
  /**
   * Canonicalization for hashing — mirrors backend canonicalizeEvidence
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
    };
  }
}

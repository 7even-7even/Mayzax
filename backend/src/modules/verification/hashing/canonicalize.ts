import { VerificationEvidence } from '../types/verification.types';

/**
 * Canonicalization for verification evidence hashing
 * - Sorts keys recursively
 * - Normalizes whitespace: trim, collapse multiple spaces, remove \n\r\t
 * - Normalizes casing where appropriate (hostname, pathname lowercase; title, headings lowercased trimmed for hash)
 * - Removes empty/null/undefined fields
 * - Produces deterministic JSON string
 */

function normalizeWhitespace(value: string): string {
  return value
    .replace(/[\n\r\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTextForHash(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

function isObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sortKeysRecursive(input: any): any {
  if (Array.isArray(input)) {
    return input.map(sortKeysRecursive);
  }
  if (isObject(input)) {
    const sorted: any = {};
    const keys = Object.keys(input).sort();
    for (const k of keys) {
      const v = input[k];
      if (v === null || v === undefined || v === '') continue;
      sorted[k] = sortKeysRecursive(v);
    }
    return sorted;
  }
  return input;
}

export function canonicalizeEvidence(evidence: VerificationEvidence): string {
  // Build canonical subset — only fields that should contribute to hash
  // Exclude volatile fields like verificationTimestamp? Actually timestamp SHOULD be part of hash but validated separately.
  // Include timestamp for replay protection, but we keep it.
  const subset: any = {
    portal: evidence.portal,
    hostname: normalizeTextForHash(evidence.hostname || ''),
    pathname: normalizeTextForHash(evidence.pathname || ''),
    normalizedUrl: normalizeTextForHash(evidence.normalizedUrl || ''),
    title: normalizeTextForHash(evidence.title || ''),
    headings: (evidence.headings || []).map((h) => normalizeTextForHash(h)).sort(),
    confirmationText: normalizeTextForHash(evidence.confirmationText || ''),
    applicationReference: evidence.applicationReference ? normalizeTextForHash(evidence.applicationReference) : null,
    https: evidence.https,
    extensionVersion: evidence.extensionVersion,
    domFingerprint: {
      hasConfirmationCard: !!evidence.domFingerprint?.hasConfirmationCard,
      hasSuccessBanner: !!evidence.domFingerprint?.hasSuccessBanner,
      expectedContainersFound: evidence.domFingerprint?.expectedContainersFound || 0,
      unexpectedApplyButtonPresent: !!evidence.domFingerprint?.unexpectedApplyButtonPresent,
    },
  };

  // Sort keys recursively for determinism
  const sorted = sortKeysRecursive(subset);
  return JSON.stringify(sorted);
}

export function canonicalizeEvidenceDetailed(evidence: VerificationEvidence): { canonicalString: string; canonicalObject: any } {
  const canonicalString = canonicalizeEvidence(evidence);
  const canonicalObject = JSON.parse(canonicalString);
  return { canonicalString, canonicalObject };
}

/**
 * Used to compare client evidence with server re-scored evidence for drift detection
 */
export function compareCanonicalEvidence(a: VerificationEvidence, b: VerificationEvidence): { match: boolean; canonicalA: string; canonicalB: string } {
  const canA = canonicalizeEvidence(a);
  const canB = canonicalizeEvidence(b);
  return { match: canA === canB, canonicalA: canA, canonicalB: canB };
}

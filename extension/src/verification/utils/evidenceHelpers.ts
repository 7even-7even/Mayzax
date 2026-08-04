/**
 * Shared Evidence Collectors — v1.1 Universal ATS Intelligence
 * Reusable utilities, no duplicated logic
 */

import { normalizeWhitespace } from './normalization';
import { META_SELECTORS, BREADCRUMB_SELECTORS, JSONLD_SUCCESS_INDICATORS, DOM_FINGERPRINTS } from './successPhrases';

export function querySafe(doc: Document, selector: string): Element | null {
  try {
    return doc.querySelector(selector);
  } catch {
    return null;
  }
}

export function queryAllSafe(doc: Document, selector: string): Element[] {
  try {
    return Array.from(doc.querySelectorAll(selector));
  } catch {
    return [];
  }
}

export function isVisible(el: Element): boolean {
  try {
    const style = window.getComputedStyle(el);
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
    if (style.opacity === '0') return false;
    return true;
  } catch {
    return true;
  }
}

export function getText(el: Element): string {
  return normalizeWhitespace(el.textContent || '');
}

// ───────────────────────────
// Meta Tags Evidence
// ───────────────────────────

export interface MetaEvidenceResult {
  ogTitle?: string;
  description?: string;
  twitterTitle?: string;
  hasSuccess: boolean;
  matchedPhrases: string[];
}

export function collectMetaEvidence(doc: Document, successPatterns: RegExp[]): MetaEvidenceResult {
  const result: MetaEvidenceResult = {
    hasSuccess: false,
    matchedPhrases: [],
  };

  const ogTitleEl = querySafe(doc, META_SELECTORS.ogTitle);
  if (ogTitleEl) {
    const content = ogTitleEl.getAttribute('content') || '';
    result.ogTitle = content;
    for (const pat of successPatterns) {
      if (pat.test(content)) {
        result.hasSuccess = true;
        result.matchedPhrases.push(`og:title:${pat.source}`);
      }
    }
  }

  const descEl = querySafe(doc, META_SELECTORS.description) || querySafe(doc, META_SELECTORS.ogDescription);
  if (descEl) {
    const content = descEl.getAttribute('content') || '';
    result.description = content;
    for (const pat of successPatterns) {
      if (pat.test(content)) {
        result.hasSuccess = true;
        result.matchedPhrases.push(`description:${pat.source}`);
      }
    }
  }

  const twitterEl = querySafe(doc, META_SELECTORS.twitterTitle);
  if (twitterEl) {
    const content = twitterEl.getAttribute('content') || '';
    result.twitterTitle = content;
    for (const pat of successPatterns) {
      if (pat.test(content)) {
        result.hasSuccess = true;
        result.matchedPhrases.push(`twitter:title:${pat.source}`);
      }
    }
  }

  return result;
}

// ───────────────────────────
// Breadcrumb Evidence
// ───────────────────────────

export interface BreadcrumbEvidenceResult {
  items: string[];
  hasSuccess: boolean;
  matchedPhrases: string[];
}

export function collectBreadcrumbEvidence(doc: Document, successPatterns: RegExp[]): BreadcrumbEvidenceResult {
  const items: string[] = [];
  const matchedPhrases: string[] = [];
  let hasSuccess = false;

  for (const selector of BREADCRUMB_SELECTORS) {
    const elements = queryAllSafe(doc, selector);
    for (const el of elements) {
      if (!isVisible(el)) continue;
      const text = getText(el);
      if (text && text.length > 2 && text.length < 500) {
        // Split breadcrumb items by common separators
        const parts = text.split(/[\/>\|·•]+/).map(s => s.trim()).filter(Boolean);
        items.push(...parts);
        for (const part of parts) {
          for (const pat of successPatterns) {
            if (pat.test(part)) {
              hasSuccess = true;
              matchedPhrases.push(`breadcrumb:${part} matches ${pat.source}`);
            }
          }
        }
      }
    }
  }

  return {
    items: [...new Set(items)].slice(0, 20),
    hasSuccess,
    matchedPhrases,
  };
}

// ───────────────────────────
// JSON-LD Structured Data Evidence
// ───────────────────────────

export interface StructuredDataEvidenceResult {
  hasConfirmation: boolean;
  hasApplication: boolean;
  matchedTypes: string[];
  jsonLdRaw?: any;
}

export function collectStructuredDataEvidence(doc: Document): StructuredDataEvidenceResult {
  const result: StructuredDataEvidenceResult = {
    hasConfirmation: false,
    hasApplication: false,
    matchedTypes: [],
  };

  const scripts = queryAllSafe(doc, 'script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const content = script.textContent || '';
      if (!content) continue;
      const data = JSON.parse(content);
      result.jsonLdRaw = data;

      const text = content.toLowerCase();
      for (const pat of JSONLD_SUCCESS_INDICATORS) {
        if (pat.test(text)) {
          result.hasConfirmation = true;
          result.matchedTypes.push(pat.source);
        }
      }

      // Check for JobPosting or ApplyAction types
      if (text.includes('jobposting') || text.includes('applyaction') || text.includes('application')) {
        result.hasApplication = true;
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  }

  return result;
}

// ───────────────────────────
// DOM Fingerprint Evidence — Universal
// ───────────────────────────

export interface DomFingerprintEvidenceResult {
  hasSuccessCard: boolean;
  hasConfirmationBanner: boolean;
  hasSuccessIcon: boolean;
  hasProgressCompleted: boolean;
  hasDisabledForm: boolean;
  hasReadOnlySummary: boolean;
  hasReceiptCard: boolean;
  hasDownloadConfirmation: boolean;
  hasPrintConfirmation: boolean;
  hasConfirmationPanel: boolean;
  hasReviewPage: boolean;
  hasCompletedTimeline: boolean;
  hasApplicationSummary: boolean;
  hasProgressBar: boolean;
  hasSuccessAnimation: boolean;
  fingerprintScore: number;
  matchedFingerprints: string[];
  totalChecked: number;
}

export function collectDomFingerprintEvidence(doc: Document): DomFingerprintEvidenceResult {
  const result: DomFingerprintEvidenceResult = {
    hasSuccessCard: false,
    hasConfirmationBanner: false,
    hasSuccessIcon: false,
    hasProgressCompleted: false,
    hasDisabledForm: false,
    hasReadOnlySummary: false,
    hasReceiptCard: false,
    hasDownloadConfirmation: false,
    hasPrintConfirmation: false,
    hasConfirmationPanel: false,
    hasReviewPage: false,
    hasCompletedTimeline: false,
    hasApplicationSummary: false,
    hasProgressBar: false,
    hasSuccessAnimation: false,
    fingerprintScore: 0,
    matchedFingerprints: [],
    totalChecked: 0,
  };

  const checkSelectors = (selectors: string[], key: keyof DomFingerprintEvidenceResult) => {
    for (const sel of selectors) {
      result.totalChecked++;
      const el = querySafe(doc, sel);
      if (el && isVisible(el)) {
        (result as any)[key] = true;
        result.fingerprintScore += 2;
        result.matchedFingerprints.push(`${String(key)}:${sel}`);
        return true;
      }
    }
    return false;
  };

  checkSelectors(DOM_FINGERPRINTS.successCard, 'hasSuccessCard');
  checkSelectors(DOM_FINGERPRINTS.confirmationBanner, 'hasConfirmationBanner');
  checkSelectors(DOM_FINGERPRINTS.successIcon, 'hasSuccessIcon');
  checkSelectors(DOM_FINGERPRINTS.progressCompleted, 'hasProgressCompleted');
  checkSelectors(DOM_FINGERPRINTS.disabledForm, 'hasDisabledForm');
  checkSelectors(DOM_FINGERPRINTS.readOnlySummary, 'hasReadOnlySummary');
  checkSelectors(DOM_FINGERPRINTS.receiptCard, 'hasReceiptCard');
  checkSelectors(DOM_FINGERPRINTS.downloadConfirmation, 'hasDownloadConfirmation');
  checkSelectors(DOM_FINGERPRINTS.printConfirmation, 'hasPrintConfirmation');
  checkSelectors(DOM_FINGERPRINTS.confirmationPanel, 'hasConfirmationPanel');
  checkSelectors(DOM_FINGERPRINTS.reviewPage, 'hasReviewPage');
  checkSelectors(DOM_FINGERPRINTS.completedTimeline, 'hasCompletedTimeline');
  checkSelectors(DOM_FINGERPRINTS.applicationSummary, 'hasApplicationSummary');
  checkSelectors(DOM_FINGERPRINTS.progressBar, 'hasProgressBar');

  // Success animation check
  const animationSelectors = ['[class*="animation" i]', '[class*="confetti" i]', 'canvas', 'lottie-player'];
  for (const sel of animationSelectors) {
    const el = querySafe(doc, sel);
    if (el && isVisible(el)) {
      const text = getText(el);
      if (text.length < 10) {
        result.hasSuccessAnimation = true;
        result.fingerprintScore += 1;
        result.matchedFingerprints.push(`hasSuccessAnimation:${sel}`);
        break;
      }
    }
  }

  // Generic confirmation check as fallback
  checkSelectors(DOM_FINGERPRINTS.confirmation, 'hasSuccessCard');

  return result;
}

// ───────────────────────────
// URL Evidence
// ───────────────────────────

export interface UrlEvidenceResult {
  hasSuccessPath: boolean;
  matchedPattern?: string;
  path: string;
  search: string;
  fullPath: string;
  hasReferenceParam?: boolean;
}

export function collectUrlEvidence(urlString: string, successPatterns: RegExp[]): UrlEvidenceResult {
  try {
    const url = new URL(urlString);
    const fullPath = (url.pathname + url.search).toLowerCase();
    const path = url.pathname.toLowerCase();
    const search = url.search.toLowerCase();

    for (const pat of successPatterns) {
      if (pat.test(fullPath)) {
        return {
          hasSuccessPath: true,
          matchedPattern: pat.source,
          path,
          search,
          fullPath,
          hasReferenceParam: /reference|receipt|id|token/i.test(search),
        };
      }
    }

    return {
      hasSuccessPath: false,
      path,
      search,
      fullPath,
      hasReferenceParam: /reference|receipt|id|token/i.test(search),
    };
  } catch {
    return {
      hasSuccessPath: false,
      path: '',
      search: '',
      fullPath: urlString.toLowerCase(),
    };
  }
}

// ───────────────────────────
// Button Evidence
// ───────────────────────────

export interface ButtonEvidenceResult {
  positiveButtons: { text: string; selector?: string }[];
  negativeButtons: { text: string; selector?: string }[];
  hasPositive: boolean;
  hasNegative: boolean;
  positiveCount: number;
  negativeCount: number;
}

export function collectButtonEvidence(doc: Document, positivePatterns: RegExp[], negativePatterns: RegExp[]): ButtonEvidenceResult {
  const positiveButtons: { text: string }[] = [];
  const negativeButtons: { text: string }[] = [];

  const buttons = queryAllSafe(doc, 'button, [role="button"], input[type="submit"], a[class*="button" i], a[class*="btn" i]');

  for (const btn of buttons.slice(0, 50)) {
    if (!isVisible(btn)) continue;
    const text = getText(btn);
    if (!text || text.length > 80) continue;

    for (const pat of positivePatterns) {
      if (pat.test(text)) {
        positiveButtons.push({ text });
        break;
      }
    }

    for (const pat of negativePatterns) {
      if (pat.test(text)) {
        negativeButtons.push({ text });
        break;
      }
    }
  }

  return {
    positiveButtons,
    negativeButtons,
    hasPositive: positiveButtons.length > 0,
    hasNegative: negativeButtons.length > 0,
    positiveCount: positiveButtons.length,
    negativeCount: negativeButtons.length,
  };
}

// ───────────────────────────
// Reference Evidence Aggregator
// ───────────────────────────

export interface ReferenceEvidenceResult {
  applicationId?: string | null;
  candidateId?: string | null;
  referenceNumber?: string | null;
  submissionNumber?: string | null;
  receiptNumber?: string | null;
  trackingNumber?: string | null;
  caseNumber?: string | null;
  requisitionId?: string | null;
  hasAnyReference: boolean;
  allReferences: string[];
  strongestReference?: string;
}

export function collectReferenceEvidence(doc: Document, patterns: RegExp[], selectors?: string[]): ReferenceEvidenceResult {
  const text = doc.body ? (doc.body.textContent || '') : '';
  const allReferences: string[] = [];
  let applicationId: string | null = null;
  let candidateId: string | null = null;
  let referenceNumber: string | null = null;

  // Try selectors first
  if (selectors) {
    for (const sel of selectors) {
      const el = querySafe(doc, sel);
      if (el && isVisible(el)) {
        const txt = getText(el);
        if (txt && txt.length >= 4 && txt.length <= 100) {
          const cleaned = txt.replace(/[^A-Z0-9-]/gi, '').trim();
          if (cleaned.length >= 4) {
            allReferences.push(cleaned);
            if (!applicationId) applicationId = cleaned;
          }
        }
      }
    }
  }

  // Regex patterns
  for (const pat of patterns) {
    const match = text.match(pat);
    if (match) {
      const candidate = match[2] || match[1] || match[0];
      const cleaned = candidate.replace(/[^A-Z0-9-]/gi, '').trim();
      if (cleaned.length >= 4 && cleaned.length <= 100) {
        allReferences.push(cleaned.toUpperCase());
        if (!referenceNumber) referenceNumber = cleaned.toUpperCase();
        if (!applicationId && /application/i.test(pat.source)) {
          applicationId = cleaned.toUpperCase();
        }
        if (!candidateId && /candidate/i.test(pat.source)) {
          candidateId = cleaned.toUpperCase();
        }
      }
    }
  }

  const uniqueRefs = [...new Set(allReferences)];

  return {
    applicationId,
    candidateId,
    referenceNumber,
    hasAnyReference: uniqueRefs.length > 0,
    allReferences: uniqueRefs,
    strongestReference: uniqueRefs[0] || undefined,
  };
}

import { PortalPlugin, JobPortal } from '../types';
import { extractReference } from '../utils/dom';
import { BODY_SUCCESS_PHRASES, FAILURE_PHRASES, REFERENCE_PATTERNS, POSITIVE_BUTTON_PATTERNS, NEGATIVE_BUTTON_PATTERNS } from '../utils/successPhrases';

export abstract class BasePortalPlugin implements PortalPlugin {
  abstract readonly portal: JobPortal;
  abstract readonly displayName: string;
  abstract readonly hostPatterns: RegExp[];
  abstract readonly pathPatterns: RegExp[];
  abstract readonly titlePatterns: RegExp[];
  abstract readonly headingPatterns: RegExp[];
  abstract readonly confirmationPatterns: RegExp[];
  abstract readonly referencePatterns: RegExp[];
  abstract readonly expectedSelectors: string[];
  abstract readonly applyButtonSelectors: string[];
  readonly weightBonus?: number;
  readonly negativePatterns?: RegExp[];

  // v1.1 Enhanced — optional, with defaults via getters
  readonly successPhrases?: RegExp[];
  readonly failurePhrases?: RegExp[];
  readonly confirmationSelectors?: string[];
  readonly applicationIdSelectors?: string[];
  readonly candidateIdSelectors?: string[];
  readonly receiptSelectors?: string[];
  readonly successIconSelectors?: string[];
  readonly progressSelectors?: string[];
  readonly breadcrumbSelectors?: string[];
  readonly positiveButtonPatterns?: RegExp[];
  readonly negativeButtonPatterns?: RegExp[];
  readonly domFingerprints?: {
    successCard?: string[];
    confirmationBanner?: string[];
    successIcon?: string[];
    progressCompleted?: string[];
    disabledForm?: string[];
    readOnlySummary?: string[];
    receiptCard?: string[];
    downloadConfirmation?: string[];
    printConfirmation?: string[];
    confirmationPanel?: string[];
    reviewPage?: string[];
    completedTimeline?: string[];
    applicationSummary?: string[];
    progressBar?: string[];
  };

  canHandle(hostname: string): boolean {
    const lower = hostname.toLowerCase().replace(/^www\./, '');
    return this.hostPatterns.some(p => p.test(lower));
  }

  getSuccessPhrases(): RegExp[] {
    return this.successPhrases || this.confirmationPatterns || BODY_SUCCESS_PHRASES;
  }

  getFailurePhrases(): RegExp[] {
    return this.failurePhrases || this.negativePatterns || FAILURE_PHRASES;
  }

  getConfirmationSelectors(): string[] {
    return this.confirmationSelectors || this.expectedSelectors || ['[class*="confirmation"]', '[class*="success"]'];
  }

  extractApplicationId(doc: Document): string | null {
    const selectors = this.applicationIdSelectors || ['[class*="application-id"]', '[class*="reference-number"]'];
    for (const sel of selectors) {
      try {
        const el = doc.querySelector(sel);
        if (el && el.textContent && el.textContent.trim().length >= 4) {
          return el.textContent.trim().slice(0, 100);
        }
      } catch {}
    }
    return null;
  }

  extractCandidateId(doc: Document): string | null {
    const selectors = this.candidateIdSelectors || ['[class*="candidate-id"]'];
    for (const sel of selectors) {
      try {
        const el = doc.querySelector(sel);
        if (el && el.textContent && el.textContent.trim().length >= 4) {
          return el.textContent.trim().slice(0, 100);
        }
      } catch {}
    }
    return null;
  }

  extractAllReferences(doc: Document): import('../types').ReferenceEvidence {
    const text = doc.body ? (doc.body.textContent || '') : '';
    const allRefs: string[] = [];
    let appId: string | null = null;
    let candId: string | null = null;

    const patterns = this.referencePatterns?.length ? this.referencePatterns : REFERENCE_PATTERNS;

    for (const pat of patterns) {
      const match = text.match(pat);
      if (match) {
        const candidate = match[2] || match[1] || match[0];
        const cleaned = candidate.replace(/[^A-Z0-9-]/gi, '').trim();
        if (cleaned.length >= 4) {
          allRefs.push(cleaned.toUpperCase());
          if (!appId) appId = cleaned.toUpperCase();
        }
      }
    }

    const appIdFromSel = this.extractApplicationId(doc);
    if (appIdFromSel) {
      allRefs.push(appIdFromSel);
      if (!appId) appId = appIdFromSel;
    }

    const candIdFromSel = this.extractCandidateId(doc);
    if (candIdFromSel) {
      allRefs.push(candIdFromSel);
      candId = candIdFromSel;
    }

    const unique = [...new Set(allRefs)];

    return {
      applicationId: appId,
      candidateId: candId,
      referenceNumber: unique[0] || null,
      submissionNumber: null,
      receiptNumber: null,
      trackingNumber: null,
      caseNumber: null,
      requisitionId: null,
      hasAnyReference: unique.length > 0,
      allReferences: unique,
      strongestReference: unique[0],
    };
  }

  extractCompany(doc: Document, _url: URL): string | null {
    const og = doc.querySelector('meta[property="og:site_name"]');
    if (og) return og.getAttribute('content') || null;
    
    const title = doc.title || '';
    const splitters = [' at ', ' - ', ' | ', ' @ '];
    for (const splitter of splitters) {
      if (title.includes(splitter)) {
        const parts = title.split(splitter);
        if (parts.length > 1) return parts[1].trim();
      }
    }
    
    try {
      const host = new URL(doc.baseURI || window.location.href).hostname.replace(/^www\./, '').split('.')[0];
      const generic = ['job-boards', 'boards', 'jobs', 'careers', 'lever', 'greenhouse', 'workatastartup', 'simplyhired', 'indeed', 'glassdoor', 'linkedin', 'myworkdayjobs', 'myworkday', 'workday', 'successfactors', 'sapsf', 'oraclecloud', 'taleo', 'smartrecruiters', 'recruitee', 'ashbyhq', 'teamtailor', 'bamboohr', 'jobvite', 'personio', 'icims', 'jazzhr', 'breezy', 'comeet', 'fountain', 'pinpointhq', 'rippling', 'workable'];
      if (!generic.includes(host.toLowerCase())) {
        return host.charAt(0).toUpperCase() + host.slice(1);
      }
    } catch {}
    
    return null;
  }

  extractJobTitle(doc: Document, _url: URL): string | null {
    const og = doc.querySelector('meta[property="og:title"]');
    if (og) {
      const content = og.getAttribute('content') || '';
      if (!/thank you|application received|success|confirmation/i.test(content)) {
        return content;
      }
    }

    const title = doc.title || '';
    const genericTitles = ['thank you', 'application received', 'application submitted', 'success', 'confirmation', 'applied'];
    if (genericTitles.some(t => title.toLowerCase().includes(t))) {
      return null;
    }

    const splitters = [' at ', ' - ', ' | ', ' @ '];
    for (const splitter of splitters) {
      if (title.includes(splitter)) {
        const job = title.split(splitter)[0]?.trim();
        if (job && !genericTitles.some(t => job.toLowerCase().includes(t))) {
          return job;
        }
      }
    }

    return title || null;
  }

  extractReference(doc: Document): string | null {
    if (!this.referencePatterns || this.referencePatterns.length === 0) return null;
    return extractReference(doc, this.referencePatterns);
  }
}

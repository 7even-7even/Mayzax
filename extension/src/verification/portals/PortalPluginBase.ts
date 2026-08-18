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
    let text = '';
    if (doc.body) {
      try {
        const cloned = doc.body.cloneNode(true) as HTMLElement;
        const toRemove = cloned.querySelectorAll('script, style, noscript, svg, iframe, link, meta');
        toRemove.forEach(el => el.remove());
        text = cloned.textContent || '';
      } catch {
        text = doc.body.textContent || '';
      }
    }
    const allRefs: string[] = [];
    let appId: string | null = null;
    let candId: string | null = null;

    const patterns = this.referencePatterns?.length ? this.referencePatterns : REFERENCE_PATTERNS;

    for (const pat of patterns) {
      const match = text.match(pat);
      if (match) {
        const candidate = match[2] || match[1] || match[0];
        const cleaned = candidate.replace(/[^A-Z0-9-]/gi, '').trim();
        // Skip technical code strings/placeholders
        if (cleaned.length >= 4 && !/TRACKINGPIXELHTML|HTMLCONTENT|TEMPLATE|SCRIPT|STYLESHEET/i.test(cleaned)) {
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

  extractFromSuccessHeaders(doc: Document): { jobTitle: string | null; company: string | null } | null {
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, p, span, div'))
      .map(el => el.textContent?.trim() || '')
      .filter(txt => txt.length > 5 && txt.length < 200);

    const patterns = [
      /your application was sent to\s+(.+?)\s+for\s+(.+)/i,
      /your application has been submitted to\s+(.+?)\s+for\s+(.+)/i,
      /applied to\s+(.+?)\s+for\s+(.+)/i,
      /applied to\s+(.+?)\s+as\s+(.+)/i,
      /applied successfully to\s+(.+?)\s+for\s+(.+)/i,
      /application for\s+(.+?)\s+at\s+(.+?)\s+was/i,
      /application for\s+(.+?)\s+was sent to\s+(.+)/i,
      /application to\s+(.+?)\s+for\s+(.+?)\s+successful/i,
      /thanks for applying to\s+(.+?)\s+for\s+(.+)/i,
      /thank you for applying to\s+(.+?)\s+for\s+(.+)/i,
    ];

    for (const text of headings) {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const src = pattern.source;
          if (
            src.includes('sent to\\s+(.+?)\\s+for') || 
            src.includes('submitted to\\s+(.+?)\\s+for') || 
            src.includes('applied to\\s+(.+?)\\s+for') || 
            src.includes('applied to\\s+(.+?)\\s+as') ||
            src.includes('successfully to\\s+(.+?)\\s+for') ||
            src.includes('applying to\\s+(.+?)\\s+for')
          ) {
            return { company: match[1].trim(), jobTitle: match[2].trim() };
          } else if (src.includes('for\\s+(.+?)\\s+at') || src.includes('application for\\s+(.+?)\\s+was')) {
            return { jobTitle: match[1].trim(), company: match[2].trim() };
          } else if (src.includes('to\\s+(.+?)\\s+for')) {
            return { company: match[1].trim(), jobTitle: match[2].trim() };
          }
        }
      }
    }
    return null;
  }

  extractCompany(doc: Document, url: URL): string | null {
    const parsed = this.extractFromSuccessHeaders(doc);
    if (parsed && parsed.company) return parsed.company;

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

  extractJobTitle(doc: Document, url: URL): string | null {
    const parsed = this.extractFromSuccessHeaders(doc);
    if (parsed && parsed.jobTitle) return parsed.jobTitle;

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

  // --- Portal Adapter Interface Methods ---
  detectApplicationStart(context: PageContext): boolean {
    const hasForm = !!context.document.querySelector('form');
    const isApply = /apply|job|career/i.test(context.url.pathname);
    return hasForm || isApply;
  }

  observeForm(context: PageContext): FormObservation {
    const fileInputs = Array.from(context.document.querySelectorAll('input[type="file"]'));
    const resumeUploaded = fileInputs.some(f => {
      const input = f as HTMLInputElement;
      return input.files && input.files.length > 0;
    });

    const requiredInputs = Array.from(context.document.querySelectorAll('input[required], textarea[required], select[required]'));
    const requiredFieldsCompleted = requiredInputs.length > 0 && requiredInputs.every(el => {
      const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (input.type === 'checkbox') return (input as HTMLInputElement).checked;
      if (input.type === 'radio') {
        const name = input.name;
        if (!name) return !!input.value;
        const checked = context.document.querySelector(`input[name="${name}"]:checked`);
        return !!checked;
      }
      return input.value.trim().length > 0;
    });

    return {
      formInteraction: false,
      requiredFieldsCompleted,
      resumeUploaded,
    };
  }

  detectSubmission(context: PageContext): SubmissionObservation {
    return { submitClicked: false };
  }

  detectConfirmation(context: PageContext): ConfirmationObservation {
    const title = context.document.title || '';
    const titleMatch = this.titlePatterns.some(p => p.test(title));

    const headings = Array.from(context.document.querySelectorAll('h1, h2, h3'))
      .map(h => h.textContent?.trim() || '')
      .filter(Boolean);
    const headingMatch = headings.some(text => this.headingPatterns.some(p => p.test(text)));

    const bodyText = context.document.body ? (context.document.body.textContent || '') : '';
    const bodyMatch = this.confirmationPatterns.some(p => p.test(bodyText));

    const confirmed = titleMatch || headingMatch || bodyMatch;
    return {
      submissionConfirmed: confirmed,
      confirmationText: confirmed ? (headings[0] || title || bodyText.slice(0, 100)) : undefined,
    };
  }

  extractApplicationIdentifiers(context: PageContext): ApplicationIdentifiers {
    const refs = this.extractAllReferences(context.document);
    return {
      jobId: this.extractJobIdFromUrl(context.url) || undefined,
      applicationId: refs.applicationId || undefined,
      referenceId: refs.strongestReference || undefined,
    };
  }

  private extractJobIdFromUrl(url: URL): string | null {
    const match = url.pathname.match(/\/(?:jobs|job|position|requisition|careers)\/([A-Za-z0-9_-]+)/i);
    return match ? match[1] : null;
  }
}

export interface PageContext {
  document: Document;
  url: URL;
}

export interface FormObservation {
  formInteraction: boolean;
  requiredFieldsCompleted: boolean;
  resumeUploaded: boolean;
  metadata?: Record<string, any>;
}

export interface SubmissionObservation {
  submitClicked: boolean;
  metadata?: Record<string, any>;
}

export interface ConfirmationObservation {
  submissionConfirmed: boolean;
  confirmationText?: string;
  metadata?: Record<string, any>;
}

export interface ApplicationIdentifiers {
  jobId?: string;
  applicationId?: string;
  referenceId?: string;
}


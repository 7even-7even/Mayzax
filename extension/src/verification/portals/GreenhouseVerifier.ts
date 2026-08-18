import { BasePortalPlugin, PageContext, ApplicationIdentifiers } from './PortalPluginBase';
import { JobPortal } from '../types';
import {
  TITLE_SUCCESS_PHRASES,
  HEADING_SUCCESS_PHRASES,
  BODY_SUCCESS_PHRASES,
  FAILURE_PHRASES,
  URL_SUCCESS_PATTERNS,
  POSITIVE_BUTTON_PATTERNS,
  NEGATIVE_BUTTON_PATTERNS,
} from '../utils/successPhrases';

export class GreenhouseVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.GREENHOUSE;
  readonly displayName = 'Greenhouse';
  readonly hostPatterns = [/(?:^|\.)greenhouse\.io$/, /(?:^|\.)greenhouse\.com$/, /^boards\.greenhouse\.io$/, /(?:^|\.)job-boards\.greenhouse\.io$/];
  readonly pathPatterns = [/\/confirmation/i, /\/applications?\/.*submitted/i, /\/thank.?you/i, /\/success/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/application submitted/i, /thank you/i, /confirmation/i, /your application/i, ...TITLE_SUCCESS_PHRASES];
  readonly headingPatterns = [
    /application submitted/i,
    /thank you for applying/i,
    /your application has been submitted/i,
    /application received/i,
    ...HEADING_SUCCESS_PHRASES,
  ];
  readonly confirmationPatterns = [
    /your application for .* has been submitted/i,
    /thank you for applying/i,
    /application submitted/i,
    /we have received your application/i,
    ...BODY_SUCCESS_PHRASES,
  ];
  readonly referencePatterns = [
    /application\s*(id|reference|number)\s*[:#]?\s*([A-Z0-9-]{6,})/i,
    /reference\s*number\s*[:#]?\s*([A-Z0-9-]+)/i,
  ];
  readonly expectedSelectors = [
    '#application_confirmation',
    '.application-submitted',
    '.thank-you',
    '[class*="confirmation"]',
    '.board-content',
    '.application--confirmation',
    '[data-mapped="true"]',
    '.success-card',
    '.confirmation-card',
  ];
  readonly applyButtonSelectors = ['a[href*="apply"]', 'button', '#apply_button'];
  readonly weightBonus = 5;

  // v1.1 Enhanced
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
  readonly confirmationSelectors = [
    '#application_confirmation',
    '.application-submitted',
    '.thank-you',
    '[class*="confirmation"]',
    '.board-content',
    '.application--confirmation',
    '[data-mapped="true"]',
    '.success-card',
    '.confirmation-card',
  ];
  readonly applicationIdSelectors = ['.application-id', '#applicationId', '[class*="application-id"]'];
  readonly candidateIdSelectors = ['.candidate-id', '#candidateId'];
  readonly receiptSelectors = ['.receipt-card', '.receipt'];
  readonly successIconSelectors = ['[class*="checkmark"]', '[class*="success-icon"]', '.icon-success'];
  readonly progressSelectors = ['.progress-completed', '.completed-timeline'];
  readonly positiveButtonPatterns = POSITIVE_BUTTON_PATTERNS;
  readonly negativeButtonPatterns = NEGATIVE_BUTTON_PATTERNS;
  readonly domFingerprints = {
    successCard: ['#application_confirmation', '.application-submitted', '.success-card', '.confirmation-card'],
    confirmationBanner: ['.alert-success', '[role="alert"]', '.success-banner'],
    successIcon: ['[class*="checkmark"]', '[class*="success-icon"]'],
    progressCompleted: ['.progress-completed', '.completed-timeline'],
    disabledForm: ['form[disabled]', '.form-disabled'],
    readOnlySummary: ['.application-summary', '.read-only'],
    receiptCard: ['.receipt-card'],
    confirmationPanel: ['.confirmation-panel', '.success-panel'],
    applicationSummary: ['.application-summary'],
  };

  extractCompany(doc: Document, url: URL): string | null {
    const companyEl = doc.querySelector('.company-name');
    if (companyEl) {
      const text = companyEl.textContent?.replace(/at\s+/i, '').trim();
      if (text) return text;
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 0) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return super.extractCompany(doc, url);
  }

  extractJobTitle(doc: Document, _url: URL): string | null {
    const titleEl = doc.querySelector('.app-title');
    if (titleEl) {
      const text = titleEl.textContent?.trim();
      if (text && !/thank you|application submitted/i.test(text)) return text;
    }
    return super.extractJobTitle(doc, _url);
  }

  detectApplicationStart(context: PageContext): boolean {
    const isGreenhouseHost = this.canHandle(context.url.hostname);
    const hasApplicationForm = !!context.document.querySelector('#application_form, form[action*="/apply"], #main_fields');
    return isGreenhouseHost && hasApplicationForm;
  }

  extractApplicationIdentifiers(context: PageContext): ApplicationIdentifiers {
    const refs = this.extractAllReferences(context.document);
    let jobId = context.url.searchParams.get('gh_jid') || null;
    if (!jobId) {
      const match = context.url.pathname.match(/\/jobs\/(\d+)/);
      if (match) jobId = match[1];
    }
    return {
      jobId: jobId || undefined,
      applicationId: refs.applicationId || undefined,
      referenceId: refs.strongestReference || undefined,
    };
  }
}

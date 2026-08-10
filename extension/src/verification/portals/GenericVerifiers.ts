import { BasePortalPlugin } from './PortalPluginBase';
import { JobPortal } from '../types';
import {
  TITLE_SUCCESS_PHRASES,
  HEADING_SUCCESS_PHRASES,
  BODY_SUCCESS_PHRASES,
  FAILURE_PHRASES,
  URL_SUCCESS_PATTERNS,
  REFERENCE_PATTERNS,
  POSITIVE_BUTTON_PATTERNS,
  NEGATIVE_BUTTON_PATTERNS,
} from '../utils/successPhrases';

/**
 * Generic Career Verifier — v1.1 Universal ATS Intelligence
 * Much smarter: collects evidence from URL, title, headings, body, buttons, meta, DOM, reference IDs,
 * forms, icons, containers, progress bars, breadcrumbs, success banners, application summaries
 */
export class GenericCareerVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.CAREER_SITE;
  readonly displayName = 'Career Site';
  readonly hostPatterns = [/careers\./, /jobs\./, /(?:^|\.)careers\./, /(?:^|\.)jobs\./];
  readonly pathPatterns = [...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [...TITLE_SUCCESS_PHRASES];
  readonly headingPatterns = [...HEADING_SUCCESS_PHRASES];
  readonly confirmationPatterns = [...BODY_SUCCESS_PHRASES];
  readonly referencePatterns = [...REFERENCE_PATTERNS];
  readonly expectedSelectors: string[] = [
    '[class*="confirmation"]',
    '[class*="success"]',
    '[class*="application-success"]',
    '[class*="thank-you"]',
    '[id*="confirmation"]',
    '.success-card',
    '.confirmation-card',
    '.application-confirmation',
    '.receipt-card',
    '[data-automation-id*="confirmation"]',
    '[class*="application-summary"]',
    '[class*="progress-completed"]',
    '[class*="completed-timeline"]',
    '.alert-success',
    '[role="alert"]',
  ];
  readonly applyButtonSelectors = ['button', 'a[class*="apply"]', 'a[class*="button"]'];
  readonly weightBonus = 2;

  // v1.1 Enhanced
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
  readonly confirmationSelectors = [
    '.confirmation-message',
    '.success-message',
    '[class*="confirmation"]',
    '[class*="success"]',
    '.application-confirmation',
    '.thank-you',
    '#application_confirmation',
    '.application-submitted',
    '.receipt-card',
    '.success-card',
    '.confirmation-card',
    '[data-automation-id*="confirmation"]',
  ];
  readonly applicationIdSelectors = [
    '[class*="application-id"]',
    '[class*="reference-number"]',
    '#applicationId',
    '#referenceNumber',
    '.application-number',
  ];
  readonly candidateIdSelectors = ['[class*="candidate-id"]', '.candidate-number', '#candidateId'];
  readonly receiptSelectors = ['.receipt', '.receipt-card', '[class*="receipt"]'];
  readonly successIconSelectors = ['[class*="success-icon"]', '[class*="checkmark"]', '[class*="check-circle"]', '.icon-success'];
  readonly progressSelectors = ['.progress-completed', '.progress-complete', '[class*="progress-completed"]', '.completed-timeline'];
  readonly breadcrumbSelectors = ['.breadcrumb', '[class*="breadcrumb"]', 'nav[aria-label*="breadcrumb"]'];
  readonly positiveButtonPatterns = POSITIVE_BUTTON_PATTERNS;
  readonly negativeButtonPatterns = NEGATIVE_BUTTON_PATTERNS;
  readonly domFingerprints = {
    successCard: ['.success-card', '.confirmation-card', '[class*="success-card"]', '[class*="confirmation-card"]'],
    confirmationBanner: ['.confirmation-banner', '.success-banner', '.alert-success', '[role="alert"]'],
    successIcon: ['.success-icon', '[class*="checkmark"]', '[class*="check-circle"]', '.icon-success'],
    progressCompleted: ['.progress-completed', '.completed-timeline', '[class*="progress-completed"]'],
    disabledForm: ['form[disabled]', 'fieldset[disabled]', '.form-disabled', 'form.readonly'],
    readOnlySummary: ['.read-only', '.application-summary', '[class*="readonly"]', '.review-page'],
    receiptCard: ['.receipt-card', '.receipt', '[class*="receipt"]'],
    downloadConfirmation: ['a[href*="download"][href*="confirmation"]', 'button[class*="download"]'],
    printConfirmation: ['button[class*="print"]', '[onclick*="print"]'],
    confirmationPanel: ['.confirmation-panel', '.success-panel', '[class*="confirmation-panel"]'],
    reviewPage: ['.review-page', '.application-review'],
    completedTimeline: ['.completed-timeline', '.timeline-completed'],
    applicationSummary: ['.application-summary', '.summary-card'],
    progressBar: ['.progress-bar', '[role="progressbar"]', '.progress'],
  };

  extractCompany(doc: Document, url: URL): string | null {
    const companySelectors = [
      '.company-name',
      '[class*="company-name"]',
      '[data-company]',
      '.employer-name',
      'meta[property="og:site_name"]',
    ];
    for (const sel of companySelectors) {
      try {
        const el = doc.querySelector(sel);
        if (el) {
          const content = sel.includes('meta') ? el.getAttribute('content') : el.textContent;
          if (content && content.trim().length > 1 && content.trim().length < 100) {
            return content.trim();
          }
        }
      } catch {}
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      const maybeCompany = parts[0];
      if (maybeCompany.length > 2 && maybeCompany.length < 30 && !['jobs', 'careers', 'positions', 'apply', 'application'].includes(maybeCompany.toLowerCase())) {
        return maybeCompany.charAt(0).toUpperCase() + maybeCompany.slice(1);
      }
    }
    return super.extractCompany(doc, url);
  }

  extractJobTitle(doc: Document, url: URL): string | null {
    const titleSelectors = [
      '.job-title',
      '.app-title',
      '.posting-header h2',
      'h1[class*="job-title"]',
      '[data-automation-id="jobPostingTitle"]',
      '[class*="job-title"]',
      'meta[property="og:title"]',
    ];
    for (const sel of titleSelectors) {
      try {
        const el = doc.querySelector(sel);
        if (el) {
          const content = sel.includes('meta') ? el.getAttribute('content') : el.textContent;
          if (content) {
            const trimmed = content.trim();
            if (trimmed.length > 3 && trimmed.length < 120 && !/thank you|submitted|confirmation|success|applied/i.test(trimmed)) {
              return trimmed;
            }
          }
        }
      } catch {}
    }
    return super.extractJobTitle(doc, url);
  }
}

export class OtherVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.OTHER;
  readonly displayName = 'Other';
  readonly hostPatterns = [/.*/];
  readonly pathPatterns = [...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [...TITLE_SUCCESS_PHRASES];
  readonly headingPatterns = [...HEADING_SUCCESS_PHRASES];
  readonly confirmationPatterns = [...BODY_SUCCESS_PHRASES];
  readonly referencePatterns = [...REFERENCE_PATTERNS];
  readonly expectedSelectors: string[] = [
    '[class*="confirmation"]',
    '[class*="success"]',
    '[id*="confirmation"]',
    '.success-card',
    '.confirmation-card',
  ];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 0;

  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
  readonly confirmationSelectors = ['[class*="confirmation"]', '[class*="success"]', '.thank-you', '#application_confirmation'];
  readonly applicationIdSelectors = ['[class*="application-id"]', '[class*="reference-number"]'];
  readonly candidateIdSelectors = ['[class*="candidate-id"]'];
  readonly positiveButtonPatterns = POSITIVE_BUTTON_PATTERNS;
  readonly negativeButtonPatterns = NEGATIVE_BUTTON_PATTERNS;

  canHandle(_hostname: string): boolean {
    return true;
  }

  extractCompany(doc: Document, url: URL): string | null {
    const selectors = [
      'meta[property="og:site_name"]',
      '.company-name',
      '[class*="company"]',
      '[data-company]',
    ];
    for (const sel of selectors) {
      try {
        const el = doc.querySelector(sel);
        if (el) {
          const content = sel.includes('meta') ? el.getAttribute('content') : el.textContent;
          if (content && content.trim().length > 1 && content.trim().length < 100) {
            return content.trim();
          }
        }
      } catch {}
    }
    try {
      const host = url.hostname.replace(/^www\./, '').split('.')[0];
      const generic = ['myworkdayjobs', 'myworkday', 'workday', 'successfactors', 'sapsf', 'oraclecloud', 'taleo', 'smartrecruiters', 'recruitee', 'ashbyhq', 'teamtailor', 'bamboohr', 'jobvite', 'personio', 'icims', 'jazzhr', 'breezy', 'comeet', 'fountain', 'pinpointhq', 'rippling', 'workable', 'boards', 'job-boards'];
      if (!generic.includes(host.toLowerCase()) && host.length > 2) {
        return host.charAt(0).toUpperCase() + host.slice(1);
      }
    } catch {}
    return null;
  }
}

// Additional specific portals — kept for backward compatibility, now using universal phrases
export class ZipRecruiterVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.ZIPRECRUITER;
  readonly displayName = 'ZipRecruiter';
  readonly hostPatterns = [/(?:^|\.)ziprecruiter\.com$/];
  readonly pathPatterns = [/\/applied/i, /\/confirmation/i, /\/thank.?you/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/applied/i, /application sent/i, ...TITLE_SUCCESS_PHRASES];
  readonly headingPatterns = [/application sent/i, /applied/i, ...HEADING_SUCCESS_PHRASES];
  readonly confirmationPatterns = [/application sent/i, /you applied/i, ...BODY_SUCCESS_PHRASES];
  readonly referencePatterns: RegExp[] = [];
  readonly expectedSelectors = ['.job-applied', '[class*="applied"]', '[class*="confirmation"]'];
  readonly applyButtonSelectors = ['button.apply-button'];
  readonly weightBonus = 3;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

export class GlassdoorVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.GLASSDOOR;
  readonly displayName = 'Glassdoor';
  readonly hostPatterns = [/(?:^|\.)glassdoor\.com$/];
  readonly pathPatterns = [/\/Job\/applied/i, /\/applied/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/application submitted/i, ...TITLE_SUCCESS_PHRASES];
  readonly headingPatterns = [/application submitted/i, ...HEADING_SUCCESS_PHRASES];
  readonly confirmationPatterns = [/application submitted/i, ...BODY_SUCCESS_PHRASES];
  readonly referencePatterns: RegExp[] = [];
  readonly expectedSelectors = ['.appliedConfirm', '[data-test*="applied"]', '[class*="confirmation"]'];
  readonly applyButtonSelectors = ['button[data-test*="apply"]'];
  readonly weightBonus = 3;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

export class NaukriVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.NAUKRI;
  readonly displayName = 'Naukri';
  readonly hostPatterns = [/(?:^|\.)naukri\.com$/];
  readonly pathPatterns = [/\/applied/i, /\/confirmation/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/applied/i, /application submitted/i, ...TITLE_SUCCESS_PHRASES];
  readonly headingPatterns = [/applied/i, ...HEADING_SUCCESS_PHRASES];
  readonly confirmationPatterns = [/applied/i, ...BODY_SUCCESS_PHRASES];
  readonly referencePatterns: RegExp[] = [];
  readonly expectedSelectors = ['.applied', '[class*="success"]', '[class*="confirmation"]'];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 2;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

export class DiceVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.DICE;
  readonly displayName = 'Dice';
  readonly hostPatterns = [/(?:^|\.)dice\.com$/];
  readonly pathPatterns = [/\/applied/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/applied/i, ...TITLE_SUCCESS_PHRASES];
  readonly headingPatterns = [/applied/i, ...HEADING_SUCCESS_PHRASES];
  readonly confirmationPatterns = [/applied/i, ...BODY_SUCCESS_PHRASES];
  readonly referencePatterns: RegExp[] = [];
  readonly expectedSelectors: string[] = ['[class*="confirmation"]', '[class*="success"]'];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 2;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

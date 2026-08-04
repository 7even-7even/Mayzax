import { BasePortalPlugin } from './PortalPluginBase';
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

export class WorkdayVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.WORKDAY;
  readonly displayName = 'Workday';
  readonly hostPatterns = [/(?:^|\.)myworkdayjobs\.com$/, /(?:^|\.)myworkday\.com$/, /(?:^|\.)workday\.com$/];
  readonly pathPatterns = [/\/confirmation/i, /\/submitted/i, /\/application.*complete/i, /\/thank.*you/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/submission successful/i, /you have successfully submitted/i, /your application/i, /thank you/i, ...TITLE_SUCCESS_PHRASES];
  readonly headingPatterns = [
    /you have successfully submitted/i,
    /application submitted/i,
    /submission successful/i,
    /thank you for applying/i,
    ...HEADING_SUCCESS_PHRASES,
  ];
  readonly confirmationPatterns = [
    /you have successfully submitted/i,
    /your application has been submitted/i,
    /thank you for applying/i,
    /application.*submitted/i,
    ...BODY_SUCCESS_PHRASES,
  ];
  readonly referencePatterns = [
    /application\s*id\s*[:#]?\s*([A-Z0-9-]+)/i,
    /reference\s*number\s*[:#]?\s*([A-Z0-9-]+)/i,
    /submission\s*id\s*[:#]?\s*([A-Z0-9-]+)/i,
  ];
  readonly expectedSelectors = [
    '[data-automation-id="confirmationPage"]',
    '[data-automation-id="candidateApplicationConfirmation"]',
    '[data-automation-id="applicationConfirmation"]',
    'section[data-automation-id*="confirmation"]',
    '[data-automation-id*="confirmation"]',
    '[class*="confirmation"]',
    '.success-card',
  ];
  readonly applyButtonSelectors = ['[data-automation-id*="apply"]', 'button[data-automation-id*="apply"]'];
  readonly weightBonus = 10;

  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
  readonly confirmationSelectors = [
    '[data-automation-id="confirmationPage"]',
    '[data-automation-id="candidateApplicationConfirmation"]',
    '[class*="confirmation"]',
    '.success-card',
  ];
  readonly applicationIdSelectors = ['[data-automation-id*="applicationId"]', '[class*="application-id"]'];
  readonly candidateIdSelectors = ['[data-automation-id*="candidateId"]'];
  readonly positiveButtonPatterns = POSITIVE_BUTTON_PATTERNS;
  readonly negativeButtonPatterns = NEGATIVE_BUTTON_PATTERNS;
  readonly domFingerprints = {
    successCard: ['[data-automation-id="confirmationPage"]', '.success-card'],
    confirmationBanner: ['[role="alert"]', '.alert-success'],
    progressCompleted: ['[data-automation-id*="progress"]', '.progress-completed'],
  };

  extractCompany(doc: Document, _url: URL): string | null {
    const companyEl = doc.querySelector('[data-automation-id="jobPostingCompanyName"]');
    if (companyEl) return companyEl.textContent?.trim() || null;
    return super.extractCompany(doc, _url);
  }

  extractJobTitle(doc: Document, _url: URL): string | null {
    const titleEl = doc.querySelector('[data-automation-id="jobPostingHeader"] h2, [data-automation-id="jobPostingTitle"]');
    if (titleEl) {
      const text = titleEl.textContent?.trim();
      if (text && !/thank you|submitted/i.test(text)) return text;
    }
    return super.extractJobTitle(doc, _url);
  }
}

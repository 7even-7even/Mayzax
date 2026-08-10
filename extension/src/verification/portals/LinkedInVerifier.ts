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

export class LinkedInVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.LINKEDIN;
  readonly displayName = 'LinkedIn';
  readonly hostPatterns = [/(?:^|\.)linkedin\.com$/];
  readonly pathPatterns = [/\/jobs\/.*\/applied/i, /\/easy-apply/i, /\/application.*submitted/i, /\/confirmation/i, /\/applied/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/application submitted/i, /your application was sent/i, /applied/i, ...TITLE_SUCCESS_PHRASES];
  readonly headingPatterns = [/application submitted/i, /your application was sent to/i, /applied/i, /you applied/i, ...HEADING_SUCCESS_PHRASES];
  readonly confirmationPatterns = [/your application was sent/i, /application submitted/i, /you applied to/i, ...BODY_SUCCESS_PHRASES];
  readonly referencePatterns: RegExp[] = [];
  readonly expectedSelectors = ['.artdeco-inline-feedback--success', '[data-test-modal*="success"]', 'h2[class*="success"]', '.jobs-apply-form__success', '[class*="confirmation"]'];
  readonly applyButtonSelectors = ['button[aria-label*="Apply"]', 'button.jobs-apply-button', 'button.jobs-apply-form__submit'];
  readonly weightBonus = 5;

  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
  readonly positiveButtonPatterns = POSITIVE_BUTTON_PATTERNS;
  readonly negativeButtonPatterns = NEGATIVE_BUTTON_PATTERNS;

  extractCompany(doc: Document, _url: URL): string | null {
    const companyEl = doc.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .jobs-company__box');
    if (companyEl) return companyEl.textContent?.trim() || null;
    return super.extractCompany(doc, _url);
  }

  extractJobTitle(doc: Document, _url: URL): string | null {
    const titleEl = doc.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title');
    if (titleEl) return titleEl.textContent?.trim() || null;
    return super.extractJobTitle(doc, _url);
  }
}

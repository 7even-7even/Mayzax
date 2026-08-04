import { BasePortalPlugin } from './PortalPluginBase';
import { JobPortal } from '../types';

export class LinkedInVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.LINKEDIN;
  readonly displayName = 'LinkedIn';
  readonly hostPatterns = [/(?:^|\.)linkedin\.com$/];
  readonly pathPatterns = [/\/jobs\/.*\/applied/i, /\/easy-apply/i, /\/application.*submitted/i, /\/confirmation/i, /\/applied/i];
  readonly titlePatterns = [/application submitted/i, /your application was sent/i, /applied/i];
  readonly headingPatterns = [/application submitted/i, /your application was sent to/i, /applied/i, /you applied/i];
  readonly confirmationPatterns = [/your application was sent/i, /application submitted/i, /you applied to/i];
  readonly referencePatterns: RegExp[] = [];
  readonly expectedSelectors = ['.artdeco-inline-feedback--success', '[data-test-modal*="success"]', 'h2[class*="success"]', '.jobs-apply-form__success'];
  readonly applyButtonSelectors = ['button[aria-label*="Apply"]', 'button.jobs-apply-button', 'button.jobs-apply-form__submit'];
  readonly weightBonus = 5;

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

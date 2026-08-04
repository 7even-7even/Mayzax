import { BasePortalPlugin } from './PortalPluginBase';
import { JobPortal } from '../types';

export class WorkdayVerifier extends BasePortalPlugin {
  // Workday often mapped to COMPANY_WEBSITE or CAREER_SITE in enum, but we treat as LEVER-like for scoring
  readonly portal = JobPortal.COMPANY_WEBSITE; // Keep COMPANY_WEBSITE, but display is Workday
  readonly displayName = 'Workday';
  readonly hostPatterns = [/(?:^|\.)myworkdayjobs\.com$/, /(?:^|\.)myworkday\.com$/, /(?:^|\.)workday\.com$/];
  readonly pathPatterns = [/\/confirmation/i, /\/submitted/i, /\/application.*complete/i, /\/thank.*you/i];
  readonly titlePatterns = [/submission successful/i, /you have successfully submitted/i, /your application/i, /thank you/i];
  readonly headingPatterns = [
    /you have successfully submitted/i,
    /application submitted/i,
    /submission successful/i,
    /thank you for applying/i,
  ];
  readonly confirmationPatterns = [
    /you have successfully submitted/i,
    /your application has been submitted/i,
    /thank you for applying/i,
    /application.*submitted/i,
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
  ];
  readonly applyButtonSelectors = ['[data-automation-id*="apply"]', 'button[data-automation-id*="apply"]'];
  readonly weightBonus = 10;

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

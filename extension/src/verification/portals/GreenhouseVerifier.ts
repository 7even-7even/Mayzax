import { BasePortalPlugin } from './PortalPluginBase';
import { JobPortal } from '../types';

export class GreenhouseVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.GREENHOUSE;
  readonly displayName = 'Greenhouse';
  readonly hostPatterns = [/(?:^|\.)greenhouse\.io$/, /(?:^|\.)greenhouse\.com$/, /^boards\.greenhouse\.io$/];
  readonly pathPatterns = [/\/confirmation/i, /\/applications?\/.*submitted/i, /\/thank.?you/i, /\/success/i];
  readonly titlePatterns = [/application submitted/i, /thank you/i, /confirmation/i, /your application/i];
  readonly headingPatterns = [
    /application submitted/i,
    /thank you for applying/i,
    /your application has been submitted/i,
    /application received/i,
  ];
  readonly confirmationPatterns = [
    /your application for .* has been submitted/i,
    /thank you for applying/i,
    /application submitted/i,
    /we have received your application/i,
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
  ];
  readonly applyButtonSelectors = ['a[href*="apply"]', 'button', '#apply_button'];
  readonly weightBonus = 5;

  extractCompany(doc: Document, url: URL): string | null {
    const companyEl = doc.querySelector('.company-name');
    if (companyEl) {
      const text = companyEl.textContent?.replace(/at\s+/i, '').trim();
      if (text) return text;
    }
    // URL path: boards.greenhouse.io/company/jobs/...
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
}

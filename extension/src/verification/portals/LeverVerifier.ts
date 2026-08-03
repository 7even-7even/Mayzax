import { BasePortalPlugin } from './PortalPluginBase';
import { JobPortal } from '../types';

export class LeverVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.LEVER;
  readonly displayName = 'Lever';
  readonly hostPatterns = [/(?:^|\.)lever\.co$/, /^jobs\.lever\.co$/];
  readonly pathPatterns = [/\/applied/i, /\/application.*success/i, /\/confirmation/i, /\/thank.?you/i];
  readonly titlePatterns = [/you have applied/i, /application submitted/i, /thank you/i];
  readonly headingPatterns = [/you have applied/i, /application submitted/i, /thank you/i, /application received/i];
  readonly confirmationPatterns = [/you have applied to/i, /application submitted/i, /thank you for applying/i];
  readonly referencePatterns = [/reference\s*[:#]?\s*([A-Z0-9-]+)/i, /application\s*id\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['.application-complete', '.posting-apply-success', '[class*="success"]', '.content-full'];
  readonly applyButtonSelectors = ['button.posting-btn-submit', 'a.posting-btn-submit'];
  readonly weightBonus = 5;

  extractCompany(doc: Document, url: URL): string | null {
    const companyEl = doc.querySelector('.posting-header-company-logo, img[alt*="logo"]');
    if (companyEl) {
      const alt = companyEl.getAttribute('alt')?.replace(/logo/i, '').trim();
      if (alt) return alt;
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 0) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return super.extractCompany(doc, url);
  }

  extractJobTitle(doc: Document, _url: URL): string | null {
    const titleEl = doc.querySelector('.posting-header h2');
    if (titleEl) {
      const text = titleEl.textContent?.trim();
      if (text && !/thank you|application submitted/i.test(text)) return text;
    }
    return super.extractJobTitle(doc, _url);
  }
}

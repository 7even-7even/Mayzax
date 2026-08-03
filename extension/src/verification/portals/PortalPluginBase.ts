import { PortalPlugin, JobPortal } from '../types';
import { extractReference } from '../utils/dom';

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

  canHandle(hostname: string): boolean {
    const lower = hostname.toLowerCase().replace(/^www\./, '');
    return this.hostPatterns.some(p => p.test(lower));
  }

  extractCompany(doc: Document, _url: URL): string | null {
    // Default generic extraction
    const og = doc.querySelector('meta[property="og:site_name"]');
    if (og) return og.getAttribute('content') || null;
    
    // Try to parse from title
    const title = doc.title || '';
    const splitters = [' at ', ' - ', ' | ', ' @ '];
    for (const splitter of splitters) {
      if (title.includes(splitter)) {
        const parts = title.split(splitter);
        if (parts.length > 1) return parts[1].trim();
      }
    }
    
    // Hostname fallback
    try {
      const host = new URL(doc.baseURI || window.location.href).hostname.replace(/^www\./, '').split('.')[0];
      const generic = ['job-boards', 'boards', 'jobs', 'careers', 'lever', 'greenhouse', 'workatastartup', 'simplyhired', 'indeed', 'glassdoor', 'linkedin'];
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
      // Filter generic titles
      if (!/thank you|application received|success|confirmation/i.test(content)) {
        return content;
      }
    }

    // Title parsing
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

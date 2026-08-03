import { BasePortalPlugin } from './PortalPluginBase';
import { JobPortal } from '../types';

export class GenericCareerVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.CAREER_SITE;
  readonly displayName = 'Career Site';
  readonly hostPatterns = [/careers\./, /jobs\./];
  readonly pathPatterns = [/\/confirmation/i, /\/thank.?you/i, /\/success/i, /\/submitted/i, /\/applied/i];
  readonly titlePatterns = [/thank you/i, /application submitted/i, /application received/i, /success/i];
  readonly headingPatterns = [/thank you/i, /application submitted/i, /application received/i];
  readonly confirmationPatterns = [/thank you for applying/i, /your application has been submitted/i, /application received/i];
  readonly referencePatterns = [/application\s*(id|reference)?\s*[:#]?\s*([A-Z0-9-]{4,})/i];
  readonly expectedSelectors: string[] = [];
  readonly applyButtonSelectors = ['button', 'a[class*="apply"]'];
  readonly weightBonus = 0;
}

export class OtherVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.OTHER;
  readonly displayName = 'Other';
  readonly hostPatterns = [/.*/]; // fallback matches everything
  readonly pathPatterns = [/\/confirmation/i, /\/thank.?you/i, /\/success/i, /\/submitted/i, /\/applied/i];
  readonly titlePatterns = [/thank you/i, /application submitted/i, /confirmation/i];
  readonly headingPatterns = [/thank you/i, /application submitted/i];
  readonly confirmationPatterns = [/thank you for applying/i, /your application has been submitted/i];
  readonly referencePatterns = [/application\s*(id|reference)?\s*[:#]?\s*([A-Z0-9-]{4,})/i];
  readonly expectedSelectors: string[] = [];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 0;

  canHandle(_hostname: string): boolean {
    return true; // fallback
  }
}

// Additional specific portals
export class ZipRecruiterVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.ZIPRECRUITER;
  readonly displayName = 'ZipRecruiter';
  readonly hostPatterns = [/(?:^|\.)ziprecruiter\.com$/];
  readonly pathPatterns = [/\/applied/i, /\/confirmation/i, /\/thank.?you/i];
  readonly titlePatterns = [/applied/i, /application sent/i];
  readonly headingPatterns = [/application sent/i, /applied/i];
  readonly confirmationPatterns = [/application sent/i, /you applied/i];
  readonly referencePatterns: RegExp[] = [];
  readonly expectedSelectors = ['.job-applied', '[class*="applied"]'];
  readonly applyButtonSelectors = ['button.apply-button'];
  readonly weightBonus = 3;
}

export class GlassdoorVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.GLASSDOOR;
  readonly displayName = 'Glassdoor';
  readonly hostPatterns = [/(?:^|\.)glassdoor\.com$/];
  readonly pathPatterns = [/\/Job\/applied/i, /\/applied/i];
  readonly titlePatterns = [/application submitted/i];
  readonly headingPatterns = [/application submitted/i];
  readonly confirmationPatterns = [/application submitted/i];
  readonly referencePatterns: RegExp[] = [];
  readonly expectedSelectors = ['.appliedConfirm', '[data-test*="applied"]'];
  readonly applyButtonSelectors = ['button[data-test*="apply"]'];
  readonly weightBonus = 3;
}

export class NaukriVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.NAUKRI;
  readonly displayName = 'Naukri';
  readonly hostPatterns = [/(?:^|\.)naukri\.com$/];
  readonly pathPatterns = [/\/applied/i, /\/confirmation/i];
  readonly titlePatterns = [/applied/i, /application submitted/i];
  readonly headingPatterns = [/applied/i];
  readonly confirmationPatterns = [/applied/i];
  readonly referencePatterns: RegExp[] = [];
  readonly expectedSelectors = ['.applied', '[class*="success"]'];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 2;
}

export class DiceVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.DICE;
  readonly displayName = 'Dice';
  readonly hostPatterns = [/(?:^|\.)dice\.com$/];
  readonly pathPatterns = [/\/applied/i];
  readonly titlePatterns = [/applied/i];
  readonly headingPatterns = [/applied/i];
  readonly confirmationPatterns = [/applied/i];
  readonly referencePatterns: RegExp[] = [];
  readonly expectedSelectors: string[] = [];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 2;
}

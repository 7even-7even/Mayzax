import { BasePortalPlugin } from './PortalPluginBase';
import { JobPortal } from '../types';

export class IndeedVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.INDEED;
  readonly displayName = 'Indeed';
  readonly hostPatterns = [/(?:^|\.)indeed\.com$/, /(?:^|\.)indeed\.[a-z.]+$/];
  readonly pathPatterns = [/\/applied/i, /\/application.*complete/i, /\/confirmation/i, /\/thank.?you/i];
  readonly titlePatterns = [/applied/i, /application submitted/i, /you applied/i];
  readonly headingPatterns = [/you applied/i, /application submitted/i, /your application was sent/i];
  readonly confirmationPatterns = [/you applied to/i, /application submitted/i, /your application has been sent/i];
  readonly referencePatterns: RegExp[] = [];
  readonly expectedSelectors = ['[class*="applied"]', '.jobsearch-IndeedApplyButton--applied', '.indeed-apply-success'];
  readonly applyButtonSelectors = ['button[aria-label*="Apply"]', '.jobsearch-IndeedApplyButton'];
  readonly weightBonus = 3;
}

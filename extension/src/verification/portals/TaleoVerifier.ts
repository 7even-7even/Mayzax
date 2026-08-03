import { BasePortalPlugin } from './PortalPluginBase';
import { JobPortal } from '../types';

export class TaleoVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.COMPANY_WEBSITE;
  readonly displayName = 'Taleo';
  readonly hostPatterns = [/(?:^|\.)taleo\.net$/];
  readonly pathPatterns = [/\/careersection\//i, /\/confirmation/i];
  readonly titlePatterns = [/submission.*complete/i, /thank you/i, /confirmation/i];
  readonly headingPatterns = [/thank you/i, /submission complete/i];
  readonly confirmationPatterns = [/thank you/i, /submission complete/i];
  readonly referencePatterns = [/submission\s*id\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['.confirmation', '.submissionConfirmation'];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 8;
}

import { BasePortalPlugin } from './PortalPluginBase';
import { JobPortal } from '../types';

export class OracleVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.COMPANY_WEBSITE;
  readonly displayName = 'Oracle Cloud';
  readonly hostPatterns = [/(?:^|\.)oraclecloud\.com$/];
  readonly pathPatterns = [/\/hcmUI\/CandidateExperience/i, /\/confirmation/i, /\/submitted/i];
  readonly titlePatterns = [/submission.*received/i, /thank you/i, /application submitted/i];
  readonly headingPatterns = [/thank you/i, /submission received/i, /application submitted/i];
  readonly confirmationPatterns = [/your submission has been received/i, /thank you for applying/i];
  readonly referencePatterns = [/submission\s*id\s*[:#]?\s*([A-Z0-9-]+)/i, /application\s*id\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[id*="confirmation"]', '[class*="confirmation"]', '.confirmationPage'];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 8;
}

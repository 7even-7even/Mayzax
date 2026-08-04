import { BasePortalPlugin } from './PortalPluginBase';
import { JobPortal } from '../types';

export class SuccessFactorsVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.COMPANY_WEBSITE;
  readonly displayName = 'SuccessFactors';
  readonly hostPatterns = [/(?:^|\.)successfactors\.com$/, /(?:^|\.)sapsf\.com$/, /(?:^|\.)successfactors\.eu$/];
  readonly pathPatterns = [/\/career\//i, /\/applicationStatus/i, /\/confirmation/i, /\/thank.*you/i];
  readonly titlePatterns = [/application submitted/i, /thank you/i, /confirmation/i];
  readonly headingPatterns = [/thank you/i, /application submitted/i, /submission complete/i];
  readonly confirmationPatterns = [/thank you for applying/i, /your application has been submitted/i];
  readonly referencePatterns = [/application\s*id\s*[:#]?\s*([A-Z0-9-]+)/i, /requisition\s*id\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['.applicationComplete', '[class*="confirmation"]', '.sfsuConfirmation'];
  readonly applyButtonSelectors = ['button', 'a[class*="apply"]'];
  readonly weightBonus = 8;
}

import { BasePortalPlugin } from './PortalPluginBase';
import { JobPortal } from '../types';
import {
  TITLE_SUCCESS_PHRASES,
  HEADING_SUCCESS_PHRASES,
  BODY_SUCCESS_PHRASES,
  FAILURE_PHRASES,
  URL_SUCCESS_PATTERNS,
  POSITIVE_BUTTON_PATTERNS,
  NEGATIVE_BUTTON_PATTERNS,
} from '../utils/successPhrases';

export class SuccessFactorsVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.SUCCESSFACTORS;
  readonly displayName = 'SuccessFactors';
  readonly hostPatterns = [/(?:^|\.)successfactors\.com$/, /(?:^|\.)sapsf\.com$/, /(?:^|\.)successfactors\.eu$/];
  readonly pathPatterns = [/\/career\//i, /\/applicationStatus/i, /\/confirmation/i, /\/thank.*you/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/application submitted/i, /thank you/i, /confirmation/i, ...TITLE_SUCCESS_PHRASES];
  readonly headingPatterns = [/thank you/i, /application submitted/i, /submission complete/i, ...HEADING_SUCCESS_PHRASES];
  readonly confirmationPatterns = [/thank you for applying/i, /your application has been submitted/i, ...BODY_SUCCESS_PHRASES];
  readonly referencePatterns = [/application\s*id\s*[:#]?\s*([A-Z0-9-]+)/i, /requisition\s*id\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['.applicationComplete', '[class*="confirmation"]', '.sfsuConfirmation', '[data-automation-id*="confirmation"]'];
  readonly applyButtonSelectors = ['button', 'a[class*="apply"]'];
  readonly weightBonus = 8;

  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
  readonly positiveButtonPatterns = POSITIVE_BUTTON_PATTERNS;
  readonly negativeButtonPatterns = NEGATIVE_BUTTON_PATTERNS;
}

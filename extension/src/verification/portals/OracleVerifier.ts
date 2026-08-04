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

export class OracleVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.ORACLE;
  readonly displayName = 'Oracle Cloud';
  readonly hostPatterns = [/(?:^|\.)oraclecloud\.com$/];
  readonly pathPatterns = [/\/hcmUI\/CandidateExperience/i, /\/confirmation/i, /\/submitted/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/submission.*received/i, /thank you/i, /application submitted/i, ...TITLE_SUCCESS_PHRASES];
  readonly headingPatterns = [/thank you/i, /submission received/i, /application submitted/i, ...HEADING_SUCCESS_PHRASES];
  readonly confirmationPatterns = [/your submission has been received/i, /thank you for applying/i, ...BODY_SUCCESS_PHRASES];
  readonly referencePatterns = [/submission\s*id\s*[:#]?\s*([A-Z0-9-]+)/i, /application\s*id\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[id*="confirmation"]', '[class*="confirmation"]', '.confirmationPage', '[class*="success"]'];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 8;

  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
  readonly positiveButtonPatterns = POSITIVE_BUTTON_PATTERNS;
  readonly negativeButtonPatterns = NEGATIVE_BUTTON_PATTERNS;
}

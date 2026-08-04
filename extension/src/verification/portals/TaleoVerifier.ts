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

export class TaleoVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.TALEO;
  readonly displayName = 'Taleo';
  readonly hostPatterns = [/(?:^|\.)taleo\.net$/];
  readonly pathPatterns = [/\/careersection\//i, /\/confirmation/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/submission.*complete/i, /thank you/i, /confirmation/i, ...TITLE_SUCCESS_PHRASES];
  readonly headingPatterns = [/thank you/i, /submission complete/i, ...HEADING_SUCCESS_PHRASES];
  readonly confirmationPatterns = [/thank you/i, /submission complete/i, ...BODY_SUCCESS_PHRASES];
  readonly referencePatterns = [/submission\s*id\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['.confirmation', '.submissionConfirmation', '[class*="confirmation"]', '[class*="success"]'];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 8;

  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
  readonly positiveButtonPatterns = POSITIVE_BUTTON_PATTERNS;
  readonly negativeButtonPatterns = NEGATIVE_BUTTON_PATTERNS;
}

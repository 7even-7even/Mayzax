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

export class IndeedVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.INDEED;
  readonly displayName = 'Indeed';
  readonly hostPatterns = [/(?:^|\.)indeed\.com$/, /(?:^|\.)indeed\.[a-z.]+$/];
  readonly pathPatterns = [/\/applied/i, /\/application.*complete/i, /\/confirmation/i, /\/thank.?you/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/applied/i, /application submitted/i, /you applied/i, ...TITLE_SUCCESS_PHRASES];
  readonly headingPatterns = [/you applied/i, /application submitted/i, /your application was sent/i, ...HEADING_SUCCESS_PHRASES];
  readonly confirmationPatterns = [/you applied to/i, /application submitted/i, /your application has been sent/i, ...BODY_SUCCESS_PHRASES];
  readonly referencePatterns: RegExp[] = [];
  readonly expectedSelectors = ['[class*="applied"]', '.jobsearch-IndeedApplyButton--applied', '.indeed-apply-success', '[class*="confirmation"]'];
  readonly applyButtonSelectors = ['button[aria-label*="Apply"]', '.jobsearch-IndeedApplyButton'];
  readonly weightBonus = 3;

  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
  readonly positiveButtonPatterns = POSITIVE_BUTTON_PATTERNS;
  readonly negativeButtonPatterns = NEGATIVE_BUTTON_PATTERNS;
}

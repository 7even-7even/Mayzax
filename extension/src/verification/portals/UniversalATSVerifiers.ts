/**
 * Universal ATS Verifiers — v1.1 Universal ATS Intelligence
 * Each plugin matches ATS platform, not employer
 * Example: hardrockdigital.recruitee.com and companyxyz.recruitee.com both use Recruitee plugin
 */

import { BasePortalPlugin } from './PortalPluginBase';
import { JobPortal } from '../types';
import { TITLE_SUCCESS_PHRASES, HEADING_SUCCESS_PHRASES, BODY_SUCCESS_PHRASES, FAILURE_PHRASES, URL_SUCCESS_PATTERNS } from '../utils/successPhrases';

// ───────────────────────────
// Recruitee
// ───────────────────────────

export class RecruiteeVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.RECRUITEE;
  readonly displayName = 'Recruitee';
  readonly hostPatterns = [/(?:^|\.)recruitee\.com$/];
  readonly pathPatterns = [/\/applied/i, /\/confirmation/i, /\/thank-you/i, /\/success/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/applied/i, /thank you/i, /success/i, /application submitted/i, /all done/i];
  readonly headingPatterns = [/all done/i, /thank you/i, /applied/i, /application submitted/i, /you're all set/i];
  readonly confirmationPatterns = [/all done/i, /thank you/i, /applied/i, /application submitted/i, /you're all set/i, /we have received/i];
  readonly referencePatterns = [/application\s*id\s*[:#]?\s*([A-Z0-9-]+)/i, /reference\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[class*="confirmation"]', '.application--confirmation', '[data-mapped="true"]'];
  readonly applyButtonSelectors = ['button', 'a[class*="apply"]'];
  readonly weightBonus = 5;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
  readonly confirmationSelectors = ['.application--confirmation', '[class*="confirmation"]', '[data-mapped="true"]'];
  readonly applicationIdSelectors = ['[class*="application-id"]', '.reference-number'];
  readonly candidateIdSelectors = ['[class*="candidate-id"]'];
  readonly domFingerprints = {
    successCard: ['.application--confirmation', '[class*="success-card"]'],
    confirmationBanner: ['[class*="confirmation-banner"]', '.alert-success'],
    successIcon: ['[class*="checkmark"]', '[class*="success-icon"]'],
  };
  readonly positiveButtonPatterns = [/view application/i, /return home/i, /browse jobs/i];
  readonly negativeButtonPatterns = [/apply now/i, /submit application/i];
}

// ───────────────────────────
// Ashby
// ───────────────────────────

export class AshbyVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.ASHBY;
  readonly displayName = 'Ashby';
  readonly hostPatterns = [/(?:^|\.)ashbyhq\.com$/];
  readonly pathPatterns = [/\/application\/submitted/i, /\/application\/confirmation/i, /\/application\/success/i, /\/application\/complete/i, /\/confirmation/i, /\/submitted/i, /\/success/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/application submitted/i, /thank you/i, /applied/i, /success/i];
  readonly headingPatterns = [/thank you/i, /application submitted/i, /you're all set/i, /all done/i];
  readonly confirmationPatterns = [/thank you/i, /application submitted/i, /we have received/i, /you're all set/i];
  readonly referencePatterns = [/application\s*id\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[data-ashby-form]', '.ashby-application--confirmation', '[class*="confirmation"]'];
  readonly applyButtonSelectors = ['button', '[data-ashby-form] button'];
  readonly weightBonus = 5;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
  readonly confirmationSelectors = ['[data-ashby-form]', '.ashby-application--confirmation'];
  readonly applicationIdSelectors = ['[class*="application-id"]'];
  readonly candidateIdSelectors = ['[class*="candidate-id"]'];
}

// ───────────────────────────
// Teamtailor
// ───────────────────────────

export class TeamtailorVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.TEAMTAILOR;
  readonly displayName = 'Teamtailor';
  readonly hostPatterns = [/(?:^|\.)teamtailor\.com$/];
  readonly pathPatterns = [/\/applications/i, /\/confirmation/i, /\/thank-you/i, /\/applied/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/thank you/i, /application submitted/i, /applied/i];
  readonly headingPatterns = [/thank you for applying/i, /application submitted/i, /you're all set/i];
  readonly confirmationPatterns = [/thank you for applying/i, /your application has been submitted/i, /we have received/i];
  readonly referencePatterns = [/reference\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[class*="teamtailor"]', '[class*="confirmation"]', '.application-confirmation'];
  readonly applyButtonSelectors = ['button', 'a[class*="apply"]'];
  readonly weightBonus = 5;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

// ───────────────────────────
// SmartRecruiters
// ───────────────────────────

export class SmartRecruitersVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.SMARTRECRUITERS;
  readonly displayName = 'SmartRecruiters';
  readonly hostPatterns = [/(?:^|\.)smartrecruiters\.com$/, /(?:^|\.)smartrecruiters\.co$/];
  readonly pathPatterns = [/\/confirmation/i, /\/applied/i, /\/success/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/thank you/i, /application submitted/i, /success/i];
  readonly headingPatterns = [/thank you/i, /application submitted/i, /you have applied/i];
  readonly confirmationPatterns = [/thank you/i, /we have received your application/i, /your application has been submitted/i];
  readonly referencePatterns = [/reference\s*[:#]?\s*([A-Z0-9-]+)/i, /application\s*id\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['.sr-apply-button', '[class*="smartRecruiters"]', '[class*="confirmation"]', '.application-confirmation'];
  readonly applyButtonSelectors = ['.sr-apply-button', 'button'];
  readonly weightBonus = 5;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

// ───────────────────────────
// BambooHR
// ───────────────────────────

export class BambooHRVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.BAMBOOHR;
  readonly displayName = 'BambooHR';
  readonly hostPatterns = [/(?:^|\.)bamboohr\.com$/];
  readonly pathPatterns = [/\/confirmation/i, /\/applied/i, /\/success/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/thank you/i, /application submitted/i];
  readonly headingPatterns = [/thank you/i, /application submitted/i, /you have applied/i];
  readonly confirmationPatterns = [/thank you/i, /your application has been submitted/i, /we have received/i];
  readonly referencePatterns = [/application\s*id\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[id*="bamboohr"]', '[class*="bamboohr"]', '[class*="confirmation"]'];
  readonly applyButtonSelectors = ['button', 'a[class*="apply"]'];
  readonly weightBonus = 5;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

// ───────────────────────────
// Jobvite
// ───────────────────────────

export class JobviteVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.JOBVITE;
  readonly displayName = 'Jobvite';
  readonly hostPatterns = [/(?:^|\.)jobvite\.com$/];
  readonly pathPatterns = [/\/confirmation/i, /\/complete/i, /\/thank-you/i, /\/applied/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/thank you/i, /application submitted/i, /confirmation/i];
  readonly headingPatterns = [/thank you/i, /application submitted/i, /you have applied/i];
  readonly confirmationPatterns = [/thank you/i, /your application has been submitted/i, /we have received/i];
  readonly referencePatterns = [/requisition\s*id\s*[:#]?\s*([A-Z0-9-]+)/i, /application\s*id\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[class*="jv-confirmation"]', '.jv-confirmation', '[class*="confirmation"]'];
  readonly applyButtonSelectors = ['button', 'a[class*="apply"]'];
  readonly weightBonus = 5;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

// ───────────────────────────
// Personio
// ───────────────────────────

export class PersonioVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.PERSONIO;
  readonly displayName = 'Personio';
  readonly hostPatterns = [/(?:^|\.)personio\.com$/, /(?:^|\.)personio\.de$/];
  readonly pathPatterns = [/\/confirmation/i, /\/success/i, /\/applied/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/thank you/i, /application received/i, /success/i];
  readonly headingPatterns = [/thank you for your application/i, /application received/i, /success/i];
  readonly confirmationPatterns = [/thank you for your application/i, /we have received your application/i, /application received/i];
  readonly referencePatterns = [/reference\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[class*="personio"]', '[class*="confirmation"]'];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 5;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

// ───────────────────────────
// iCIMS
// ───────────────────────────

export class IcimsVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.ICIMS;
  readonly displayName = 'iCIMS';
  readonly hostPatterns = [/(?:^|\.)icims\.com$/];
  readonly pathPatterns = [/\/confirmation/i, /\/applied/i, /\/success/i, /\/thank-you/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/thank you/i, /application submitted/i, /confirmation/i];
  readonly headingPatterns = [/thank you/i, /your application has been submitted/i, /application submitted/i];
  readonly confirmationPatterns = [/thank you/i, /your application has been submitted/i, /we have received/i];
  readonly referencePatterns = [/reference\s*[:#]?\s*([A-Z0-9-]+)/i, /submission\s*id\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[class*="iCIMS"]', '[id*="iCIMS"]', '[class*="confirmation"]', '.iCIMS_Logo'];
  readonly applyButtonSelectors = ['button', 'a[class*="apply"]'];
  readonly weightBonus = 5;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

// ───────────────────────────
// JazzHR
// ───────────────────────────

export class JazzHRVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.JAZZHR;
  readonly displayName = 'JazzHR';
  readonly hostPatterns = [/(?:^|\.)jazzhr\.com$/];
  readonly pathPatterns = [/\/confirmation/i, /\/applied/i, /\/thank-you/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/thank you/i, /application submitted/i];
  readonly headingPatterns = [/thank you/i, /application submitted/i];
  readonly confirmationPatterns = [/thank you for applying/i, /your application has been submitted/i];
  readonly referencePatterns = [/application\s*id\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[class*="jazzhr"]', '[class*="confirmation"]'];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 5;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

// ───────────────────────────
// BreezyHR
// ───────────────────────────

export class BreezyHRVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.BREEZYHR;
  readonly displayName = 'BreezyHR';
  readonly hostPatterns = [/(?:^|\.)breezy\.hr$/];
  readonly pathPatterns = [/\/confirmation/i, /\/applied/i, /\/thank-you/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/thank you/i, /application submitted/i, /applied/i];
  readonly headingPatterns = [/thank you/i, /you have applied/i, /application submitted/i];
  readonly confirmationPatterns = [/thank you/i, /your application has been submitted/i];
  readonly referencePatterns = [/reference\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[class*="breezy"]', '[class*="confirmation"]', '.breezy-confirmation'];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 5;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

// ───────────────────────────
// Comeet
// ───────────────────────────

export class ComeetVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.COMEET;
  readonly displayName = 'Comeet';
  readonly hostPatterns = [/(?:^|\.)comeet\.co$/, /(?:^|\.)comeet\.com$/];
  readonly pathPatterns = [/\/confirmation/i, /\/applied/i, /\/success/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/thank you/i, /application submitted/i];
  readonly headingPatterns = [/thank you/i, /application submitted/i];
  readonly confirmationPatterns = [/thank you for applying/i, /your application has been submitted/i];
  readonly referencePatterns = [/reference\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[class*="comeet"]', '[class*="confirmation"]'];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 5;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

// ───────────────────────────
// Fountain
// ───────────────────────────

export class FountainVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.FOUNTAIN;
  readonly displayName = 'Fountain';
  readonly hostPatterns = [/(?:^|\.)fountain\.com$/];
  readonly pathPatterns = [/\/confirmation/i, /\/applied/i, /\/success/i, /\/thank-you/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/thank you/i, /application submitted/i, /all done/i];
  readonly headingPatterns = [/all done/i, /thank you/i, /you're all set/i];
  readonly confirmationPatterns = [/all done/i, /thank you/i, /you're all set/i, /application submitted/i];
  readonly referencePatterns = [/application\s*id\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[class*="fountain"]', '[class*="confirmation"]', '.fountain-confirmation'];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 5;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

// ───────────────────────────
// Pinpoint
// ───────────────────────────

export class PinpointVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.PINPOINT;
  readonly displayName = 'Pinpoint';
  readonly hostPatterns = [/(?:^|\.)pinpointhq\.com$/];
  readonly pathPatterns = [/\/confirmation/i, /\/applied/i, /\/thank-you/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/thank you/i, /application submitted/i];
  readonly headingPatterns = [/thank you/i, /application submitted/i];
  readonly confirmationPatterns = [/thank you for applying/i, /your application has been submitted/i];
  readonly referencePatterns = [/reference\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[class*="pinpoint"]', '[class*="confirmation"]'];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 5;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

// ───────────────────────────
// Rippling
// ───────────────────────────

export class RipplingVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.RIPPLING;
  readonly displayName = 'Rippling ATS';
  readonly hostPatterns = [/(?:^|\.)rippling\.com$/, /(?:^|\.)ats\.rippling\.com$/];
  readonly pathPatterns = [/\/confirmation/i, /\/applied/i, /\/success/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/thank you/i, /application submitted/i, /all done/i];
  readonly headingPatterns = [/all done/i, /thank you/i, /you're all set/i];
  readonly confirmationPatterns = [/all done/i, /thank you/i, /you're all set/i, /application submitted/i];
  readonly referencePatterns = [/reference\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[class*="rippling"]', '[class*="confirmation"]'];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 5;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

// ───────────────────────────
// Workable
// ───────────────────────────

export class WorkableVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.WORKABLE;
  readonly displayName = 'Workable';
  readonly hostPatterns = [/(?:^|\.)workable\.com$/, /(?:^|\.)jobs\.workable\.com$/];
  readonly pathPatterns = [/\/confirmation/i, /\/applied/i, /\/thank-you/i, /\/success/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/thank you/i, /application submitted/i];
  readonly headingPatterns = [/thank you for applying/i, /application submitted/i];
  readonly confirmationPatterns = [/thank you for applying/i, /your application has been submitted/i];
  readonly referencePatterns = [/reference\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[class*="workable"]', '[class*="confirmation"]', '.workable-confirmation'];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 5;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

// ───────────────────────────
// Dover
// ───────────────────────────

export class DoverVerifier extends BasePortalPlugin {
  readonly portal = JobPortal.OTHER; // Map to OTHER for backend compatibility, but display as Dover
  readonly displayName = 'Dover';
  readonly hostPatterns = [/(?:^|\.)dover\.com$/, /(?:^|\.)app\.dover\.com$/];
  readonly pathPatterns = [/\/applications/i, /\/confirmation/i, /\/success/i, ...URL_SUCCESS_PATTERNS];
  readonly titlePatterns = [/thank you/i, /application submitted/i];
  readonly headingPatterns = [/thank you/i, /application submitted/i];
  readonly confirmationPatterns = [/thank you/i, /your application has been submitted/i];
  readonly referencePatterns = [/reference\s*[:#]?\s*([A-Z0-9-]+)/i];
  readonly expectedSelectors = ['[class*="dover"]', '[class*="confirmation"]'];
  readonly applyButtonSelectors = ['button'];
  readonly weightBonus = 3;
  readonly successPhrases = BODY_SUCCESS_PHRASES;
  readonly failurePhrases = FAILURE_PHRASES;
}

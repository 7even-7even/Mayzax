/**
 * Universal Success Phrases — v1.1 Evidence Aggregation Model
 * Single source of truth, no duplicated regex
 * Used across all ATS plugins + Generic plugin
 * Goal: Minimize false negatives — collect every possible positive signal
 */

// ───────────────────────────
// URL Success Patterns
// ───────────────────────────

export const URL_SUCCESS_PATTERNS: RegExp[] = [
  /\/applied/i,
  /\/application-submitted/i,
  /\/application\/submitted/i,
  /\/success/i,
  /\/confirmation/i,
  /\/thank-you/i,
  /\/thankyou/i,
  /\/thank_you/i,
  /\/completed/i,
  /\/submitted/i,
  /\/done/i,
  /\/finish/i,
  /\/complete/i,
  /\/receipt/i,
  /\/reference/i,
  /\/applied-success/i,
  /\/apply-success/i,
  /\/application-complete/i,
  /\/application-success/i,
  /\/applied\/success/i,
  /\/post-apply/i,
  /\/application\/complete/i,
  /\/application\/success/i,
  /\/application\/confirmation/i,
  /\/candidate\/confirmation/i,
  /\/application\/thank-you/i,
  /\/application\/submitted/i,
  /\/job\/applied/i,
  /\/jobs\/applied/i,
  /\/applied\/confirmation/i,
];

// ───────────────────────────
// Page Title Success Phrases
// ───────────────────────────

export const TITLE_SUCCESS_PHRASES: RegExp[] = [
  /application submitted/i,
  /applied/i,
  /thank you/i,
  /thanks for applying/i,
  /success/i,
  /application complete/i,
  /we've received your application/i,
  /all done/i,
  /you're all set/i,
  /you are all set/i,
  /submission successful/i,
  /application received/i,
  /application confirmed/i,
  /application sent/i,
  /successfully applied/i,
  /you applied/i,
  /your application has been submitted/i,
  /your application has been received/i,
  /application saved/i,
  /application finished/i,
  /completed/i,
  /continue review/i,
  /we will review/i,
  /we have received/i,
  /thank you for your application/i,
  /thank you for applying/i,
  /your submission/i,
  /submission complete/i,
  /submission confirmed/i,
  /submission received/i,
  /application is complete/i,
  /you have applied/i,
  /you've applied/i,
];

// ───────────────────────────
// Heading Success Phrases (H1, H2, H3)
// ───────────────────────────

export const HEADING_SUCCESS_PHRASES: RegExp[] = [
  /application submitted/i,
  /thank you for applying/i,
  /your application has been submitted/i,
  /application received/i,
  /success/i,
  /all done/i,
  /you're all set/i,
  /you are all set/i,
  /submission successful/i,
  /thank you/i,
  /thanks for applying/i,
  /we've received your application/i,
  /application complete/i,
  /application confirmed/i,
  /you applied/i,
  /you have applied/i,
  /your application has been received/i,
  /application sent/i,
  /successfully applied/i,
  /application is complete/i,
  /we have received your application/i,
  /we will review your application/i,
  /our team will review/i,
  /recruiter will contact you/i,
  /we appreciate your interest/i,
  /everything is complete/i,
  /all set/i,
  /you are all set/i,
  /you're all set/i,
  /application recorded/i,
  /application has been recorded/i,
  /completed/i,
  /done/i,
  /finished/i,
  /received/i,
  /confirmed/i,
];

// ───────────────────────────
// Confirmation Body Success Phrases — Universal
// ───────────────────────────

export const BODY_SUCCESS_PHRASES: RegExp[] = [
  /thank you/i,
  /thanks for applying/i,
  /application received/i,
  /we've received your application/i,
  /we have received your application/i,
  /we'll review your application/i,
  /we will review your application/i,
  /application complete/i,
  /application submitted/i,
  /your application has been received/i,
  /your application has been submitted/i,
  /we appreciate your interest/i,
  /our team will review/i,
  /recruiter will contact you/i,
  /reference number/i,
  /application number/i,
  /candidate id/i,
  /submission successful/i,
  /all done/i,
  /everything is complete/i,
  /application has been recorded/i,
  /application has been saved/i,
  /success/i,
  /completed/i,
  /you have successfully/i,
  /you've successfully/i,
  /your submission has been/i,
  /we will be in touch/i,
  /we'll be in touch/i,
  /next steps/i,
  /what happens next/i,
  /we received your/i,
  /thank you for your interest/i,
  /thank you for submitting/i,
  /your application is complete/i,
  /your application was sent/i,
  /application was sent/i,
  /successfully submitted/i,
  /has been submitted/i,
  /has been received/i,
  /is now complete/i,
  /you have applied/i,
  /you applied/i,
  /applied successfully/i,
  /submitted successfully/i,
  /confirmation/i,
  /receipt/i,
  /tracking number/i,
  /we've got your application/i,
  /we got your application/i,
  /you are all set/i,
  /you're all set/i,
  /all set/i,
  /you're done/i,
  /you are done/i,
  /application confirmed/i,
  /you will hear from us/i,
  /we will contact you/i,
  /we'll contact you/i,
];

// ───────────────────────────
// Failure Phrases — Actual failure indicators (strong negative)
// ───────────────────────────

export const FAILURE_PHRASES: RegExp[] = [
  /application failed/i,
  /submission failed/i,
  /failed to submit/i,
  /error submitting/i,
  /error occurred/i,
  /something went wrong/i,
  /please try again/i,
  /validation failed/i,
  /required field/i,
  /resume missing/i,
  /upload required/i,
  /session expired/i,
  /unauthorized/i,
  /access denied/i,
  /an error/i,
  /could not be submitted/i,
  /not submitted/i,
  /submission error/i,
  /apply error/i,
  /incomplete application/i,
  /draft/i,
  /continue application/i,
];

// ───────────────────────────
// Reference ID Patterns — Strongest positive
// ───────────────────────────

export const REFERENCE_PATTERNS: RegExp[] = [
  /application\s*(id|reference|number)\s*[:#]?\s*([A-Z0-9-]{4,})/i,
  /reference\s*number\s*[:#]?\s*([A-Z0-9-]+)/i,
  /candidate\s*id\s*[:#]?\s*([A-Z0-9-]+)/i,
  /submission\s*(id|number|reference)?\s*[:#]?\s*([A-Z0-9-]{4,})/i,
  /receipt\s*number\s*[:#]?\s*([A-Z0-9-]+)/i,
  /tracking\s*number\s*[:#]?\s*([A-Z0-9-]+)/i,
  /case\s*number\s*[:#]?\s*([A-Z0-9-]+)/i,
  /requisition\s*id\s*[:#]?\s*([A-Z0-9-]+)/i,
  /jr\s*id\s*[:#]?\s*(\d+)/i,
  /job\s*reference\s*[:#]?\s*([A-Z0-9-]+)/i,
  /confirmation\s*(id|number|code)?\s*[:#]?\s*([A-Z0-9-]+)/i,
  /app\s*id\s*[:#]?\s*([A-Z0-9-]+)/i,
  /app\s*#\s*([A-Z0-9-]+)/i,
  /ref\s*#\s*([A-Z0-9-]+)/i,
  /id\s*:\s*([A-Z0-9-]{6,})/i,
];

// More specific reference selectors
export const APPLICATION_ID_SELECTORS: string[] = [
  '[data-testid*="application-id" i]',
  '[data-test*="application-id" i]',
  '.application-id',
  '.application-number',
  '.reference-number',
  '#applicationId',
  '#application-id',
  '#referenceNumber',
  '[class*="application-id" i]',
  '[class*="reference-number" i]',
  '[id*="applicationId" i]',
  '[id*="referenceNumber" i]',
];

export const CANDIDATE_ID_SELECTORS: string[] = [
  '[data-testid*="candidate-id" i]',
  '.candidate-id',
  '.candidate-number',
  '#candidateId',
  '[class*="candidate-id" i]',
];

// ───────────────────────────
// Button Patterns — Positive vs Negative (weak signals)
// ───────────────────────────

export const POSITIVE_BUTTON_PATTERNS: RegExp[] = [
  /view application/i,
  /track application/i,
  /return home/i,
  /browse jobs/i,
  /dashboard/i,
  /view status/i,
  /view my applications/i,
  /my applications/i,
  /go to dashboard/i,
  /back to jobs/i,
  /search more jobs/i,
  /explore jobs/i,
  /view receipt/i,
  /download confirmation/i,
  /print confirmation/i,
  /done/i,
  /finished/i,
  /close/i,
];

export const NEGATIVE_BUTTON_PATTERNS: RegExp[] = [
  /apply now/i,
  /submit application/i,
  /continue application/i,
  /start application/i,
  /apply for this job/i,
  /submit my application/i,
  /send application/i,
  /apply/i,
];

// ───────────────────────────
// Meta Tag Success Indicators
// ───────────────────────────

export const META_SUCCESS_PHRASES: RegExp[] = [
  /application submitted/i,
  /thank you/i,
  /success/i,
  /confirmation/i,
  /applied/i,
];

// ───────────────────────────
// Breadcrumb Success Indicators
// ───────────────────────────

export const BREADCRUMB_SUCCESS_PHRASES: RegExp[] = [
  /confirmation/i,
  /thank you/i,
  /success/i,
  /applied/i,
  /submitted/i,
  /complete/i,
  /receipt/i,
];

// ───────────────────────────
// DOM Fingerprint Selectors — Universal
// ───────────────────────────

export const DOM_FINGERPRINTS = {
  successCard: [
    '.success-card',
    '.confirmation-card',
    '.application-confirmation',
    '.apply-confirmation',
    '[class*="success-card" i]',
    '[class*="confirmation-card" i]',
    '[class*="application-success" i]',
    '[class*="apply-success" i]',
    '.receipt-card',
    '.application-receipt',
    '[class*="receipt-card" i]',
  ],
  confirmationBanner: [
    '.confirmation-banner',
    '.success-banner',
    '[class*="confirmation-banner" i]',
    '[class*="success-banner" i]',
    '.alert-success',
    '[role="alert"]',
    '.notification-success',
    '[class*="alert-success" i]',
  ],
  successIcon: [
    '.success-icon',
    '.confirmation-icon',
    '[class*="success-icon" i]',
    '[class*="checkmark" i]',
    '[class*="check-circle" i]',
    'svg[class*="success" i]',
    'svg[class*="check" i]',
    'i[class*="check" i]',
    '.icon-success',
    '.icon-check',
    'img[alt*="success" i]',
    'img[alt*="confirmation" i]',
  ],
  progressCompleted: [
    '.progress-completed',
    '.progress-complete',
    '[class*="progress-completed" i]',
    '[class*="step-completed" i]',
    '.completed-timeline',
    '.timeline-completed',
    '[class*="timeline-completed" i]',
    '.step-success',
    '.progress-success',
  ],
  disabledForm: [
    'form[disabled]',
    'fieldset[disabled]',
    'form input[disabled]',
    'form textarea[disabled]',
    'form.readonly',
    'form[readonly]',
    '.form-disabled',
    '[class*="form-disabled" i]',
  ],
  readOnlySummary: [
    '.read-only',
    '.readonly-summary',
    '.application-summary',
    '[class*="application-summary" i]',
    '[class*="readonly" i]',
    '.review-page',
    '.application-review',
  ],
  receiptCard: [
    '.receipt',
    '.receipt-card',
    '.confirmation-receipt',
    '[class*="receipt" i]',
  ],
  downloadConfirmation: [
    'a[href*="download" i][href*="confirmation" i]',
    'button[class*="download" i]',
    'a[class*="download-receipt" i]',
  ],
  printConfirmation: [
    'button[class*="print" i]',
    'a[class*="print" i]',
    '[onclick*="print" i]',
  ],
  confirmationPanel: [
    '.confirmation-panel',
    '.success-panel',
    '[class*="confirmation-panel" i]',
    '[class*="success-panel" i]',
    '.panel-success',
  ],
  reviewPage: [
    '.review-page',
    '.application-review',
    '[class*="review-page" i]',
  ],
  completedTimeline: [
    '.completed-timeline',
    '.timeline-completed',
    '[class*="completed-timeline" i]',
    '[class*="timeline-completed" i]',
  ],
  applicationSummary: [
    '.application-summary',
    '.summary-card',
    '[class*="application-summary" i]',
  ],
  progressBar: [
    '.progress-bar',
    '[role="progressbar"]',
    '.progress',
    '[class*="progress-bar" i]',
  ],
  // Generic
  confirmation: [
    '[data-automation-id*="confirmation" i]',
    '[data-testid*="confirmation" i]',
    '[data-test*="confirmation" i]',
    '[id*="confirmation" i]',
    '[class*="confirmation" i]',
    '#application_confirmation',
    '.application-submitted',
    '.application-complete',
    '.thank-you',
  ],
};

// ───────────────────────────
// Structured Data (JSON-LD) Indicators
// ───────────────────────────

export const JSONLD_SUCCESS_INDICATORS: RegExp[] = [
  /application.*submitted/i,
  /thank you/i,
  /success/i,
  /confirmation/i,
  /applied/i,
];

// ───────────────────────────
// Breadcrumb Selectors
// ───────────────────────────

export const BREADCRUMB_SELECTORS: string[] = [
  '.breadcrumb',
  '[class*="breadcrumb" i]',
  'nav[aria-label*="breadcrumb" i]',
  '.breadcrumbs',
  '[class*="breadcrumbs" i]',
  'ol[class*="breadcrumb" i]',
  'ul[class*="breadcrumb" i]',
];

// ───────────────────────────
// Meta Tag Selectors
// ───────────────────────────

export const META_SELECTORS = {
  ogTitle: 'meta[property="og:title"]',
  description: 'meta[name="description"]',
  ogDescription: 'meta[property="og:description"]',
  twitterTitle: 'meta[name="twitter:title"]',
  twitterDescription: 'meta[name="twitter:description"]',
};

// ───────────────────────────
// Hostname ATS Patterns — Universal (for generic detection)
// ───────────────────────────

export const KNOWN_ATS_HOST_PATTERNS: RegExp[] = [
  /(?:^|\.)greenhouse\.io$/,
  /(?:^|\.)greenhouse\.com$/,
  /(?:^|\.)lever\.co$/,
  /(?:^|\.)myworkdayjobs\.com$/,
  /(?:^|\.)myworkday\.com$/,
  /(?:^|\.)workday\.com$/,
  /(?:^|\.)successfactors\.com$/,
  /(?:^|\.)sapsf\.com$/,
  /(?:^|\.)sapsf\.eu$/,
  /(?:^|\.)oraclecloud\.com$/,
  /(?:^|\.)taleo\.net$/,
  /(?:^|\.)smartrecruiters\.com$/,
  /(?:^|\.)recruitee\.com$/,
  /(?:^|\.)ashbyhq\.com$/,
  /(?:^|\.)teamtailor\.com$/,
  /(?:^|\.)bamboohr\.com$/,
  /(?:^|\.)jobvite\.com$/,
  /(?:^|\.)personio\.com$/,
  /(?:^|\.)personio\.de$/,
  /(?:^|\.)icims\.com$/,
  /(?:^|\.)jazzhr\.com$/,
  /(?:^|\.)breezy\.hr$/,
  /(?:^|\.)comeet\.co$/,
  /(?:^|\.)fountain\.com$/,
  /(?:^|\.)pinpointhq\.com$/,
  /(?:^|\.)rippling\.com$/,
  /(?:^|\.)workable\.com$/,
  /(?:^|\.)dover\.com$/,
  /(?:^|\.)applytojob\.com$/,
  /(?:^|\.)careerplug\.com$/,
  /(?:^|\.)paylocity\.com$/,
  /(?:^|\.)paycom\.com$/,
  /(?:^|\.)paycor\.com$/,
  /(?:^|\.)ultipro\.com$/,
  /(?:^|\.)kronos\.net$/,
  /(?:^|\.)adp\.com$/,
  /(?:^|\.)cornerstoneondemand\.com$/,
  /(?:^|\.)saba\.com$/,
  /(?:^|\.)jobscore\.com$/,
  /(?:^|\.)recruitcrm\.io$/,
  /(?:^|\.)loxo\.co$/,
  /(?:^|\.)linkedin\.com$/,
  /(?:^|\.)indeed\.com$/,
  /(?:^|\.)glassdoor\.com$/,
  /(?:^|\.)ziprecruiter\.com$/,
  /(?:^|\.)monster\.com$/,
  /(?:^|\.)dice\.com$/,
  /(?:^|\.)naukri\.com$/,
  /(?:^|\.)wellfound\.com$/,
  /(?:^|\.)angel\.co$/,
  /(?:^|\.)joinhandshake\.com$/,
  /(?:^|\.)ycombinator\.com$/,
  /(?:^|\.)workatastartup\.com$/,
  /(?:^|\.)simplify\.jobs$/,
  /(?:^|\.)simplyhired\.com$/,
  /(?:^|\.)careerbuilder\.com$/,
  /(?:^|\.)themuse\.com$/,
  /(?:^|\.)jobright\.ai$/,
  /(?:^|\.)speedyapply\.com$/,
];

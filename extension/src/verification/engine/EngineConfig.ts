export const ENGINE_VERSION = 'v2' as const;
export const ENGINE_VERSION_NAME = '1.1.0';

/**
 * v1.1 Universal ATS Intelligence — Evidence Aggregation Model
 * Philosophy: Start at 0, add positive evidence, missing evidence = 0 (no penalty)
 * Positive evidence dominates, fraud only slightly reduces unless overwhelming
 * Goal: Minimize false negatives, allow some false positives
 */

export const SCORING_WEIGHTS = {
  // Core positive signals (start at 0, add)
  UrlSuccessPattern: 15,        // /applied, /confirmation, /thank-you, etc.
  Domain: 10,                   // Known ATS hostname (e.g., greenhouse.io, lever.co, recruitee.com)
  PageTitle: 15,                // Title contains success phrases
  Heading: 20,                  // H1/H2/H3 contains success phrases
  ConfirmationBody: 20,         // Body contains success phrases
  ApplicationReference: 20,     // Strongest: Application ID, Reference Number, Candidate ID
  DomFingerprint: 15,           // Success cards, banners, icons, progress, receipt cards
  PortalCompliance: 5,          // Portal-specific compliance
  MetaTags: 5,                  // og:title, description contains success
  Breadcrumbs: 5,               // Breadcrumbs contain success
  JsonLd: 5,                    // Structured data indicates success
  PositiveButtons: 5,           // View Application, Track Application, etc.
  CompanyExtracted: 2,          // Weak positive
  JobTitleExtracted: 2,         // Weak positive
  FormDisabled: 5,              // Disabled/read-only form indicates completion

  // Legacy compatibility (keep existing keys but mapped to new model)
  DomainLegacy: 15,
  PageTitleLegacy: 15,
  HeadingLegacy: 20,
  ConfirmationBodyLegacy: 20,
  DomFingerprintLegacy: 15,
  PortalComplianceLegacy: 5,
  ApplyButtonBonus: 2,          // Reduced from 5 — very weak positive if Apply absent
  ApplyButtonPenalty: -2,       // Reduced from -15 — very weak negative

  // For evidence aggregation debugging
  Url: 15,
};

export const THRESHOLDS = {
  VERIFIED: 40,        // HIGH confidence — lowered from 65 to reduce false negatives
  SUSPICIOUS_MIN: 20,  // MEDIUM — lowered from 45
  REJECTED_MAX: 19,    // LOW
};

export const FRAUD_PENALTIES = {
  HISTORY_MANIPULATION: -5,     // Keep — actual fraud indicator
  SHORT_TIME_ON_PAGE: -1,       // Minimal influence — users often return quickly
  APPLY_BUTTON_VISIBLE: -2,     // Very weak — many ATS always show other jobs
  NEGATIVE_TITLE: 0,            // Missing title = 0, not penalty — failure phrases handled in FraudAnalyzer
  NEGATIVE_HEADING: 0,          // Missing heading = 0
  FAILURE_PHRASE: -10,          // Actual failure phrase (error, failed) — moderate penalty
  OVERWHELMING_FAILURE: -30,    // Multiple failure phrases — strong but not instant reject unless overwhelming
};

export const GENERIC_PORTAL_CAP = 90; // Increased from 70 — generic plugin now smarter, allow higher confidence
export const MIN_TIME_ON_PAGE_MS = 1000; // Reduced from 3000 — don't penalize quick returns

// New: Evidence aggregation thresholds for debugging
export const EVIDENCE_THRESHOLDS = {
  MIN_POSITIVE_SIGNALS: 2,      // At least 2 positive signals needed for suspicious
  MIN_FOR_VERIFIED: 3,          // At least 3 positive signals for verified
  STRONG_REFERENCE_BONUS: 20,   // Reference ID is strongest positive
};

// Logging levels
export const LOGGING = {
  VERBOSE: true,                // Enable detailed positive/neutral/negative logging
  SHOW_NEUTRAL: true,           // Show neutral evidence (e.g., Apply button still visible)
  SHOW_WEAK_NEGATIVE: true,     // Show weak negative evidence
};


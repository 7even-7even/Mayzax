export const ENGINE_VERSION = 'v2' as const;
export const ENGINE_VERSION_NAME = '1.0.0';

export const SCORING_WEIGHTS = {
  Domain: 15,
  PageTitle: 15,
  Heading: 20,
  ConfirmationBody: 20,
  ApplicationReference: 10,
  DomFingerprint: 15,
  PortalCompliance: 5,
  ApplyButtonBonus: 5, // bonus if absent
  ApplyButtonPenalty: -15,
};

export const THRESHOLDS = {
  VERIFIED: 65, // HIGH confidence
  SUSPICIOUS_MIN: 45, // MEDIUM
  REJECTED_MAX: 30, // LOW
};

export const FRAUD_PENALTIES = {
  HISTORY_MANIPULATION: -5,
  SHORT_TIME_ON_PAGE: -5,
  APPLY_BUTTON_VISIBLE: -5,
  NEGATIVE_TITLE: -5,
  NEGATIVE_HEADING: -5,
};

export const GENERIC_PORTAL_CAP = 70; // max score for OTHER without strong evidence
export const MIN_TIME_ON_PAGE_MS = 3000; // <3s suspicious

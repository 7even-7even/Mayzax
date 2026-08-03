export const ENGINE_VERSION = 'v2' as const;
export const ENGINE_VERSION_NAME = '2.0.0';

export const SCORING_WEIGHTS = {
  Domain: 10,
  PageTitle: 15,
  Heading: 20,
  ConfirmationBody: 20,
  ApplicationReference: 15,
  DomFingerprint: 15,
  PortalCompliance: 5,
  ApplyButtonBonus: 5, // bonus if absent
  ApplyButtonPenalty: -15,
};

export const THRESHOLDS = {
  VERIFIED: 80, // HIGH confidence
  SUSPICIOUS_MIN: 50, // MEDIUM
  REJECTED_MAX: 49, // LOW
};

export const FRAUD_PENALTIES = {
  HISTORY_MANIPULATION: -10,
  SHORT_TIME_ON_PAGE: -5,
  APPLY_BUTTON_VISIBLE: -15,
  NEGATIVE_TITLE: -20,
  NEGATIVE_HEADING: -10,
};

export const GENERIC_PORTAL_CAP = 60; // max score for OTHER without strong evidence
export const MIN_TIME_ON_PAGE_MS = 3000; // <3s suspicious

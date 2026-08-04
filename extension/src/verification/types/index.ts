export type VerificationConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type VerificationVersion = 'v2';

export enum JobPortal {
  LINKEDIN = 'LINKEDIN',
  INDEED = 'INDEED',
  GLASSDOOR = 'GLASSDOOR',
  JOBRIGHT = 'JOBRIGHT',
  SIMPLIFY = 'SIMPLIFY',
  SIMPLYHIRED = 'SIMPLYHIRED',
  WELLFOUND = 'WELLFOUND',
  HANDSHAKE = 'HANDSHAKE',
  NAUKRI = 'NAUKRI',
  DICE = 'DICE',
  MONSTER = 'MONSTER',
  ZIPRECRUITER = 'ZIPRECRUITER',
  COMPANY_WEBSITE = 'COMPANY_WEBSITE',
  CAREERBUILDER = 'CAREERBUILDER',
  LEVER = 'LEVER',
  GREENHOUSE = 'GREENHOUSE',
  SPEEDY_APPLY = 'SPEEDY_APPLY',
  THE_MUSE = 'THE_MUSE',
  Y_COMBINATOR = 'Y_COMBINATOR',
  CAREER_SITE = 'CAREER_SITE',
  OTHER = 'OTHER',
}

export interface DetectedButton {
  text: string;
  disabled: boolean;
  visible: boolean;
}

export interface DomFingerprint {
  hasConfirmationCard: boolean;
  hasSuccessBanner: boolean;
  expectedContainersFound: number;
  unexpectedApplyButtonPresent: boolean;
  totalExpected?: number;
  matchedSelectors?: string[];
  missingSelectors?: string[];
}

export interface VerificationEvidence {
  portal: JobPortal;
  hostname: string;
  pathname: string;
  fullUrl: string;
  normalizedUrl: string;
  title: string;
  headings: string[];
  confirmationText: string;
  applicationReference: string | null;
  detectedButtons: DetectedButton[];
  domFingerprint: DomFingerprint;
  verificationTimestamp: number;
  extensionVersion: string;
  https: boolean;
  pageLanguage?: string;
  timeOnPageMs?: number;
  userInteractionDetected?: boolean;
  historyManipulationDetected?: boolean;
  referrer?: string;
  [key: string]: any;
}

export interface RuleOutcome {
  ruleId: string;
  passed: boolean;
  scoreContribution: number;
  reasons: string[];
  fraudSignals?: string[];
  matchedKeywords?: string[];
}

export interface VerificationResultV2 {
  verified: boolean;
  score: number;
  confidence: VerificationConfidence;
  portal: JobPortal;
  reasons: string[];
  evidence: VerificationEvidence;
  verificationHash?: string;
  verificationTimestamp: number;
  version: VerificationVersion;
  applicationReference?: string | null;
  fraudSignals?: string[];
  isReplay?: boolean;
}

export interface RuleContext {
  document: Document;
  url: URL;
  portalPlugin?: PortalPlugin;
  evidence?: Partial<VerificationEvidence>;
}

export interface VerificationRule {
  id: string;
  defaultWeight: number;
  evaluate(context: RuleContext): RuleOutcome;
}

export interface PortalDefinition {
  portal: JobPortal;
  displayName: string;
  hostPatterns: RegExp[];
  pathPatterns: RegExp[];
  titlePatterns: RegExp[];
  headingPatterns: RegExp[];
  confirmationPatterns: RegExp[];
  referencePatterns: RegExp[];
  expectedSelectors: string[];
  applyButtonSelectors: string[];
  negativePatterns?: RegExp[];
  weightBonus?: number;
}

export interface PortalPlugin extends PortalDefinition {
  extractCompany(doc: Document, url: URL): string | null;
  extractJobTitle(doc: Document, url: URL): string | null;
  extractReference(doc: Document): string | null;
  canHandle(hostname: string): boolean;
}

// Legacy compatibility
export type ConfidenceLevel = 'VERIFIED' | 'VERY_LIKELY' | 'POSSIBLE' | 'NOT_VERIFIED';

export interface VerificationEntry {
  id: string;
  portal: JobPortal;
  company: string;
  jobTitle: string;
  url: string;
  pageTitle: string;
  verified: boolean;
  confidenceScore: number;
  matchedRules: string[];
  matchedKeywords: string[];
  timestamp: number;
  // v2 additions (optional for backward compat)
  score?: number;
  confidence?: VerificationConfidence;
  evidence?: VerificationEvidence;
  verificationHash?: string;
  version?: VerificationVersion;
  applicationReference?: string | null;
  reasons?: string[];
  fraudSignals?: string[];
}

import { JobPortal } from '@prisma/client';

export type VerificationConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type VerificationVersion = 'v2';

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
  verificationTimestamp: number; // epoch ms
  extensionVersion: string;
  https: boolean;
  pageLanguage?: string;
  timeOnPageMs?: number;
  userInteractionDetected?: boolean;
  historyManipulationDetected?: boolean;
  referrer?: string;
  // allow future extensibility
  [key: string]: any;
}

export interface RuleOutcome {
  ruleId: string;
  passed: boolean;
  scoreContribution: number;
  reasons: string[];
  fraudSignals?: string[];
  evidence?: Partial<VerificationEvidence>;
}

export interface VerificationResult {
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

export interface CanonicalizationOptions {
  sortKeys: boolean;
  normalizeWhitespace: boolean;
  normalizeCase: {
    hostname: boolean;
    pathname: boolean;
    title: boolean;
    headings: boolean;
    confirmationText: boolean;
  };
}

export interface PortalDefinition {
  portal: JobPortal;
  displayName: string;
  hostPatterns: RegExp[];
  pathPatterns: RegExp[]; // allowed confirmation paths
  titlePatterns: RegExp[];
  headingPatterns: RegExp[];
  confirmationPatterns: RegExp[];
  referencePatterns: RegExp[];
  expectedSelectors: string[];
  applyButtonSelectors: string[];
  negativePatterns?: RegExp[];
  weightBonus?: number;
}

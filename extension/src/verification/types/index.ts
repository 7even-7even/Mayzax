export type VerificationConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type VerificationVersion = 'v2' | 'v1.1';

export enum JobPortal {
  // Existing
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
  // New v1.1 Universal ATS
  RECRUITEE = 'RECRUITEE',
  ASHBY = 'ASHBY',
  TEAMTAILOR = 'TEAMTAILOR',
  SMARTRECRUITERS = 'SMARTRECRUITERS',
  BAMBOOHR = 'BAMBOOHR',
  JOBVITE = 'JOBVITE',
  PERSONIO = 'PERSONIO',
  TALEO = 'TALEO',
  SUCCESSFACTORS = 'SUCCESSFACTORS',
  ICIMS = 'ICIMS',
  JAZZHR = 'JAZZHR',
  BREEZYHR = 'BREEZYHR',
  COMEET = 'COMEET',
  FOUNTAIN = 'FOUNTAIN',
  PINPOINT = 'PINPOINT',
  RIPPLING = 'RIPPLING',
  WORKABLE = 'WORKABLE',
  WORKDAY = 'WORKDAY',
  ORACLE = 'ORACLE',
  APOLLO = 'APOLLO',
  DOVER = 'DOVER',
  FOUNDRY = 'FOUNDRY',
}

// ───────────────────────────
// Button Evidence
// ───────────────────────────

export interface DetectedButton {
  text: string;
  disabled: boolean;
  visible: boolean;
  type?: 'positive' | 'negative' | 'neutral';
}

export interface ButtonEvidence {
  positiveButtons: DetectedButton[]; // View Application, Track Application, Return Home, Browse Jobs, Dashboard, View Status
  negativeButtons: DetectedButton[]; // Apply Now, Submit Application, Continue Application, Start Application
  neutralButtons: DetectedButton[];
  hasPositive: boolean;
  hasNegative: boolean;
  positiveCount: number;
  negativeCount: number;
}

// ───────────────────────────
// DOM Fingerprints — Universal
// ───────────────────────────

export interface DomFingerprint {
  // Legacy
  hasConfirmationCard: boolean;
  hasSuccessBanner: boolean;
  expectedContainersFound: number;
  unexpectedApplyButtonPresent: boolean;
  totalExpected?: number;
  matchedSelectors?: string[];
  missingSelectors?: string[];

  // v1.1 Universal
  hasSuccessCard?: boolean;
  hasConfirmationBanner?: boolean;
  hasSuccessIcon?: boolean;
  hasProgressCompleted?: boolean;
  hasDisabledForm?: boolean;
  hasReadOnlySummary?: boolean;
  hasReceiptCard?: boolean;
  hasDownloadConfirmation?: boolean;
  hasPrintConfirmation?: boolean;
  hasConfirmationPanel?: boolean;
  hasReviewPage?: boolean;
  hasCompletedTimeline?: boolean;
  hasApplicationSummary?: boolean;
  hasProgressBar?: boolean;
  hasSuccessAnimation?: boolean;
  // Counts
  fingerprintScore?: number;
  matchedFingerprints?: string[];
}

export interface UrlEvidence {
  hasSuccessPath: boolean;
  matchedPattern?: string;
  path: string;
  search: string;
  fullPath: string;
  hasReferenceParam?: boolean;
}

export interface MetaEvidence {
  ogTitle?: string;
  description?: string;
  twitterTitle?: string;
  hasSuccess: boolean;
  matchedPhrases: string[];
}

export interface BreadcrumbEvidence {
  items: string[];
  hasSuccess: boolean;
  matchedPhrases: string[];
}

export interface StructuredDataEvidence {
  hasConfirmation: boolean;
  hasApplication: boolean;
  jsonLdRaw?: any;
  matchedTypes: string[];
}

export interface ReferenceEvidence {
  applicationId?: string | null;
  candidateId?: string | null;
  referenceNumber?: string | null;
  submissionNumber?: string | null;
  receiptNumber?: string | null;
  trackingNumber?: string | null;
  caseNumber?: string | null;
  requisitionId?: string | null;
  // Aggregated
  hasAnyReference: boolean;
  allReferences: string[];
  strongestReference?: string;
}

export interface TitleEvidence {
  hasSuccess: boolean;
  hasFailure: boolean;
  matchedPhrases: string[];
  failurePhrases: string[];
}

export interface HeadingEvidence {
  h1: string[];
  h2: string[];
  h3: string[];
  allHeadings: string[];
  hasSuccess: boolean;
  hasFailure: boolean;
  matchedSuccessPhrases: string[];
  matchedFailurePhrases: string[];
}

export interface BodyEvidence {
  hasSuccess: boolean;
  hasFailure: boolean;
  matchedSuccessPhrases: string[];
  matchedFailurePhrases: string[];
  textLength: number;
  confirmationText: string;
}

// ───────────────────────────
// Main Verification Evidence — Universal
// ───────────────────────────

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

  // v1.1 Universal Evidence — Evidence Aggregation Model
  urlEvidence?: UrlEvidence;
  titleEvidence?: TitleEvidence;
  headingEvidence?: HeadingEvidence;
  bodyEvidence?: BodyEvidence;
  metaEvidence?: MetaEvidence;
  breadcrumbEvidence?: BreadcrumbEvidence;
  structuredDataEvidence?: StructuredDataEvidence;
  buttonEvidence?: ButtonEvidence;
  referenceEvidence?: ReferenceEvidence;
  // Positive/Negative aggregation for logging
  positiveSignals?: string[];
  neutralSignals?: string[];
  negativeSignals?: string[];
  fraudSignalsDetailed?: string[];
  // Raw counts
  evidenceScoreBreakdown?: Record<string, number>;
  totalPositiveSignals?: number;

  submissionEvidence?: SubmissionEvidence;

  [key: string]: any;
}

export interface SubmissionEvidence {
  submitDetected: boolean;
  userClickedSubmit: boolean;
  requestObserved: boolean;
  requestMethod?: string;
  requestUrl?: string;
  responseObserved: boolean;
  responseStatus?: number;
  redirectDetected: boolean;
  redirectUrl?: string;
  confirmationDetected: boolean;
  confirmationText?: string;
  applicationReference?: string;
  formResetDetected: boolean;
  dashboardDetected: boolean;
  newApplicationDetected: boolean;
  updatedApplicationDetected: boolean;
  matchedJobTitle?: boolean;
  matchedCompany?: boolean;
  matchedJobUrl?: boolean;
  timestamp: number;
}


export interface RuleOutcome {
  ruleId: string;
  passed: boolean;
  scoreContribution: number;
  reasons: string[];
  fraudSignals?: string[];
  matchedKeywords?: string[];
  // v1.1 logging categories
  category?: 'positive' | 'neutral' | 'negative' | 'fraud';
  evidenceType?: string;
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
  // v1.1 improved logging
  positiveEvidence?: string[];
  neutralEvidence?: string[];
  weakNegativeEvidence?: string[];
  fraudAnalysis?: string[];
  evidenceBreakdown?: Record<string, number>;
}

export interface RuleContext {
  document: Document;
  url: URL;
  portalPlugin?: PortalPlugin;
  evidence?: Partial<VerificationEvidence>;
  normalizedEvidence?: VerificationEvidence; // v1.1: normalized evidence
}

export interface VerificationRule {
  id: string;
  defaultWeight: number;
  evaluate(context: RuleContext): RuleOutcome;
  // v1.1: evaluate normalized evidence instead of raw DOM
  evaluateEvidence?(evidence: VerificationEvidence, plugin?: PortalPlugin): RuleOutcome;
}

// ───────────────────────────
// Portal Plugin — Enhanced v1.1
// ───────────────────────────

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

  // Legacy optional
  negativePatterns?: RegExp[];
  weightBonus?: number;

  // v1.1 Enhanced — ATS Intelligence
  successPhrases?: RegExp[];              // Universal success vocabulary for this ATS
  failurePhrases?: RegExp[];              // Failure vocabulary
  confirmationSelectors?: string[];       // Confirmation containers
  applicationIdSelectors?: string[];      // Application ID locations
  candidateIdSelectors?: string[];        // Candidate ID locations
  receiptSelectors?: string[];            // Receipt card selectors
  successIconSelectors?: string[];        // Success icon selectors
  progressSelectors?: string[];           // Progress/completed timeline
  breadcrumbSelectors?: string[];         // Breadcrumb selectors
  metaSelectors?: string[];               // Meta tag selectors
  positiveButtonPatterns?: RegExp[];      // View Application, Track Application, etc.
  negativeButtonPatterns?: RegExp[];      // Apply Now, Submit Application, etc.
  domFingerprints?: {
    successCard?: string[];
    confirmationBanner?: string[];
    successIcon?: string[];
    progressCompleted?: string[];
    disabledForm?: string[];
    readOnlySummary?: string[];
    receiptCard?: string[];
    downloadConfirmation?: string[];
    printConfirmation?: string[];
    confirmationPanel?: string[];
    reviewPage?: string[];
    completedTimeline?: string[];
    applicationSummary?: string[];
    progressBar?: string[];
  };
  companySelectors?: string[];            // Company extraction selectors
  jobTitleSelectors?: string[];           // Job title extraction selectors
  // ATS-specific company extraction
  companyExtraction?: (doc: Document, url: URL) => string | null;
  jobTitleExtraction?: (doc: Document, url: URL) => string | null;
}

export interface PortalPlugin extends PortalDefinition {
  extractCompany(doc: Document, url: URL): string | null;
  extractJobTitle(doc: Document, url: URL): string | null;
  extractReference(doc: Document): string | null;
  canHandle(hostname: string): boolean;

  // v1.1 Enhanced methods
  getSuccessPhrases?(): RegExp[];
  getFailurePhrases?(): RegExp[];
  getConfirmationSelectors?(): string[];
  extractApplicationId?(doc: Document): string | null;
  extractCandidateId?(doc: Document): string | null;
  extractAllReferences?(doc: Document): ReferenceEvidence;

  // Journey Adapter Methods
  detectApplicationStart(context: any): boolean;
  observeForm(context: any): any;
  detectSubmission(context: any): any;
  detectConfirmation(context: any): any;
  extractApplicationIdentifiers(context: any): any;
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
  // v2 additions
  score?: number;
  confidence?: VerificationConfidence;
  evidence?: VerificationEvidence;
  verificationHash?: string;
  version?: VerificationVersion;
  applicationReference?: string | null;
  reasons?: string[];
  fraudSignals?: string[];
  // v1.1
  positiveEvidence?: string[];
  neutralEvidence?: string[];
  weakNegativeEvidence?: string[];
}


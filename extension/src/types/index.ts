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
  OTHER = 'OTHER'
}

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
}

export interface RuleResult {
  ruleName: string;
  passed: boolean;
  score: number;
  matchedKeywords?: string[];
}

export interface DetectionResult {
  success: boolean;
  confidenceScore: number;
  matchedRules: string[];
  matchedKeywords: string[];
}

export interface ExtractedMetadata {
  company: string;
  jobTitle: string;
  pageTitle: string;
  portal: JobPortal;
}

export interface VerifyUrlRequest {
  action: 'VERIFY_URL';
  url: string;
}

export interface VerifyUrlResponse {
  verified: boolean;
  confidenceScore: number;
  portal: JobPortal;
  company: string;
  jobTitle: string;
  pageTitle: string;
  timestamp: number;
  matchedRules: string[];
  matchedKeywords: string[];
}

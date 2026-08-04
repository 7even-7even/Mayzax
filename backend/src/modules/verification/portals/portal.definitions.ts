import { JobPortal } from '@prisma/client';
import { PortalDefinition } from '../types/verification.types';

/**
 * Strict portal definitions — hostname anchored regex prevents evil-*.com bypass
 * Path patterns are confirmation/success pages only
 */

export const SUPPORTED_PORTALS: PortalDefinition[] = [
  {
    portal: 'GREENHOUSE' as JobPortal,
    displayName: 'Greenhouse',
    hostPatterns: [
      /(?:^|\.)greenhouse\.io$/,
      /(?:^|\.)greenhouse\.com$/,
      /^boards\.greenhouse\.io$/,
    ],
    pathPatterns: [
      /\/confirmation/i,
      /\/applications?\/.*submitted/i,
      /\/thank.?you/i,
      /\/success/i,
    ],
    titlePatterns: [
      /application submitted/i,
      /thank you/i,
      /confirmation/i,
      /your application/i,
    ],
    headingPatterns: [
      /application submitted/i,
      /thank you for applying/i,
      /your application has been submitted/i,
      /application received/i,
      /success/i,
    ],
    confirmationPatterns: [
      /your application for .* has been submitted/i,
      /thank you for applying/i,
      /application submitted/i,
      /we have received your application/i,
    ],
    referencePatterns: [
      /application\s*(id|reference|number)\s*[:#]?\s*([A-Z0-9-]{6,})/i,
      /reference\s*number\s*[:#]?\s*([A-Z0-9-]+)/i,
    ],
    expectedSelectors: [
      '#application_confirmation',
      '.application-submitted',
      '.thank-you',
      '[class*=\"confirmation\"]',
    ],
    applyButtonSelectors: ['a[href*=\"apply\"]', 'button'],
    weightBonus: 5,
  },
  {
    portal: 'LEVER' as JobPortal,
    displayName: 'Lever',
    hostPatterns: [
      /(?:^|\.)lever\.co$/,
      /^jobs\.lever\.co$/,
      /^jobs\.leuco\.com$/,
    ],
    pathPatterns: [
      /\/applied/i,
      /\/application.*success/i,
      /\/confirmation/i,
      /\/thank.?you/i,
    ],
    titlePatterns: [
      /you have applied/i,
      /application submitted/i,
      /thank you/i,
    ],
    headingPatterns: [
      /you have applied/i,
      /application submitted/i,
      /thank you/i,
    ],
    confirmationPatterns: [
      /you have applied to/i,
      /application submitted/i,
      /thank you for applying/i,
    ],
    referencePatterns: [
      /reference\s*[:#]?\s*([A-Z0-9-]+)/i,
    ],
    expectedSelectors: [
      '.application-complete',
      '.posting-apply-success',
      '[class*=\"success\"]',
    ],
    applyButtonSelectors: ['button.posting-btn-submit'],
    weightBonus: 5,
  },
  {
    portal: 'LINKEDIN' as JobPortal,
    displayName: 'LinkedIn',
    hostPatterns: [
      /(?:^|\.)linkedin\.com$/,
    ],
    pathPatterns: [
      /\/jobs\/.*\/applied/i,
      /\/easy-apply/i,
      /\/application.*submitted/i,
      /\/confirmation/i,
    ],
    titlePatterns: [
      /application submitted/i,
      /your application was sent/i,
      /applied/i,
    ],
    headingPatterns: [
      /application submitted/i,
      /your application was sent to/i,
      /applied/i,
    ],
    confirmationPatterns: [
      /your application was sent/i,
      /application submitted/i,
      /you applied/i,
    ],
    referencePatterns: [],
    expectedSelectors: [
      '.artdeco-inline-feedback--success',
      '[data-test-modal*=\"success\"]',
      'h2[class*=\"success\"]',
    ],
    applyButtonSelectors: ['button[aria-label*=\"Apply\"]', 'button.jobs-apply-button'],
    weightBonus: 5,
  },
  {
    portal: 'INDEED' as JobPortal,
    displayName: 'Indeed',
    hostPatterns: [/(?:^|\.)indeed\.com$/, /(?:^|\.)indeed\.[a-z.]+$/],
    pathPatterns: [/\/applied/i, /\/application.*complete/i, /\/confirmation/i],
    titlePatterns: [/applied/i, /application submitted/i],
    headingPatterns: [/you applied/i, /application submitted/i],
    confirmationPatterns: [/you applied to/i, /application submitted/i],
    referencePatterns: [],
    expectedSelectors: ['[class*=\"applied\"]', '.jobsearch-IndeedApplyButton--applied'],
    applyButtonSelectors: ['button[aria-label*=\"Apply\"]'],
    weightBonus: 3,
  },
  {
    portal: 'COMPANY_WEBSITE' as JobPortal, // Workday mapped to COMPANY_WEBSITE (enum has no WORKDAY)
    displayName: 'Workday',
    hostPatterns: [
      /(?:^|\.)myworkdayjobs\.com$/,
      /(?:^|\.)myworkday\.com$/,
      /(?:^|\.)workday\.com$/,
    ],
    pathPatterns: [
      /\/confirmation/i,
      /\/submitted/i,
      /\/application.*complete/i,
      /\/thank.*you/i,
    ],
    titlePatterns: [
      /submission successful/i,
      /you have successfully submitted/i,
      /your application/i,
      /thank you/i,
    ],
    headingPatterns: [
      /you have successfully submitted/i,
      /application submitted/i,
      /submission successful/i,
      /thank you for applying/i,
    ],
    confirmationPatterns: [
      /you have successfully submitted/i,
      /your application has been submitted/i,
      /thank you for applying/i,
      /application.*submitted/i,
    ],
    referencePatterns: [
      /application\s*id\s*[:#]?\s*([A-Z0-9-]+)/i,
      /reference\s*number\s*[:#]?\s*([A-Z0-9-]+)/i,
      /submission\s*id\s*[:#]?\s*([A-Z0-9-]+)/i,
    ],
    expectedSelectors: [
      '[data-automation-id=\"confirmationPage\"]',
      '[data-automation-id=\"candidateApplicationConfirmation\"]',
      '[data-automation-id=\"applicationConfirmation\"]',
      'section[data-automation-id*=\"confirmation\"]',
    ],
    applyButtonSelectors: ['[data-automation-id*=\"apply\"]'],
    weightBonus: 10,
  },
  {
    portal: 'ZIPRECRUITER' as JobPortal,
    displayName: 'ZipRecruiter',
    hostPatterns: [/(?:^|\.)ziprecruiter\.com$/],
    pathPatterns: [/\/applied/i, /\/confirmation/i],
    titlePatterns: [/applied/i, /application sent/i],
    headingPatterns: [/application sent/i, /applied/i],
    confirmationPatterns: [/application sent/i, /you applied/i],
    referencePatterns: [],
    expectedSelectors: ['.job-applied', '[class*=\"applied\"]'],
    applyButtonSelectors: ['button.apply-button'],
    weightBonus: 3,
  },
  {
    portal: 'GLASSDOOR' as JobPortal,
    displayName: 'Glassdoor',
    hostPatterns: [/(?:^|\.)glassdoor\.com$/],
    pathPatterns: [/\/Job\/applied/i, /\/applied/i],
    titlePatterns: [/application submitted/i],
    headingPatterns: [/application submitted/i],
    confirmationPatterns: [/application submitted/i],
    referencePatterns: [],
    expectedSelectors: ['.appliedConfirm', '[data-test*=\"applied\"]'],
    applyButtonSelectors: ['button[data-test*=\"apply\"]'],
    weightBonus: 3,
  },
  {
    portal: 'CAREERBUILDER' as JobPortal,
    displayName: 'CareerBuilder',
    hostPatterns: [/(?:^|\.)careerbuilder\.com$/],
    pathPatterns: [/\/applied/i],
    titlePatterns: [/applied/i],
    headingPatterns: [/applied/i],
    confirmationPatterns: [],
    referencePatterns: [],
    expectedSelectors: ['[class*=\"applied\"]'],
    applyButtonSelectors: ['button.apply'],
    weightBonus: 2,
  },
  {
    portal: 'WELLFOUND' as JobPortal,
    displayName: 'Wellfound',
    hostPatterns: [/(?:^|\.)wellfound\.com$/, /(?:^|\.)angel\.co$/],
    pathPatterns: [/\/applied/i],
    titlePatterns: [/applied/i],
    headingPatterns: [/applied/i],
    confirmationPatterns: [],
    referencePatterns: [],
    expectedSelectors: [],
    applyButtonSelectors: [],
    weightBonus: 2,
  },
  {
    portal: 'OTHER' as JobPortal,
    displayName: 'Generic Career Site',
    hostPatterns: [
      // Generic career site patterns — but still validated for HTTPS and not IP/localhost
      /careers\./,
      /jobs\./,
    ],
    pathPatterns: [
      /\/confirmation/i,
      /\/thank.?you/i,
      /\/success/i,
      /\/submitted/i,
      /\/applied/i,
    ],
    titlePatterns: [
      /thank you/i,
      /application submitted/i,
      /application received/i,
      /success/i,
    ],
    headingPatterns: [
      /thank you/i,
      /application submitted/i,
      /application received/i,
    ],
    confirmationPatterns: [
      /thank you for applying/i,
      /your application has been submitted/i,
      /application received/i,
    ],
    referencePatterns: [
      /application\s*(id|reference)?\s*[:#]?\s*([A-Z0-9-]{4,})/i,
    ],
    expectedSelectors: [],
    applyButtonSelectors: ['button'],
    weightBonus: 0,
  },
];

// For strict validation: if hostname does NOT match any SUPPORTED_PORTALS hostPatterns, it's unsupported unless generic career detection passes
export const STRICT_SUPPORTED_PORTALS = SUPPORTED_PORTALS.filter(p => p.portal !== 'OTHER');

export const NEGATIVE_KEYWORDS = [
  /error/i,
  /failed/i,
  /submission failed/i,
  /validation failed/i,
  /required field/i,
  /resume missing/i,
  /draft/i,
  /incomplete/i,
  /cancelled/i,
  /unauthorized/i,
  /access denied/i,
  /session expired/i,
];

export const CONFIRMATION_KEYWORDS = [
  'application submitted',
  'application received',
  'application complete',
  'successfully applied',
  'thank you for applying',
  'your application has been submitted',
  'we have received your application',
  'submission successful',
  'you have successfully submitted',
];

import { BaseVerificationRule } from './BaseRule';
import { RuleContext, RuleOutcome, JobPortal } from '../types';
import { isBlockedHostname, isHttps, normalizeHostname } from '../utils/url';

export class DomainRule extends BaseVerificationRule {
  readonly id = 'DomainValidation';
  readonly defaultWeight = 10;

  // Strict allowlist of supported ATS host patterns — anchored to prevent evil-*.com bypass
  private static readonly SUPPORTED_HOST_PATTERNS: { portal: JobPortal; patterns: RegExp[] }[] = [
    { portal: JobPortal.GREENHOUSE, patterns: [/(?:^|\.)greenhouse\.io$/, /(?:^|\.)greenhouse\.com$/, /^boards\.greenhouse\.io$/] },
    { portal: JobPortal.LEVER, patterns: [/(?:^|\.)lever\.co$/, /^jobs\.lever\.co$/] },
    { portal: JobPortal.LINKEDIN, patterns: [/(?:^|\.)linkedin\.com$/] },
    { portal: JobPortal.INDEED, patterns: [/(?:^|\.)indeed\.com$/, /(?:^|\.)indeed\.[a-z.]+$/] },
    { portal: JobPortal.GLASSDOOR, patterns: [/(?:^|\.)glassdoor\.com$/] },
    { portal: JobPortal.ZIPRECRUITER, patterns: [/(?:^|\.)ziprecruiter\.com$/] },
    { portal: JobPortal.CAREERBUILDER, patterns: [/(?:^|\.)careerbuilder\.com$/] },
    { portal: JobPortal.WELLFOUND, patterns: [/(?:^|\.)wellfound\.com$/, /(?:^|\.)angel\.co$/] },
    { portal: JobPortal.NAUKRI, patterns: [/(?:^|\.)naukri\.com$/] },
    { portal: JobPortal.DICE, patterns: [/(?:^|\.)dice\.com$/] },
    { portal: JobPortal.MONSTER, patterns: [/(?:^|\.)monster\.com$/] },
    { portal: JobPortal.THE_MUSE, patterns: [/(?:^|\.)themuse\.com$/] },
    { portal: JobPortal.Y_COMBINATOR, patterns: [/(?:^|\.)ycombinator\.com$/, /(?:^|\.)workatastartup\.com$/] },
    { portal: JobPortal.JOBRIGHT, patterns: [/(?:^|\.)jobright\.ai$/, /(?:^|\.)jobright\.com$/] },
    { portal: JobPortal.SIMPLIFY, patterns: [/(?:^|\.)simplify\.jobs$/] },
    { portal: JobPortal.SIMPLYHIRED, patterns: [/(?:^|\.)simplyhired\.com$/] },
    { portal: JobPortal.HANDSHAKE, patterns: [/(?:^|\.)joinhandshake\.com$/, /(?:^|\.)handshake\.com$/] },
    // Workday mapped to COMPANY_WEBSITE but keep pattern
    { portal: JobPortal.COMPANY_WEBSITE, patterns: [/(?:^|\.)myworkdayjobs\.com$/, /(?:^|\.)myworkday\.com$/, /(?:^|\.)workday\.com$/] },
    { portal: JobPortal.COMPANY_WEBSITE, patterns: [/(?:^|\.)successfactors\.com$/, /(?:^|\.)sapsf\.com$/] },
    { portal: JobPortal.COMPANY_WEBSITE, patterns: [/(?:^|\.)oraclecloud\.com$/] },
    { portal: JobPortal.COMPANY_WEBSITE, patterns: [/(?:^|\.)taleo\.net$/] },
  ];

  evaluate(context: RuleContext): RuleOutcome {
    const { url, portalPlugin } = context;
    const reasons: string[] = [];
    const fraudSignals: string[] = [];

    // HTTPS check
    if (!isHttps(url)) {
      return this.createOutcome(false, 0, [`Insecure protocol: ${url.protocol} — HTTPS required`], {
        fraudSignals: ['INSECURE_PROTOCOL'],
      });
    }

    const hostname = normalizeHostname(url.hostname);
    const pathname = url.pathname;

    // Blocked hostname
    if (isBlockedHostname(hostname)) {
      return this.createOutcome(false, 0, [`Blocked hostname: ${hostname}`], {
        fraudSignals: ['BLOCKED_HOSTNAME'],
      });
    }

    // Check if portal plugin exists (detected by registry) — if so, trust its host validation but still verify path
    if (portalPlugin) {
      // Verify hostname matches plugin's hostPatterns (defense in depth)
      const hostMatches = portalPlugin.hostPatterns.some(pat => pat.test(hostname));
      if (!hostMatches) {
        fraudSignals.push('HOSTNAME_MISMATCH_PORTAL');
        reasons.push(`Hostname ${hostname} does not match expected patterns for ${portalPlugin.displayName}`);
        // Don't instant fail, but reduce score
        return this.createOutcome(true, 5, reasons, { fraudSignals });
      }

      reasons.push(`Domain validated: ${hostname} matches ${portalPlugin.displayName}`);

      // Path validation
      if (portalPlugin.pathPatterns.length > 0) {
        const pathMatches = portalPlugin.pathPatterns.some(pat => pat.test(pathname));
        if (!pathMatches) {
          reasons.push(`Path ${pathname} not in expected confirmation patterns for ${portalPlugin.displayName}, but hostname valid`);
          fraudSignals.push('UNEXPECTED_PATH_PATTERN');
        } else {
          reasons.push(`Path pattern validated for ${portalPlugin.displayName}: ${pathname}`);
        }
      }

      return this.createOutcome(true, this.defaultWeight, reasons, { fraudSignals });
    }

    // Fallback: check against supported list
    for (const entry of DomainRule.SUPPORTED_HOST_PATTERNS) {
      for (const pat of entry.patterns) {
        if (pat.test(hostname)) {
          reasons.push(`Domain ${hostname} matches supported portal ${entry.portal}`);
          return this.createOutcome(true, this.defaultWeight, reasons);
        }
      }
    }

    // Generic career site detection — allow but lower score
    if (hostname.includes('careers.') || hostname.includes('jobs.') || url.pathname.toLowerCase().includes('/careers') || url.pathname.toLowerCase().includes('/jobs')) {
      reasons.push(`Generic career domain validated: ${hostname}`);
      return this.createOutcome(true, this.defaultWeight, reasons);
    }

    // If we reach here, domain is generic but passes basic checks — allow with reduced score
    reasons.push(`Domain ${hostname} passes basic validation but is not in strict allowlist — generic portal`);
    return this.createOutcome(true, 5, reasons, { fraudSignals: ['GENERIC_DOMAIN'] });
  }
}

import { BaseVerificationRule } from './BaseRule';
import { RuleContext, RuleOutcome, JobPortal, VerificationEvidence, PortalPlugin } from '../types';
import { isBlockedHostname, isHttps, normalizeHostname } from '../utils/url';

export class DomainRule extends BaseVerificationRule {
  readonly id = 'DomainValidation';
  readonly defaultWeight = 10;

  private static readonly SUPPORTED_HOST_PATTERNS: { portal: JobPortal; patterns: RegExp[] }[] = [
    { portal: JobPortal.GREENHOUSE, patterns: [/(?:^|\.)greenhouse\.io$/, /(?:^|\.)greenhouse\.com$/, /^boards\.greenhouse\.io$/, /(?:^|\.)job-boards\.greenhouse\.io$/] },
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
    { portal: JobPortal.COMPANY_WEBSITE, patterns: [/(?:^|\.)myworkdayjobs\.com$/, /(?:^|\.)myworkday\.com$/, /(?:^|\.)workday\.com$/] },
    { portal: JobPortal.COMPANY_WEBSITE, patterns: [/(?:^|\.)successfactors\.com$/, /(?:^|\.)sapsf\.com$/] },
    { portal: JobPortal.COMPANY_WEBSITE, patterns: [/(?:^|\.)oraclecloud\.com$/] },
    { portal: JobPortal.COMPANY_WEBSITE, patterns: [/(?:^|\.)taleo\.net$/] },
    { portal: JobPortal.RECRUITEE, patterns: [/(?:^|\.)recruitee\.com$/] },
    { portal: JobPortal.ASHBY, patterns: [/(?:^|\.)ashbyhq\.com$/] },
    { portal: JobPortal.TEAMTAILOR, patterns: [/(?:^|\.)teamtailor\.com$/] },
    { portal: JobPortal.SMARTRECRUITERS, patterns: [/(?:^|\.)smartrecruiters\.com$/] },
    { portal: JobPortal.BAMBOOHR, patterns: [/(?:^|\.)bamboohr\.com$/] },
    { portal: JobPortal.JOBVITE, patterns: [/(?:^|\.)jobvite\.com$/] },
    { portal: JobPortal.PERSONIO, patterns: [/(?:^|\.)personio\.com$/, /(?:^|\.)personio\.de$/] },
    { portal: JobPortal.ICIMS, patterns: [/(?:^|\.)icims\.com$/] },
    { portal: JobPortal.JAZZHR, patterns: [/(?:^|\.)jazzhr\.com$/] },
    { portal: JobPortal.BREEZYHR, patterns: [/(?:^|\.)breezy\.hr$/] },
    { portal: JobPortal.COMEET, patterns: [/(?:^|\.)comeet\.co$/] },
    { portal: JobPortal.FOUNTAIN, patterns: [/(?:^|\.)fountain\.com$/] },
    { portal: JobPortal.PINPOINT, patterns: [/(?:^|\.)pinpointhq\.com$/] },
    { portal: JobPortal.RIPPLING, patterns: [/(?:^|\.)rippling\.com$/, /(?:^|\.)ats\.rippling\.com$/] },
    { portal: JobPortal.WORKABLE, patterns: [/(?:^|\.)workable\.com$/, /(?:^|\.)jobs\.workable\.com$/] },
  ];

  /**
   * v1.1 Evidence-driven evaluation — consumes normalized evidence
   * Start at 0, add positive, missing = 0, fraud only slight reduction
   */
  evaluateEvidence(evidence: VerificationEvidence, plugin?: PortalPlugin): RuleOutcome {
    const reasons: string[] = [];
    const fraudSignals: string[] = [];

    // HTTPS check — actual fraud, not missing evidence
    if (!evidence.https) {
      return this.evidenceOutcome(false, 0, [`Insecure protocol — HTTPS required`], 'fraud', {
        fraudSignals: ['INSECURE_PROTOCOL'],
      });
    }

    const hostname = normalizeHostname(evidence.hostname || '');
    const pathname = evidence.pathname || '';

    // Blocked hostname — actual fraud, instant 0
    if (isBlockedHostname(hostname)) {
      return this.evidenceOutcome(false, 0, [`Blocked hostname: ${hostname}`], 'fraud', {
        fraudSignals: ['BLOCKED_HOSTNAME'],
      });
    }

    // Portal plugin match — positive signal
    if (plugin) {
      const hostMatches = plugin.hostPatterns.some(pat => pat.test(hostname));
      if (hostMatches) {
        reasons.push(`✓ Domain validated: ${hostname} matches ${plugin.displayName}`);
        // Path validation — positive if matches, neutral if not (no penalty for missing)
        if (plugin.pathPatterns.length > 0) {
          const pathMatches = plugin.pathPatterns.some(pat => pat.test(pathname));
          if (pathMatches) {
            reasons.push(`✓ Path pattern validated for ${plugin.displayName}: ${pathname}`);
          } else {
            // Missing path pattern = neutral, not negative (per v1.1 philosophy)
            reasons.push(`• Path ${pathname} not in expected confirmation patterns for ${plugin.displayName}, but hostname valid — neutral`);
          }
        }
        return this.evidenceOutcome(true, this.defaultWeight, reasons, 'positive', { fraudSignals });
      } else {
        // Hostname mismatch but plugin exists — neutral, not failure (could be generic career site using same ATS)
        reasons.push(`• Hostname ${hostname} does not exactly match ${plugin.displayName} patterns — neutral, not penalty`);
        return this.evidenceOutcome(true, 5, reasons, 'neutral', { fraudSignals: ['HOSTNAME_MISMATCH_PORTAL'] });
      }
    }

    // Fallback: check against supported list — positive if matches
    for (const entry of DomainRule.SUPPORTED_HOST_PATTERNS) {
      for (const pat of entry.patterns) {
        if (pat.test(hostname)) {
          reasons.push(`✓ Domain ${hostname} matches supported portal ${entry.portal}`);
          return this.evidenceOutcome(true, this.defaultWeight, reasons, 'positive');
        }
      }
    }

    // Generic career site — positive but lower score
    if (hostname.includes('careers.') || hostname.includes('jobs.') || pathname.toLowerCase().includes('/careers') || pathname.toLowerCase().includes('/jobs')) {
      reasons.push(`✓ Generic career domain validated: ${hostname}`);
      return this.evidenceOutcome(true, 5, reasons, 'positive');
    }

    // Generic domain that passes basic checks — neutral, not penalty (avoid false negative)
    // Old logic gave 5 with GENERIC_DOMAIN fraud signal, new logic gives 2 positive for generic valid
    reasons.push(`• Domain ${hostname} passes basic validation — generic portal, weak positive`);
    return this.evidenceOutcome(true, 2, reasons, 'neutral');
  }

  evaluate(context: RuleContext): RuleOutcome {
    const { url, portalPlugin } = context;
    const reasons: string[] = [];
    const fraudSignals: string[] = [];

    if (!isHttps(url)) {
      return this.createOutcome(false, 0, [`Insecure protocol: ${url.protocol} — HTTPS required`], {
        fraudSignals: ['INSECURE_PROTOCOL'],
      });
    }

    const hostname = normalizeHostname(url.hostname);
    const pathname = url.pathname;

    if (isBlockedHostname(hostname)) {
      return this.createOutcome(false, 0, [`Blocked hostname: ${hostname}`], {
        fraudSignals: ['BLOCKED_HOSTNAME'],
      });
    }

    if (portalPlugin) {
      const hostMatches = portalPlugin.hostPatterns.some(pat => pat.test(hostname));
      if (!hostMatches) {
        fraudSignals.push('HOSTNAME_MISMATCH_PORTAL');
        reasons.push(`Hostname ${hostname} does not match expected patterns for ${portalPlugin.displayName}`);
        return this.createOutcome(true, 5, reasons, { fraudSignals });
      }

      reasons.push(`Domain validated: ${hostname} matches ${portalPlugin.displayName}`);

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

    for (const entry of DomainRule.SUPPORTED_HOST_PATTERNS) {
      for (const pat of entry.patterns) {
        if (pat.test(hostname)) {
          reasons.push(`Domain ${hostname} matches supported portal ${entry.portal}`);
          return this.createOutcome(true, this.defaultWeight, reasons);
        }
      }
    }

    if (hostname.includes('careers.') || hostname.includes('jobs.') || url.pathname.toLowerCase().includes('/careers') || url.pathname.toLowerCase().includes('/jobs')) {
      reasons.push(`Generic career domain validated: ${hostname}`);
      return this.createOutcome(true, this.defaultWeight, reasons);
    }

    reasons.push(`Domain ${hostname} passes basic validation but is not in strict allowlist — generic portal`);
    return this.createOutcome(true, 5, reasons, { fraudSignals: ['GENERIC_DOMAIN'] });
  }
}


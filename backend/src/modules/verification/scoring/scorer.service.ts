import { VerificationEvidence, RuleOutcome } from '../types/verification.types';
import { PortalRegistry } from '../portals/portal.registry';
import { NEGATIVE_KEYWORDS } from '../portals/portal.definitions';
import { getConfidenceFromScore } from './confidence';

/**
 * Server-side scoring — defense in depth, mirrors client rules
 * Produces same weighted scoring to detect client tampering
 */

export interface ScoringResult {
  score: number;
  maxScore: number;
  reasons: string[];
  fraudSignals: string[];
  outcomes: RuleOutcome[];
}

export class VerificationScorer {
  private portalRegistry: PortalRegistry;

  constructor() {
    this.portalRegistry = PortalRegistry.getInstance();
  }

  score(evidence: VerificationEvidence): ScoringResult {
    const outcomes: RuleOutcome[] = [];
    const reasons: string[] = [];
    const fraudSignals: string[] = [];
    let totalScore = 0;
    const maxScore = 100;

    // 1. Domain Validation (10) — instant reject if fails
    const domainOutcome = this.evaluateDomain(evidence);
    outcomes.push(domainOutcome);
    if (!domainOutcome.passed) {
      // Instant 0 if domain unsupported or insecure
      return {
        score: 0,
        maxScore,
        reasons: [...domainOutcome.reasons, 'Domain validation failed — unsupported or insecure'],
        fraudSignals: [...(domainOutcome.fraudSignals || []), 'UNSUPPORTED_DOMAIN_OR_INSECURE'],
        outcomes,
      };
    }
    totalScore += domainOutcome.scoreContribution;
    reasons.push(...domainOutcome.reasons);
    if (domainOutcome.fraudSignals) fraudSignals.push(...domainOutcome.fraudSignals);

    // 2. Page Title (15)
    const titleOutcome = this.evaluateTitle(evidence);
    outcomes.push(titleOutcome);
    totalScore += titleOutcome.scoreContribution;
    reasons.push(...titleOutcome.reasons);
    if (titleOutcome.fraudSignals) fraudSignals.push(...titleOutcome.fraudSignals);

    // 3. Heading (20)
    const headingOutcome = this.evaluateHeading(evidence);
    outcomes.push(headingOutcome);
    totalScore += headingOutcome.scoreContribution;
    reasons.push(...headingOutcome.reasons);

    // 4. Confirmation Body (20)
    const bodyOutcome = this.evaluateConfirmationBody(evidence);
    outcomes.push(bodyOutcome);
    totalScore += bodyOutcome.scoreContribution;
    reasons.push(...bodyOutcome.reasons);

    // 5. Application Reference (15)
    const refOutcome = this.evaluateReference(evidence);
    outcomes.push(refOutcome);
    totalScore += refOutcome.scoreContribution;
    reasons.push(...refOutcome.reasons);

    // 6. DOM Fingerprint (15)
    const fingerprintOutcome = this.evaluateFingerprint(evidence);
    outcomes.push(fingerprintOutcome);
    totalScore += fingerprintOutcome.scoreContribution;
    reasons.push(...fingerprintOutcome.reasons);

    // 7. Portal Compliance (5 + bonus)
    const portalOutcome = this.evaluatePortalCompliance(evidence);
    outcomes.push(portalOutcome);
    totalScore += portalOutcome.scoreContribution;
    reasons.push(...portalOutcome.reasons);

    // 8. Apply Button Check (penalty)
    const buttonOutcome = this.evaluateApplyButton(evidence);
    outcomes.push(buttonOutcome);
    totalScore += buttonOutcome.scoreContribution; // can be negative
    reasons.push(...buttonOutcome.reasons);
    if (buttonOutcome.fraudSignals) fraudSignals.push(...buttonOutcome.fraudSignals);

    // 9. Security signals
    if (evidence.historyManipulationDetected) {
      totalScore -= 10;
      fraudSignals.push('HISTORY_MANIPULATION_DETECTED');
      reasons.push('History manipulation detected — confidence reduced');
    }
    if (evidence.timeOnPageMs !== undefined && evidence.timeOnPageMs < 3000) {
      totalScore -= 5;
      fraudSignals.push('SHORT_TIME_ON_PAGE');
      reasons.push(`Short time on page (${evidence.timeOnPageMs}ms) suspicious`);
    }
    if (!evidence.userInteractionDetected) {
      // Don't penalize heavily, but note
      fraudSignals.push('NO_USER_INTERACTION_DETECTED');
    }

    // Cap score
    totalScore = Math.max(0, Math.min(totalScore, 100));

    // For OTHER portal, cap at 60 unless strong fingerprint + reference
    const portalDef = this.portalRegistry.detectPortal(evidence.hostname, evidence.pathname);
    if (!portalDef || portalDef.portal === 'OTHER') {
      if (totalScore > 60 && !evidence.applicationReference && evidence.domFingerprint.expectedContainersFound < 2) {
        totalScore = Math.min(totalScore, 60);
        reasons.push('Generic portal capped at 60 without strong evidence');
      }
    }

    return {
      score: totalScore,
      maxScore,
      reasons,
      fraudSignals,
      outcomes,
    };
  }

  private evaluateDomain(evidence: VerificationEvidence): RuleOutcome {
    const reasons: string[] = [];
    const fraudSignals: string[] = [];

    if (!evidence.https) {
      return {
        ruleId: 'DomainValidation',
        passed: false,
        scoreContribution: 0,
        reasons: ['Insecure protocol — HTTPS required'],
        fraudSignals: ['INSECURE_PROTOCOL'],
      };
    }

    const hostname = evidence.hostname?.toLowerCase() || '';
    if (!hostname || hostname.length < 4 || !hostname.includes('.')) {
      return {
        ruleId: 'DomainValidation',
        passed: false,
        scoreContribution: 0,
        reasons: [`Invalid hostname: ${hostname}`],
        fraudSignals: ['INVALID_HOSTNAME'],
      };
    }

    // IP or localhost
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || ['localhost', '127.0.0.1'].includes(hostname)) {
      return {
        ruleId: 'DomainValidation',
        passed: false,
        scoreContribution: 0,
        reasons: [`Blocked hostname: ${hostname}`],
        fraudSignals: ['BLOCKED_HOSTNAME'],
      };
    }

    // Check supported
    const isSupported = this.portalRegistry.isSupportedHostname(hostname);
    if (!isSupported) {
      return {
        ruleId: 'DomainValidation',
        passed: false,
        scoreContribution: 0,
        reasons: [`Unsupported domain: ${hostname}`],
        fraudSignals: ['UNSUPPORTED_DOMAIN'],
      };
    }

    const portalDef = this.portalRegistry.detectPortal(hostname, evidence.pathname);
    if (portalDef) {
      reasons.push(`Domain validated: ${hostname} matches ${portalDef.displayName}`);
      const pathCheck = this.portalRegistry.isPathAllowedForPortal(hostname, evidence.pathname);
      if (!pathCheck.allowed) {
        reasons.push(`Path ${evidence.pathname} not in expected confirmation patterns for ${portalDef.displayName} — but hostname valid`);
        // Don't fail, just note
        fraudSignals.push('UNEXPECTED_PATH_PATTERN');
      } else {
        reasons.push(`Path pattern validated for ${portalDef.displayName}: ${evidence.pathname}`);
      }
      return {
        ruleId: 'DomainValidation',
        passed: true,
        scoreContribution: 10,
        reasons,
        fraudSignals,
      };
    }

    // Generic career site — allow but lower confidence
    if (hostname.includes('careers.') || hostname.includes('jobs.') || /careers|jobs/i.test(evidence.pathname)) {
      reasons.push(`Generic career domain validated: ${hostname}`);
      return {
        ruleId: 'DomainValidation',
        passed: true,
        scoreContribution: 10,
        reasons,
      };
    }

    return {
      ruleId: 'DomainValidation',
      passed: true,
      scoreContribution: 5, // generic but valid
      reasons: [`Domain ${hostname} is generic but passes basic validation`],
    };
  }

  private evaluateTitle(evidence: VerificationEvidence): RuleOutcome {
    const title = (evidence.title || '').toLowerCase();
    const reasons: string[] = [];
    const fraudSignals: string[] = [];
    let score = 0;

    // Negative check
    for (const neg of NEGATIVE_KEYWORDS) {
      if (neg.test(title)) {
        return {
          ruleId: 'PageTitle',
          passed: false,
          scoreContribution: -20,
          reasons: [`Negative keyword in title: ${title} matches ${neg}`],
          fraudSignals: ['NEGATIVE_TITLE'],
        };
      }
    }

    const portalDef = this.portalRegistry.detectPortal(evidence.hostname, evidence.pathname);
    const patterns = portalDef ? portalDef.titlePatterns : [/thank you/i, /application submitted/i, /confirmation/i];

    for (const pat of patterns) {
      if (pat.test(title)) {
        score = 15;
        reasons.push(`Title matched pattern ${pat}: "${evidence.title}"`);
        break;
      }
    }

    if (score === 0) {
      // Fuzzy generic check
      if (/submitted|received|thank you|confirmation|success/i.test(title)) {
        score = 8;
        reasons.push(`Title contains generic success keyword: "${evidence.title}"`);
      } else {
        reasons.push(`Title does not match expected success patterns: "${evidence.title}"`);
      }
    }

    return {
      ruleId: 'PageTitle',
      passed: score > 0,
      scoreContribution: score,
      reasons,
      fraudSignals,
    };
  }

  private evaluateHeading(evidence: VerificationEvidence): RuleOutcome {
    const headings = evidence.headings || [];
    const reasons: string[] = [];
    let score = 0;

    // Negative check in headings
    for (const h of headings) {
      const lower = h.toLowerCase();
      for (const neg of NEGATIVE_KEYWORDS) {
        if (neg.test(lower)) {
          return {
            ruleId: 'Heading',
            passed: false,
            scoreContribution: -10,
            reasons: [`Negative keyword in heading: "${h}"`],
            fraudSignals: ['NEGATIVE_HEADING'],
          };
        }
      }
    }

    const portalDef = this.portalRegistry.detectPortal(evidence.hostname, evidence.pathname);
    const patterns = portalDef ? portalDef.headingPatterns : [/application submitted/i, /thank you/i];

    let matched = 0;
    for (const heading of headings) {
      for (const pat of patterns) {
        if (pat.test(heading)) {
          matched++;
          reasons.push(`Heading matched ${pat}: "${heading}"`);
          break;
        }
      }
    }

    if (matched >= 2) score = 20;
    else if (matched === 1) score = 15;
    else if (headings.some(h => /submitted|received|thank you|success/i.test(h))) {
      score = 10;
      reasons.push(`Headings contain generic success: ${headings.join(', ')}`);
    } else {
      reasons.push(`No heading matched expected patterns. Found: ${headings.join(' | ')}`);
    }

    return {
      ruleId: 'Heading',
      passed: score > 0,
      scoreContribution: score,
      reasons,
    };
  }

  private evaluateConfirmationBody(evidence: VerificationEvidence): RuleOutcome {
    const text = (evidence.confirmationText || '').toLowerCase();
    const reasons: string[] = [];
    let score = 0;

    if (!text || text.length < 10) {
      return {
        ruleId: 'ConfirmationBody',
        passed: false,
        scoreContribution: 0,
        reasons: ['Confirmation text empty or too short'],
      };
    }

    const portalDef = this.portalRegistry.detectPortal(evidence.hostname, evidence.pathname);
    const patterns = portalDef ? portalDef.confirmationPatterns : [/thank you for applying/i, /your application has been submitted/i];

    let matches = 0;
    for (const pat of patterns) {
      if (pat.test(text)) {
        matches++;
        reasons.push(`Confirmation body matched ${pat}`);
      }
    }

    // Need at least some semantic length
    if (text.length > 50) {
      if (matches >= 2) score = 20;
      else if (matches === 1) score = 15;
      else if (/submitted|received|thank you|success/i.test(text)) {
        score = 10;
        reasons.push('Body contains generic success keywords');
      }
    } else {
      reasons.push(`Confirmation text length suspiciously short: ${text.length} chars`);
    }

    // Check for single sentence reliance avoidance: must be >1 sentence or >20 chars and contain company/role?
    if (text.split('.').length < 2 && score > 0) {
      reasons.push('Confirmation body has limited sentences — partial credit');
      score = Math.min(score, 15);
    }

    return {
      ruleId: 'ConfirmationBody',
      passed: score > 0,
      scoreContribution: score,
      reasons,
    };
  }

  private evaluateReference(evidence: VerificationEvidence): RuleOutcome {
    const ref = evidence.applicationReference;
    const reasons: string[] = [];
    if (!ref) {
      return {
        ruleId: 'ApplicationReference',
        passed: false,
        scoreContribution: 0,
        reasons: ['No application reference found'],
      };
    }

    // Validate reference format: at least 6 chars alphanumeric + dash
    if (/^[A-Z0-9-]{6,}$/i.test(ref.trim())) {
      reasons.push(`Application reference found: ${ref}`);
      return {
        ruleId: 'ApplicationReference',
        passed: true,
        scoreContribution: 15,
        reasons,
      };
    }

    reasons.push(`Reference found but format weak: ${ref}`);
    return {
      ruleId: 'ApplicationReference',
      passed: true,
      scoreContribution: 8,
      reasons,
    };
  }

  private evaluateFingerprint(evidence: VerificationEvidence): RuleOutcome {
    const fp = evidence.domFingerprint;
    const reasons: string[] = [];
    let score = 0;

    if (!fp) {
      return {
        ruleId: 'DomFingerprint',
        passed: false,
        scoreContribution: 0,
        reasons: ['No DOM fingerprint provided'],
      };
    }

    if (fp.hasConfirmationCard) {
      score += 7;
      reasons.push('Confirmation card detected');
    }
    if (fp.hasSuccessBanner) {
      score += 5;
      reasons.push('Success banner detected');
    }
    if (fp.expectedContainersFound >= 2) {
      score += 8;
      reasons.push(`Expected containers found: ${fp.expectedContainersFound}`);
    } else if (fp.expectedContainersFound === 1) {
      score += 4;
      reasons.push('1 expected container found');
    }

    const capped = Math.min(score, 15);
    return {
      ruleId: 'DomFingerprint',
      passed: capped > 0,
      scoreContribution: capped,
      reasons,
    };
  }

  private evaluatePortalCompliance(evidence: VerificationEvidence): RuleOutcome {
    const portalDef = this.portalRegistry.detectPortal(evidence.hostname, evidence.pathname);
    const reasons: string[] = [];
    let score = 0;

    if (!portalDef) {
      return {
        ruleId: 'PortalCompliance',
        passed: false,
        scoreContribution: 0,
        reasons: ['No portal definition matched'],
      };
    }

    reasons.push(`Portal compliance for ${portalDef.displayName}`);
    score = 5;
    if (portalDef.weightBonus) {
      score += portalDef.weightBonus > 5 ? 5 : portalDef.weightBonus; // cap bonus
      reasons.push(`Portal bonus +${portalDef.weightBonus} for ${portalDef.displayName}`);
    }

    return {
      ruleId: 'PortalCompliance',
      passed: true,
      scoreContribution: Math.min(score, 10),
      reasons,
    };
  }

  private evaluateApplyButton(evidence: VerificationEvidence): RuleOutcome {
    const buttons = evidence.detectedButtons || [];
    const reasons: string[] = [];
    const fraudSignals: string[] = [];

    // Check if any apply button still visible and enabled
    const problematic = buttons.filter(b => /apply|submit application|continue application|quick apply/i.test(b.text) && b.visible && !b.disabled);

    if (problematic.length > 0) {
      reasons.push(`Apply button still visible and enabled: ${problematic.map(b => b.text).join(', ')} — reduces confidence`);
      fraudSignals.push('APPLY_BUTTON_STILL_ENABLED');
      return {
        ruleId: 'ApplyButton',
        passed: false,
        scoreContribution: -15,
        reasons,
        fraudSignals,
      };
    }

    const disabledApply = buttons.filter(b => /apply|submit/i.test(b.text) && b.disabled);
    if (disabledApply.length > 0) {
      reasons.push('Apply button present but disabled — neutral');
      return {
        ruleId: 'ApplyButton',
        passed: true,
        scoreContribution: 0,
        reasons,
      };
    }

    // If no apply button found at all, bonus
    if (buttons.length === 0 || !buttons.some(b => /apply/i.test(b.text))) {
      reasons.push('No Apply button found — likely on confirmation page');
      return {
        ruleId: 'ApplyButton',
        passed: true,
        scoreContribution: 5,
        reasons,
      };
    }

    return {
      ruleId: 'ApplyButton',
      passed: true,
      scoreContribution: 0,
      reasons: ['Apply button check neutral'],
    };
  }
}

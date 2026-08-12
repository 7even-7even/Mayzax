import { VerificationEvidence, RuleOutcome } from '../types/verification.types';
import { PortalRegistry } from '../portals/portal.registry';
import { getConfidenceFromScore } from './confidence';

/**
 * Server-side scoring — v1.1 Universal ATS Intelligence
 * Evidence Aggregation Model: Start at 0, add positive evidence
 * Missing evidence = 0 (no penalty), positive dominates, fraud only slight reduction
 * Minimizes false negatives — genuinely submitted applications almost never unverified
 */

export interface ScoringResult {
  score: number;
  maxScore: number;
  reasons: string[];
  fraudSignals: string[];
  outcomes: RuleOutcome[];
  positiveEvidence?: string[];
  neutralEvidence?: string[];
  weakNegativeEvidence?: string[];
  evidenceBreakdown?: Record<string, number>;
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
    const positiveEvidence: string[] = [];
    const neutralEvidence: string[] = [];
    const weakNegativeEvidence: string[] = [];
    const evidenceBreakdown: Record<string, number> = {};

    let totalScore = 0;
    const maxScore = 100;

    // ── URL Success Pattern — 15 pts ─────────────────────────────────────
    const urlHasSuccess = /\/applied|\/application-submitted|\/success|\/confirmation|\/thank-you|\/thankyou|\/completed|\/submitted|\/done|\/finish|\/complete|\/receipt|\/reference/i.test(evidence.pathname + (evidence as any).search || '');
    if (urlHasSuccess || /\/applied|\/confirmation|\/thank-you|\/success/i.test(evidence.pathname)) {
      totalScore += 15;
      evidenceBreakdown.url = 15;
      positiveEvidence.push(`✓ Success path: ${evidence.pathname}`);
      reasons.push(`URL success pattern in ${evidence.pathname}`);
    } else {
      evidenceBreakdown.url = 0;
      neutralEvidence.push(`• No success path in URL: ${evidence.pathname}`);
    }

    // ── Domain Validation — 10 pts, but missing = 0 not instant reject unless blocked ──
    const domainOutcome = this.evaluateDomain(evidence);
    outcomes.push(domainOutcome);
    if (domainOutcome.passed) {
      totalScore += domainOutcome.scoreContribution;
      evidenceBreakdown.domain = domainOutcome.scoreContribution;
      positiveEvidence.push(...domainOutcome.reasons.filter(r => r.includes('✓')));
      reasons.push(...domainOutcome.reasons);
    } else {
      // Only blocked/insecure is instant 0, generic is neutral
      if (domainOutcome.fraudSignals?.includes('BLOCKED_HOSTNAME') || domainOutcome.fraudSignals?.includes('INSECURE_PROTOCOL')) {
        return {
          score: 0,
          maxScore,
          reasons: [...domainOutcome.reasons, 'Domain validation failed — blocked or insecure'],
          fraudSignals: [...(domainOutcome.fraudSignals || []), 'UNSUPPORTED_DOMAIN_OR_INSECURE'],
          outcomes,
          positiveEvidence: [],
          neutralEvidence: domainOutcome.reasons,
          weakNegativeEvidence: [],
          evidenceBreakdown: { domain: 0 },
        };
      }
      evidenceBreakdown.domain = 0;
      neutralEvidence.push(...domainOutcome.reasons);
    }
    if (domainOutcome.fraudSignals) fraudSignals.push(...domainOutcome.fraudSignals);

    // ── Page Title — 15 pts, missing = 0 ─────────────────────────────────
    const titleOutcome = this.evaluateTitle(evidence);
    outcomes.push(titleOutcome);
    if (titleOutcome.scoreContribution > 0) {
      totalScore += titleOutcome.scoreContribution;
      evidenceBreakdown.title = titleOutcome.scoreContribution;
      positiveEvidence.push(...titleOutcome.reasons.filter(r => r.includes('✓')));
      reasons.push(...titleOutcome.reasons);
    } else {
      evidenceBreakdown.title = 0;
      neutralEvidence.push(...titleOutcome.reasons);
    }

    // ── Heading — 20 pts, missing = 0 ────────────────────────────────────
    const headingOutcome = this.evaluateHeading(evidence);
    outcomes.push(headingOutcome);
    if (headingOutcome.scoreContribution > 0) {
      totalScore += headingOutcome.scoreContribution;
      evidenceBreakdown.heading = headingOutcome.scoreContribution;
      positiveEvidence.push(...headingOutcome.reasons.filter(r => r.includes('✓')));
      reasons.push(...headingOutcome.reasons);
    } else {
      evidenceBreakdown.heading = 0;
      neutralEvidence.push(...headingOutcome.reasons);
    }

    // ── Confirmation Body — 20 pts, missing = 0 ──────────────────────────
    const bodyOutcome = this.evaluateConfirmationBody(evidence);
    outcomes.push(bodyOutcome);
    if (bodyOutcome.scoreContribution > 0) {
      totalScore += bodyOutcome.scoreContribution;
      evidenceBreakdown.body = bodyOutcome.scoreContribution;
      positiveEvidence.push(...bodyOutcome.reasons.filter(r => r.includes('✓')));
      reasons.push(...bodyOutcome.reasons);
    } else {
      evidenceBreakdown.body = 0;
      neutralEvidence.push(...bodyOutcome.reasons);
    }

    // ── Application Reference — 20 pts strongest ─────────────────────────
    const refOutcome = this.evaluateReference(evidence);
    outcomes.push(refOutcome);
    if (refOutcome.scoreContribution > 0) {
      totalScore += refOutcome.scoreContribution;
      evidenceBreakdown.reference = refOutcome.scoreContribution;
      positiveEvidence.push(...refOutcome.reasons.filter(r => r.includes('✓')));
      reasons.push(...refOutcome.reasons);
    } else {
      evidenceBreakdown.reference = 0;
      neutralEvidence.push(...refOutcome.reasons);
    }

    // ── DOM Fingerprint — up to 15 pts ───────────────────────────────────
    const fingerprintOutcome = this.evaluateFingerprint(evidence);
    outcomes.push(fingerprintOutcome);
    if (fingerprintOutcome.scoreContribution > 0) {
      totalScore += fingerprintOutcome.scoreContribution;
      evidenceBreakdown.domFingerprint = fingerprintOutcome.scoreContribution;
      positiveEvidence.push(...fingerprintOutcome.reasons.filter(r => r.includes('✓')));
      reasons.push(...fingerprintOutcome.reasons);
    } else {
      evidenceBreakdown.domFingerprint = 0;
      neutralEvidence.push(...fingerprintOutcome.reasons);
    }

    // ── Portal Compliance — 5 pts ────────────────────────────────────────
    const portalOutcome = this.evaluatePortalCompliance(evidence);
    outcomes.push(portalOutcome);
    if (portalOutcome.scoreContribution > 0) {
      totalScore += portalOutcome.scoreContribution;
      evidenceBreakdown.portalCompliance = portalOutcome.scoreContribution;
      positiveEvidence.push(...portalOutcome.reasons.filter(r => r.includes('✓')));
      reasons.push(...portalOutcome.reasons);
    } else {
      evidenceBreakdown.portalCompliance = 0;
      neutralEvidence.push(...portalOutcome.reasons);
    }

    // ── Apply Button — Very weak signal, not penalty ─────────────────────
    const buttonOutcome = this.evaluateApplyButton(evidence);
    outcomes.push(buttonOutcome);
    // Only add positive if bonus, negative is very weak -2 handled as weakNegative
    if (buttonOutcome.scoreContribution > 0) {
      totalScore += buttonOutcome.scoreContribution;
      evidenceBreakdown.positiveButtons = buttonOutcome.scoreContribution;
      positiveEvidence.push(...buttonOutcome.reasons.filter(r => r.includes('✓')));
    } else if (buttonOutcome.scoreContribution < 0) {
      // Apply button visible — very weak negative, only -2 if not many positives
      const positiveCount = positiveEvidence.length;
      if (positiveCount < 2) {
        totalScore += buttonOutcome.scoreContribution; // -2
        evidenceBreakdown.applyButton = buttonOutcome.scoreContribution;
        weakNegativeEvidence.push(...buttonOutcome.reasons);
      } else {
        // Many positives outweigh, neutral
        neutralEvidence.push(`• Apply button still visible but ${positiveCount} positive signals outweigh — weak neutral`);
        evidenceBreakdown.applyButton = 0;
      }
    } else {
      evidenceBreakdown.applyButton = 0;
      neutralEvidence.push(...buttonOutcome.reasons);
    }
    if (buttonOutcome.fraudSignals) fraudSignals.push(...buttonOutcome.fraudSignals);

    // ── Fraud Analysis — Minimal penalties, only slight reduction ────────
    if (evidence.historyManipulationDetected) {
      totalScore -= 5; // Keep -5 for actual fraud
      fraudSignals.push('HISTORY_MANIPULATION_DETECTED');
      reasons.push('History manipulation detected — slight reduction');
      weakNegativeEvidence.push('• History manipulation detected — possible spoofing');
    }
    if (evidence.timeOnPageMs !== undefined && evidence.timeOnPageMs < 1000) {
      totalScore -= 1; // Minimal from -5 to -1
      weakNegativeEvidence.push(`• Page viewed for only ${evidence.timeOnPageMs}ms — minimal influence`);
      if (evidence.timeOnPageMs < 500) {
        fraudSignals.push('VERY_SHORT_TIME_ON_PAGE');
      }
    }

    // Check for failure phrases in title/body — moderate penalty if found
    const allText = `${evidence.title || ''} ${evidence.headings?.join(' ') || ''} ${evidence.confirmationText || ''}`.toLowerCase();
    const failurePatterns = [/error/i, /failed/i, /submission failed/i, /validation failed/i];
    let failureCount = 0;
    for (const pat of failurePatterns) {
      if (pat.test(allText)) failureCount++;
    }
    if (failureCount === 1) {
      totalScore -= 10;
      fraudSignals.push('FAILURE_PHRASE_DETECTED');
      weakNegativeEvidence.push(`• Failure phrase detected — moderate reduction`);
    } else if (failureCount >= 2) {
      totalScore -= 30;
      fraudSignals.push('OVERWHELMING_FAILURE_PHRASES');
      weakNegativeEvidence.push(`• Multiple failure phrases (${failureCount}) — strong negative`);
    }

    totalScore = Math.max(0, Math.min(totalScore, 100));

    // Generic portal cap increased to 90 (from 60) since generic now smarter
    const portalDef = this.portalRegistry.detectPortal(evidence.hostname, evidence.pathname);
    if (!portalDef || portalDef.portal === 'OTHER') {
      if (totalScore > 90 && !evidence.applicationReference && evidence.domFingerprint.expectedContainersFound < 1) {
        if ((evidence.domFingerprint as any).fingerprintScore !== undefined && (evidence.domFingerprint as any).fingerprintScore < 2) {
          // Only cap if no strong evidence
          if (!evidence.applicationReference) {
            // Keep at 90, not 60, to reduce false negatives
          }
        }
      }
    }



    return {
      score: totalScore,
      maxScore,
      reasons,
      fraudSignals: [...new Set(fraudSignals)],
      outcomes,
      positiveEvidence,
      neutralEvidence,
      weakNegativeEvidence,
      evidenceBreakdown,
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

    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || ['localhost', '127.0.0.1'].includes(hostname)) {
      return {
        ruleId: 'DomainValidation',
        passed: false,
        scoreContribution: 0,
        reasons: [`Blocked hostname: ${hostname}`],
        fraudSignals: ['BLOCKED_HOSTNAME'],
      };
    }

    const isSupported = this.portalRegistry.isSupportedHostname(hostname);
    if (!isSupported) {
      return {
        ruleId: 'DomainValidation',
        passed: true,
        scoreContribution: 2,
        reasons: [`Domain ${hostname} generic but valid — weak positive`],
      };
    }

    const portalDef = this.portalRegistry.detectPortal(hostname, evidence.pathname);
    if (portalDef) {
      reasons.push(`✓ Domain validated: ${hostname} matches ${portalDef.displayName}`);
      const pathCheck = this.portalRegistry.isPathAllowedForPortal(hostname, evidence.pathname);
      if (!pathCheck.allowed) {
        reasons.push(`• Path ${evidence.pathname} not in expected confirmation patterns for ${portalDef.displayName}, but hostname valid — neutral`);
      } else {
        reasons.push(`✓ Path pattern validated for ${portalDef.displayName}: ${evidence.pathname}`);
      }
      return {
        ruleId: 'DomainValidation',
        passed: true,
        scoreContribution: 10,
        reasons,
        fraudSignals,
      };
    }

    if (hostname.includes('careers.') || hostname.includes('jobs.') || /careers|jobs/i.test(evidence.pathname)) {
      reasons.push(`✓ Generic career domain validated: ${hostname}`);
      return {
        ruleId: 'DomainValidation',
        passed: true,
        scoreContribution: 5,
        reasons,
      };
    }

    return {
      ruleId: 'DomainValidation',
      passed: true,
      scoreContribution: 2,
      reasons: [`• Domain ${hostname} generic but passes basic validation — weak positive`],
    };
  }

  private evaluateTitle(evidence: VerificationEvidence): RuleOutcome {
    const title = (evidence.title || '').toLowerCase();
    const reasons: string[] = [];

    if (!title) {
      return {
        ruleId: 'PageTitle',
        passed: false,
        scoreContribution: 0,
        reasons: ['• No title'],
      };
    }

    const portalDef = this.portalRegistry.detectPortal(evidence.hostname, evidence.pathname);
    const patterns = portalDef ? portalDef.titlePatterns : [/thank you/i, /application submitted/i, /confirmation/i, /success/i, /all done/i, /you're all set/i];

    for (const pat of patterns) {
      if (pat.test(title)) {
        reasons.push(`✓ Title matched pattern ${pat}: "${evidence.title}"`);
        return {
          ruleId: 'PageTitle',
          passed: true,
          scoreContribution: 15,
          reasons,
        };
      }
    }

    if (/submitted|received|thank you|confirmation|success|all done|you're all set|applied|complete/i.test(title)) {
      reasons.push(`✓ Title contains generic success keyword: "${evidence.title}" — partial`);
      return {
        ruleId: 'PageTitle',
        passed: true,
        scoreContribution: 8,
        reasons,
      };
    }

    return {
      ruleId: 'PageTitle',
      passed: false,
      scoreContribution: 0,
      reasons: [`• Title does not match success patterns: "${evidence.title.slice(0, 60)}"`],
    };
  }

  private evaluateHeading(evidence: VerificationEvidence): RuleOutcome {
    const headings = evidence.headings || [];
    const reasons: string[] = [];

    if (headings.length === 0) {
      return {
        ruleId: 'Heading',
        passed: false,
        scoreContribution: 0,
        reasons: ['• No headings found'],
      };
    }

    const portalDef = this.portalRegistry.detectPortal(evidence.hostname, evidence.pathname);
    const patterns = portalDef ? portalDef.headingPatterns : [/application submitted/i, /thank you/i, /all done/i, /you're all set/i];

    let matched = 0;
    for (const heading of headings) {
      for (const pat of patterns) {
        if (pat.test(heading)) {
          matched++;
          reasons.push(`✓ Heading matched ${pat}: "${heading}"`);
          break;
        }
      }
    }

    if (matched >= 2) {
      return { ruleId: 'Heading', passed: true, scoreContribution: 20, reasons };
    } else if (matched === 1) {
      return { ruleId: 'Heading', passed: true, scoreContribution: 15, reasons };
    } else if (headings.some(h => /submitted|received|thank you|success|all done|you're all set|applied/i.test(h))) {
      reasons.push(`✓ Headings contain generic success: ${headings.slice(0, 2).join(', ').slice(0, 80)}`);
      return { ruleId: 'Heading', passed: true, scoreContribution: 10, reasons };
    }

    return {
      ruleId: 'Heading',
      passed: false,
      scoreContribution: 0,
      reasons: [`• No heading matched success patterns. Found: ${headings.slice(0, 2).join(' | ').slice(0, 60) || 'none'}`],
    };
  }

  private evaluateConfirmationBody(evidence: VerificationEvidence): RuleOutcome {
    const text = (evidence.confirmationText || '').toLowerCase();
    const reasons: string[] = [];

    if (!text || text.length < 10) {
      return {
        ruleId: 'ConfirmationBody',
        passed: false,
        scoreContribution: 0,
        reasons: ['• Confirmation text empty or too short'],
      };
    }

    const portalDef = this.portalRegistry.detectPortal(evidence.hostname, evidence.pathname);
    const patterns = portalDef ? portalDef.confirmationPatterns : [/thank you for applying/i, /your application has been submitted/i, /all done/i, /you're all set/i];

    let matches = 0;
    for (const pat of patterns) {
      if (pat.test(text)) {
        matches++;
        reasons.push(`✓ Confirmation body matched ${pat}`);
      }
    }

    if (text.length > 20) {
      if (matches >= 2) {
        return { ruleId: 'ConfirmationBody', passed: true, scoreContribution: 20, reasons };
      } else if (matches === 1) {
        return { ruleId: 'ConfirmationBody', passed: true, scoreContribution: 15, reasons };
      } else if (/submitted|received|thank you|success|all done|you're all set|we have received|we will review|reference number|we appreciate/i.test(text)) {
        reasons.push('✓ Body contains generic success keywords');
        return { ruleId: 'ConfirmationBody', passed: true, scoreContribution: 10, reasons };
      }
    }

    return {
      ruleId: 'ConfirmationBody',
      passed: false,
      scoreContribution: 0,
      reasons: [`• Confirmation body no success pattern, length ${text.length}`],
    };
  }

  private evaluateReference(evidence: VerificationEvidence): RuleOutcome {
    const ref = evidence.applicationReference || (evidence as any).referenceEvidence?.strongestReference;
    const reasons: string[] = [];
    if (!ref) {
      return {
        ruleId: 'ApplicationReference',
        passed: false,
        scoreContribution: 0,
        reasons: ['• No application reference found'],
      };
    }

    if (/^[A-Z0-9-]{4,}$/i.test(ref.trim())) {
      reasons.push(`✓ Application reference found: ${ref} — strongest positive`);
      return {
        ruleId: 'ApplicationReference',
        passed: true,
        scoreContribution: 20,
        reasons,
      };
    }

    reasons.push(`✓ Reference found but format weak: ${ref} — partial`);
    return {
      ruleId: 'ApplicationReference',
      passed: true,
      scoreContribution: 10,
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
        reasons: ['• No DOM fingerprint provided'],
      };
    }

    const anyFingerprint = (fp as any).fingerprintScore || 0;
    if (anyFingerprint > 0) {
      score = Math.min(anyFingerprint, 15);
      reasons.push(`✓ Success DOM fingerprints: score ${anyFingerprint}`);
    } else {
      if (fp.hasConfirmationCard) {
        score += 7;
        reasons.push('✓ Confirmation card detected');
      }
      if (fp.hasSuccessBanner) {
        score += 5;
        reasons.push('✓ Success banner detected');
      }
      if ((fp as any).hasSuccessIcon) {
        score += 3;
        reasons.push('✓ Success icon detected');
      }
      if ((fp as any).hasReceiptCard) {
        score += 5;
        reasons.push('✓ Receipt card detected');
      }
      if (fp.expectedContainersFound >= 1) {
        score += 4;
        reasons.push(`✓ Expected containers found: ${fp.expectedContainersFound}`);
      }
    }

    if (score === 0) {
      return {
        ruleId: 'DomFingerprint',
        passed: false,
        scoreContribution: 0,
        reasons: ['• No success DOM fingerprints'],
      };
    }

    return {
      ruleId: 'DomFingerprint',
      passed: true,
      scoreContribution: Math.min(score, 15),
      reasons,
    };
  }

  private evaluatePortalCompliance(evidence: VerificationEvidence): RuleOutcome {
    const portalDef = this.portalRegistry.detectPortal(evidence.hostname, evidence.pathname);
    const reasons: string[] = [];

    if (!portalDef) {
      return {
        ruleId: 'PortalCompliance',
        passed: false,
        scoreContribution: 0,
        reasons: ['• No portal definition matched'],
      };
    }

    reasons.push(`✓ Portal compliance for ${portalDef.displayName}`);
    let score = 5;
    if (portalDef.weightBonus) {
      score += Math.min(portalDef.weightBonus, 5);
      reasons.push(`✓ Portal bonus +${Math.min(portalDef.weightBonus, 5)} for ${portalDef.displayName}`);
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

    const problematic = buttons.filter(b => /apply|submit application|continue application|quick apply/i.test(b.text) && b.visible && !b.disabled);

    if (problematic.length > 0) {
      // Very weak negative per v1.1 spec — don't auto-penalize, many ATS show other jobs
      reasons.push(`• Apply button still visible: ${problematic.map(b => b.text).join(', ')} — very weak negative`);
      return {
        ruleId: 'ApplyButton',
        passed: true,
        scoreContribution: -2,
        reasons,
        fraudSignals: ['APPLY_BUTTON_STILL_VISIBLE_WEAK'],
      };
    }

    if (buttons.length === 0 || !buttons.some(b => /apply/i.test(b.text))) {
      reasons.push('✓ No Apply button found — likely confirmation page — weak positive');
      return {
        ruleId: 'ApplyButton',
        passed: true,
        scoreContribution: 2,
        reasons,
      };
    }

    return {
      ruleId: 'ApplyButton',
      passed: true,
      scoreContribution: 0,
      reasons: ['• Apply button check neutral'],
    };
  }
}

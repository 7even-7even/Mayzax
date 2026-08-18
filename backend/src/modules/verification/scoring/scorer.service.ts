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

    // Use synchronized scoring weights matching EngineConfig.ts (v1.3.0)
    const weights = {
      UrlSuccessPattern: 20,
      Domain: 15,
      PageTitle: 20,
      Heading: 20,
      ConfirmationBody: 20,
      ApplicationReference: 10,
      DomFingerprint: 20,
      PortalCompliance: 10,
      MetaTags: 5,
      Breadcrumbs: 5,
      JsonLd: 5,
      PositiveButtons: 10,
      CompanyExtracted: 5,
      JobTitleExtracted: 5,
      FormDisabled: 10,
    };

    // ── URL Success Pattern — 15 pts ─────────────────────────────────────
    if (evidence.urlEvidence?.hasSuccessPath) {
      totalScore += weights.UrlSuccessPattern;
      evidenceBreakdown.url = weights.UrlSuccessPattern;
      positiveEvidence.push(`✓ Success path: ${evidence.urlEvidence.matchedPattern} in ${evidence.urlEvidence.fullPath}`);
      reasons.push(`URL success pattern: ${evidence.urlEvidence.matchedPattern}`);
    } else {
      evidenceBreakdown.url = 0;
      neutralEvidence.push(`• No success path in URL: ${evidence.urlEvidence?.fullPath || evidence.pathname}`);
    }

    // ── Domain / Hostname Known ATS — 5 pts ─────────────────────────────
    if (evidence.hostname) {
      const isKnownATS = evidence.portal !== 'OTHER' && evidence.portal !== 'COMPANY_WEBSITE' && evidence.portal !== 'CAREER_SITE';
      if (isKnownATS) {
        totalScore += weights.Domain;
        evidenceBreakdown.domain = weights.Domain;
        positiveEvidence.push(`✓ Known ATS hostname: ${evidence.hostname} matches ${evidence.portal}`);
        reasons.push(`Domain validated: ${evidence.hostname} matches ${evidence.portal}`);
      } else if (evidence.hostname.includes('careers.') || evidence.hostname.includes('jobs.') || evidence.pathname.includes('/careers') || evidence.pathname.includes('/jobs')) {
        totalScore += 5;
        evidenceBreakdown.domain = 5;
        positiveEvidence.push(`✓ Career domain: ${evidence.hostname}`);
        reasons.push(`Career domain: ${evidence.hostname}`);
      } else {
        evidenceBreakdown.domain = 0;
        neutralEvidence.push(`• Generic domain: ${evidence.hostname}`);
      }
    }

    // ── Page Title Success — 15 pts ──────────────────────────────────────
    if (evidence.titleEvidence?.hasSuccess) {
      totalScore += weights.PageTitle;
      evidenceBreakdown.title = weights.PageTitle;
      positiveEvidence.push(`✓ Confirmation title: "${evidence.title.slice(0, 80)}" — ${evidence.titleEvidence.matchedPhrases.slice(0, 2).join(', ')}`);
      reasons.push(`Title matched: ${evidence.titleEvidence.matchedPhrases.slice(0, 2).join(', ')}`);
    } else if (evidence.title) {
      const titleLower = evidence.title.toLowerCase();
      if (/thank you|success|submitted|confirmation|applied|all done|you're all set|you are all set/i.test(titleLower)) {
        totalScore += 10;
        evidenceBreakdown.title = 10;
        positiveEvidence.push(`✓ Title contains success keyword: "${evidence.title.slice(0, 80)}"`);
        reasons.push(`Title contains generic success keyword`);
      } else {
        evidenceBreakdown.title = 0;
        neutralEvidence.push(`• No success phrase in title: "${evidence.title.slice(0, 60)}"`);
      }
    } else {
      evidenceBreakdown.title = 0;
      neutralEvidence.push(`• No title`);
    }

    // ── Heading Success (H1/H2/H3) — 20 pts ──────────────────────────────
    if (evidence.headingEvidence?.hasSuccess) {
      const count = evidence.headingEvidence.matchedSuccessPhrases.length;
      const finalWeight = count >= 2 ? weights.Heading : Math.max(10, weights.Heading - 5);
      totalScore += finalWeight;
      evidenceBreakdown.heading = finalWeight;
      positiveEvidence.push(`✓ Confirmation heading: ${evidence.headingEvidence.matchedSuccessPhrases.slice(0, 2).join(', ')} — "${evidence.headingEvidence.allHeadings.slice(0, 2).join(' | ').slice(0, 80)}"`);
      reasons.push(`Heading matched: ${evidence.headingEvidence.matchedSuccessPhrases.slice(0, 2).join(', ')}`);
    } else if (evidence.headings && evidence.headings.length > 0) {
      const headingText = evidence.headings.join(' ').toLowerCase();
      if (/thank you|success|submitted|confirmation|applied|all done|you're all set/i.test(headingText)) {
        totalScore += 10;
        evidenceBreakdown.heading = 10;
        positiveEvidence.push(`✓ Headings contain generic success: ${evidence.headings.slice(0, 2).join(' | ').slice(0, 80)}`);
        reasons.push(`Headings contain generic success keywords`);
      } else {
        evidenceBreakdown.heading = 0;
        neutralEvidence.push(`• No success heading, found: ${evidence.headings.slice(0, 2).join(' | ').slice(0, 60) || 'none'}`);
      }
    } else {
      evidenceBreakdown.heading = 0;
      neutralEvidence.push(`• No headings found`);
    }

    // ── Confirmation Body — 15 pts ───────────────────────────────────────
    if (evidence.bodyEvidence?.hasSuccess) {
      const count = evidence.bodyEvidence.matchedSuccessPhrases.length;
      const finalWeight = count >= 2 ? weights.ConfirmationBody : 15;
      totalScore += finalWeight;
      evidenceBreakdown.body = finalWeight;
      positiveEvidence.push(`✓ Confirmation body: ${evidence.bodyEvidence.matchedSuccessPhrases.slice(0, 2).join(', ')} — "${evidence.bodyEvidence.confirmationText.slice(0, 100)}..."`);
      reasons.push(`Body matched: ${evidence.bodyEvidence.matchedSuccessPhrases.slice(0, 2).join(', ')}`);
    } else if (evidence.confirmationText && evidence.confirmationText.length > 20) {
      if (/thank you|application received|submitted|success|confirmation|all done|you're all set|we have received|we will review|reference number|we appreciate/i.test(evidence.confirmationText.toLowerCase())) {
        totalScore += 10;
        evidenceBreakdown.body = 10;
        positiveEvidence.push(`✓ Body contains generic success keywords — "${evidence.confirmationText.slice(0, 100)}..."`);
        reasons.push(`Body contains generic success keywords`);
      } else {
        evidenceBreakdown.body = 0;
        neutralEvidence.push(`• No confirmation body match, length: ${evidence.confirmationText.length}`);
      }
    } else {
      evidenceBreakdown.body = 0;
      neutralEvidence.push(`• No confirmation body`);
    }

    // ── Meta Tags — 5 pts ────────────────────────────────────────────────
    if (evidence.metaEvidence?.hasSuccess) {
      totalScore += weights.MetaTags;
      evidenceBreakdown.meta = weights.MetaTags;
      positiveEvidence.push(`✓ Meta tags: ${evidence.metaEvidence.matchedPhrases.slice(0, 2).join(', ')}`);
      reasons.push(`Meta tags matched: ${evidence.metaEvidence.matchedPhrases.slice(0, 2).join(', ')}`);
    } else {
      evidenceBreakdown.meta = 0;
      neutralEvidence.push(`• No success in meta tags`);
    }

    // ── Breadcrumbs — 5 pts ──────────────────────────────────────────────
    if (evidence.breadcrumbEvidence?.hasSuccess) {
      totalScore += weights.Breadcrumbs;
      evidenceBreakdown.breadcrumbs = weights.Breadcrumbs;
      positiveEvidence.push(`✓ Breadcrumbs: ${evidence.breadcrumbEvidence.matchedPhrases.slice(0, 2).join(', ')}`);
      reasons.push(`Breadcrumbs matched`);
    } else {
      evidenceBreakdown.breadcrumbs = 0;
      neutralEvidence.push(`• No success in breadcrumbs`);
    }

    // ── JSON-LD Structured Data — 5 pts ──────────────────────────────────
    if (evidence.structuredDataEvidence?.hasConfirmation) {
      totalScore += weights.JsonLd;
      evidenceBreakdown.jsonLd = weights.JsonLd;
      positiveEvidence.push(`✓ Structured data: ${evidence.structuredDataEvidence.matchedTypes.slice(0, 2).join(', ')}`);
      reasons.push(`Structured data indicates confirmation`);
    } else {
      evidenceBreakdown.jsonLd = 0;
      neutralEvidence.push(`• No structured data confirmation`);
    }

    // ── DOM Fingerprints — up to 20 pts ──────────────────────────────────
    const domScore = evidence.domFingerprint?.fingerprintScore || 0;
    const hasFingerprint = domScore > 0 || evidence.domFingerprint?.hasConfirmationCard || evidence.domFingerprint?.hasSuccessBanner;
    if (hasFingerprint) {
      const weight = Math.min(domScore || 10, weights.DomFingerprint);
      totalScore += weight;
      evidenceBreakdown.domFingerprint = weight;
      const matched = evidence.domFingerprint.matchedFingerprints?.slice(0, 3).join(', ') || 'success card/banner';
      positiveEvidence.push(`✓ Success DOM: ${matched} (score ${domScore || weight})`);
      reasons.push(`DOM fingerprint: ${matched}`);
    } else {
      evidenceBreakdown.domFingerprint = 0;
      neutralEvidence.push(`• No success DOM fingerprints`);
    }

    // ── Positive Buttons — 10 pts ─────────────────────────────────────────
    if (evidence.buttonEvidence?.hasPositive) {
      totalScore += weights.PositiveButtons;
      evidenceBreakdown.positiveButtons = weights.PositiveButtons;
      positiveEvidence.push(`✓ Positive buttons: ${evidence.buttonEvidence.positiveButtons.map((b: any) => b.text).slice(0, 3).join(', ')}`);
      reasons.push(`Positive buttons: ${evidence.buttonEvidence.positiveButtons.map((b: any) => b.text).slice(0, 2).join(', ')}`);
    } else {
      evidenceBreakdown.positiveButtons = 0;
      neutralEvidence.push(`• No positive buttons (View Application, Dashboard, etc.)`);
    }

    // ── Apply Button Check — Bonus 2 pts if absent ───────────────────────
    if (evidence.buttonEvidence?.hasNegative) {
      neutralEvidence.push(`• Apply button still visible: ${evidence.buttonEvidence.negativeButtons.map((b: any) => b.text).slice(0, 2).join(', ')} — weak signal`);
      evidenceBreakdown.applyButton = 0;
    } else {
      evidenceBreakdown.applyButton = 0;
      if (evidence.buttonEvidence && !evidence.buttonEvidence.hasNegative) {
        totalScore += 2;
        evidenceBreakdown.applyAbsentBonus = 2;
        positiveEvidence.push(`✓ No Apply button — likely confirmation page`);
      }
    }

    // ── Application Reference — 10 pts strongest ─────────────────────────
    if (evidence.referenceEvidence?.hasAnyReference) {
      totalScore += weights.ApplicationReference;
      evidenceBreakdown.reference = weights.ApplicationReference;
      positiveEvidence.push(`✓ Reference ID: ${evidence.referenceEvidence.strongestReference} (${evidence.referenceEvidence.allReferences.length} found) — strongest positive`);
      reasons.push(`Reference found: ${evidence.referenceEvidence.strongestReference}`);
    } else if (evidence.applicationReference) {
      totalScore += weights.ApplicationReference;
      evidenceBreakdown.reference = weights.ApplicationReference;
      positiveEvidence.push(`✓ Reference ID: ${evidence.applicationReference} — strongest positive`);
      reasons.push(`Reference found: ${evidence.applicationReference}`);
    } else {
      evidenceBreakdown.reference = 0;
      neutralEvidence.push(`• No reference ID`);
    }

    // ── Portal Compliance — 5 pts ────────────────────────────────────────
    if (evidence.portal && evidence.portal !== 'OTHER') {
      totalScore += weights.PortalCompliance;
      evidenceBreakdown.portalCompliance = weights.PortalCompliance;
      positiveEvidence.push(`✓ Portal compliance: ${evidence.portal}`);
      reasons.push(`Portal compliance: ${evidence.portal}`);
    } else {
      evidenceBreakdown.portalCompliance = 0;
      neutralEvidence.push(`• Generic portal: ${evidence.portal}`);
    }

    // ── Form Disabled/Read-only — 10 pts ──────────────────────────────────
    if (evidence.domFingerprint?.hasDisabledForm || evidence.domFingerprint?.hasReadOnlySummary) {
      totalScore += weights.FormDisabled;
      evidenceBreakdown.formDisabled = weights.FormDisabled;
      positiveEvidence.push(`✓ Form disabled/read-only — indicates completion`);
      reasons.push(`Form disabled/read-only`);
    } else {
      evidenceBreakdown.formDisabled = 0;
    }

    // ── Post-Submission Evidence ─────────────────────────────────────────
    if (evidence.submissionEvidence) {
      const sub = evidence.submissionEvidence;
      let subScore = 0;

      if (sub.newApplicationDetected || sub.updatedApplicationDetected) {
        subScore += 40;
        positiveEvidence.push(`✓ Post-submission dashboard application matched`);
        reasons.push(`Post-submission dashboard application matched`);
      } else if (sub.applicationReference) {
        subScore += 30;
        positiveEvidence.push(`✓ Post-submission reference ID captured: ${sub.applicationReference}`);
        reasons.push(`Post-submission reference ID captured`);
      } else if (sub.responseStatus && sub.responseStatus >= 200 && sub.responseStatus < 300) {
        subScore += 25;
        positiveEvidence.push(`✓ Successful post-submission network response observed`);
        reasons.push(`Successful post-submission network response observed`);
      }

      if (sub.confirmationDetected) {
        subScore += 20;
        positiveEvidence.push(`✓ Post-submission success message/toast observed`);
        reasons.push(`Post-submission success message/toast observed`);
      }
      if (sub.formResetDetected) {
        subScore += 15;
        positiveEvidence.push(`✓ Post-submission form reset detected`);
        reasons.push(`Post-submission form reset detected`);
      }
      if (sub.redirectDetected && sub.dashboardDetected) {
        subScore += 15;
        positiveEvidence.push(`✓ Post-submission redirect to dashboard observed`);
        reasons.push(`Post-submission redirect to dashboard observed`);
      }

      if (sub.submitDetected && !sub.responseStatus) {
        subScore += 5;
        positiveEvidence.push(`✓ Post-submission submit action detected`);
      }

      totalScore += subScore;
      evidenceBreakdown.submissionEvidence = subScore;
    }

    // ── Fraud Analysis — Minimal penalties, only slight reduction ────────
    if (evidence.historyManipulationDetected) {
      totalScore -= 5;
      fraudSignals.push('HISTORY_MANIPULATION_DETECTED');
      reasons.push('History manipulation detected — slight reduction');
      weakNegativeEvidence.push('• History manipulation detected — possible spoofing');
    }
    if (evidence.timeOnPageMs !== undefined && evidence.timeOnPageMs < 1000) {
      totalScore -= 1;
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

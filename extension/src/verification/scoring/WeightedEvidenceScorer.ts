/**
 * Weighted Evidence Scorer — v1.1 Universal ATS Intelligence
 * Philosophy: Start at 0, add positive evidence, missing evidence = 0 (no penalty)
 * Positive evidence dominates, fraud only slightly reduces unless overwhelming
 * Goal: Minimize false negatives — genuinely submitted applications almost never unverified
 */

import { VerificationEvidence } from '../types';
import { getConfidenceFromScore } from './ConfidenceMapper';
import { SCORING_WEIGHTS, THRESHOLDS, EVIDENCE_THRESHOLDS } from '../engine/EngineConfig';

export interface EvidenceScoreResult {
  score: number;
  maxScore: number;
  reasons: string[];
  positiveEvidence: string[];
  neutralEvidence: string[];
  weakNegativeEvidence: string[];
  evidenceBreakdown: Record<string, number>;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  verified: boolean;
  totalPositiveSignals: number;
}

export class WeightedEvidenceScorer {
  /**
   * Score based on normalized evidence — evidence aggregation model
   * Starts at 0, adds positive signals, no penalty for missing evidence
   */
  score(evidence: VerificationEvidence): EvidenceScoreResult {
    const positiveEvidence: string[] = [];
    const neutralEvidence: string[] = [];
    const weakNegativeEvidence: string[] = [];
    const reasons: string[] = [];
    const breakdown: Record<string, number> = {};

    let totalScore = 0;

    // ── URL Success Pattern — 15 pts ─────────────────────────────────────
    if (evidence.urlEvidence?.hasSuccessPath) {
      const weight = SCORING_WEIGHTS.UrlSuccessPattern || 15;
      totalScore += weight;
      breakdown.url = weight;
      positiveEvidence.push(`✓ Success path: ${evidence.urlEvidence.matchedPattern} in ${evidence.urlEvidence.fullPath}`);
      reasons.push(`URL success pattern: ${evidence.urlEvidence.matchedPattern}`);
    } else {
      breakdown.url = 0;
      neutralEvidence.push(`• No success path in URL: ${evidence.urlEvidence?.fullPath || evidence.pathname}`);
    }

    // ── Domain / Hostname Known ATS — 10 pts ─────────────────────────────
    if (evidence.hostname) {
      // Check if hostname matches known ATS (from evidence or portal)
      const isKnownATS = evidence.portal !== 'OTHER' && evidence.portal !== 'COMPANY_WEBSITE' && evidence.portal !== 'CAREER_SITE';
      if (isKnownATS) {
        const weight = SCORING_WEIGHTS.Domain || 10;
        totalScore += weight;
        breakdown.domain = weight;
        positiveEvidence.push(`✓ Known ATS hostname: ${evidence.hostname} matches ${evidence.portal}`);
        reasons.push(`Domain validated: ${evidence.hostname} matches ${evidence.portal}`);
      } else if (evidence.hostname.includes('careers.') || evidence.hostname.includes('jobs.') || evidence.pathname.includes('/careers') || evidence.pathname.includes('/jobs')) {
        const weight = 5;
        totalScore += weight;
        breakdown.domain = weight;
        positiveEvidence.push(`✓ Career domain: ${evidence.hostname}`);
        reasons.push(`Career domain: ${evidence.hostname}`);
      } else {
        breakdown.domain = 0;
        neutralEvidence.push(`• Generic domain: ${evidence.hostname}`);
      }
    }

    // ── Page Title Success — 15 pts ──────────────────────────────────────
    if (evidence.titleEvidence?.hasSuccess) {
      const weight = SCORING_WEIGHTS.PageTitle || 15;
      totalScore += weight;
      breakdown.title = weight;
      positiveEvidence.push(`✓ Confirmation title: "${evidence.title.slice(0, 80)}" — ${evidence.titleEvidence.matchedPhrases.slice(0, 2).join(', ')}`);
      reasons.push(`Title matched: ${evidence.titleEvidence.matchedPhrases.slice(0, 2).join(', ')}`);
    } else if (evidence.title) {
      // Check generic success in title even if titleEvidence not set (fallback)
      const titleLower = evidence.title.toLowerCase();
      if (/thank you|success|submitted|confirmation|applied|all done|you're all set|you are all set/i.test(titleLower)) {
        const weight = 10;
        totalScore += weight;
        breakdown.title = weight;
        positiveEvidence.push(`✓ Title contains success keyword: "${evidence.title.slice(0, 80)}"`);
        reasons.push(`Title contains generic success keyword`);
      } else {
        breakdown.title = 0;
        neutralEvidence.push(`• No success phrase in title: "${evidence.title.slice(0, 60)}"`);
      }
    } else {
      breakdown.title = 0;
      neutralEvidence.push(`• No title`);
    }

    // ── Heading Success (H1/H2/H3) — 20 pts ──────────────────────────────
    if (evidence.headingEvidence?.hasSuccess) {
      const weight = SCORING_WEIGHTS.Heading || 20;
      // Boost if multiple headings match
      const count = evidence.headingEvidence.matchedSuccessPhrases.length;
      const finalWeight = count >= 2 ? weight : Math.max(10, weight - 5);
      totalScore += finalWeight;
      breakdown.heading = finalWeight;
      positiveEvidence.push(`✓ Confirmation heading: ${evidence.headingEvidence.matchedSuccessPhrases.slice(0, 2).join(', ')} — "${evidence.headingEvidence.allHeadings.slice(0, 2).join(' | ').slice(0, 80)}"`);
      reasons.push(`Heading matched: ${evidence.headingEvidence.matchedSuccessPhrases.slice(0, 2).join(', ')}`);
    } else if (evidence.headings && evidence.headings.length > 0) {
      // Fallback: check headings array directly
      const headingText = evidence.headings.join(' ').toLowerCase();
      if (/thank you|success|submitted|confirmation|applied|all done|you're all set/i.test(headingText)) {
        const weight = 10;
        totalScore += weight;
        breakdown.heading = weight;
        positiveEvidence.push(`✓ Headings contain generic success: ${evidence.headings.slice(0, 2).join(' | ').slice(0, 80)}`);
        reasons.push(`Headings contain generic success keywords`);
      } else {
        breakdown.heading = 0;
        neutralEvidence.push(`• No success heading, found: ${evidence.headings.slice(0, 2).join(' | ').slice(0, 60) || 'none'}`);
      }
    } else {
      breakdown.heading = 0;
      neutralEvidence.push(`• No headings found`);
    }

    // ── Confirmation Body — 20 pts ───────────────────────────────────────
    if (evidence.bodyEvidence?.hasSuccess) {
      const weight = SCORING_WEIGHTS.ConfirmationBody || 20;
      const count = evidence.bodyEvidence.matchedSuccessPhrases.length;
      const finalWeight = count >= 2 ? weight : 15;
      totalScore += finalWeight;
      breakdown.body = finalWeight;
      positiveEvidence.push(`✓ Confirmation body: ${evidence.bodyEvidence.matchedSuccessPhrases.slice(0, 2).join(', ')} — "${evidence.bodyEvidence.confirmationText.slice(0, 100)}..."`);
      reasons.push(`Body matched: ${evidence.bodyEvidence.matchedSuccessPhrases.slice(0, 2).join(', ')}`);
    } else if (evidence.confirmationText && evidence.confirmationText.length > 20) {
      // Fallback generic check
      if (/thank you|application received|submitted|success|confirmation|all done|you're all set|we have received|we will review|reference number/i.test(evidence.confirmationText.toLowerCase())) {
        const weight = 10;
        totalScore += weight;
        breakdown.body = weight;
        positiveEvidence.push(`✓ Body contains generic success keywords — "${evidence.confirmationText.slice(0, 100)}..."`);
        reasons.push(`Body contains generic success keywords`);
      } else {
        breakdown.body = 0;
        neutralEvidence.push(`• No confirmation body match, length: ${evidence.confirmationText.length}`);
      }
    } else {
      breakdown.body = 0;
      neutralEvidence.push(`• No confirmation body`);
    }

    // ── Meta Tags — 5 pts ────────────────────────────────────────────────
    if (evidence.metaEvidence?.hasSuccess) {
      const weight = SCORING_WEIGHTS.MetaTags || 5;
      totalScore += weight;
      breakdown.meta = weight;
      positiveEvidence.push(`✓ Meta tags: ${evidence.metaEvidence.matchedPhrases.slice(0, 2).join(', ')}`);
      reasons.push(`Meta tags matched: ${evidence.metaEvidence.matchedPhrases.slice(0, 2).join(', ')}`);
    } else {
      breakdown.meta = 0;
      neutralEvidence.push(`• No success in meta tags`);
    }

    // ── Breadcrumbs — 5 pts ──────────────────────────────────────────────
    if (evidence.breadcrumbEvidence?.hasSuccess) {
      const weight = SCORING_WEIGHTS.Breadcrumbs || 5;
      totalScore += weight;
      breakdown.breadcrumbs = weight;
      positiveEvidence.push(`✓ Breadcrumbs: ${evidence.breadcrumbEvidence.matchedPhrases.slice(0, 2).join(', ')}`);
      reasons.push(`Breadcrumbs matched`);
    } else {
      breakdown.breadcrumbs = 0;
      neutralEvidence.push(`• No success in breadcrumbs`);
    }

    // ── JSON-LD Structured Data — 5 pts ──────────────────────────────────
    if (evidence.structuredDataEvidence?.hasConfirmation) {
      const weight = SCORING_WEIGHTS.JsonLd || 5;
      totalScore += weight;
      breakdown.jsonLd = weight;
      positiveEvidence.push(`✓ Structured data: ${evidence.structuredDataEvidence.matchedTypes.slice(0, 2).join(', ')}`);
      reasons.push(`Structured data indicates confirmation`);
    } else {
      breakdown.jsonLd = 0;
      neutralEvidence.push(`• No structured data confirmation`);
    }

    // ── DOM Fingerprints — up to 15 pts ──────────────────────────────────
    const domScore = evidence.domFingerprint?.fingerprintScore || 0;
    const hasFingerprint = domScore > 0 || evidence.domFingerprint?.hasConfirmationCard || evidence.domFingerprint?.hasSuccessBanner;
    if (hasFingerprint) {
      const weight = Math.min(domScore || 10, SCORING_WEIGHTS.DomFingerprint || 15);
      totalScore += weight;
      breakdown.domFingerprint = weight;
      const matched = evidence.domFingerprint.matchedFingerprints?.slice(0, 3).join(', ') || 'success card/banner';
      positiveEvidence.push(`✓ Success DOM: ${matched} (score ${domScore || weight})`);
      reasons.push(`DOM fingerprint: ${matched}`);
    } else {
      breakdown.domFingerprint = 0;
      neutralEvidence.push(`• No success DOM fingerprints`);
    }

    // ── Positive Buttons — 5 pts ─────────────────────────────────────────
    if (evidence.buttonEvidence?.hasPositive) {
      const weight = SCORING_WEIGHTS.PositiveButtons || 5;
      totalScore += weight;
      breakdown.positiveButtons = weight;
      positiveEvidence.push(`✓ Positive buttons: ${evidence.buttonEvidence.positiveButtons.map(b => b.text).slice(0, 3).join(', ')}`);
      reasons.push(`Positive buttons: ${evidence.buttonEvidence.positiveButtons.map(b => b.text).slice(0, 2).join(', ')}`);
    } else {
      breakdown.positiveButtons = 0;
      neutralEvidence.push(`• No positive buttons (View Application, Dashboard, etc.)`);
    }

    // ── Negative Buttons — very weak signal, not penalty ─────────────────
    if (evidence.buttonEvidence?.hasNegative) {
      // Very weak negative, -2 max, not automatic rejection
      // Spec says: DO NOT automatically penalize, treat as weak
      neutralEvidence.push(`• Apply button still visible: ${evidence.buttonEvidence.negativeButtons.map(b => b.text).slice(0, 2).join(', ')} — weak signal`);
      // No score deduction here, handled in FraudAnalyzer as weak negative
      breakdown.negativeButtons = 0;
    } else {
      breakdown.negativeButtons = 0;
      // Bonus if no apply button? Very weak positive
      if (!evidence.buttonEvidence?.hasNegative) {
        const weight = 2;
        totalScore += weight;
        breakdown.applyAbsentBonus = weight;
        positiveEvidence.push(`✓ No Apply button — likely confirmation page`);
      }
    }

    // ── Application Reference — 20 pts strongest ─────────────────────────
    if (evidence.referenceEvidence?.hasAnyReference) {
      const weight = SCORING_WEIGHTS.ApplicationReference || 20;
      totalScore += weight;
      breakdown.reference = weight;
      positiveEvidence.push(`✓ Reference ID: ${evidence.referenceEvidence.strongestReference} (${evidence.referenceEvidence.allReferences.length} found) — strongest positive`);
      reasons.push(`Reference found: ${evidence.referenceEvidence.strongestReference}`);
    } else if (evidence.applicationReference) {
      const weight = SCORING_WEIGHTS.ApplicationReference || 20;
      totalScore += weight;
      breakdown.reference = weight;
      positiveEvidence.push(`✓ Reference ID: ${evidence.applicationReference} — strongest positive`);
      reasons.push(`Reference found: ${evidence.applicationReference}`);
    } else {
      breakdown.reference = 0;
      neutralEvidence.push(`• No reference ID`);
    }

    // ── Company/Job Title Extracted — 2 pts each weak ────────────────────
    // These are weak positives, not critical
    if (evidence.hostname) {
      // Company extraction is attempted in EvidenceCollector, but we can check if we have company info
      // For now, treat as neutral unless we have explicit company
      breakdown.company = 0;
      breakdown.jobTitle = 0;
    }

    // ── Portal Compliance — 5 pts ────────────────────────────────────────
    if (evidence.portal && evidence.portal !== 'OTHER') {
      const weight = SCORING_WEIGHTS.PortalCompliance || 5;
      totalScore += weight;
      breakdown.portalCompliance = weight;
      positiveEvidence.push(`✓ Portal compliance: ${evidence.portal}`);
      reasons.push(`Portal compliance: ${evidence.portal}`);
    } else {
      breakdown.portalCompliance = 0;
      neutralEvidence.push(`• Generic portal: ${evidence.portal}`);
    }

    // ── Form Disabled/Read-only — 5 pts ──────────────────────────────────
    if (evidence.domFingerprint?.hasDisabledForm || evidence.domFingerprint?.hasReadOnlySummary) {
      const weight = 5;
      totalScore += weight;
      breakdown.formDisabled = weight;
      positiveEvidence.push(`✓ Form disabled/read-only — indicates completion`);
      reasons.push(`Form disabled/read-only`);
    } else {
      breakdown.formDisabled = 0;
    }

    // Cap at 100
    totalScore = Math.min(totalScore, 100);

    // Check minimum positive signals for verified
    const totalPositive = positiveEvidence.length;

    // Confidence mapping — lower thresholds for v1.1 to reduce false negatives
    const confidence = getConfidenceFromScore(totalScore);
    const verified = totalScore >= THRESHOLDS.VERIFIED && totalPositive >= EVIDENCE_THRESHOLDS.MIN_FOR_VERIFIED;

    // If we have strong reference, boost to verified even if score slightly below threshold? Reference is strongest.
    let finalVerified = verified;
    let finalScore = totalScore;
    let finalConfidence = confidence;

    if (evidence.referenceEvidence?.hasAnyReference && totalScore >= 30) {
      // Reference ID present + at least 30 score = likely genuine submission, boost
      finalVerified = true;
      finalScore = Math.max(totalScore, 45);
      finalConfidence = totalScore >= 40 ? 'HIGH' : 'MEDIUM';
      if (!verified) {
        reasons.push(`Boosted to verified due to reference ID + positive signals`);
      }
    }

    // If we have many positive signals (≥4) even with moderate score, consider verified to avoid false negatives
    if (totalPositive >= 4 && totalScore >= 30 && !finalVerified) {
      finalVerified = true;
      finalConfidence = 'MEDIUM';
      reasons.push(`Boosted to verified due to ${totalPositive} positive signals (minimize false negatives)`);
    }

    return {
      score: finalScore,
      maxScore: 100,
      reasons,
      positiveEvidence,
      neutralEvidence,
      weakNegativeEvidence: [], // Filled by FraudAnalyzer
      evidenceBreakdown: breakdown,
      confidence: finalConfidence,
      verified: finalVerified,
      totalPositiveSignals: totalPositive,
    };
  }
}

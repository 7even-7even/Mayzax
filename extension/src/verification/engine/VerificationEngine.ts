import { RuleContext, VerificationEvidence, VerificationResultV2, VerificationRule, PortalPlugin, JobPortal, SubmissionEvidence } from '../types';
import { EvidenceCollector } from '../evidence/EvidenceCollector';
import { EvidenceNormalizer } from '../evidence/EvidenceNormalizer';
import { VerificationScorer } from '../scoring/Scorer';
import { WeightedEvidenceScorer } from '../scoring/WeightedEvidenceScorer';
import { FraudAnalyzer } from '../fraud/FraudAnalyzer';
import { PortalRegistryV2 } from '../portals';
import { DomainRule } from '../rules/DomainRule';
import { PageTitleRule } from '../rules/PageTitleRule';
import { HeadingRule } from '../rules/HeadingRule';
import { ConfirmationBodyRule } from '../rules/ConfirmationBodyRule';
import { ReferenceRule } from '../rules/ReferenceRule';
import { DomFingerprintRule } from '../rules/DomFingerprintRule';
import { PortalComplianceRule } from '../rules/PortalComplianceRule';
import { ApplyButtonRule } from '../rules/ApplyButtonRule';
import { ENGINE_VERSION, ENGINE_VERSION_NAME, THRESHOLDS, LOGGING } from './EngineConfig';
import { parseUrlSafe } from '../utils/url';

/**
 * Enterprise Verification Engine v1.1 — Universal ATS Intelligence
 * 
 * New Pipeline (per spec):
 * Recruitment Detection (in content.ts via RecruitmentPageDetector)
 *   ↓
 * Portal Detection (PortalRegistryV2)
 *   ↓
 * Portal Plugin (ATS-specific config)
 *   ↓
 * Evidence Collection (Universal — URL, hostname, title, H1/H2/H3, body, meta, breadcrumbs, JSON-LD, DOM fingerprints, buttons, references)
 *   ↓
 * Evidence Normalization (shared helpers, normalized evidence)
 *   ↓
 * Weighted Confidence Engine (start at 0, add positive evidence, missing = 0)
 *   ↓
 * Fraud Analysis (separate, slight reduction unless overwhelming)
 *   ↓
 * Final Verification (with improved logging)
 * 
 * Philosophy: Evidence Aggregation, not exact wording matching
 * Goal: Minimize false negatives — genuinely submitted applications almost never unverified
 */

export class VerificationEngine {
  private collector: EvidenceCollector;
  private scorerLegacy: VerificationScorer;
  private scorerWeighted: WeightedEvidenceScorer;
  private fraudAnalyzer: FraudAnalyzer;
  private portalRegistry: PortalRegistryV2;
  private rules: VerificationRule[];

  constructor() {
    this.collector = new EvidenceCollector();
    this.scorerLegacy = new VerificationScorer();
    this.scorerWeighted = new WeightedEvidenceScorer();
    this.fraudAnalyzer = new FraudAnalyzer();
    this.portalRegistry = PortalRegistryV2.getInstance();
    // Legacy rules kept for backward compatibility, but new engine uses evidence-driven scoring
    this.rules = [
      new DomainRule(),
      new PageTitleRule(),
      new HeadingRule(),
      new ConfirmationBodyRule(),
      new ReferenceRule(),
      new DomFingerprintRule(),
      new PortalComplianceRule(),
      new ApplyButtonRule(),
    ];
  }

  /**
   * Main verification entry point — v1.1 Universal ATS Intelligence
   * Implements new pipeline with evidence aggregation
   */
  async verify(document: Document, urlString: string, extensionVersion: string = ENGINE_VERSION_NAME, submissionEvidence?: SubmissionEvidence): Promise<VerificationResultV2> {
    const url = parseUrlSafe(urlString);
    if (!url) {
      return this.createRejectedResult(urlString, 'Invalid URL', extensionVersion);
    }

    // ── 1. Portal Detection ────────────────────────────────────────────────
    const portalPlugin: PortalPlugin = this.portalRegistry.getPluginForHostname(url.hostname);
    console.debug(`[Mayzax v1.2] Portal detected: ${portalPlugin.displayName} (${portalPlugin.portal}) for hostname ${url.hostname}`);

    // ── 2. Evidence Collection ─────────────────────────────────────────────
    // Universal evidence collection — every meaningful source
    let evidence: VerificationEvidence;
    try {
      evidence = this.collector.collect(document, urlString, { extensionVersion });
      if (submissionEvidence) {
        evidence.submissionEvidence = submissionEvidence;
      }
      console.debug(`[Mayzax v1.2] Evidence collected: ${evidence.positiveSignals?.length || 0} positive, ${evidence.headings?.length || 0} headings, body length ${evidence.confirmationText?.length || 0}`);
    } catch (err) {
      return this.createRejectedResult(urlString, `Evidence collection failed: ${err}`, extensionVersion);
    }

    // ── 3. Evidence Normalization ──────────────────────────────────────────
    // Shared normalization helpers, consumes normalized evidence rather than raw DOM
    let normalizedEvidence: VerificationEvidence;
    try {
      normalizedEvidence = EvidenceNormalizer.normalize(evidence);
      console.debug(`[Mayzax v1.2] Evidence normalized`);
    } catch (err) {
      console.warn(`[Mayzax v1.2] Normalization failed, using raw evidence`, err);
      normalizedEvidence = evidence;
    }

    // ── 4. Weighted Confidence Engine ──────────────────────────────────────
    // Evidence aggregation model: Start at 0, add positive evidence, missing = 0
    let weightedResult;
    try {
      weightedResult = this.scorerWeighted.score(normalizedEvidence);
      console.debug(`[Mayzax v1.2] Weighted scoring: ${weightedResult.score}% confidence ${weightedResult.confidence} with ${weightedResult.totalPositiveSignals} positive signals`);
    } catch (err) {
      console.warn(`[Mayzax v1.2] Weighted scoring failed, falling back to legacy`, err);
      // Fallback to legacy scorer
      const legacyOutcomes = this.evaluateLegacyRules(document, url, portalPlugin, normalizedEvidence);
      const legacyScoring = this.scorerLegacy.score(legacyOutcomes, normalizedEvidence);
      weightedResult = {
        score: legacyScoring.score,
        maxScore: 100,
        reasons: legacyScoring.reasons,
        positiveEvidence: legacyScoring.reasons.filter(r => r.includes('✓') || r.toLowerCase().includes('matched') || r.toLowerCase().includes('detected')),
        neutralEvidence: [],
        weakNegativeEvidence: [],
        evidenceBreakdown: {},
        confidence: legacyScoring.confidence,
        verified: legacyScoring.verified,
        totalPositiveSignals: legacyScoring.reasons.length,
      };
    }

    // ── 5. Fraud Analysis ──────────────────────────────────────────────────
    // Separate from scoring, fraud only slightly reduces unless overwhelming
    let fraudAnalysis;
    let finalScore = weightedResult.score;
    let finalVerified = weightedResult.verified;
    let finalConfidence = weightedResult.confidence;

    try {
      fraudAnalysis = this.fraudAnalyzer.analyze(normalizedEvidence, weightedResult.score);
      const fraudAdjusted = this.fraudAnalyzer.applyFraudPenalty(weightedResult.score, fraudAnalysis);
      finalScore = fraudAdjusted.adjustedScore;
      finalVerified = fraudAdjusted.verified;
      finalConfidence = fraudAdjusted.confidence;

      if (fraudAnalysis.fraudScore < 0) {
        console.debug(`[Mayzax v1.2] Fraud analysis: penalty ${fraudAnalysis.fraudScore}, adjusted ${weightedResult.score} -> ${finalScore}, fraud signals: ${fraudAnalysis.fraudSignals.join(', ')}`);
      }
    } catch (err) {
      console.warn(`[Mayzax v1.2] Fraud analysis failed`, err);
      fraudAnalysis = {
        fraudScore: 0,
        fraudSignals: [],
        failurePhrases: [],
        isFraud: false,
        isOverwhelmingFailure: false,
        reasons: [],
        weakNegativeEvidence: [],
      };
    }

    // ── 6. Final Verification with Improved Logging ──────────────────────
    // Build comprehensive result with positive/neutral/weak negative sections
    const positiveEvidence = weightedResult.positiveEvidence || [];
    const neutralEvidence = weightedResult.neutralEvidence || [];
    const weakNegativeEvidence = [
      ...(weightedResult.weakNegativeEvidence || []),
      ...(fraudAnalysis?.weakNegativeEvidence || []),
    ];
    const fraudSignals = [
      ...(fraudAnalysis?.fraudSignals || []),
    ];

    // Combine reasons with improved logging format
    const allReasons = [
      ...positiveEvidence,
      ...neutralEvidence.slice(0, 2), // Show max 2 neutral for brevity
      ...weakNegativeEvidence.slice(0, 2),
      ...fraudAnalysis.reasons,
    ];

    // Debug logging — improved format per spec
    if (LOGGING.VERBOSE) {
      const debugLog = this.createImprovedLog(
        positiveEvidence,
        neutralEvidence,
        weakNegativeEvidence,
        fraudAnalysis.reasons,
        weightedResult.evidenceBreakdown,
        finalScore,
        finalConfidence,
        finalVerified
      );
      console.log(debugLog);
    }

    const result: VerificationResultV2 = {
      verified: finalVerified,
      score: finalScore,
      confidence: finalConfidence,
      portal: normalizedEvidence.portal as JobPortal,
      reasons: allReasons,
      evidence: normalizedEvidence,
      verificationTimestamp: Date.now(),
      version: ENGINE_VERSION,
      applicationReference: normalizedEvidence.applicationReference || normalizedEvidence.referenceEvidence?.strongestReference || null,
      fraudSignals: fraudSignals.length > 0 ? fraudSignals : undefined,
      // v1.1 improved logging fields
      positiveEvidence,
      neutralEvidence,
      weakNegativeEvidence,
      fraudAnalysis: fraudAnalysis.reasons,
      evidenceBreakdown: weightedResult.evidenceBreakdown,
    };

    return result;
  }

  /**
   * Legacy rules evaluation — kept for backward compatibility
   * Used as fallback if weighted scorer fails
   */
  private evaluateLegacyRules(document: Document, url: URL, portalPlugin: PortalPlugin, evidence: VerificationEvidence) {
    const context: RuleContext = {
      document,
      url,
      portalPlugin,
      evidence,
      normalizedEvidence: evidence,
    };

    return this.rules.map(rule => {
      try {
        // Try new evidence-based evaluation first if available
        if (rule.evaluateEvidence) {
          return rule.evaluateEvidence(evidence, portalPlugin);
        }
        return rule.evaluate(context);
      } catch (e) {
        console.warn(`[Mayzax v1.1] Rule ${rule.id} error`, e);
        return {
          ruleId: rule.id,
          passed: false,
          scoreContribution: 0,
          reasons: [`Rule ${rule.id} evaluation error: ${e}`],
          fraudSignals: ['RULE_ERROR'],
        };
      }
    });
  }

  private createImprovedLog(
    positive: string[],
    neutral: string[],
    weakNegative: string[],
    fraud: string[],
    breakdown: Record<string, number>,
    score: number,
    confidence: string,
    verified: boolean
  ): string {
    let log = '\n';
    log += '╔════════════════════════════════════════════════════════════╗\n';
    log += '║  Mayzax v1.3 — Universal ATS Intelligence                 ║\n';
    log += '╚════════════════════════════════════════════════════════════╝\n';

    log += '\n✓ Positive Evidence\n';
    if (positive.length > 0) {
      log += positive.map(s => `  ${s}`).join('\n');
    } else {
      log += '  (none — no success signals found)';
    }

    if (neutral.length > 0 && LOGGING.SHOW_NEUTRAL) {
      log += '\n\n• Neutral Evidence\n';
      log += neutral.map(s => `  ${s}`).join('\n');
    }

    if (weakNegative.length > 0 && LOGGING.SHOW_WEAK_NEGATIVE) {
      log += '\n\n• Weak Negative Evidence\n';
      log += weakNegative.map(s => `  ${s}`).join('\n');
    }

    if (fraud.length > 0) {
      log += '\n\n⚠ Fraud Analysis\n';
      log += fraud.map(s => `  ${s}`).join('\n');
    }

    log += '\n\n─── Evidence Breakdown ───\n';
    for (const [key, val] of Object.entries(breakdown)) {
      if (val > 0) log += `  ${key}: +${val}\n`;
    }

    log += `\n─── Overall Confidence ───\n`;
    log += `  Score: ${score}%\n`;
    log += `  Confidence: ${confidence}\n`;
    log += `  Verified: ${verified ? 'YES ✓' : 'NO ✗'}\n`;
    log += `  Positive signals: ${positive.length}\n`;

    if (verified) {
      log += `\n  Result: Verified (${score}%) — genuinely submitted application\n`;
    } else if (score >= THRESHOLDS.SUSPICIOUS_MIN) {
      log += `\n  Result: Suspicious (${score}%) — manual review recommended\n`;
    } else {
      log += `\n  Result: Rejected (${score}%) — insufficient evidence\n`;
    }

    return log;
  }

  private createRejectedResult(urlString: string, reason: string, extensionVersion: string): VerificationResultV2 {
    let hostname = '';
    let pathname = '';
    try {
      const u = new URL(urlString);
      hostname = u.hostname.toLowerCase().replace(/^www\./, '');
      pathname = u.pathname;
    } catch {}

    const evidence: VerificationEvidence = {
      portal: this.portalRegistry.detectPortalEnum(hostname) as JobPortal,
      hostname,
      pathname,
      fullUrl: urlString,
      normalizedUrl: urlString.toLowerCase(),
      title: '',
      headings: [],
      confirmationText: '',
      applicationReference: null,
      detectedButtons: [],
      domFingerprint: {
        hasConfirmationCard: false,
        hasSuccessBanner: false,
        expectedContainersFound: 0,
        unexpectedApplyButtonPresent: false,
      },
      verificationTimestamp: Date.now(),
      extensionVersion,
      https: urlString.startsWith('https://'),
      positiveSignals: [],
      neutralSignals: [reason],
      negativeSignals: [],
      evidenceScoreBreakdown: {},
      totalPositiveSignals: 0,
    };

    return {
      verified: false,
      score: 0,
      confidence: 'LOW',
      portal: evidence.portal,
      reasons: [reason],
      evidence,
      verificationTimestamp: Date.now(),
      version: ENGINE_VERSION,
      fraudSignals: ['INVALID_URL_OR_EVIDENCE_ERROR'],
      positiveEvidence: [],
      neutralEvidence: [reason],
      weakNegativeEvidence: [],
    };
  }

  getRules(): VerificationRule[] {
    return this.rules;
  }

  // New v1.1 method for direct evidence scoring (for testing)
  scoreEvidence(evidence: VerificationEvidence) {
    const normalized = EvidenceNormalizer.normalize(evidence);
    const weighted = this.scorerWeighted.score(normalized);
    const fraud = this.fraudAnalyzer.analyze(normalized, weighted.score);
    const adjusted = this.fraudAnalyzer.applyFraudPenalty(weighted.score, fraud);
    return { weighted, fraud, adjusted, normalized };
  }
}


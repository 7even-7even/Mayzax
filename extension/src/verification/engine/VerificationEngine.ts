import { RuleContext, VerificationEvidence, VerificationResultV2, VerificationRule, PortalPlugin } from '../types';
import { EvidenceCollector } from '../evidence/EvidenceCollector';
import { VerificationScorer } from '../scoring/Scorer';
import { PortalRegistryV2 } from '../portals';
import { DomainRule } from '../rules/DomainRule';
import { PageTitleRule } from '../rules/PageTitleRule';
import { HeadingRule } from '../rules/HeadingRule';
import { ConfirmationBodyRule } from '../rules/ConfirmationBodyRule';
import { ReferenceRule } from '../rules/ReferenceRule';
import { DomFingerprintRule } from '../rules/DomFingerprintRule';
import { PortalComplianceRule } from '../rules/PortalComplianceRule';
import { ApplyButtonRule } from '../rules/ApplyButtonRule';
import { ENGINE_VERSION } from './EngineConfig';
import { parseUrlSafe } from '../utils/url';

/**
 * Enterprise Verification Engine v2 — modular, weighted, fraud-resistant
 */

export class VerificationEngine {
  private collector: EvidenceCollector;
  private scorer: VerificationScorer;
  private portalRegistry: PortalRegistryV2;
  private rules: VerificationRule[];

  constructor() {
    this.collector = new EvidenceCollector();
    this.scorer = new VerificationScorer();
    this.portalRegistry = PortalRegistryV2.getInstance();
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
   * Main verification entry point — collects evidence, runs rules, scores
   * @param document DOM document
   * @param urlString current URL
   * @param extensionVersion from manifest
   */
  async verify(document: Document, urlString: string, extensionVersion: string = '2.0.0'): Promise<VerificationResultV2> {
    const url = parseUrlSafe(urlString);
    if (!url) {
      return this.createRejectedResult(urlString, 'Invalid URL', extensionVersion);
    }

    // Detect portal plugin
    const portalPlugin: PortalPlugin = this.portalRegistry.getPluginForHostname(url.hostname);

    // Collect evidence (includes history guard, interaction tracking)
    let evidence: VerificationEvidence;
    try {
      evidence = this.collector.collect(document, urlString, { extensionVersion });
    } catch (err) {
      return this.createRejectedResult(urlString, `Evidence collection failed: ${err}`, extensionVersion);
    }

    // Build rule context
    const context: RuleContext = {
      document,
      url,
      portalPlugin,
      evidence,
    };

    // Evaluate all rules
    const outcomes = this.rules.map(rule => {
      try {
        return rule.evaluate(context);
      } catch (e) {
        console.warn(`[Mayzax v2] Rule ${rule.id} error`, e);
        return {
          ruleId: rule.id,
          passed: false,
          scoreContribution: 0,
          reasons: [`Rule ${rule.id} evaluation error: ${e}`],
          fraudSignals: ['RULE_ERROR'],
        };
      }
    });

    // Score
    const scoring = this.scorer.score(outcomes, evidence);

    const result: VerificationResultV2 = {
      verified: scoring.verified,
      score: scoring.score,
      confidence: scoring.confidence,
      portal: evidence.portal,
      reasons: scoring.reasons,
      evidence,
      verificationTimestamp: Date.now(),
      version: ENGINE_VERSION,
      applicationReference: evidence.applicationReference,
      fraudSignals: scoring.fraudSignals,
    };

    return result;
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
      portal: this.portalRegistry.detectPortalEnum(hostname) as any,
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
    };
  }

  getRules(): VerificationRule[] {
    return this.rules;
  }
}

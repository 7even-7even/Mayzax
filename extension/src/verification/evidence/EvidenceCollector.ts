import { VerificationEvidence, JobPortal, PortalPlugin, DetectedButton, DomFingerprint } from '../types';
import { normalizeUrlForEvidence, parseUrlSafe, normalizeHostname } from '../utils/url';
import { collectHeadings, collectConfirmationText, collectButtons, checkDomFingerprint, extractReference } from '../utils/dom';
import { PortalRegistryV2 } from '../portals';
import {
  collectMetaEvidence,
  collectBreadcrumbEvidence,
  collectStructuredDataEvidence,
  collectDomFingerprintEvidence,
  collectUrlEvidence,
  collectButtonEvidence,
  collectReferenceEvidence,
} from '../utils/evidenceHelpers';
import {
  URL_SUCCESS_PATTERNS,
  TITLE_SUCCESS_PHRASES,
  HEADING_SUCCESS_PHRASES,
  BODY_SUCCESS_PHRASES,
  REFERENCE_PATTERNS,
  POSITIVE_BUTTON_PATTERNS,
  NEGATIVE_BUTTON_PATTERNS,
} from '../utils/successPhrases';

export interface EvidenceCollectorOptions {
  extensionVersion: string;
  timeOnPageMs?: number;
  userInteractionDetected?: boolean;
  historyManipulationDetected?: boolean;
}

/**
 * Universal Evidence Collector — v1.1 Universal ATS Intelligence
 * Pipeline: Portal Detection → Evidence Collection (universal) → Normalization → Weighted Scoring → Fraud Analysis
 * Collects EVERY possible positive signal, not just exact wording
 */
export class EvidenceCollector {
  private registry = PortalRegistryV2.getInstance();
  private pageLoadTime: number;
  private interactionDetected: boolean = false;
  private historyManipulated: boolean = false;

  constructor() {
    this.pageLoadTime = Date.now();
    this.setupInteractionListeners();
    this.setupHistoryGuard();
  }

  private setupInteractionListeners() {
    try {
      const markInteraction = () => {
        this.interactionDetected = true;
      };
      document.addEventListener('click', markInteraction, { once: false });
      document.addEventListener('submit', markInteraction, { once: false });
      document.addEventListener('keydown', markInteraction, { once: false });
    } catch {}
  }

  private setupHistoryGuard() {
    try {
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      const self = this;

      history.pushState = function (...args) {
        self.historyManipulated = true;
        return originalPushState.apply(this, args as any);
      };

      history.replaceState = function (...args) {
        self.historyManipulated = true;
        return originalReplaceState.apply(this, args as any);
      };

      window.addEventListener('popstate', () => {
        self.historyManipulated = true;
      });
    } catch {}
  }

  collect(document: Document, urlString: string, options: EvidenceCollectorOptions): VerificationEvidence {
    const url = parseUrlSafe(urlString) || parseUrlSafe(window.location.href);
    if (!url) {
      throw new Error('Invalid URL for evidence collection');
    }

    const hostname = normalizeHostname(url.hostname);
    const pathname = url.pathname;
    const fullUrl = urlString;
    const normalizedUrl = normalizeUrlForEvidence(urlString);
    const title = document.title || '';
    const headings = collectHeadings(document);
    const confirmationText = collectConfirmationText(document);
    const detectedButtons: DetectedButton[] = collectButtons(document);

    const plugin: PortalPlugin = this.registry.getPluginForHostname(hostname);

    // ── Universal Evidence Collection ────────────────────────────────────

    // URL evidence — success path detection
    const urlEvidence = collectUrlEvidence(urlString, [...URL_SUCCESS_PATTERNS, ...plugin.pathPatterns]);

    // Meta evidence — og:title, description
    const metaEvidence = collectMetaEvidence(document, [...TITLE_SUCCESS_PHRASES, ...plugin.titlePatterns]);

    // Breadcrumb evidence
    const breadcrumbEvidence = collectBreadcrumbEvidence(document, [...TITLE_SUCCESS_PHRASES, ...plugin.titlePatterns]);

    // Structured data (JSON-LD)
    const structuredDataEvidence = collectStructuredDataEvidence(document);

    // DOM fingerprint — universal success cards, banners, icons, progress, etc.
    const domFingerprintUniversal = collectDomFingerprintEvidence(document);

    // Button evidence — positive vs negative (weak signals)
    const buttonEvidence = collectButtonEvidence(
      document,
      [...POSITIVE_BUTTON_PATTERNS, ...(plugin.positiveButtonPatterns || [])],
      [...NEGATIVE_BUTTON_PATTERNS, ...(plugin.negativeButtonPatterns || [])]
    );

    // Reference evidence — strongest positive
    const referenceEvidence = collectReferenceEvidence(
      document,
      [...REFERENCE_PATTERNS, ...plugin.referencePatterns],
      [...(plugin.applicationIdSelectors || []), ...(plugin.candidateIdSelectors || []), ...(plugin.expectedSelectors || [])]
    );

    // Legacy fingerprint for backward compat
    const fingerprintResult = checkDomFingerprint(document, plugin.expectedSelectors);
    const domFingerprint: DomFingerprint = {
      hasConfirmationCard: fingerprintResult.hasConfirmationCard || domFingerprintUniversal.hasSuccessCard || domFingerprintUniversal.hasConfirmationBanner,
      hasSuccessBanner: fingerprintResult.hasSuccessBanner || domFingerprintUniversal.hasConfirmationBanner,
      expectedContainersFound: fingerprintResult.expectedContainersFound,
      unexpectedApplyButtonPresent: detectedButtons.some(b => /apply|submit/i.test(b.text) && b.visible && !b.disabled),
      totalExpected: plugin.expectedSelectors.length,
      matchedSelectors: fingerprintResult.matchedSelectors,
      missingSelectors: fingerprintResult.missingSelectors,
      // v1.1 universal
      hasSuccessCard: domFingerprintUniversal.hasSuccessCard,
      hasConfirmationBanner: domFingerprintUniversal.hasConfirmationBanner,
      hasSuccessIcon: domFingerprintUniversal.hasSuccessIcon,
      hasProgressCompleted: domFingerprintUniversal.hasProgressCompleted,
      hasDisabledForm: domFingerprintUniversal.hasDisabledForm,
      hasReadOnlySummary: domFingerprintUniversal.hasReadOnlySummary,
      hasReceiptCard: domFingerprintUniversal.hasReceiptCard,
      hasDownloadConfirmation: domFingerprintUniversal.hasDownloadConfirmation,
      hasPrintConfirmation: domFingerprintUniversal.hasPrintConfirmation,
      hasConfirmationPanel: domFingerprintUniversal.hasConfirmationPanel,
      hasReviewPage: domFingerprintUniversal.hasReviewPage,
      hasCompletedTimeline: domFingerprintUniversal.hasCompletedTimeline,
      hasApplicationSummary: domFingerprintUniversal.hasApplicationSummary,
      hasProgressBar: domFingerprintUniversal.hasProgressBar,
      hasSuccessAnimation: domFingerprintUniversal.hasSuccessAnimation,
      fingerprintScore: domFingerprintUniversal.fingerprintScore,
      matchedFingerprints: domFingerprintUniversal.matchedFingerprints,
    };

    const applicationReference = plugin.extractReference(document) || referenceEvidence.strongestReference || (() => {
      const genericPatterns = [
        /application\s*(id|reference|number)\s*[:#]?\s*([A-Z0-9-]{6,})/i,
        /reference\s*number\s*[:#]?\s*([A-Z0-9-]+)/i,
      ];
      return extractReference(document, genericPatterns);
    })();

    const timeOnPageMs = options.timeOnPageMs ?? (Date.now() - this.pageLoadTime);
    const userInteractionDetected = options.userInteractionDetected ?? this.interactionDetected;
    const historyManipulationDetected = options.historyManipulationDetected ?? this.historyManipulated;

    // ── Universal Evidence Aggregation ───────────────────────────────────

    // Title evidence
    const titleHasSuccess = TITLE_SUCCESS_PHRASES.some(p => p.test(title)) || plugin.titlePatterns.some(p => p.test(title));
    const titleMatched = [...TITLE_SUCCESS_PHRASES, ...plugin.titlePatterns].filter(p => p.test(title)).map(p => p.source);

    // Heading evidence
    const allHeadingsText = headings.join(' ');
    const headingHasSuccess = HEADING_SUCCESS_PHRASES.some(p => p.test(allHeadingsText)) || plugin.headingPatterns.some(p => p.test(allHeadingsText));
    const headingMatched = [...HEADING_SUCCESS_PHRASES, ...plugin.headingPatterns].filter(p => p.test(allHeadingsText)).map(p => p.source);

    // Body evidence
    const bodyHasSuccess = BODY_SUCCESS_PHRASES.some(p => p.test(confirmationText)) || plugin.confirmationPatterns.some(p => p.test(confirmationText));
    const bodyMatched = [...BODY_SUCCESS_PHRASES, ...plugin.confirmationPatterns].filter(p => p.test(confirmationText)).map(p => p.source);

    // Positive signals aggregation for logging
    const positiveSignals: string[] = [];
    const neutralSignals: string[] = [];
    const negativeSignals: string[] = [];

    if (urlEvidence.hasSuccessPath) positiveSignals.push(`✓ Success path: ${urlEvidence.matchedPattern} in ${urlEvidence.fullPath}`);
    else neutralSignals.push(`• No success path in URL: ${urlEvidence.fullPath}`);

    if (titleHasSuccess) positiveSignals.push(`✓ Confirmation title: "${title.slice(0, 80)}"`);
    else neutralSignals.push(`• No success phrase in title: "${title.slice(0, 60)}"`);

    if (headingHasSuccess) positiveSignals.push(`✓ Confirmation heading: ${headingMatched.slice(0, 2).join(', ')} — "${headings.slice(0, 2).join(' | ').slice(0, 80)}"`);
    else neutralSignals.push(`• No success heading, found: ${headings.slice(0, 2).join(' | ').slice(0, 60) || 'none'}`);

    if (bodyHasSuccess) positiveSignals.push(`✓ Confirmation body: ${bodyMatched.slice(0, 2).join(', ')} — "${confirmationText.slice(0, 100)}..."`);
    else neutralSignals.push(`• No confirmation body match`);

    if (metaEvidence.hasSuccess) positiveSignals.push(`✓ Meta tags: ${metaEvidence.matchedPhrases.slice(0, 2).join(', ')}`);
    else neutralSignals.push(`• No success in meta tags`);

    if (breadcrumbEvidence.hasSuccess) positiveSignals.push(`✓ Breadcrumbs: ${breadcrumbEvidence.matchedPhrases.slice(0, 2).join(', ')}`);
    else neutralSignals.push(`• No success in breadcrumbs`);

    if (structuredDataEvidence.hasConfirmation) positiveSignals.push(`✓ Structured data: ${structuredDataEvidence.matchedTypes.slice(0, 2).join(', ')}`);
    else neutralSignals.push(`• No structured data confirmation`);

    if (domFingerprintUniversal.fingerprintScore > 0) {
      positiveSignals.push(`✓ Success DOM: ${domFingerprintUniversal.matchedFingerprints.slice(0, 3).join(', ')} (score ${domFingerprintUniversal.fingerprintScore})`);
    } else {
      neutralSignals.push(`• No success DOM fingerprints`);
    }

    if (buttonEvidence.hasPositive) positiveSignals.push(`✓ Positive buttons: ${buttonEvidence.positiveButtons.map(b => b.text).slice(0, 3).join(', ')}`);
    else neutralSignals.push(`• No positive buttons (View Application, Dashboard, etc.)`);

    if (buttonEvidence.hasNegative) neutralSignals.push(`• Apply button still visible: ${buttonEvidence.negativeButtons.map(b => b.text).slice(0, 2).join(', ')} — weak signal`);

    if (referenceEvidence.hasAnyReference) positiveSignals.push(`✓ Reference ID: ${referenceEvidence.strongestReference} (${referenceEvidence.allReferences.length} found) — strongest positive`);
    else neutralSignals.push(`• No reference ID`);

    // Evidence breakdown for scoring
    const evidenceScoreBreakdown: Record<string, number> = {
      url: urlEvidence.hasSuccessPath ? 15 : 0,
      title: titleHasSuccess ? 15 : 0,
      heading: headingHasSuccess ? 20 : 0,
      body: bodyHasSuccess ? 20 : 0,
      meta: metaEvidence.hasSuccess ? 5 : 0,
      breadcrumbs: breadcrumbEvidence.hasSuccess ? 5 : 0,
      jsonLd: structuredDataEvidence.hasConfirmation ? 5 : 0,
      domFingerprint: Math.min(domFingerprintUniversal.fingerprintScore, 15),
      positiveButtons: buttonEvidence.hasPositive ? 5 : 0,
      reference: referenceEvidence.hasAnyReference ? 20 : 0,
      companyExtracted: 0, // filled below
      jobTitleExtracted: 0,
    };

    const totalPositiveSignals = positiveSignals.length;

    const evidence: VerificationEvidence = {
      portal: plugin.portal as JobPortal,
      hostname,
      pathname,
      fullUrl,
      normalizedUrl,
      title,
      headings,
      confirmationText,
      applicationReference,
      detectedButtons,
      domFingerprint,
      verificationTimestamp: Date.now(),
      extensionVersion: options.extensionVersion || '1.1.0',
      https: url.protocol === 'https:',
      pageLanguage: document.documentElement.lang || undefined,
      timeOnPageMs,
      userInteractionDetected,
      historyManipulationDetected,
      referrer: document.referrer || undefined,

      // v1.1 Universal
      urlEvidence,
      titleEvidence: {
        hasSuccess: titleHasSuccess,
        hasFailure: false,
        matchedPhrases: titleMatched,
        failurePhrases: [],
      },
      headingEvidence: {
        h1: headings.filter((_, i) => i < 3),
        h2: [],
        h3: [],
        allHeadings: headings,
        hasSuccess: headingHasSuccess,
        hasFailure: false,
        matchedSuccessPhrases: headingMatched,
        matchedFailurePhrases: [],
      },
      bodyEvidence: {
        hasSuccess: bodyHasSuccess,
        hasFailure: false,
        matchedSuccessPhrases: bodyMatched,
        matchedFailurePhrases: [],
        textLength: confirmationText.length,
        confirmationText,
      },
      metaEvidence,
      breadcrumbEvidence,
      structuredDataEvidence,
      buttonEvidence,
      referenceEvidence,

      positiveSignals,
      neutralSignals,
      negativeSignals,
      evidenceScoreBreakdown,
      totalPositiveSignals,
    };

    return evidence;
  }

  resetInteraction() {
    this.interactionDetected = false;
    this.historyManipulated = false;
    this.pageLoadTime = Date.now();
  }
}


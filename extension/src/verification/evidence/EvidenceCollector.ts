import { VerificationEvidence, JobPortal, PortalPlugin, DetectedButton, DomFingerprint } from '../types';
import { normalizeUrlForEvidence, parseUrlSafe, normalizeHostname } from '../utils/url';
import { collectHeadings, collectConfirmationText, collectButtons, checkDomFingerprint, extractReference } from '../utils/dom';
import { PortalRegistryV2 } from '../portals';

export interface EvidenceCollectorOptions {
  extensionVersion: string;
  timeOnPageMs?: number;
  userInteractionDetected?: boolean;
  historyManipulationDetected?: boolean;
}

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
    } catch {
      // ignore if document not available
    }
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
    } catch {
      // ignore if history not available
    }
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

    const plugin: PortalPlugin = options ? this.registry.getPluginForHostname(hostname) : this.registry.getPluginForHostname(hostname);

    const fingerprintResult = checkDomFingerprint(document, plugin.expectedSelectors);
    const domFingerprint: DomFingerprint = {
      hasConfirmationCard: fingerprintResult.hasConfirmationCard,
      hasSuccessBanner: fingerprintResult.hasSuccessBanner,
      expectedContainersFound: fingerprintResult.expectedContainersFound,
      unexpectedApplyButtonPresent: detectedButtons.some(b => /apply|submit/i.test(b.text) && b.visible && !b.disabled),
      totalExpected: plugin.expectedSelectors.length,
      matchedSelectors: fingerprintResult.matchedSelectors,
      missingSelectors: fingerprintResult.missingSelectors,
    };

    const applicationReference = plugin.extractReference(document) || (() => {
      // Fallback generic
      const genericPatterns = [
        /application\s*(id|reference|number)\s*[:#]?\s*([A-Z0-9-]{6,})/i,
        /reference\s*number\s*[:#]?\s*([A-Z0-9-]+)/i,
      ];
      return extractReference(document, genericPatterns);
    })();

    const timeOnPageMs = options.timeOnPageMs ?? (Date.now() - this.pageLoadTime);
    const userInteractionDetected = options.userInteractionDetected ?? this.interactionDetected;
    const historyManipulationDetected = options.historyManipulationDetected ?? this.historyManipulated;

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
      extensionVersion: options.extensionVersion || '2.0.0',
      https: url.protocol === 'https:',
      pageLanguage: document.documentElement.lang || undefined,
      timeOnPageMs,
      userInteractionDetected,
      historyManipulationDetected,
      referrer: document.referrer || undefined,
    };

    return evidence;
  }

  resetInteraction() {
    this.interactionDetected = false;
    this.historyManipulated = false;
    this.pageLoadTime = Date.now();
  }
}

import { VerificationEngine } from './verification/engine/VerificationEngine';
import { VerificationStoreV2 } from './storage/VerificationStoreV2';
import { PortalRegistryV2 } from './verification/portals';
import { ENGINE_VERSION_NAME } from './verification/engine/EngineConfig';

// Legacy fallback imports (kept for backward compat during migration)
import { PortalRegistry } from './detectors/PortalRegistry';
import { extractPageMetadata } from './utils/metadata';

const engine = new VerificationEngine();
const portalRegistryV2 = PortalRegistryV2.getInstance();

// Track user interaction for evidence - collector also tracks, but we keep outer for additional guard
function setupInteractionTracking() {
  // Collector handles internally, this is additional global flag
  document.addEventListener('click', () => {}, { passive: true });
  document.addEventListener('submit', () => {}, { passive: true });
}

// History guard — detect pushState/replaceState spoofing (collector also wraps, this is extra)
function setupHistoryGuard() {
  // Collector does wrapping, keep this as no-op for backwards compat
  try {
    window.addEventListener('popstate', () => {});
  } catch (err) {
    console.warn('[Mayzax v2] History guard setup failed', err);
  }
}

async function runDetectionV2() {
  const currentUrl = window.location.href;
  console.debug('[Mayzax v2] Running detection for', currentUrl);

  try {
    const result = await engine.verify(document, currentUrl, ENGINE_VERSION_NAME);
    
    console.log(`[Mayzax v2] Verification result: score=${result.score} confidence=${result.confidence} verified=${result.verified}`, result.reasons);

    // Only save if score >= 50 (suspicious threshold) to avoid noise, but store all for audit?
    // We'll save if score >= 50, but for verified we need >=80
    if (result.score >= 50) {
      // Extract company/jobTitle via portal plugin
      const plugin = portalRegistryV2.getPluginForHostname(new URL(currentUrl).hostname);
      let company = '';
      let jobTitle = '';
      try {
        company = plugin.extractCompany(document, new URL(currentUrl)) || '';
        jobTitle = plugin.extractJobTitle(document, new URL(currentUrl)) || '';
      } catch {
        // fallback generic
        company = result.evidence.hostname.split('.')[0];
        jobTitle = result.evidence.title.slice(0, 100);
      }

      // Filter generic titles
      if (/thank you|application submitted|success|confirmation/i.test(jobTitle)) {
        jobTitle = '';
      }

      // Save via V2 store
      const entry = await VerificationStoreV2.saveV2(result, company, jobTitle);
      console.log('[Mayzax v2] Verification cached:', entry);

      // Notify background with full v2 payload
      try {
        chrome.runtime.sendMessage({
          action: 'PAGE_VERIFIED_V2',
          payload: {
            result,
            entry,
          },
        });
      } catch (e) {
        console.warn('[Mayzax v2] Failed to notify background', e);
      }

      // Also notify legacy PAGE_VERIFIED for backward compat
      try {
        chrome.runtime.sendMessage({
          action: 'PAGE_VERIFIED',
          payload: {
            portal: result.portal,
            company,
            jobTitle,
            url: currentUrl,
            pageTitle: result.evidence.title,
            verified: result.verified,
            confidenceScore: result.score,
            matchedRules: result.reasons,
            matchedKeywords: result.evidence.headings,
            timestamp: result.verificationTimestamp,
            // v2 extras
            score: result.score,
            confidence: result.confidence,
            evidence: result.evidence,
            version: result.version,
            applicationReference: result.applicationReference,
            fraudSignals: result.fraudSignals,
          },
        });
      } catch {}
    } else {
      console.debug('[Mayzax v2] Score below threshold, not caching', result.score);
    }
  } catch (err) {
    console.error('[Mayzax v2] Detection failed', err);
    // Fallback to legacy detector for migration safety
    runLegacyDetection();
  }
}

function runLegacyDetection() {
  try {
    const currentUrl = window.location.href;
    const registry = PortalRegistry.getInstance();
    const detector = registry.getDetector(currentUrl);
    const result = detector.detectSuccess(document, currentUrl);
    if (result.success && result.confidenceScore >= 50) {
      const meta = extractPageMetadata(document, currentUrl, detector.portal);
      const payload = {
        portal: detector.portal,
        company: meta.company,
        jobTitle: meta.jobTitle,
        url: currentUrl,
        pageTitle: meta.pageTitle,
        verified: true,
        confidenceScore: result.confidenceScore,
        matchedRules: result.matchedRules,
        matchedKeywords: result.matchedKeywords,
        timestamp: Date.now(),
      };
      VerificationStoreV2.saveV2(
        {
          verified: true,
          score: result.confidenceScore,
          confidence: result.confidenceScore >= 80 ? 'HIGH' : result.confidenceScore >= 50 ? 'MEDIUM' : 'LOW',
          portal: detector.portal as any,
          reasons: result.matchedRules,
          evidence: {
            portal: detector.portal as any,
            hostname: new URL(currentUrl).hostname,
            pathname: new URL(currentUrl).pathname,
            fullUrl: currentUrl,
            normalizedUrl: currentUrl,
            title: meta.pageTitle,
            headings: result.matchedKeywords,
            confirmationText: result.matchedKeywords.join(' '),
            applicationReference: null,
            detectedButtons: [],
            domFingerprint: { hasConfirmationCard: false, hasSuccessBanner: false, expectedContainersFound: 0, unexpectedApplyButtonPresent: false },
            verificationTimestamp: Date.now(),
            extensionVersion: ENGINE_VERSION_NAME,
            https: currentUrl.startsWith('https://'),
          },
          verificationTimestamp: Date.now(),
          version: 'v2',
          applicationReference: null,
        } as any,
        meta.company,
        meta.jobTitle
      );
      chrome.runtime.sendMessage({ action: 'PAGE_VERIFIED', payload });
    }
  } catch (e) {
    console.warn('[Mayzax v2] Legacy fallback failed', e);
  }
}

// Initial setup
setupInteractionTracking();
setupHistoryGuard();

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  // Delay slightly to allow SPA to settle
  setTimeout(runDetectionV2, 1500);
} else {
  window.addEventListener('DOMContentLoaded', () => setTimeout(runDetectionV2, 1500));
}

// MutationObserver for SPA transitions — debounced and with time-on-page tracking
let debounceTimer: number | null = null;
let lastUrl = window.location.href;

const observer = new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
  }

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    runDetectionV2();
  }, 1200) as unknown as number;
});

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

// Also listen for navigation events (for SPA)
let lastHref = window.location.href;
setInterval(() => {
  if (window.location.href !== lastHref) {
    lastHref = window.location.href;
    setTimeout(runDetectionV2, 1000);
  }
}, 1000);

console.log(`[Mayzax v2] Content script loaded v${ENGINE_VERSION_NAME}`);

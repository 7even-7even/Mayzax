import { PortalRegistry } from './detectors/PortalRegistry';
import { VerificationStore } from './storage/VerificationStore';
import { extractPageMetadata } from './utils/metadata';

function runDetection() {
  const currentUrl = window.location.href;
  const registry = PortalRegistry.getInstance();
  const detector = registry.getDetector(currentUrl);

  const result = detector.detectSuccess(document, currentUrl);
  if (result.success && result.confidenceScore >= 50) {
    const meta = extractPageMetadata(document, currentUrl, detector.portal);

    const verificationPayload = {
      portal: detector.portal,
      company: meta.company,
      jobTitle: meta.jobTitle,
      url: currentUrl,
      pageTitle: meta.pageTitle,
      verified: true,
      confidenceScore: result.confidenceScore,
      matchedRules: result.matchedRules,
      matchedKeywords: result.matchedKeywords,
      timestamp: Date.now()
    };

    // Save locally in content script context via VerificationStore (which accesses chrome.storage.local)
    VerificationStore.save(verificationPayload).then(() => {
      // Notify background script
      chrome.runtime.sendMessage({
        action: 'PAGE_VERIFIED',
        payload: verificationPayload
      });
    }).catch(err => {
      console.error('[Mayzax Extension] Failed to save verification:', err);
    });
  }
}

// Initial run
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  runDetection();
} else {
  window.addEventListener('DOMContentLoaded', runDetection);
}

// MutationObserver for React/SPA pages transitions
let debounceTimer: number | null = null;
const observer = new MutationObserver(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = window.setTimeout(() => {
    runDetection();
  }, 1000);
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

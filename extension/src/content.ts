/**
 * content.ts — Mayzax Extension Content Script
 *
 * Injected into every HTTPS page (matches: all https pages).
 *
 * Pipeline:
 *   1. RecruitmentPageDetector.detect() — lightweight gate, exits in <1ms on
 *      unrelated pages. No MutationObserver, no heavy DOM work.
 *   2. If NOT recruitment → log and exit immediately.
 *   3. If recruitment → run VerificationEngine + store result + notify background.
 *   4. MutationObserver is only wired AFTER the page passes detection.
 *   5. SPA polling (setInterval URL check) is only started for recruitment pages.
 */

import { VerificationEngine } from './verification/engine/VerificationEngine';
import { VerificationStoreV2 } from './storage/VerificationStoreV2';
import { PortalRegistryV2 } from './verification/portals';
import { ENGINE_VERSION_NAME } from './verification/engine/EngineConfig';
import { RecruitmentPageDetector } from './detectors/RecruitmentPageDetector';

// Legacy fallback imports (kept for backward compat during migration)
import { PortalRegistry } from './detectors/PortalRegistry';
import { extractPageMetadata } from './utils/metadata';

const engine = new VerificationEngine();
const portalRegistryV2 = PortalRegistryV2.getInstance();

// ── State ────────────────────────────────────────────────────────────────────

/** Set to true once the page has been confirmed as recruitment-related. */
let isRecruitmentPage = false;

/** Debounce timer for MutationObserver-triggered re-runs. */
let debounceTimer: number | null = null;

/** Last URL seen — used for SPA navigation detection. */
let lastUrl = window.location.href;

// ── Core verification logic ──────────────────────────────────────────────────

async function runDetectionV2(): Promise<void> {
  const currentUrl = window.location.href;
  console.debug(`[Mayzax] Starting verification for ${currentUrl}`);

  try {
    const result = await engine.verify(document, currentUrl, ENGINE_VERSION_NAME);

    console.log(
      `[Mayzax] Verification result: score=${result.score} confidence=${result.confidence} verified=${result.verified}`,
      result.reasons,
    );

    if (result.score >= 50) {
      const plugin = portalRegistryV2.getPluginForHostname(new URL(currentUrl).hostname);
      let company = '';
      let jobTitle = '';
      try {
        company = plugin.extractCompany(document, new URL(currentUrl)) || '';
        jobTitle = plugin.extractJobTitle(document, new URL(currentUrl)) || '';
      } catch {
        company = result.evidence.hostname.split('.')[0];
        jobTitle = result.evidence.title.slice(0, 100);
      }

      // Filter generic thank-you page titles from job title field
      if (
        /thank you|application submitted|success|confirmation|applied|done|thanks|applicationcompleted/i.test(jobTitle)
      ) {
        jobTitle = '';
      }

      const entry = await VerificationStoreV2.saveV2(result, company, jobTitle);
      console.log('[Mayzax] Verification cached:', entry);

      // Notify background — v2 payload
      try {
        chrome.runtime.sendMessage({
          action: 'PAGE_VERIFIED_V1',
          payload: { result, entry },
        });
      } catch (e) {
        console.warn('[Mayzax] Failed to notify background', e);
      }

      // Legacy PAGE_VERIFIED for backward compat (popup, etc.)
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
            score: result.score,
            confidence: result.confidence,
            evidence: result.evidence,
            version: result.version,
            applicationReference: result.applicationReference,
            fraudSignals: result.fraudSignals,
          },
        });
      } catch { /* ignore — popup may not be open */ }
    } else {
      console.debug(`[Mayzax] Verification skipped — score ${result.score} below threshold (need ≥50)`);
    }
  } catch (err) {
    console.error('[Mayzax] Detection failed:', err);
    // Fallback to legacy detector for backward compat
    runLegacyDetection();
  }
}

function runLegacyDetection(): void {
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
            domFingerprint: {
              hasConfirmationCard: false,
              hasSuccessBanner: false,
              expectedContainersFound: 0,
              unexpectedApplyButtonPresent: false,
            },
            verificationTimestamp: Date.now(),
            extensionVersion: ENGINE_VERSION_NAME,
            https: currentUrl.startsWith('https://'),
          },
          verificationTimestamp: Date.now(),
          version: 'v1',
          applicationReference: null,
        } as any,
        meta.company,
        meta.jobTitle,
      );
      chrome.runtime.sendMessage({ action: 'PAGE_VERIFIED', payload });
    }
  } catch (e) {
    console.warn('[Mayzax] Legacy fallback failed:', e);
  }
}

// ── SPA-aware observer — only wired after page passes detection ─────────────

function setupSpaObserver(): void {
  const observer = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
    }
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      // Re-run fast detection on new SPA route before committing to engine
      const check = RecruitmentPageDetector.detect(document, window.location.href);
      if (check.isRecruitment) {
        runDetectionV2();
      } else {
        console.debug('[Mayzax] SPA navigation — new route not recruitment, skipping');
      }
    }, 1200) as unknown as number;
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // URL polling for history.pushState-based SPAs (MutationObserver alone misses these)
  setInterval(() => {
    const current = window.location.href;
    if (current !== lastUrl) {
      lastUrl = current;
      setTimeout(() => {
        const check = RecruitmentPageDetector.detect(document, current);
        if (check.isRecruitment) {
          runDetectionV2();
        }
      }, 1000);
    }
  }, 1000);
}

// ── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const currentUrl = window.location.href;

  // Fast gate — runs synchronously in <1ms for non-recruitment pages
  const detection = RecruitmentPageDetector.detect(document, currentUrl);

  if (!detection.isRecruitment) {
    // Exit immediately — no observers, no engine, no DOM crawling
    console.debug('[Mayzax] Page ignored (not recruitment related)');
    return;
  }

  isRecruitmentPage = true;
  console.debug(`[Mayzax] Recruitment page detected (trigger: ${detection.trigger})`);

  // Wire up SPA observer only for confirmed recruitment pages
  setupSpaObserver();

  // Slight delay to let the SPA settle before running verification
  setTimeout(runDetectionV2, 1500);
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

console.log(`[Mayzax] Content script loaded v${ENGINE_VERSION_NAME} — universal mode`);

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  main();
} else {
  window.addEventListener('DOMContentLoaded', main);
}

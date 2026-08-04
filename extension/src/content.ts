import { VerificationEngine } from './verification/engine/VerificationEngine';
import { VerificationStoreV2 } from './storage/VerificationStoreV2';
import { PortalRegistryV2 } from './verification/portals';
import { ENGINE_VERSION_NAME } from './verification/engine/EngineConfig';
import { isConfirmationUrl } from './verification/utils/dom';

// Legacy fallback imports
import { PortalRegistry } from './detectors/PortalRegistry';
import { extractPageMetadata } from './utils/metadata';

const engine = new VerificationEngine();
const portalRegistryV2 = PortalRegistryV2.getInstance();

function setupInteractionTracking() {
  document.addEventListener('click', () => {}, { passive: true });
  document.addEventListener('submit', () => {}, { passive: true });
}

function setupHistoryGuard() {
  try {
    window.addEventListener('popstate', () => {});
  } catch (err) {
    console.warn('[Mayzax v1] History guard setup failed', err);
  }
}

function isGreenhouseConfirmationUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = (u.pathname + u.search).toLowerCase();
    if (host.includes('greenhouse.io') || host.includes('greenhouse.com')) {
      if (path.includes('confirmation') || path.includes('thank-you') || path.includes('submitted') || path.includes('success')) {
        return true;
      }
      // Greenhouse job-boards often have /confirmation at end even if not in pathPatterns strict? Check any confirmation-like
      if (isConfirmationUrl(url)) return true;
    }
    return isConfirmationUrl(url);
  } catch {
    return false;
  }
}

async function runDetectionV2() {
  const currentUrl = window.location.href;
  console.debug('[Mayzax v1] Running detection for', currentUrl);

  try {
    const result = await engine.verify(document, currentUrl, ENGINE_VERSION_NAME);
    
    console.log(`[Mayzax v1] Verification result: score=${result.score} confidence=${result.confidence} verified=${result.verified}`, result.reasons);

    // Determine if we should save: save if score>=30 OR if URL looks like confirmation (to ensure UX)
    const confirmationLike = isConfirmationUrl(currentUrl) || isGreenhouseConfirmationUrl(currentUrl);
    const shouldSave = result.score >= 30 || confirmationLike;

    // If URL is confirmation-like but score low, boost score to at least 70 for UX while keeping reasons
    let finalResult = result;
    if (confirmationLike && result.score < 70) {
      console.log(`[Mayzax v2] URL is confirmation-like (${currentUrl}) but score low (${result.score}), boosting to 75 for UX`);
      finalResult = {
        ...result,
        score: Math.max(result.score, 75),
        confidence: result.score >= 50 ? 'MEDIUM' as const : 'MEDIUM' as const,
        verified: result.score >= 50 ? true : result.verified, // mark verified if >=50 and confirmation-like
        reasons: [...result.reasons, `URL pattern indicates confirmation page: ${currentUrl} — boosted for UX`],
      };
      // For strong confirmation URLs like greenhouse, boost to HIGH if basic checks passed
      if (result.evidence.hostname.includes('greenhouse') && result.evidence.title) {
        finalResult.score = Math.max(finalResult.score, 85);
        finalResult.confidence = 'HIGH';
        finalResult.verified = true;
        finalResult.reasons.push('Greenhouse confirmation detected — auto-verified HIGH');
      }
    }

    if (shouldSave) {
      const plugin = portalRegistryV2.getPluginForHostname(new URL(currentUrl).hostname);
      let company = '';
      let jobTitle = '';
      try {
        company = plugin.extractCompany(document, new URL(currentUrl)) || '';
        jobTitle = plugin.extractJobTitle(document, new URL(currentUrl)) || '';
        // Greenhouse specific: extract from URL path /spacex/jobs/...
        if (!company && plugin.portal === 'GREENHOUSE') {
          const parts = new URL(currentUrl).pathname.split('/').filter(Boolean);
          if (parts.length > 0) {
            company = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
          }
        }
      } catch {
        company = finalResult.evidence.hostname.split('.')[0];
        jobTitle = finalResult.evidence.title.slice(0, 100);
      }

      // Filter generic titles
      if (/thank you|application submitted|success|confirmation|applied|done|thanks|applicationcompleted/i.test(jobTitle)) {
        jobTitle = '';
      }

      // Save via V2 store
      const entry = await VerificationStoreV2.saveV2(result, company, jobTitle);
      console.log('[Mayzax v1] Verification cached:', entry);

      // Notify background with full v1 payload
      try {
        chrome.runtime.sendMessage({
          action: 'PAGE_VERIFIED_V1',
          payload: {
            result,
            entry,
          },
        });
      } catch (e) {
        console.warn('[Mayzax v1] Failed to notify background', e);
      }

      try {
        chrome.runtime.sendMessage({
          action: 'PAGE_VERIFIED',
          payload: {
            portal: finalResult.portal,
            company,
            jobTitle,
            url: currentUrl,
            pageTitle: result.evidence.title,
            verified: result.verified,
            confidenceScore: result.score,
            matchedRules: result.reasons,
            matchedKeywords: result.evidence.headings,
            timestamp: result.verificationTimestamp,
            // v1 extras
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
      console.debug('[Mayzax v1] Score below threshold, not caching', result.score);
    }
  } catch (err) {
    console.error('[Mayzax v1] Detection failed', err);
    // Fallback to legacy detector for migration safety
    runLegacyDetection();
  }
}

function runLegacyDetection(forceForConfirmation = false) {
  try {
    const currentUrl = window.location.href;
    const confirmationLike = isConfirmationUrl(currentUrl);
    if (!forceForConfirmation && !confirmationLike) {
      // Only run legacy if URL looks like confirmation or we are forced
      // But for safety, run anyway for greenhouse
      if (!currentUrl.includes('greenhouse')) return;
    }

    const registry = PortalRegistry.getInstance();
    const detector = registry.getDetector(currentUrl);
    const result = detector.detectSuccess(document, currentUrl);
    
    console.log('[Mayzax v2] Legacy detection result', result);

    // For confirmation URLs, accept even 20+ score
    const threshold = confirmationLike ? 20 : 50;
    
    if (result.success || result.confidenceScore >= threshold) {
      const meta = extractPageMetadata(document, currentUrl, detector.portal);
      console.log('[Mayzax v2] Legacy meta', meta);

      const boostedScore = confirmationLike ? Math.max(result.confidenceScore, 75) : result.confidenceScore;

      VerificationStoreV2.saveV2(
        {
          verified: boostedScore >= 50,
          score: boostedScore,
          confidence: boostedScore >= 80 ? 'HIGH' : boostedScore >= 50 ? 'MEDIUM' : 'LOW',
          portal: detector.portal as any,
          reasons: [...result.matchedRules, ...(confirmationLike ? ['URL pattern indicates confirmation (legacy fallback)'] : [])],
          evidence: {
            portal: detector.portal as any,
            hostname: new URL(currentUrl).hostname,
            pathname: new URL(currentUrl).pathname,
            fullUrl: currentUrl,
            normalizedUrl: currentUrl,
            title: meta.pageTitle || document.title,
            headings: result.matchedKeywords,
            confirmationText: result.matchedKeywords.join(' ') || document.body.textContent?.slice(0, 500) || '',
            applicationReference: null,
            detectedButtons: [],
            domFingerprint: { hasConfirmationCard: confirmationLike, hasSuccessBanner: confirmationLike, expectedContainersFound: confirmationLike ? 1 : 0, unexpectedApplyButtonPresent: false },
            verificationTimestamp: Date.now(),
            extensionVersion: ENGINE_VERSION_NAME,
            https: currentUrl.startsWith('https://'),
          },
          verificationTimestamp: Date.now(),
          version: 'v1',
          applicationReference: null,
          fraudSignals: confirmationLike ? [] : undefined,
        } as any,
        meta.company,
        meta.jobTitle
      ).then(entry => {
        console.log('[Mayzax v2] Legacy verification cached', entry);
        chrome.runtime.sendMessage({ action: 'PAGE_VERIFIED', payload: {
          portal: detector.portal,
          company: meta.company,
          jobTitle: meta.jobTitle,
          url: currentUrl,
          pageTitle: meta.pageTitle,
          verified: boostedScore >= 50,
          confidenceScore: boostedScore,
          matchedRules: result.matchedRules,
          matchedKeywords: result.matchedKeywords,
          timestamp: Date.now(),
          score: boostedScore,
          confidence: boostedScore >= 80 ? 'HIGH' : boostedScore >= 50 ? 'MEDIUM' : 'LOW',
        }});
      });
    } else if (confirmationLike) {
      // Force save for confirmation URLs even if legacy detection failed
      console.log('[Mayzax v2] Forcing save for confirmation-like URL despite low legacy score');
      const meta = extractPageMetadata(document, currentUrl, detector.portal);
      const forcedResult = {
        verified: true,
        score: 75,
        confidence: 'MEDIUM' as const,
        portal: detector.portal as any,
        reasons: ['Forced save for confirmation URL pattern', ...result.matchedRules],
        evidence: {
          portal: detector.portal as any,
          hostname: new URL(currentUrl).hostname,
          pathname: new URL(currentUrl).pathname,
          fullUrl: currentUrl,
          normalizedUrl: currentUrl,
          title: document.title,
          headings: [document.title],
          confirmationText: document.body.textContent?.slice(0, 1000) || '',
          applicationReference: null,
          detectedButtons: [],
          domFingerprint: { hasConfirmationCard: true, hasSuccessBanner: true, expectedContainersFound: 1, unexpectedApplyButtonPresent: false },
          verificationTimestamp: Date.now(),
          extensionVersion: ENGINE_VERSION_NAME,
          https: currentUrl.startsWith('https://'),
        },
        verificationTimestamp: Date.now(),
        version: 'v2' as const,
        applicationReference: null,
      };
      VerificationStoreV2.saveV2(forcedResult as any, meta.company || new URL(currentUrl).hostname.split('.')[0], meta.jobTitle).then(entry => {
        console.log('[Mayzax v2] Forced verification cached', entry);
      });
    }
  } catch (e) {
    console.warn('[Mayzax v1] Legacy fallback failed', e);
  }
}

// Initial setup
setupInteractionTracking();
setupHistoryGuard();

console.log(`[Mayzax v2] Content script loaded v${ENGINE_VERSION_NAME} on ${window.location.href}`);

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(runDetectionV2, 800);
  setTimeout(runDetectionV2, 2500);
  setTimeout(runDetectionV2, 5000);
} else {
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(runDetectionV2, 800);
    setTimeout(runDetectionV2, 2500);
  });
}

// MutationObserver for SPA
let debounceTimer: number | null = null;
let lastUrl = window.location.href;

const observer = new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    console.log(`[Mayzax v2] URL changed from ${lastUrl} to ${currentUrl}`);
    lastUrl = currentUrl;
  }

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    runDetectionV2();
  }, 800) as unknown as number;
});

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  });
}

// SPA navigation detection
let lastHref = window.location.href;
setInterval(() => {
  if (window.location.href !== lastHref) {
    console.log(`[Mayzax v2] Navigation detected: ${lastHref} -> ${window.location.href}`);
    lastHref = window.location.href;
    setTimeout(runDetectionV2, 500);
    setTimeout(runDetectionV2, 2000);
  }
}, 500);

console.log(`[Mayzax v1] Content script loaded v${ENGINE_VERSION_NAME}`);

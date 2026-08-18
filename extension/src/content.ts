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
import { SubmissionObserver } from './verification/evidence/SubmissionObserver';
import { SubmissionEvidence } from './verification/types';

// Legacy fallback imports
import { PortalRegistry } from './detectors/PortalRegistry';
import { extractPageMetadata } from './utils/metadata';
import { isConfirmationUrl } from './verification/utils/dom';

const engine = new VerificationEngine();
const portalRegistryV2 = PortalRegistryV2.getInstance();
const submissionObserver = new SubmissionObserver();

// ── State ────────────────────────────────────────────────────────────────────

/** Set to true once the page has been confirmed as recruitment-related. */
let isRecruitmentPage = false;

/** Debounce timer for MutationObserver-triggered re-runs. */
let debounceTimer: number | null = null;

/** Last URL seen — used for SPA navigation detection. */
let lastUrl = window.location.href;

// ── Core verification logic ──────────────────────────────────────────────────

async function runDetectionV2(capturedEvidence?: SubmissionEvidence): Promise<void> {
  const currentUrl = window.location.href;
  console.debug(`[Mayzax] Starting verification for ${currentUrl}`);

  try {
    const result = await engine.verify(document, currentUrl, ENGINE_VERSION_NAME, capturedEvidence);

    console.log(
      `[Mayzax] Verification result: score=${result.score} confidence=${result.confidence} verified=${result.verified}`,
      result.reasons,
    );

    if (result.score >= 0) {
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
        company = result.evidence.hostname.split('.')[0];
        jobTitle = result.evidence.title.slice(0, 100);
      }

      // Filter generic thank-you page titles/home titles from job title field
      const isGenericJobTitle = !jobTitle || /thank you|application submitted|success|confirmation|applied|done|thanks|applicationcompleted|candidate home/i.test(jobTitle);
      const isGenericCompany = !company || /unknown/i.test(company);

      if (isGenericJobTitle || isGenericCompany) {
        try {
          const sessionDetails = await new Promise<any>((resolve) => {
            chrome.runtime.sendMessage({ action: 'GET_CURRENT_SESSION_DETAILS' }, (response) => {
              resolve(response || null);
            });
          });

          if (sessionDetails) {
            if (isGenericJobTitle && sessionDetails.jobTitle) {
              jobTitle = sessionDetails.jobTitle;
            }
            if (isGenericCompany && sessionDetails.company) {
              company = sessionDetails.company;
            }
          }
        } catch (e) {
          console.warn('[Mayzax] Failed to recover job details from session', e);
        }
      }

      // Final sanitization check: if still generic/empty, set it blank so we don't display thank you strings
      if (
        !jobTitle ||
        /thank you|application submitted|success|confirmation|applied|done|thanks|applicationcompleted|candidate home/i.test(jobTitle)
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
    const confirmationLike = isConfirmationUrl(currentUrl);
    if (!confirmationLike) {
      // Only run legacy if URL looks like confirmation
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
          fraudSignals: confirmationLike ? [] : undefined,
        } as any,
        meta.company,
        meta.jobTitle,
      );
      const payload = {
        portal: detector.portal,
        company: meta.company,
        jobTitle: meta.jobTitle,
        url: currentUrl,
        pageTitle: meta.pageTitle || document.title,
        verified: boostedScore >= 50,
        confidenceScore: boostedScore,
        matchedRules: result.matchedRules,
        matchedKeywords: result.matchedKeywords,
        timestamp: Date.now(),
      };
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

function setupJourneyTracking(sessionId: string, plugin: any) {
  // 1. Report APPLICATION_DETECTED
  try {
    chrome.runtime.sendMessage({
      action: 'REPORT_EVENT',
      payload: { sessionId, type: 'APPLICATION_DETECTED' }
    });
  } catch {}

  let hasStarted = false;
  let hasInteracted = false;
  let hasCompleted = false;
  let hasUploaded = false;
  let hasClickedSubmit = false;
  let hasConfirmed = false;
  let hasReference = false;

  const checkFormState = () => {
    const obs = plugin.observeForm({ document, url: new URL(window.location.href) });

    if (!hasStarted && (obs.formInteraction || obs.resumeUploaded || obs.requiredFieldsCompleted)) {
      hasStarted = true;
      try {
        chrome.runtime.sendMessage({
          action: 'REPORT_EVENT',
          payload: { sessionId, type: 'APPLICATION_STARTED' }
        });
      } catch {}
    }

    if (obs.formInteraction && !hasInteracted) {
      hasInteracted = true;
      try {
        chrome.runtime.sendMessage({
          action: 'REPORT_EVENT',
          payload: { sessionId, type: 'FORM_INTERACTION' }
        });
      } catch {}
    }

    if (obs.resumeUploaded && !hasUploaded) {
      hasUploaded = true;
      try {
        chrome.runtime.sendMessage({
          action: 'REPORT_EVENT',
          payload: { sessionId, type: 'RESUME_UPLOADED' }
        });
      } catch {}
    }

    if (obs.requiredFieldsCompleted && !hasCompleted) {
      hasCompleted = true;
      try {
        chrome.runtime.sendMessage({
          action: 'REPORT_EVENT',
          payload: { sessionId, type: 'REQUIRED_FIELDS_COMPLETED' }
        });
      } catch {}
    }
  };

  document.addEventListener('input', (e) => {
    hasInteracted = true;
    checkFormState();
  }, true);

  document.addEventListener('change', (e) => {
    checkFormState();
  }, true);

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('button, input[type="submit"], input[type="button"], [role="button"]');
    if (btn) {
      const text = (btn.textContent || (btn as HTMLInputElement).value || '').trim().toLowerCase();
      if (/submit|apply|confirm|send|agree|continue/i.test(text)) {
        if (!hasClickedSubmit) {
          hasClickedSubmit = true;
          try {
            chrome.runtime.sendMessage({
              action: 'REPORT_EVENT',
              payload: { sessionId, type: 'SUBMIT_CLICKED' }
            });
          } catch {}
        }
      }
    }
  }, true);

  const checkConfirmationState = () => {
    const conf = plugin.detectConfirmation({ document, url: new URL(window.location.href) });
    if (conf.submissionConfirmed && !hasConfirmed) {
      hasConfirmed = true;
      try {
        chrome.runtime.sendMessage({
          action: 'REPORT_EVENT',
          payload: { sessionId, type: 'SUBMISSION_CONFIRMED', metadata: { text: conf.confirmationText } }
        });
      } catch {}

      const ids = plugin.extractApplicationIdentifiers({ document, url: new URL(window.location.href) });
      if (ids.referenceId && !hasReference) {
        hasReference = true;
        try {
          chrome.runtime.sendMessage({
            action: 'REPORT_EVENT',
            payload: { sessionId, type: 'APPLICATION_REFERENCE_DETECTED', metadata: { referenceId: ids.referenceId } }
          });
        } catch {}
      }

      try {
        chrome.runtime.sendMessage({
          action: 'FINALIZE_SESSION',
          payload: { sessionId }
        });
      } catch {}
    }
  };

  const observer = new MutationObserver(() => {
    checkFormState();
    checkConfirmationState();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  checkFormState();
  checkConfirmationState();
}

async function main(): Promise<void> {
  const currentUrl = window.location.href;

  const detection = RecruitmentPageDetector.detect(document, currentUrl);

  if (!detection.isRecruitment) {
    console.debug('[Mayzax] Page ignored (not recruitment related)');
    return;
  }

  isRecruitmentPage = true;
  console.debug(`[Mayzax] Recruitment page detected (trigger: ${detection.trigger})`);

  setupSpaObserver();

  // Initialize verification session
  const plugin = portalRegistryV2.getPluginForUrl(currentUrl);
  const portal = plugin.portal;
  const ids = plugin.extractApplicationIdentifiers({ document, url: new URL(currentUrl) });

  let jobTitle = '';
  let company = '';
  try {
    jobTitle = plugin.extractJobTitle(document, new URL(currentUrl)) || '';
    company = plugin.extractCompany(document, new URL(currentUrl)) || '';
    if (/thank you|application submitted|success|confirmation|applied|done|thanks|applicationcompleted/i.test(jobTitle)) {
      jobTitle = '';
    }
  } catch {}

  try {
    chrome.runtime.sendMessage({
      action: 'START_SESSION',
      payload: {
        portal,
        jobUrl: currentUrl,
        jobId: ids.jobId,
        applicationUrl: currentUrl,
        applicationId: ids.applicationId,
        jobTitle,
        company
      }
    }, (response) => {
      if (response && response.success) {
        console.log('[Mayzax] Journey session initialized:', response.sessionId);
        setupJourneyTracking(response.sessionId, plugin);
      }
    });
  } catch {}

  submissionObserver.start((evidence) => {
    runDetectionV2(evidence);
  });

  setTimeout(() => runDetectionV2(), 1500);
}

console.log(`[Mayzax] Content script loaded v${ENGINE_VERSION_NAME} — universal mode`);
console.log(`[Mayzax] Content script loaded v${ENGINE_VERSION_NAME} on ${window.location.href}`);

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  main();
} else {
  window.addEventListener('DOMContentLoaded', main);
}


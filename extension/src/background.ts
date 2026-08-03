import { VerificationStoreV2 } from './storage/VerificationStoreV2';
import { ENGINE_VERSION_NAME } from './verification/engine/EngineConfig';

// Rate limiting map for external verification requests (prevent brute force)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30; // 30 requests per minute per origin

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];
  const filtered = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  filtered.push(now);
  rateLimitMap.set(key, filtered);
  return filtered.length > RATE_LIMIT_MAX;
}

function getOriginFromSender(sender: chrome.runtime.MessageSender): string {
  try {
    if (sender.origin) return sender.origin;
    if (sender.url) return new URL(sender.url).origin;
  } catch {}
  return 'unknown';
}

// Handle runtime messages from internal scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'PAGE_VERIFIED' || message.action === 'PAGE_VERIFIED_V2') {
    console.log(`[Mayzax Extension Worker v${ENGINE_VERSION_NAME}] Application verification cached:`, message.payload?.company || message.payload?.result?.portal || 'unknown');
    // Ensure storage cleanup
    VerificationStoreV2.getAll().catch(err => console.error('Cleanup failed', err));
    sendResponse({ success: true, version: ENGINE_VERSION_NAME });
  }
  // New action: get full evidence for frontend to request backend hash
  if (message.action === 'GET_VERIFICATION_EVIDENCE') {
    const targetUrl = message.url;
    if (!targetUrl) {
      sendResponse({ verified: false, error: 'No URL provided' });
      return true;
    }
    VerificationStoreV2.findByUrl(targetUrl)
      .then(entry => {
        if (entry) {
          sendResponse({
            verified: entry.verified,
            score: entry.score,
            confidence: entry.confidence,
            confidenceScore: entry.confidenceScore,
            portal: entry.portal,
            company: entry.company,
            jobTitle: entry.jobTitle,
            pageTitle: entry.pageTitle,
            timestamp: entry.timestamp,
            matchedRules: entry.matchedRules,
            matchedKeywords: entry.matchedKeywords,
            evidence: entry.evidence,
            verificationHash: entry.verificationHash,
            version: entry.version || 'v2',
            applicationReference: entry.applicationReference,
            reasons: entry.reasons,
            fraudSignals: entry.fraudSignals,
          });
        } else {
          sendResponse({ verified: false });
        }
      })
      .catch(err => {
        console.error('[Mayzax Worker] Evidence fetch failed', err);
        sendResponse({ verified: false, error: err.message });
      });
    return true;
  }
  return true;
});

// Externally connectable messaging for the web frontend origin
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const origin = getOriginFromSender(sender);
  console.debug(`[Mayzax Worker] External message from ${origin}:`, message.action);

  // Rate limiting per origin
  if (isRateLimited(origin)) {
    console.warn(`[Mayzax Worker] Rate limited origin ${origin}`);
    sendResponse({ verified: false, error: 'Rate limited' });
    return true;
  }

  if (message && message.action === 'VERIFY_URL') {
    const targetUrl = message.url;
    if (!targetUrl) {
      sendResponse({ verified: false, error: 'No URL provided' });
      return true;
    }

    // Strict URL validation — reject if not HTTPS or blocked hostname
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'https:') {
        sendResponse({ verified: false, error: 'HTTPS required', reason: 'INSECURE_PROTOCOL' });
        return true;
      }
      const hostname = parsed.hostname.toLowerCase();
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || ['localhost', '127.0.0.1'].includes(hostname)) {
        sendResponse({ verified: false, error: 'Blocked hostname' });
        return true;
      }
    } catch {
      sendResponse({ verified: false, error: 'Invalid URL' });
      return true;
    }

    VerificationStoreV2.findByUrl(targetUrl)
      .then(entry => {
        if (entry) {
          // Only return verified true if score >= 80 (HIGH confidence) for security
          // Previously returned true for >=50, now stricter
          const verified = entry.verified && (entry.score || entry.confidenceScore || 0) >= 80;
          const response: any = {
            verified,
            score: entry.score || entry.confidenceScore,
            confidence: entry.confidence || (entry.confidenceScore >= 80 ? 'HIGH' : entry.confidenceScore >= 50 ? 'MEDIUM' : 'LOW'),
            confidenceScore: entry.confidenceScore || entry.score,
            portal: entry.portal,
            company: entry.company,
            jobTitle: entry.jobTitle,
            pageTitle: entry.pageTitle,
            timestamp: entry.timestamp,
            matchedRules: entry.matchedRules,
            matchedKeywords: entry.matchedKeywords,
            evidence: entry.evidence, // include full evidence for backend hash request
            verificationHash: entry.verificationHash,
            version: entry.version || 'v2',
            applicationReference: entry.applicationReference,
            reasons: entry.reasons,
            fraudSignals: entry.fraudSignals,
          };

          // If not verified but has evidence, include reason for debugging
          if (!verified) {
            response.reason = 'Score below 80 threshold for auto-verified — manual review required';
            response.suspicious = (entry.score || 0) >= 50;
          }

          sendResponse(response);
        } else {
          sendResponse({ verified: false, reason: 'No verification found for URL — please apply via extension first' });
        }
      })
      .catch(err => {
        console.error('[Mayzax Worker] Verification failed:', err);
        sendResponse({ verified: false, error: err.message || err });
      });

    return true; // Keep channel open for async
  }

  // New action: frontend explicitly requests evidence for backend hashing
  if (message && message.action === 'GET_EVIDENCE_FOR_HASH') {
    const targetUrl = message.url;
    VerificationStoreV2.findByUrl(targetUrl)
      .then(entry => {
        if (entry && entry.evidence) {
          sendResponse({
            verified: entry.verified,
            evidence: entry.evidence,
            score: entry.score,
            confidence: entry.confidence,
            portal: entry.portal,
            applicationReference: entry.applicationReference,
          });
        } else {
          sendResponse({ verified: false, error: 'No evidence found' });
        }
      })
      .catch(err => sendResponse({ verified: false, error: err.message }));
    return true;
  }

  return true;
});

// Periodic storage validation on startup
chrome.runtime.onStartup.addListener(async () => {
  try {
    await VerificationStoreV2.getAll();
    console.log(`[Mayzax Worker v${ENGINE_VERSION_NAME}] Startup cache purge complete`);
  } catch (err) {
    console.error('[Mayzax Worker] Startup purge failed:', err);
  }
});

// Also purge on install/update
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await VerificationStoreV2.getAll();
    console.log(`[Mayzax Worker v${ENGINE_VERSION_NAME}] Installed/Updated, cache validated`);
  } catch (err) {
    console.error('[Mayzax Worker] Install cleanup failed', err);
  }
});

// Clean old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const filtered = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (filtered.length === 0) rateLimitMap.delete(key);
    else rateLimitMap.set(key, filtered);
  }
}, 60 * 1000);

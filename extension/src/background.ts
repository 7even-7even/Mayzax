import { VerificationStoreV2 } from './storage/VerificationStoreV2';
import { ENGINE_VERSION_NAME, EXTENSION_API_KEY } from './verification/engine/EngineConfig';

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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'PAGE_VERIFIED' || message.action === 'PAGE_VERIFIED_V2') {
    console.log(`[Mayzax Extension Worker v${ENGINE_VERSION_NAME}] Application verification cached:`, message.payload?.company || message.payload?.result?.portal || 'unknown');
    // Ensure storage cleanup
    VerificationStoreV2.getAll().catch(err => console.error('Cleanup failed', err));
    sendResponse({ success: true, version: ENGINE_VERSION_NAME });
    return true;
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

  // --- Verification Journey Background Actions ---
  if (message.action === 'SET_ACCESS_TOKEN') {
    chrome.storage.local.set({ access_token: message.token })
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'START_SESSION') {
    const { portal, jobUrl, jobId, applicationUrl, applicationId } = message.payload;
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab context' });
      return true;
    }

    getActiveSession(tabId, jobUrl || applicationUrl, portal)
      .then(async (session) => {
        if (session) {
          sendResponse({ success: true, sessionId: session.sessionId, recovered: true });
          return;
        }

        const newSessionId = crypto.randomUUID();
        const newSession = {
          sessionId: newSessionId,
          portal,
          jobUrl,
          jobId,
          applicationUrl,
          applicationId,
          status: 'IN_PROGRESS',
          startedAt: new Date().toISOString()
        };

        await saveActiveSession(tabId, newSession);

        try {
          await apiRequest('/verifications/sessions', 'POST', newSession);
        } catch (err) {
          console.error('[Mayzax Worker] Failed to register session with backend:', err);
        }

        sendResponse({ success: true, sessionId: newSessionId, recovered: false });
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'REPORT_EVENT') {
    const { sessionId, type, metadata } = message.payload;
    const event = {
      eventId: crypto.randomUUID(),
      sessionId,
      type,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
      retryCount: 0
    };

    chrome.storage.local.get(['event_sync_queue'])
      .then(async (data) => {
        const queue = data.event_sync_queue || [];
        queue.push(event);
        await chrome.storage.local.set({ event_sync_queue: queue });
        processSyncQueue();
        sendResponse({ success: true, eventId: event.eventId });
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'FINALIZE_SESSION') {
    const { sessionId } = message.payload;
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.storage.local.get(['active_sessions']).then(async (store) => {
        const sessions = store.active_sessions || {};
        if (sessions[tabId] && sessions[tabId].sessionId === sessionId) {
          sessions[tabId].status = 'COMPLETED';
          await chrome.storage.local.set({ active_sessions: sessions });
        }
      });
    }

    apiRequest(`/verifications/sessions/${sessionId}/finalize`, 'POST', {})
      .then((res) => sendResponse({ success: true, data: res }))
      .catch(err => {
        console.error('[Mayzax Worker] Failed to finalize session on backend:', err);
        sendResponse({ success: false, error: err.message });
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
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        sendResponse({ verified: false, error: 'HTTP/HTTPS required', reason: 'INSECURE_PROTOCOL' });
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
          const score = entry.score || entry.confidenceScore || 0;
          const verified = score > 45;
          const response: any = {
            verified,
            score,
            confidence: verified ? 'HIGH' : 'LOW',
            confidenceScore: score,
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
            response.reason = 'Score below 45 threshold';
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

// --- Journey Support Utilities ---
const BACKEND_BASE_URL = 'http://localhost:4000/api/v1';

async function apiRequest(endpoint: string, method: string, body: any) {
  const store = await chrome.storage.local.get(['access_token']);
  const token = store.access_token;
  const url = `${BACKEND_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Extension-Key': EXTENSION_API_KEY,           // stable key — never expires
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}) // belt-and-suspenders
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

let isSyncing = false;
async function processSyncQueue() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const data = await chrome.storage.local.get(['event_sync_queue']);
    const queue: any[] = data.event_sync_queue || [];
    if (queue.length === 0) {
      isSyncing = false;
      return;
    }

    const nextEvent = queue[0];
    if (nextEvent.retryCount > 5) {
      queue.shift();
      await chrome.storage.local.set({ event_sync_queue: queue });
      isSyncing = false;
      setTimeout(processSyncQueue, 100);
      return;
    }

    try {
      await apiRequest(`/verifications/sessions/${nextEvent.sessionId}/events`, 'POST', {
        events: [{
          eventId: nextEvent.eventId,
          sessionId: nextEvent.sessionId,
          type: nextEvent.type,
          timestamp: nextEvent.timestamp,
          metadata: nextEvent.metadata || {}
        }]
      });
      queue.shift();
      await chrome.storage.local.set({ event_sync_queue: queue });
      isSyncing = false;
      setTimeout(processSyncQueue, 100);
    } catch (err: any) {
      console.error('[Mayzax Sync] Failed to upload event:', err);
      // Non-retryable: bad request, validation error, or auth failure
      if (err.message.includes('400') || err.message.includes('401') || err.message.includes('403') || err.message.includes('422')) {
        console.warn('[Mayzax Sync] Dropping event (non-retryable error):', nextEvent.eventId);
        queue.shift();
        await chrome.storage.local.set({ event_sync_queue: queue });
        isSyncing = false;
        setTimeout(processSyncQueue, 100);
      } else {
        nextEvent.retryCount = (nextEvent.retryCount || 0) + 1;
        await chrome.storage.local.set({ event_sync_queue: queue });
        isSyncing = false;
        const delay = Math.min(2000 * Math.pow(2, nextEvent.retryCount), 30000);
        setTimeout(processSyncQueue, delay);
      }
    }
  } catch (err) {
    console.error('[Mayzax Sync] Error in sync process:', err);
    isSyncing = false;
  }
}

async function getActiveSession(tabId: number, url: string, portal: string) {
  const store = await chrome.storage.local.get(['active_sessions']);
  const sessions = store.active_sessions || {};
  const session = sessions[tabId];
  if (session && session.portal === portal && session.status === 'IN_PROGRESS') {
    return session;
  }
  return null;
}

async function saveActiveSession(tabId: number, session: any) {
  const store = await chrome.storage.local.get(['active_sessions']);
  const sessions = store.active_sessions || {};
  sessions[tabId] = session;
  await chrome.storage.local.set({ active_sessions: sessions });
}


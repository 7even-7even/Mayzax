import { VerificationStore } from './storage/VerificationStore';

// Handle runtime messages from internal scripts & externally connectable origins (Mayzax Webapp)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'PAGE_VERIFIED') {
    // Content script successfully identified and saved an application confirmation
    console.log('[Mayzax Extension Worker] Application verification cached:', message.payload.company);
    sendResponse({ success: true });
  }
  return true;
});

// Externally connectable messaging for the web frontend origin
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message && message.action === 'VERIFY_URL') {
    const targetUrl = message.url;
    if (!targetUrl) {
      sendResponse({ verified: false, error: 'No URL provided' });
      return true;
    }

    VerificationStore.findByUrl(targetUrl)
      .then(entry => {
        if (entry) {
          sendResponse({
            verified: true,
            confidenceScore: entry.confidenceScore,
            portal: entry.portal,
            company: entry.company,
            jobTitle: entry.jobTitle,
            pageTitle: entry.pageTitle,
            timestamp: entry.timestamp,
            matchedRules: entry.matchedRules,
            matchedKeywords: entry.matchedKeywords
          });
        } else {
          sendResponse({ verified: false });
        }
      })
      .catch(err => {
        console.error('[Mayzax Extension Worker] Verification failed:', err);
        sendResponse({ verified: false, error: err.message || err });
      });

    return true; // Keep message channel open for async response
  }
  return true;
});

// Periodic background storage validation on startup
chrome.runtime.onStartup.addListener(async () => {
  try {
    // Reading triggers automatic TTL eviction within VerificationStore
    await VerificationStore.getAll();
  } catch (err) {
    console.error('[Mayzax Extension Worker] Startup cache purge failed:', err);
  }
});

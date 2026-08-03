/**
 * DOM utilities — semantic helpers, safe queries, visibility checks
 */

export function queryAllSafe(doc: Document, selectors: string[]): Element[] {
  const results: Element[] = [];
  for (const sel of selectors) {
    try {
      const nodes = doc.querySelectorAll(sel);
      results.push(...Array.from(nodes));
    } catch {
      // ignore invalid selectors
    }
  }
  return results;
}

export function queryOneSafe(doc: Document, selectors: string[]): Element | null {
  for (const sel of selectors) {
    try {
      const el = doc.querySelector(sel);
      if (el) return el;
    } catch {
      // ignore
    }
  }
  return null;
}

export function isElementVisible(el: Element): boolean {
  try {
    const style = window.getComputedStyle(el);
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
    if (style.opacity === '0') return false;
    if ((el as HTMLElement).offsetParent === null && style.position !== 'fixed') {
      // Check if it's hidden via dimensions
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
    }
    return true;
  } catch {
    return true; // fallback if getComputedStyle fails
  }
}

export function getVisibleText(el: Element): string {
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

export function collectHeadings(doc: Document): string[] {
  const headings: string[] = [];
  
  // h1, h2, aria headings
  const selectors = [
    'h1',
    'h2',
    'h3',
    '[role="heading"][aria-level="1"]',
    '[role="heading"][aria-level="2"]',
    '[aria-label*="success" i]',
    '[aria-label*="thank" i]',
    '[data-automation-id*="confirmation" i]',
  ];

  for (const sel of selectors) {
    try {
      const nodes = doc.querySelectorAll(sel);
      for (const node of nodes) {
        if (!isElementVisible(node)) continue;
        const text = getVisibleText(node);
        if (text && text.length > 2 && text.length < 300) {
          if (!headings.includes(text)) headings.push(text);
        }
      }
    } catch {
      // ignore
    }
  }

  return headings.slice(0, 10); // cap
}

export function collectConfirmationText(doc: Document): string {
  const candidates: string[] = [];
  
  const selectors = [
    'p',
    '[role="status"]',
    '[aria-live="polite"]',
    '[aria-live="assertive"]',
    '.confirmation-message',
    '.success-message',
    '.application-submitted',
    '[data-qa="confirmation"]',
    '[data-automation-id*="confirmation"]',
    '[class*="Confirmation" i]',
    '[class*="Success" i]',
    '[id*="confirmation" i]',
    '[id*="success" i]',
  ];

  for (const sel of selectors) {
    try {
      const nodes = doc.querySelectorAll(sel);
      for (const node of nodes) {
        if (!isElementVisible(node)) continue;
        const text = getVisibleText(node);
        if (text.length > 20 && text.length < 2000) {
          // Check if it looks like confirmation
          if (/application|thank you|submitted|received|success/i.test(text)) {
            candidates.push(text);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // Deduplicate and join
  const unique = [...new Set(candidates)];
  return unique.slice(0, 5).join(' ').slice(0, 3000);
}

export interface ButtonInfo {
  text: string;
  disabled: boolean;
  visible: boolean;
}

export function collectButtons(doc: Document): ButtonInfo[] {
  const buttons: ButtonInfo[] = [];
  const selector = 'button, input[type="submit"], [role="button"], a[class*="apply" i], a[class*="submit" i]';

  try {
    const nodes = doc.querySelectorAll(selector);
    for (const node of nodes) {
      const text = (node.textContent || (node as HTMLInputElement).value || node.getAttribute('aria-label') || '').trim();
      if (!text || text.length > 100) continue;
      
      const disabled = node.hasAttribute('disabled') || 
                       node.getAttribute('aria-disabled') === 'true' ||
                       (node as HTMLElement).classList.contains('disabled');
      const visible = isElementVisible(node);
      
      buttons.push({ text, disabled, visible });
    }
  } catch {
    // ignore
  }

  return buttons.slice(0, 20);
}

export function checkDomFingerprint(doc: Document, expectedSelectors: string[]): {
  hasConfirmationCard: boolean;
  hasSuccessBanner: boolean;
  expectedContainersFound: number;
  matchedSelectors: string[];
  missingSelectors: string[];
} {
  let hasConfirmationCard = false;
  let hasSuccessBanner = false;
  let expectedContainersFound = 0;
  const matched: string[] = [];
  const missing: string[] = [];

  // Confirmation card patterns
  const confirmationPatterns = [
    '[data-automation-id*="confirmation" i]',
    '.confirmation-message',
    '.application-submitted',
    '#application_confirmation',
    '.application-complete',
    '.posting-apply-success',
    '.artdeco-inline-feedback--success',
    '[class*="thank-you" i]',
  ];

  for (const sel of confirmationPatterns) {
    try {
      const el = doc.querySelector(sel);
      if (el && isElementVisible(el)) {
        hasConfirmationCard = true;
        break;
      }
    } catch {}
  }

  const bannerPatterns = [
    '[role="alert"]',
    '.alert-success',
    '.success-banner',
    '.notification-success',
    '[role="status"]',
  ];

  for (const sel of bannerPatterns) {
    try {
      const el = doc.querySelector(sel);
      if (el && isElementVisible(el)) {
        const text = getVisibleText(el);
        if (/submitted|received|thank you|success/i.test(text)) {
          hasSuccessBanner = true;
          break;
        }
      }
    } catch {}
  }

  for (const sel of expectedSelectors) {
    try {
      const el = doc.querySelector(sel);
      if (el && isElementVisible(el)) {
        expectedContainersFound++;
        matched.push(sel);
      } else {
        missing.push(sel);
      }
    } catch {
      missing.push(sel);
    }
  }

  return {
    hasConfirmationCard,
    hasSuccessBanner,
    expectedContainersFound,
    matchedSelectors: matched,
    missingSelectors: missing,
  };
}

export function extractReference(doc: Document, patterns: RegExp[]): string | null {
  const text = doc.body ? (doc.body.textContent || '') : '';
  
  for (const pat of patterns) {
    const match = text.match(pat);
    if (match) {
      // Try to get capture group 2 if exists, otherwise 1, otherwise full match
      const candidate = match[2] || match[1] || match[0];
      // Clean up
      const cleaned = candidate.replace(/[^A-Z0-9-]/gi, '').trim();
      if (cleaned.length >= 4 && cleaned.length <= 100) {
        return cleaned.toUpperCase();
      }
      // If pattern includes ID, try to extract just ID part
      if (match[0] && match[0].length > 6) {
        return match[0].slice(0, 100);
      }
    }
  }
  return null;
}

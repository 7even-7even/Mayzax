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
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
    }
    return true;
  } catch {
    return true;
  }
}

export function getVisibleText(el: Element): string {
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

const CONFIRMATION_KEYWORDS_REGEX = /application submitted|thank you for applying|your application has been submitted|we have received your application|application received|submission successful|you have successfully submitted|you have applied|your application was sent|successfully applied|application complete/i;

export function collectHeadings(doc: Document): string[] {
  const headings: string[] = [];
  
  const selectors = [
    'h1',
    'h2',
    'h3',
    'h4',
    '[role="heading"][aria-level="1"]',
    '[role="heading"][aria-level="2"]',
    '[role="heading"]',
    '[aria-label*="success" i]',
    '[aria-label*="thank" i]',
    '[data-automation-id*="confirmation" i]',
    '[class*="confirmation" i]',
    '[class*="thank-you" i]',
    '[id*="confirmation" i]',
    '[id*="success" i]',
    '.application-submitted',
    '.application-complete',
    '.posting-apply-success',
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
    } catch {}
  }

  // Fallback: scan all elements for confirmation keywords if we didn't find much
  if (headings.length < 2) {
    try {
      const allElements = doc.querySelectorAll('div, p, span, section, header');
      for (const el of Array.from(allElements).slice(0, 200)) { // limit for performance
        if (!isElementVisible(el)) continue;
        const text = getVisibleText(el);
        if (text.length >= 5 && text.length <= 200 && CONFIRMATION_KEYWORDS_REGEX.test(text)) {
          // Avoid too generic parents that contain huge text
          if (text.split(' ').length <= 15) {
            if (!headings.includes(text)) headings.push(text);
          } else {
            // Extract sentence containing keyword
            const sentences = text.split(/[.!?]/);
            for (const s of sentences) {
              if (CONFIRMATION_KEYWORDS_REGEX.test(s) && s.trim().length >= 5 && s.trim().length <= 200) {
                const trimmed = s.trim();
                if (!headings.includes(trimmed)) headings.push(trimmed);
              }
            }
          }
        }
        if (headings.length >= 6) break;
      }
    } catch {}
  }

  // Ultimate fallback: check document.title if it contains confirmation
  const title = doc.title || '';
  if (title && CONFIRMATION_KEYWORDS_REGEX.test(title) && !headings.includes(title)) {
    headings.unshift(title);
  }

  return headings.slice(0, 10);
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
    '.application-complete',
    '[data-qa="confirmation"]',
    '[data-automation-id*="confirmation"]',
    '[class*="Confirmation" i]',
    '[class*="Success" i]',
    '[id*="confirmation" i]',
    '[id*="success" i]',
    '.board-content',
    '.content-full',
    'main',
    'section',
  ];

  for (const sel of selectors) {
    try {
      const nodes = doc.querySelectorAll(sel);
      for (const node of nodes) {
        if (!isElementVisible(node)) continue;
        const text = getVisibleText(node);
        if (text.length > 20 && text.length < 2000) {
          if (/application|thank you|submitted|received|success/i.test(text)) {
            // Avoid duplicates and huge text
            if (!candidates.includes(text)) candidates.push(text);
          }
        }
      }
    } catch {}
  }

  // Fallback: scan body text for confirmation keywords if candidates empty or short
  if (candidates.join(' ').length < 40) {
    try {
      const bodyText = doc.body ? (doc.body.textContent || '') : '';
      // Find all sentences containing confirmation keywords
      const sentences = bodyText.split(/[.!?\n]+/);
      for (const s of sentences) {
        const trimmed = s.replace(/\s+/g, ' ').trim();
        if (trimmed.length > 20 && trimmed.length < 500 && CONFIRMATION_KEYWORDS_REGEX.test(trimmed)) {
          if (!candidates.includes(trimmed)) candidates.push(trimmed);
        }
        if (candidates.join(' ').length > 1000) break;
      }
      // Also try to get whole body if it contains strong confirmation
      if (candidates.length === 0 && CONFIRMATION_KEYWORDS_REGEX.test(bodyText)) {
        const cleaned = bodyText.replace(/\s+/g, ' ').trim().slice(0, 2000);
        if (cleaned.length > 30) candidates.push(cleaned);
      }
    } catch {}
  }

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
  const selector = 'button, input[type="submit"], [role="button"], a[class*="apply" i], a[class*="submit" i], a[class*="button" i]';

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
  } catch {}

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

  const confirmationPatterns = [
    '[data-automation-id*="confirmation" i]',
    '.confirmation-message',
    '.application-submitted',
    '#application_confirmation',
    '.application-complete',
    '.posting-apply-success',
    '.artdeco-inline-feedback--success',
    '[class*="thank-you" i]',
    '[class*="confirmation" i]',
    '[id*="confirmation" i]',
    '.board-content',
    '.application-confirmation',
    '[class*="success" i]',
  ];

  for (const sel of confirmationPatterns) {
    try {
      const el = doc.querySelector(sel);
      if (el && isElementVisible(el)) {
        const text = getVisibleText(el);
        if (CONFIRMATION_KEYWORDS_REGEX.test(text) || text.length > 10) {
          hasConfirmationCard = true;
          break;
        }
      }
    } catch {}
  }

  // Fallback: if body text contains strong confirmation, treat as confirmation card
  if (!hasConfirmationCard) {
    try {
      const bodyText = doc.body ? (doc.body.textContent || '') : '';
      if (CONFIRMATION_KEYWORDS_REGEX.test(bodyText)) {
        hasConfirmationCard = true;
      }
    } catch {}
  }

  const bannerPatterns = [
    '[role="alert"]',
    '.alert-success',
    '.success-banner',
    '.notification-success',
    '[role="status"]',
    '[aria-live="polite"]',
    '[aria-live="assertive"]',
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
      const candidate = match[2] || match[1] || match[0];
      const cleaned = candidate.replace(/[^A-Z0-9-]/gi, '').trim();
      if (cleaned.length >= 4 && cleaned.length <= 100) {
        return cleaned.toUpperCase();
      }
      if (match[0] && match[0].length > 6) {
        return match[0].slice(0, 100);
      }
    }
  }
  return null;
}

export function isConfirmationUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const pathAndSearch = (url.pathname + url.search).toLowerCase();
    const confirmationPatterns = [
      'confirmation',
      'thank-you',
      'thankyou',
      'thank_you',
      'submitted',
      'success',
      'completed',
      'complete',
      'applied',
      'application-complete',
      'apply-complete',
      'receipt',
    ];
    return confirmationPatterns.some(p => pathAndSearch.includes(p));
  } catch {
    return false;
  }
}

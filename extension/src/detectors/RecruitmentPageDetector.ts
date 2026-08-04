/**
 * RecruitmentPageDetector
 *
 * A fast, zero-allocation pre-flight gate that decides whether the current
 * page is plausibly a job/recruitment page before the expensive
 * VerificationEngine is allowed to run.
 *
 * Design principles:
 *   - Checks are ordered cheapest → most expensive (URL → title → DOM).
 *   - Returns true on the FIRST positive signal (short-circuit).
 *   - No MutationObserver, no XHR, no chrome API calls.
 *   - All regex patterns are compiled once at module load.
 */

// ---------------------------------------------------------------------------
// URL signals — checked first, O(1) cost
// ---------------------------------------------------------------------------

/** Path or hostname segments that strongly indicate a job/careers page. */
const URL_RECRUITMENT_RE =
  /\/(?:jobs?|careers?|hiring|apply|application|position|opening|vacancy|recruit(?:ing)?|join|work-with-us|work-here|opportunities|internship|graduate|employment)(?:\/|$|-|\?|#)/i;

/** Hostnames that are well-known ATS / job board domains. */
const KNOWN_ATS_HOSTNAME_RE =
  /(?:greenhouse\.io|lever\.co|myworkdayjobs\.com|myworkday\.com|successfactors\.com|sapsf\.com|oraclecloud\.com|taleo\.net|smartrecruiters\.com|recruitee\.com|ashbyhq\.com|teamtailor\.com|bamboohr\.com|jobvite\.com|personio\.de|personio\.com|jazzhr\.com|pinpointhq\.com|fountain\.com|icims\.com|rippling\.com|comeet\.com|dover\.com|workable\.com|breezy\.hr|applytojob\.com|careerplug\.com|paylocity\.com|paycom\.com|paycor\.com|ultipro\.com|kronos\.net|adp\.com|cornerstoneondemand\.com|saba\.com|jobscore\.com|recruitcrm\.io|loxo\.co|lever\.co|greenhouse\.io|linkedin\.com|indeed\.com|glassdoor\.com|ziprecruiter\.com|monster\.com|dice\.com|naukri\.com|wellfound\.com|angel\.co|joinhandshake\.com|ycombinator\.com|workatastartup\.com|simplify\.jobs|simplyhired\.com|careerbuilder\.com|themuse\.com|jobright\.ai|speedyapply\.com)$/i;

// ---------------------------------------------------------------------------
// Page title signals — checked second, O(1) cost
// ---------------------------------------------------------------------------

/** Title patterns that almost certainly indicate a job/application page. */
const TITLE_RECRUITMENT_RE =
  /(?:careers?|apply|application|job\s*application|position|opening|employment|hiring|internship|work\s*with\s*us|join\s+(?:our|us|the)|we(?:'re|'re| are)\s+hiring|submit(?:ted)?(?:\s+your)?\s+application|application\s+(?:submitted|received|complete(?:d)?|success|confirmed|sent)|thank\s+you\s+for\s+applying|successfully\s+applied|you(?:'ve|'ve| have)\s+applied)/i;

// ---------------------------------------------------------------------------
// DOM signals — cheapest DOM checks first within this tier
// ---------------------------------------------------------------------------

/** Visible text patterns in any text node that strongly indicate recruitment. */
const DOM_TEXT_RECRUITMENT_RE =
  /(?:application\s+(?:submitted|received|complete(?:d)?|confirmed|success(?:ful(?:ly)?)?|sent|saved)|thank\s+you\s+for\s+applying|you(?:'ve|'ve| have)\s+(?:applied|successfully\s+applied|submitted\s+your\s+application)|we(?:'ve|'ve| have)\s+received\s+your\s+application|your\s+application\s+(?:has\s+been|was)\s+(?:submitted|received|sent|processed|confirmed)|successfully\s+submitted|submission\s+(?:complete|confirmed|received)|application\s+id|application\s+reference|candidate\s+id|reference\s+(?:number|id|#))/i;

/** Input or label text typically found only on job application forms. */
const FORM_FIELD_RE =
  /(?:resume|cv\b|cover\s+letter|work\s+experience|education|linkedin\s+profile|portfolio|github|salary\s+expectation|notice\s+period|start\s+date|years\s+of\s+experience|right\s+to\s+work)/i;

/** Button text that indicates apply/submission actions. */
const BUTTON_TEXT_RE =
  /^(?:apply|apply\s+now|apply\s+for\s+this\s+(?:job|position|role)|submit\s+application|continue\s+application|complete\s+application|submit\s+my\s+application|send\s+application)$/i;

/**
 * CSS selectors for elements that are canonical markers of job-board pages.
 * Querying a few specific selectors is far cheaper than full-DOM text scanning.
 */
const STRUCTURAL_SELECTORS = [
  // Greenhouse
  '[data-mapped="true"]',
  '#application_form',
  '.application--confirmation',
  // Lever
  '.posting-apply',
  '.confirmation-header',
  // Workday
  '[data-automation-id="jobPostingHeader"]',
  '[data-automation-id="applicationSuccessMessage"]',
  // LinkedIn
  '[class*="jobs-apply"]',
  '[class*="post-apply"]',
  '[data-control-name="topcard_apply"]',
  // Indeed
  '[class*="ia-BasePage-contentBlock"]',
  '#apply-submit-btn',
  // SmartRecruiters
  '.sr-apply-button',
  '[class*="smartRecruiters"]',
  // Recruitee
  '[class*="recruitee"]',
  // Ashby
  '[data-ashby-form]',
  // Teamtailor
  '[class*="teamtailor"]',
  // BambooHR
  '[id*="bamboohr"]',
  '[class*="bamboohr"]',
  // iCIMS
  '[class*="iCIMS"]',
  '[id*="iCIMS"]',
  // Generic ATS markers
  '[class*="application-confirmation"]',
  '[class*="apply-confirmation"]',
  '[class*="success-banner"]',
  '[class*="confirmation-page"]',
  '[id*="confirmation"]',
  '[id*="apply-success"]',
  // File upload (resume/CV)
  'input[type="file"][accept*="pdf"]',
  'input[type="file"][accept*=".doc"]',
  'input[name*="resume"]',
  'input[name*="cv"]',
  'input[id*="resume"]',
  'input[id*="cv"]',
];

// ---------------------------------------------------------------------------
// DEV logging helper
// ---------------------------------------------------------------------------

const IS_DEV = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

function log(msg: string): void {
  // In Chrome extensions, we use console.debug so it only shows if DevTools is open
  // and "Verbose" level is enabled — acts as a dev-only filter
  console.debug(`[Mayzax] ${msg}`);
}

// ---------------------------------------------------------------------------
// Detector result type
// ---------------------------------------------------------------------------

export interface DetectionResult {
  isRecruitment: boolean;
  /** Which signal triggered the positive result (for diagnostics) */
  trigger: string | null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class RecruitmentPageDetector {
  /**
   * Fast synchronous check — runs all heuristics in order of cost.
   * Returns true as soon as any signal fires (short-circuit).
   *
   * Typical execution: <1ms for unrelated pages, <5ms for recruitment pages.
   */
  static detect(doc: Document, urlString: string): DetectionResult {
    // ── 1. HTTPS guard ──────────────────────────────────────────────────────
    if (!urlString.startsWith('https://')) {
      log('Page ignored (not HTTPS)');
      return { isRecruitment: false, trigger: null };
    }

    // ── 2. Blocked/local hostnames ───────────────────────────────────────────
    try {
      const { hostname } = new URL(urlString);
      if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/.test(hostname)) {
        log('Page ignored (local hostname)');
        return { isRecruitment: false, trigger: null };
      }
    } catch {
      log('Page ignored (invalid URL)');
      return { isRecruitment: false, trigger: null };
    }

    // ── 3. Known ATS hostname ────────────────────────────────────────────────
    try {
      const { hostname } = new URL(urlString);
      const stripped = hostname.toLowerCase().replace(/^www\./, '');
      if (KNOWN_ATS_HOSTNAME_RE.test(stripped)) {
        log(`Recruitment page detected (known ATS hostname: ${stripped})`);
        return { isRecruitment: true, trigger: `ats_hostname:${stripped}` };
      }
    } catch { /* already parsed above */ }

    // ── 4. URL path keywords ─────────────────────────────────────────────────
    if (URL_RECRUITMENT_RE.test(urlString)) {
      log(`Recruitment page detected (URL path: ${urlString})`);
      return { isRecruitment: true, trigger: 'url_path' };
    }

    // ── 5. Page title ────────────────────────────────────────────────────────
    const title = doc.title || '';
    if (title && TITLE_RECRUITMENT_RE.test(title)) {
      log(`Recruitment page detected (title: "${title}")`);
      return { isRecruitment: true, trigger: `title:${title.slice(0, 60)}` };
    }

    // ── 6. Structural DOM selectors (cheap querySelector calls) ──────────────
    for (const selector of STRUCTURAL_SELECTORS) {
      try {
        if (doc.querySelector(selector)) {
          log(`Recruitment page detected (structural selector: ${selector})`);
          return { isRecruitment: true, trigger: `selector:${selector}` };
        }
      } catch { /* invalid selector — skip */ }
    }

    // ── 7. Body text scan (only if body is small enough to be fast) ──────────
    const body = doc.body;
    if (body) {
      // Only scan text if page is reasonably sized (< 200KB text)
      const bodyText = body.innerText || '';
      if (bodyText.length < 200_000) {
        if (DOM_TEXT_RECRUITMENT_RE.test(bodyText)) {
          log('Recruitment page detected (body text confirmation pattern)');
          return { isRecruitment: true, trigger: 'body_text_confirmation' };
        }
        if (FORM_FIELD_RE.test(bodyText)) {
          log('Recruitment page detected (form field labels)');
          return { isRecruitment: true, trigger: 'form_field_labels' };
        }
      }
    }

    // ── 8. Apply button text ─────────────────────────────────────────────────
    const buttons = doc.querySelectorAll<HTMLElement>('button, [role="button"], input[type="submit"]');
    for (let i = 0; i < Math.min(buttons.length, 50); i++) {
      const text = (buttons[i].textContent || '').trim();
      if (BUTTON_TEXT_RE.test(text)) {
        log(`Recruitment page detected (apply button: "${text}")`);
        return { isRecruitment: true, trigger: `button:${text}` };
      }
    }

    log('Page ignored (not recruitment related)');
    return { isRecruitment: false, trigger: null };
  }

  /**
   * Async variant — defers the DOM scan to avoid blocking the main thread
   * on heavy pages. Use this when calling from DOMContentLoaded or
   * MutationObserver callbacks.
   */
  static async detectAsync(doc: Document, urlString: string): Promise<DetectionResult> {
    return new Promise((resolve) => {
      // Yield to the browser event loop first so parsing doesn't block
      requestIdleCallback
        ? requestIdleCallback(() => resolve(RecruitmentPageDetector.detect(doc, urlString)), { timeout: 500 })
        : setTimeout(() => resolve(RecruitmentPageDetector.detect(doc, urlString)), 0);
    });
  }
}

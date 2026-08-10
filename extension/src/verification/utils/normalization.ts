/**
 * Shared Normalization Helpers — v1.1 Universal ATS Intelligence
 * No duplicated regex, single source of truth for text normalization
 */

export function normalizeWhitespace(text: string): string {
  return text.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeForComparison(text: string): string {
  return normalizeWhitespace(text).toLowerCase();
}

export function normalizeForHash(text: string): string {
  return normalizeWhitespace(text).toLowerCase();
}

export function normalizeUrl(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let pathname = parsed.pathname.toLowerCase().replace(/\/+$/, '');
    if (pathname === '') pathname = '/';
    
    const JOB_ID_PARAMS = new Set(['gh_jid', 'gh_job_id', 'job_id', 'jobid', 'jid', 'jk', 'reqid', 'requisition_id', 'id', 'job', 'application_id', 'candidate_id', 'reference']);
    const TRACKING_PATTERNS = [/^utm_/i, /^gh_src$/i, /^gh_referrer$/i, /^ref$/i, /^trk$/i, /^gclid$/i, /^fbclid$/i, /^mc_/i, /^_hsenc$/i, /^originalsubdomain$/i];
    
    const kept: [string, string][] = [];
    parsed.searchParams.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (JOB_ID_PARAMS.has(lower)) {
        kept.push([lower, value]);
        return;
      }
      const isTracking = TRACKING_PATTERNS.some(p => p.test(key));
      if (!isTracking) {
        kept.push([lower, value]);
      }
    });
    kept.sort((a, b) => a[0].localeCompare(b[0]));
    const query = kept.length > 0 ? '?' + kept.map(([k, v]) => `${k}=${v}`).join('&') : '';
    return `${host}${pathname}${query}`;
  } catch {
    return urlString.trim().toLowerCase().replace(/\/+$/, '');
  }
}

export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '').trim();
}

export function extractHostname(urlString: string): string {
  try {
    return new URL(urlString).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function sortKeysRecursive(input: any): any {
  if (Array.isArray(input)) {
    return input.map(sortKeysRecursive);
  }
  if (input !== null && typeof input === 'object') {
    const sorted: any = {};
    Object.keys(input).sort().forEach(k => {
      const v = input[k];
      if (v === null || v === undefined || v === '') return;
      sorted[k] = sortKeysRecursive(v);
    });
    return sorted;
  }
  return input;
}

export function canonicalizeEvidenceForHash(evidence: any): string {
  const subset: any = {
    portal: evidence.portal,
    hostname: normalizeForHash(evidence.hostname || ''),
    pathname: normalizeForHash(evidence.pathname || ''),
    normalizedUrl: normalizeForHash(evidence.normalizedUrl || ''),
    title: normalizeForHash(evidence.title || ''),
    headings: (evidence.headings || []).map((h: string) => normalizeForHash(h)).sort(),
    confirmationText: normalizeForHash(evidence.confirmationText || ''),
    applicationReference: evidence.applicationReference ? normalizeForHash(evidence.applicationReference) : null,
    https: evidence.https,
    extensionVersion: evidence.extensionVersion,
    domFingerprint: {
      hasConfirmationCard: !!evidence.domFingerprint?.hasConfirmationCard,
      hasSuccessBanner: !!evidence.domFingerprint?.hasSuccessBanner,
      expectedContainersFound: evidence.domFingerprint?.expectedContainersFound || 0,
      unexpectedApplyButtonPresent: !!evidence.domFingerprint?.unexpectedApplyButtonPresent,
    },
  };
  const sorted = sortKeysRecursive(subset);
  return JSON.stringify(sorted);
}

/**
 * Normalize success phrase for comparison — removes punctuation, extra spaces
 */
export function normalizeSuccessPhrase(phrase: string): string {
  return phrase.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Check if text contains any pattern from list (normalized)
 */
export function containsAnyPattern(text: string, patterns: RegExp[]): { matched: boolean; matchedPatterns: string[] } {
  const matched: string[] = [];
  for (const pat of patterns) {
    if (pat.test(text)) {
      matched.push(pat.source);
    }
  }
  return { matched: matched.length > 0, matchedPatterns: matched };
}

export function extractCompanyFromHostname(hostname: string): string | null {
  const generic = ['job-boards', 'boards', 'jobs', 'careers', 'lever', 'greenhouse', 'workatastartup', 'simplyhired', 'indeed', 'glassdoor', 'linkedin', 'myworkdayjobs', 'myworkday', 'workday', 'successfactors', 'sapsf', 'oraclecloud', 'taleo', 'smartrecruiters', 'recruitee', 'ashbyhq', 'teamtailor', 'bamboohr', 'jobvite', 'personio', 'icims', 'jazzhr', 'breezy', 'comeet', 'fountain', 'pinpointhq', 'rippling', 'workable'];
  const firstLabel = hostname.split('.')[0];
  if (!generic.includes(firstLabel.toLowerCase()) && firstLabel.length > 2) {
    return firstLabel.charAt(0).toUpperCase() + firstLabel.slice(1);
  }
  return null;
}

export function isIpAddress(hostname: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || /^\[?[0-9a-f:]+\]?$/i.test(hostname);
}

export function isBlockedHostname(hostname: string): boolean {
  const lower = normalizeHostname(hostname);
  if (!lower.includes('.')) return true;
  if (isIpAddress(lower)) return true;
  if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(lower)) return true;
  if (lower.length < 4) return true;
  return false;
}

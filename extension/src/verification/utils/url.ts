import { JobPortal } from '../types';

export function parseUrlSafe(urlString: string): URL | null {
  try {
    return new URL(urlString);
  } catch {
    return null;
  }
}

export function isHttps(url: URL): boolean {
  return url.protocol === 'https:';
}

export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '').trim();
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

/**
 * Strict hostname matching with anchored regex to prevent evil-linkedin.com bypass
 * Must use (?:^|\.) pattern
 */
export function matchesHostPattern(hostname: string, pattern: RegExp): boolean {
  const normalized = normalizeHostname(hostname);
  return pattern.test(normalized);
}

export function normalizeUrlForEvidence(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let pathname = parsed.pathname.toLowerCase().replace(/\/+$/, '');
    if (pathname === '') pathname = '/';
    
    // Keep meaningful params, strip tracking
    const JOB_ID_PARAMS = new Set(['gh_jid', 'gh_job_id', 'job_id', 'jobid', 'jid', 'jk', 'reqid', 'requisition_id', 'id', 'job']);
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

export const PORTAL_HOST_PATTERNS: Record<string, RegExp[]> = {
  LINKEDIN: [/(?:^|\.)linkedin\.com$/],
  GREENHOUSE: [/(?:^|\.)greenhouse\.io$/, /(?:^|\.)greenhouse\.com$/, /^boards\.greenhouse\.io$/],
  LEVER: [/(?:^|\.)lever\.co$/, /^jobs\.lever\.co$/],
  INDEED: [/(?:^|\.)indeed\.com$/, /(?:^|\.)indeed\.[a-z.]+$/],
  GLASSDOOR: [/(?:^|\.)glassdoor\.com$/],
  ZIPRECRUITER: [/(?:^|\.)ziprecruiter\.com$/],
  CAREERBUILDER: [/(?:^|\.)careerbuilder\.com$/],
  WELLFOUND: [/(?:^|\.)wellfound\.com$/, /(?:^|\.)angel\.co$/],
  WORKDAY: [/(?:^|\.)myworkdayjobs\.com$/, /(?:^|\.)myworkday\.com$/, /(?:^|\.)workday\.com$/],
};

export function detectPortalFromHostname(hostname: string): JobPortal | null {
  const normalized = normalizeHostname(hostname);
  for (const [portal, patterns] of Object.entries(PORTAL_HOST_PATTERNS)) {
    for (const pat of patterns) {
      if (matchesHostPattern(normalized, pat)) {
        return portal as JobPortal;
      }
    }
  }
  // Generic career detection
  if (normalized.includes('careers.') || normalized.includes('jobs.') || normalized.startsWith('careers') || normalized.startsWith('jobs')) {
    return JobPortal.CAREER_SITE;
  }
  return null;
}

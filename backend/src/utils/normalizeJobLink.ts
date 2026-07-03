/**
 * Job Link Normalization
 * ------------------------------------------------------------------
 * Used for duplicate detection. Two links that point to the *same*
 * job posting but differ in tracking params, casing, protocol, or
 * trailing slashes must normalize to the same string so that the
 * DB unique constraint (profile_id, normalized_job_link) catches them.
 * ------------------------------------------------------------------
 */

// Common tracking / session query params to strip across job portals.
const TRACKING_PARAM_PATTERNS = [
  /^utm_/i,
  /^gh_/i,
  /^ref$/i,
  /^refid$/i,
  /^referrer$/i,
  /^trk$/i,
  /^trackingid$/i,
  /^src$/i,
  /^source$/i,
  /^session/i,
  /^gclid$/i,
  /^fbclid$/i,
  /^mc_/i,
  /^originalsubdomain$/i,
];

function isTrackingParam(key: string): boolean {
  return TRACKING_PARAM_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Normalizes a job posting URL into a canonical string for duplicate comparison.
 * - Lowercases scheme + host
 * - Strips "www."
 * - Removes trailing slashes
 * - Strips known tracking query params (keeps meaningful identifiers like job IDs)
 * - Sorts remaining query params for deterministic ordering
 * - Removes URL fragments (#...)
 */
export function normalizeJobLink(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('normalizeJobLink requires a non-empty URL string');
  }

  let urlStr = rawUrl.trim();
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = `https://${urlStr}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    // Fallback: not a parseable URL, just do basic string normalization.
    return rawUrl.trim().toLowerCase().replace(/\/+$/, '');
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

  let pathname = parsed.pathname.toLowerCase().replace(/\/+$/, '');
  if (pathname === '') pathname = '/';

  const keptParams: [string, string][] = [];
  parsed.searchParams.forEach((value, key) => {
    if (!isTrackingParam(key)) {
      keptParams.push([key.toLowerCase(), value]);
    }
  });
  keptParams.sort(([a], [b]) => a.localeCompare(b));

  const query = keptParams.length > 0 ? '?' + keptParams.map(([k, v]) => `${k}=${v}`).join('&') : '';

  return `${host}${pathname}${query}`;
}

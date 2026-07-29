export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove hash and common tracking query params
    const cleanParams = new URLSearchParams();
    parsed.searchParams.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        !lowerKey.startsWith('utm_') &&
        lowerKey !== 'fbclid' &&
        lowerKey !== 'gclid' &&
        lowerKey !== '_hsenc' &&
        lowerKey !== 'ref'
      ) {
        cleanParams.append(key, value);
      }
    });
    parsed.search = cleanParams.toString();
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

export function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

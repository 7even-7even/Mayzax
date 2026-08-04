/**
 * Text utilities — fuzzy matching, normalization
 */

export function normalizeWhitespace(text: string): string {
  return text.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeForComparison(text: string): string {
  return normalizeWhitespace(text).toLowerCase();
}

/**
 * Simple Levenshtein distance for fuzzy matching
 */
export function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function fuzzyIncludes(text: string, pattern: string, threshold = 0.85): boolean {
  const lowerText = text.toLowerCase();
  const lowerPattern = pattern.toLowerCase();
  if (lowerText.includes(lowerPattern)) return true;
  // For short patterns, use Levenshtein on token level
  const words = lowerText.split(/\s+/);
  for (const word of words) {
    const distance = levenshtein(word, lowerPattern);
    const maxLen = Math.max(word.length, lowerPattern.length);
    const similarity = 1 - distance / maxLen;
    if (similarity >= threshold) return true;
  }
  return false;
}

export function matchesAnyPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text));
}

export function extractMatchedKeywords(text: string, patterns: RegExp[]): string[] {
  const matched: string[] = [];
  for (const pat of patterns) {
    if (pat.test(text)) {
      matched.push(pat.source);
    }
  }
  return matched;
}

/**
 * Token set ratio similar to fuzzywuzzy
 */
export function tokenSetRatio(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().split(/\s+/));
  const tokensB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

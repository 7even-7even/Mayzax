import { VerificationEntry } from '../verification/types';
import { normalizeUrlForEvidence } from '../verification/utils/url';
import { VerificationResultV2 } from '../verification/types';

export class VerificationStoreV2 {
  private static MAX_ENTRIES = 100;
  private static TTL_MS = 24 * 60 * 60 * 1000; // 24h
  private static STORAGE_KEY = 'verifications_v2';
  private static LEGACY_KEY = 'verifications';

  /**
   * Save v2 verification result as VerificationEntry (backward compatible wrapper)
   */
  static async saveV2(result: VerificationResultV2, company: string, jobTitle: string): Promise<VerificationEntry> {
    const store = await this.getAll();
    const normalized = normalizeUrlForEvidence(result.evidence.fullUrl);

    const existingIndex = store.findIndex(item => normalizeUrlForEvidence(item.url) === normalized);

    const entry: VerificationEntry = {
      id: existingIndex !== -1 ? store[existingIndex].id : crypto.randomUUID(),
      portal: result.portal as any,
      company: company || result.evidence.hostname.split('.')[0],
      jobTitle: jobTitle || result.evidence.title.slice(0, 100),
      url: normalized,
      pageTitle: result.evidence.title,
      verified: result.verified,
      confidenceScore: result.score,
      matchedRules: result.reasons.slice(0, 10),
      matchedKeywords: result.evidence.headings.slice(0, 5),
      timestamp: result.verificationTimestamp,
      score: result.score,
      confidence: result.confidence,
      evidence: result.evidence,
      verificationHash: result.verificationHash,
      version: result.version,
      applicationReference: result.applicationReference || null,
      reasons: result.reasons,
      fraudSignals: result.fraudSignals,
    };

    if (existingIndex !== -1) {
      store[existingIndex] = entry;
    } else {
      store.unshift(entry);
    }

    const now = Date.now();
    const clean = store.filter(item => now - item.timestamp < this.TTL_MS).slice(0, this.MAX_ENTRIES);

    await chrome.storage.local.set({ [this.STORAGE_KEY]: clean });

    // Also save to legacy key for backward compat popup that reads old key? We'll migrate
    await this.migrateLegacyIfNeeded(clean);

    return entry;
  }

  /**
   * Find by URL — checks v2 storage first, then legacy
   */
  static async findByUrl(url: string): Promise<VerificationEntry | null> {
    const store = await this.getAll();
    const normalized = normalizeUrlForEvidence(url);
    const now = Date.now();

    const entry = store.find(item => normalizeUrlForEvidence(item.url) === normalized);
    if (!entry) return null;

    if (now - entry.timestamp > this.TTL_MS) {
      await this.remove(entry.id);
      return null;
    }

    return entry;
  }

  static async getAll(): Promise<VerificationEntry[]> {
    const result = await chrome.storage.local.get([this.STORAGE_KEY, this.LEGACY_KEY]);
    let store: VerificationEntry[] = result[this.STORAGE_KEY] || [];

    // If v2 empty but legacy has data, migrate
    if (store.length === 0 && result[this.LEGACY_KEY] && result[this.LEGACY_KEY].length > 0) {
      const legacy = result[this.LEGACY_KEY] as VerificationEntry[];
      // Convert legacy entries to v2 minimal
      store = legacy.map(item => ({
        ...item,
        score: item.confidenceScore,
        confidence: item.confidenceScore >= 80 ? 'HIGH' as any : item.confidenceScore >= 50 ? 'MEDIUM' as any : 'LOW' as any,
        version: 'v2' as any,
      }));
      await chrome.storage.local.set({ [this.STORAGE_KEY]: store });
    }

    const now = Date.now();
    const valid = store.filter(item => now - item.timestamp < this.TTL_MS);
    if (valid.length !== store.length) {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: valid });
    }

    return valid;
  }

  static async remove(id: string): Promise<void> {
    const store = await this.getAll();
    const filtered = store.filter(item => item.id !== id);
    await chrome.storage.local.set({ [this.STORAGE_KEY]: filtered });
  }

  static async clear(): Promise<void> {
    await chrome.storage.local.remove([this.STORAGE_KEY, this.LEGACY_KEY]);
  }

  private static async migrateLegacyIfNeeded(v2Store: VerificationEntry[]) {
    // Keep legacy key in sync for old popup versions, but truncated
    try {
      await chrome.storage.local.set({ [this.LEGACY_KEY]: v2Store.slice(0, 20) });
    } catch {}
  }

  /**
   * Replay guard — check if same hash or same URL verified recently
   */
  static async isReplay(url: string, windowMs = 5 * 60 * 1000): Promise<boolean> {
    const store = await this.getAll();
    const normalized = normalizeUrlForEvidence(url);
    const now = Date.now();
    const recent = store.find(item => normalizeUrlForEvidence(item.url) === normalized && now - item.timestamp < windowMs);
    return !!recent;
  }
}

// Backward compat wrapper keeping old API
export class VerificationStore {
  static async save(entry: any) {
    // If entry already looks like v2, delegate
    if (entry.evidence) {
      // construct minimal result
      const result: VerificationResultV2 = {
        verified: entry.verified,
        score: entry.confidenceScore || entry.score || 0,
        confidence: entry.confidence || (entry.confidenceScore >= 80 ? 'HIGH' : entry.confidenceScore >= 50 ? 'MEDIUM' : 'LOW'),
        portal: entry.portal,
        reasons: entry.matchedRules || entry.reasons || [],
        evidence: entry.evidence || {
          portal: entry.portal,
          hostname: new URL(entry.url).hostname,
          pathname: new URL(entry.url).pathname,
          fullUrl: entry.url,
          normalizedUrl: entry.url,
          title: entry.pageTitle,
          headings: entry.matchedKeywords || [],
          confirmationText: '',
          applicationReference: null,
          detectedButtons: [],
          domFingerprint: { hasConfirmationCard: false, hasSuccessBanner: false, expectedContainersFound: 0, unexpectedApplyButtonPresent: false },
          verificationTimestamp: entry.timestamp,
          extensionVersion: '2.0.0',
          https: entry.url.startsWith('https://'),
        },
        verificationHash: entry.verificationHash,
        verificationTimestamp: entry.timestamp,
        version: 'v2',
        applicationReference: entry.applicationReference || null,
      };
      return VerificationStoreV2.saveV2(result, entry.company, entry.jobTitle);
    }
    // Legacy save
    const store = await VerificationStoreV2.getAll();
    const normalized = normalizeUrlForEvidence(entry.url);
    const existingIndex = store.findIndex(item => normalizeUrlForEvidence(item.url) === normalized);
    const fullEntry: VerificationEntry = {
      ...entry,
      id: existingIndex !== -1 ? store[existingIndex].id : crypto.randomUUID(),
      url: normalized,
      timestamp: Date.now(),
      score: entry.confidenceScore,
      confidence: entry.confidenceScore >= 80 ? 'HIGH' as any : entry.confidenceScore >= 50 ? 'MEDIUM' as any : 'LOW' as any,
      version: 'v2' as any,
    };
    const newStore = [...store];
    if (existingIndex !== -1) newStore[existingIndex] = fullEntry;
    else newStore.unshift(fullEntry);
    await chrome.storage.local.set({ verifications_v2: newStore.slice(0, 100) });
    return fullEntry;
  }

  static findByUrl = VerificationStoreV2.findByUrl.bind(VerificationStoreV2);
  static getAll = VerificationStoreV2.getAll.bind(VerificationStoreV2);
  static remove = VerificationStoreV2.remove.bind(VerificationStoreV2);
  static clear = VerificationStoreV2.clear.bind(VerificationStoreV2);
}

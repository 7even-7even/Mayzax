import { VerificationEntry } from '../types';
import { normalizeUrl } from '../utils/url';

export class VerificationStore {
  private static MAX_ENTRIES = 100;
  private static TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

  public static async save(entry: Omit<VerificationEntry, 'id'>): Promise<VerificationEntry> {
    const store = await this.getAll();
    const normalized = normalizeUrl(entry.url);
    const existingIndex = store.findIndex(item => normalizeUrl(item.url) === normalized);

    const fullEntry: VerificationEntry = {
      ...entry,
      id: existingIndex !== -1 ? store[existingIndex].id : crypto.randomUUID(),
      url: normalized,
      timestamp: Date.now()
    };

    if (existingIndex !== -1) {
      store[existingIndex] = fullEntry;
    } else {
      store.unshift(fullEntry);
    }

    // Enforce size limit and TTL eviction
    const now = Date.now();
    const cleanStore = store
      .filter(item => now - item.timestamp < this.TTL_MS)
      .slice(0, this.MAX_ENTRIES);

    await chrome.storage.local.set({ verifications: cleanStore });
    return fullEntry;
  }

  public static async findByUrl(url: string): Promise<VerificationEntry | null> {
    const store = await this.getAll();
    const normalized = normalizeUrl(url);
    const now = Date.now();
    
    const entry = store.find(item => normalizeUrl(item.url) === normalized);
    if (!entry) return null;

    // Check expiration on read
    if (now - entry.timestamp > this.TTL_MS) {
      await this.remove(entry.id);
      return null;
    }

    return entry;
  }

  public static async getAll(): Promise<VerificationEntry[]> {
    const result = await chrome.storage.local.get('verifications');
    const store: VerificationEntry[] = result.verifications || [];
    
    // Purge expired entries
    const now = Date.now();
    const validStore = store.filter(item => now - item.timestamp < this.TTL_MS);
    if (validStore.length !== store.length) {
      await chrome.storage.local.set({ verifications: validStore });
    }
    
    return validStore;
  }

  public static async remove(id: string): Promise<void> {
    const store = await this.getAll();
    const filtered = store.filter(item => item.id !== id);
    await chrome.storage.local.set({ verifications: filtered });
  }

  public static async clear(): Promise<void> {
    await chrome.storage.local.remove('verifications');
  }
}

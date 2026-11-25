/**
 * Deduplication helpers for notification-sourced transaction drafts.
 *
 * Two layers of protection:
 * 1. `NotificationDedupStore` – used by the web layer when draining the native
 *    queue, keyed on (sourcePackage, title, text, minute-bucket) so repeated
 *    deliveries of the same notification only produce one draft.
 * 2. `computeDedupeKey` – stable FNV-1a content hash mirrored by the Android
 *    side so native and web agree on identity.
 *
 * Pure module: no Capacitor, no storage, no logging of raw content.
 */

export interface DedupEntry {
  /** Dedupe key as produced by computeDedupeKey. */
  key: string;
  /** Epoch millis when this key was first seen. */
  seenAt: number;
}

export const DEFAULT_DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
export const DEFAULT_MAX_ENTRIES = 500;

/** FNV-1a 32-bit hash over a UTF-16 string, returned as 8 hex chars. */
export function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Builds the canonical dedupe key for a notification.
 * Includes a minute bucket so the exact same notification posted again within
 * the same minute is collapsed, while a genuinely new transaction later still
 * passes. Must stay in sync with the Android implementation
 * (NotificationDedup.java).
 */
export function computeDedupeKey(sourcePackage: string, title: string, text: string, receivedAt: number): string {
  const minuteBucket = Math.floor(receivedAt / (60 * 1000));
  const normalizedTitle = title.replace(/\s+/g, ' ').trim();
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  return fnv1a32(`${sourcePackage}|${normalizedTitle}|${normalizedText}|${minuteBucket}`);
}

/**
 * True when `key` was already seen within `windowMs` of `now`.
 * Entries older than the window never block new drafts.
 */
export function isDuplicate(entries: DedupEntry[], key: string, now: number, windowMs = DEFAULT_DEDUP_WINDOW_MS): boolean {
  for (const entry of entries) {
    if (entry.key === key && now - entry.seenAt <= windowMs) return true;
  }
  return false;
}

/**
 * Adds `key` to the entry list, pruning expired entries and enforcing the
 * cap (oldest first). Returns a new array; input is not mutated.
 */
export function rememberKey(
  entries: DedupEntry[],
  key: string,
  now: number,
  options?: { windowMs?: number; maxEntries?: number }
): DedupEntry[] {
  const windowMs = options?.windowMs ?? DEFAULT_DEDUP_WINDOW_MS;
  const maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES;

  const pruned = entries.filter((entry) => now - entry.seenAt <= windowMs);
  const withoutKey = pruned.filter((entry) => entry.key !== key);
  const next = [{ key, seenAt: now }, ...withoutKey];

  return next.length > maxEntries ? next.slice(0, maxEntries) : next;
}

/**
 * Stateful store used by the queue drain pipeline. Keeps only the windowed,
 * capped entry list — nothing about the raw notification content is retained
 * beyond the hash itself.
 */
export class NotificationDedupStore {
  private entries: DedupEntry[];

  constructor(initial?: DedupEntry[]) {
    this.entries = initial ? [...initial] : [];
  }

  /** Returns true (and records the key) when the key is new within the window. */
  admit(key: string, now: number, options?: { windowMs?: number; maxEntries?: number }): boolean {
    if (isDuplicate(this.entries, key, now, options?.windowMs)) return false;
    this.entries = rememberKey(this.entries, key, now, options);
    return true;
  }

  /** Serialisable snapshot for persistence (keys + timestamps only). */
  snapshot(): DedupEntry[] {
    return [...this.entries];
  }

  get size(): number {
    return this.entries.length;
  }
}

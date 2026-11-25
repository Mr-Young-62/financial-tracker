/**
 * Orchestrates the notification-draft pipeline:
 *
 *   native queue (SharedPreferences) → parse → dedupe → AppStateSnapshot
 *
 * The pure core (`processQueueItems`) is unit-testable with synthetic
 * notifications; the orchestration helper (`drainQueueIntoSnapshot`) wires it
 * to the Capacitor plugin and the existing storage flow.
 *
 * PRIVACY: raw notification text stays on-device inside the snapshot's
 * `notificationDrafts` until the user confirms or deletes a draft. Nothing is
 * sent anywhere, and raw content is never logged.
 */
import { NotificationDraft } from '../types';
import {
  CandidateApp,
  PendingNotificationItem,
  acknowledgeNotifications,
  getCaptureStatus,
  getPendingNotifications,
} from './notificationCapture';
import { DedupEntry, NotificationDedupStore, DEFAULT_DEDUP_WINDOW_MS } from './notificationDedup';
import { ParseOutcome, parseNotification } from './notificationParser';
import { AppStateSnapshot } from './storage';

export interface DrainOutcome {
  /** Updated snapshot (new drafts appended, dedupe memory refreshed). */
  snapshot: AppStateSnapshot;
  /** Queue ids safe to acknowledge (parse-ignored + newly added drafts). */
  ackIds: string[];
  /** Number of new drafts added. */
  addedCount: number;
  /** Number of queue items ignored by the parser (with reasons). */
  ignored: Array<{ id: string; reason: string }>;
}

/**
 * Pure drain step: feed raw queue items through parser + dedupe and merge the
 * results into a snapshot. No I/O — safe to unit test with synthetic input.
 *
 * Dedupe layers (both required to pass):
 *  1. dedupeKey already present in `snapshot.notificationDrafts` (persistent),
 *  2. `NotificationDedupStore` windowed memory (catches re-delivery while a
 *     draft from an earlier drain is still pending).
 *
 * Ack semantics: every item is acked exactly once by the caller after the
 * snapshot is successfully saved — parse-ignored items (nothing to keep) and
 * newly created drafts. If the save fails, the caller skips the ack so the
 * items are retried on the next drain (at-least-once; dedupe prevents dupes).
 */
export function processQueueItems(
  items: PendingNotificationItem[],
  snapshot: AppStateSnapshot,
  now: number = Date.now()
): DrainOutcome {
  const drafts = [...(snapshot.notificationDrafts ?? [])];
  const store = new NotificationDedupStore(snapshot.notificationDedup);

  // Layer 1: keys of drafts that already exist (any age — a confirmed draft
  // becomes a Transaction, but the native seen-window covers that period).
  const existingKeys = new Set(drafts.map((draft) => draft.dedupeKey));

  const ackIds: string[] = [];
  const ignored: Array<{ id: string; reason: string }> = [];
  let addedCount = 0;

  for (const item of items) {
    const outcome: ParseOutcome = parseNotification({
      sourcePackage: item.sourcePackage,
      title: item.title,
      text: item.text,
      receivedAt: item.receivedAt,
    });

    if (outcome.status === 'ignored') {
      // Nothing worth keeping (no amount / not a transaction / empty text).
      ackIds.push(item.id);
      ignored.push({ id: item.id, reason: outcome.reason });
      continue;
    }

    const candidate = outcome.candidate;
    const key = candidate.dedupeKey;

    // Layer 1: draft already exists for this content.
    if (existingKeys.has(key)) {
      ackIds.push(item.id);
      continue;
    }

    // Layer 2: seen within the dedupe window by an earlier drain.
    if (!store.admit(key, now, { windowMs: DEFAULT_DEDUP_WINDOW_MS })) {
      ackIds.push(item.id);
      continue;
    }

    drafts.push(candidate);
    existingKeys.add(key);
    ackIds.push(item.id);
    addedCount += 1;
  }

  return {
    snapshot: {
      ...snapshot,
      notificationDrafts: drafts,
      notificationDedup: store.snapshot(),
    },
    ackIds,
    addedCount,
    ignored,
  };
}

export interface QueueDrainResult {
  snapshot: AppStateSnapshot;
  addedCount: number;
  ignoredCount: number;
  /** True when the native queue could not be reached (service/bridge error). */
  queueUnavailable: boolean;
}

/**
 * Reads the native queue, merges parseable items into the snapshot, and —
 * only after `persist` succeeds — acknowledges the handled queue items.
 *
 * @param persist callback that saves the updated snapshot (existing storage).
 *                When it throws, nothing is acked so no notification is lost.
 */
export async function drainQueueIntoSnapshot(
  snapshot: AppStateSnapshot,
  persist: (next: AppStateSnapshot) => Promise<void>,
  now: number = Date.now()
): Promise<QueueDrainResult> {
  let items: PendingNotificationItem[];
  try {
    items = await getPendingNotifications();
  } catch {
    // Bridge/service unavailable (e.g. permission revoked mid-session).
    return { snapshot, addedCount: 0, ignoredCount: 0, queueUnavailable: true };
  }

  if (items.length === 0) {
    return { snapshot, addedCount: 0, ignoredCount: 0, queueUnavailable: false };
  }

  const outcome = processQueueItems(items, snapshot, now);

  if (outcome.ackIds.length > 0) {
    try {
      await persist(outcome.snapshot);
      await acknowledgeNotifications(outcome.ackIds);
    } catch {
      // Persist failed: leave the queue untouched so the next drain retries.
      return { snapshot, addedCount: 0, ignoredCount: 0, queueUnavailable: false };
    }
  }

  return {
    snapshot: outcome.snapshot,
    addedCount: outcome.addedCount,
    ignoredCount: outcome.ignored.length,
    queueUnavailable: false,
  };
}

export interface CaptureHealth {
  available: boolean;
  enabled: boolean;
  listenerPermission: boolean;
  serviceConnected: boolean;
  monitoredPackages: string[];
  /** Set when the native queue could not be reached (service/bridge error). */
  queueUnavailable?: boolean;
}

/** Feature availability for the settings UI (safe on web: all false/empty). */
export async function getCaptureHealth(): Promise<CaptureHealth> {
  try {
    const status = await getCaptureStatus();
    return {
      available: true,
      enabled: status.enabled,
      listenerPermission: status.listenerPermission,
      serviceConnected: status.serviceConnected,
      monitoredPackages: status.monitoredPackages ?? [],
      queueUnavailable: false,
    };
  } catch {
    return {
      available: false,
      enabled: false,
      listenerPermission: false,
      serviceConnected: false,
      monitoredPackages: [],
      queueUnavailable: true,
    };
  }
}

export type { CandidateApp, NotificationDraft, DedupEntry };

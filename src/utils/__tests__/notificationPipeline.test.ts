/**
 * Unit tests for the queue-drain pipeline (pure core).
 *
 * Fixtures are synthetic queue items — the same shape the native service
 * writes, but with invented content. Never use real bank notifications.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { PendingNotificationItem } from '../notificationCapture';
import { processQueueItems } from '../notificationPipeline';
import { computeDedupeKey } from '../notificationDedup';
import { AppStateSnapshot } from '../storage';

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);

function makeSnapshot(partial?: Partial<AppStateSnapshot>): AppStateSnapshot {
  return {
    categories: [],
    transactions: [],
    budgets: [],
    recurringList: [],
    currency: 'IDR',
    ...partial,
  };
}

function makeItem(overrides: Partial<PendingNotificationItem> = {}): PendingNotificationItem {
  const title = overrides.title ?? 'BankXYZ';
  const text =
    overrides.text ?? 'Pembayaran berhasil Rp150.000 ke Toko Maju pada 1 Jan 2020 10:30';
  const receivedAt = overrides.receivedAt ?? NOW;
  const sourcePackage = overrides.sourcePackage ?? 'com.example.bank';
  return {
    id: overrides.id ?? `id-${computeDedupeKey(sourcePackage, title, text, receivedAt)}`,
    sourcePackage,
    title,
    text,
    receivedAt,
    dedupeKey: computeDedupeKey(sourcePackage, title, text, receivedAt),
    ...overrides,
  };
}

describe('processQueueItems', () => {
  test('parseable item becomes a draft and is acked', () => {
    const item = makeItem();
    const outcome = processQueueItems([item], makeSnapshot(), NOW);

    assert.equal(outcome.addedCount, 1);
    assert.deepEqual(outcome.ackIds, [item.id]);
    assert.equal(outcome.snapshot.notificationDrafts?.length, 1);

    const draft = outcome.snapshot.notificationDrafts![0];
    assert.equal(draft.type, 'EXPENSE');
    assert.equal(draft.amount, 150000);
    assert.equal(draft.sourcePackage, 'com.example.bank');
    assert.equal(draft.needsReview, false);
  });

  test('duplicate content in one drain yields a single draft', () => {
    const first = makeItem({ id: 'a' });
    const second = makeItem({ id: 'b' }); // same content, same minute
    const outcome = processQueueItems([first, second], makeSnapshot(), NOW);

    assert.equal(outcome.addedCount, 1);
    assert.equal(outcome.snapshot.notificationDrafts?.length, 1);
    assert.deepEqual(outcome.ackIds.sort(), ['a', 'b']);
  });

  test('re-drain of an already-stored draft does not duplicate it', () => {
    const item = makeItem();
    const first = processQueueItems([item], makeSnapshot(), NOW);
    const second = processQueueItems([item], first.snapshot, NOW + 5_000);

    assert.equal(second.addedCount, 0);
    assert.equal(second.snapshot.notificationDrafts?.length, 1);
    assert.deepEqual(second.ackIds, [item.id]);
  });

  test('non-transaction notifications are ignored and acked without drafts', () => {
    const item = makeItem({
      id: 'balance',
      text: 'Saldo Anda Rp1.000.000 per hari ini',
    });
    const outcome = processQueueItems([item], makeSnapshot(), NOW);

    assert.equal(outcome.addedCount, 0);
    assert.equal(outcome.snapshot.notificationDrafts?.length, 0);
    assert.deepEqual(outcome.ackIds, ['balance']);
    assert.deepEqual(outcome.ignored, [{ id: 'balance', reason: 'not_a_transaction' }]);
  });

  test('works with snapshots that predate the drafts field (undefined)', () => {
    const legacy = makeSnapshot();
    delete (legacy as { notificationDrafts?: unknown }).notificationDrafts;
    delete (legacy as { notificationDedup?: unknown }).notificationDedup;

    const outcome = processQueueItems([makeItem()], legacy, NOW);
    assert.equal(outcome.addedCount, 1);
    assert.equal(outcome.snapshot.notificationDrafts?.length, 1);
    assert.ok(Array.isArray(outcome.snapshot.notificationDedup));
  });

  test('existing drafts from other sources are preserved', () => {
    const existing = processQueueItems([makeItem()], makeSnapshot(), NOW);
    const other = makeItem({
      id: 'other',
      text: 'Transfer masuk Rp500.000 dari Budi pada 1 Jan 2020 09:15',
    });
    const outcome = processQueueItems([other], existing.snapshot, NOW);

    assert.equal(outcome.snapshot.notificationDrafts?.length, 2);
  });

  test('dedupe memory is persisted into the snapshot', () => {
    const outcome = processQueueItems([makeItem()], makeSnapshot(), NOW);
    assert.equal(outcome.snapshot.notificationDedup?.length, 1);
    assert.equal(
      outcome.snapshot.notificationDedup?.[0].key,
      outcome.snapshot.notificationDrafts?.[0].dedupeKey
    );
  });

  test('empty queue is a no-op', () => {
    const snapshot = makeSnapshot();
    const outcome = processQueueItems([], snapshot, NOW);
    assert.equal(outcome.addedCount, 0);
    assert.deepEqual(outcome.ackIds, []);
    assert.equal(outcome.snapshot.notificationDrafts?.length, 0);
  });
});

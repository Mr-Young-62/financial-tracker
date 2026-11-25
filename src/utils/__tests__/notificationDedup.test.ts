/**
 * Unit tests for deduplication helpers.
 *
 * Fixtures are synthetic strings only — never real notification content.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  DEFAULT_DEDUP_WINDOW_MS,
  NotificationDedupStore,
  computeDedupeKey,
  fnv1a32,
  isDuplicate,
  rememberKey,
} from '../notificationDedup';

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);

describe('fnv1a32', () => {
  test('is deterministic and zero-padded to 8 hex chars', () => {
    const a = fnv1a32('financial-tracker');
    const b = fnv1a32('financial-tracker');
    assert.equal(a, b);
    assert.match(a, /^[0-9a-f]{8}$/);
  });

  test('different inputs produce different hashes', () => {
    assert.notEqual(fnv1a32('com.bank.a'), fnv1a32('com.bank.b'));
  });
});

describe('computeDedupeKey', () => {
  test('identical content in the same minute is the same key', () => {
    const t = NOW;
    assert.equal(
      computeDedupeKey('com.bank', 'Title', 'Body Rp10.000', t),
      computeDedupeKey('com.bank', 'Title', 'Body Rp10.000', t + 30_000)
    );
  });

  test('whitespace differences normalise away', () => {
    assert.equal(
      computeDedupeKey('com.bank', ' Title ', 'Body   Rp10.000', NOW),
      computeDedupeKey('com.bank', 'Title', 'Body Rp10.000', NOW)
    );
  });

  test('different minute buckets are different keys (new transactions pass)', () => {
    assert.notEqual(
      computeDedupeKey('com.bank', 'Title', 'Body Rp10.000', NOW),
      computeDedupeKey('com.bank', 'Title', 'Body Rp10.000', NOW + 60_000)
    );
  });

  test('different source packages are different keys', () => {
    assert.notEqual(
      computeDedupeKey('com.bank.a', 'Title', 'Body', NOW),
      computeDedupeKey('com.bank.b', 'Title', 'Body', NOW)
    );
  });
});

describe('windowed dedupe store', () => {
  test('isDuplicate only inside the window', () => {
    const entries = [{ key: 'k1', seenAt: NOW }];
    assert.equal(isDuplicate(entries, 'k1', NOW + 1000), true);
    assert.equal(
      isDuplicate(entries, 'k1', NOW + DEFAULT_DEDUP_WINDOW_MS + 1),
      false
    );
    assert.equal(isDuplicate(entries, 'other', NOW), false);
  });

  test('rememberKey prunes expired entries and respects the cap', () => {
    const entries = [
      { key: 'old', seenAt: NOW - DEFAULT_DEDUP_WINDOW_MS - 1 },
      { key: 'fresh', seenAt: NOW },
    ];
    const next = rememberKey(entries, 'new', NOW, { maxEntries: 2 });
    assert.deepEqual(
      next.map((e) => e.key),
      ['new', 'fresh']
    );
  });

  test('store admits once then rejects within the window', () => {
    const store = new NotificationDedupStore();
    assert.equal(store.admit('k', NOW), true);
    assert.equal(store.admit('k', NOW + 1000), false);
    assert.equal(store.admit('k2', NOW + 1000), true);
    assert.equal(store.size, 2);
  });

  test('store rejects after the window expires', () => {
    const store = new NotificationDedupStore();
    assert.equal(store.admit('k', NOW), true);
    // Old entry expired: the key is admitted again and replaces the old one.
    assert.equal(store.admit('k', NOW + DEFAULT_DEDUP_WINDOW_MS + 1), true);
    assert.equal(store.size, 1);
  });

  test('snapshot round-trips state', () => {
    const store = new NotificationDedupStore([{ key: 'seed', seenAt: NOW }]);
    const restored = new NotificationDedupStore(store.snapshot());
    assert.equal(restored.admit('seed', NOW + 1), false);
  });
});

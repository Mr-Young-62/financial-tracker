/**
 * Unit tests for the notification → transaction-candidate parser.
 *
 * All fixtures are SYNTHETIC strings written for these tests. Never paste
 * real bank/wallet notification content here.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  findMarkedAmounts,
  normalizeAmountNumber,
  parseNotification,
} from '../notificationParser';

const PAST = new Date(2020, 0, 1, 10, 0, 0).getTime(); // 1 Jan 2020, safely in the past

describe('normalizeAmountNumber', () => {
  test('plain integers', () => {
    assert.equal(normalizeAmountNumber('150000'), 150000);
    assert.equal(normalizeAmountNumber('0'), 0);
  });

  test('grouping separators (ID/EU and en-US)', () => {
    assert.equal(normalizeAmountNumber('1.234.567'), 1234567);
    assert.equal(normalizeAmountNumber('1,234,567'), 1234567);
    assert.equal(normalizeAmountNumber('1.234'), 1234);
    assert.equal(normalizeAmountNumber('1,234'), 1234);
    assert.equal(normalizeAmountNumber('150.000'), 150000);
  });

  test('decimal separators', () => {
    assert.equal(normalizeAmountNumber('12.50'), 12.5);
    assert.equal(normalizeAmountNumber('12,50'), 12.5);
    assert.equal(normalizeAmountNumber('1.5'), 1.5);
  });

  test('mixed separators: last one is decimal', () => {
    assert.equal(normalizeAmountNumber('1,234.56'), 1234.56);
    assert.equal(normalizeAmountNumber('1.234,56'), 1234.56);
  });

  test('rejects malformed input instead of guessing', () => {
    assert.equal(normalizeAmountNumber(''), null);
    assert.equal(normalizeAmountNumber('abc'), null);
    assert.equal(normalizeAmountNumber('12.34.56.78.9'), null); // head too long for grouping shape
    assert.equal(normalizeAmountNumber('1,2,3'), null);
    assert.equal(normalizeAmountNumber('-5'), null);
  });
});

describe('findMarkedAmounts', () => {
  test('finds explicitly marked amounts in order', () => {
    const found = findMarkedAmounts('Pembayaran Rp10.000 dan Rp20.000');
    assert.equal(found.length, 2);
    assert.deepEqual(
      found.map((f) => [f.amount, f.currency]),
      [
        [10000, 'IDR'],
        [20000, 'IDR'],
      ]
    );
  });

  test('S$ is SGD, not USD', () => {
    const found = findMarkedAmounts('You spent S$10.00 at the store');
    assert.equal(found.length, 1);
    assert.equal(found[0].currency, 'SGD');
    assert.equal(found[0].amount, 10);
  });

  test('marker must not match inside a word (form1000 is not RM 1000)', () => {
    assert.deepEqual(findMarkedAmounts('form1000 today'), []);
    assert.deepEqual(findMarkedAmounts('erupsi100 here'), []);
    const found = findMarkedAmounts('RM 1000 received');
    assert.equal(found[0]?.currency, 'MYR');
  });

  test('number must immediately follow the marker', () => {
    // "Rp gratis 100" must not capture 100.
    assert.deepEqual(findMarkedAmounts('Ikuti promo Rp gratis 100'), []);
  });

  test('multiple distinct markers are all found', () => {
    const found = findMarkedAmounts('Rp1.000 and $2.50 and €3');
    assert.deepEqual(
      found.map((f) => f.currency),
      ['IDR', 'USD', 'EUR']
    );
  });
});

describe('parseNotification', () => {
  test('clear expense notification becomes a candidate', () => {
    const outcome = parseNotification({
      sourcePackage: 'com.example.bank',
      title: 'BankXYZ',
      text: 'Pembayaran berhasil Rp150.000 ke Toko Maju pada 1 Jan 2020 10:30',
      receivedAt: PAST,
    });
    assert.equal(outcome.status, 'candidate');
    if (outcome.status !== 'candidate') return;

    const draft = outcome.candidate;
    assert.equal(draft.sourcePackage, 'com.example.bank');
    assert.equal(draft.type, 'EXPENSE');
    assert.equal(draft.amount, 150000);
    assert.equal(draft.currency, 'IDR');
    assert.notEqual(draft.description, '');
    assert.notEqual(draft.transactionDate, null);
    assert.equal(draft.reviewReasons.length, 0);
    assert.equal(draft.needsReview, false);
  });

  test('clear income notification becomes an INCOME candidate', () => {
    const outcome = parseNotification({
      sourcePackage: 'com.example.bank',
      title: 'BankABC',
      text: 'Transfer masuk Rp500.000 dari Budi pada 1 Jan 2020 09:15',
      receivedAt: PAST,
    });
    assert.equal(outcome.status, 'candidate');
    if (outcome.status !== 'candidate') return;
    assert.equal(outcome.candidate.type, 'INCOME');
    assert.equal(outcome.candidate.amount, 500000);
  });

  test('balance inquiry is ignored, not turned into income', () => {
    const outcome = parseNotification({
      sourcePackage: 'com.example.bank',
      title: 'BankXYZ',
      text: 'Saldo Anda Rp1.000.000 per hari ini',
      receivedAt: PAST,
    });
    assert.deepEqual(outcome, { status: 'ignored', reason: 'not_a_transaction' });
  });

  test('OTP message is ignored', () => {
    const outcome = parseNotification({
      sourcePackage: 'com.example.bank',
      title: 'BankXYZ',
      text: 'Kode OTP 445566 untuk verifikasi transaksi',
      receivedAt: PAST,
    });
    assert.deepEqual(outcome, { status: 'ignored', reason: 'not_a_transaction' });
  });

  test('notification without any marked amount is ignored', () => {
    const outcome = parseNotification({
      sourcePackage: 'com.example.bank',
      title: 'Promo',
      text: 'Promo cashback menarik untuk kamu',
      receivedAt: PAST,
    });
    assert.deepEqual(outcome, { status: 'ignored', reason: 'no_amount' });
  });

  test('empty notification is ignored', () => {
    const outcome = parseNotification({
      sourcePackage: 'com.example.bank',
      title: '',
      text: '',
      receivedAt: PAST,
    });
    assert.deepEqual(outcome, { status: 'ignored', reason: 'no_text' });
  });

  test('multiple amounts are flagged for review, not guessed', () => {
    const outcome = parseNotification({
      sourcePackage: 'com.example.bank',
      title: 'BankXYZ',
      text: 'Pembayaran Rp10.000 dan Rp20.000 ke Toko pada 1 Jan 2020 10:30',
      receivedAt: PAST,
    });
    assert.equal(outcome.status, 'candidate');
    if (outcome.status !== 'candidate') return;
    assert.equal(outcome.candidate.needsReview, true);
    assert.ok(outcome.candidate.reviewReasons.includes('multiple_amounts'));
    // First explicit amount is used, but the user must confirm.
    assert.equal(outcome.candidate.amount, 10000);
  });

  test('missing type/description/date is flagged for review', () => {
    const outcome = parseNotification({
      sourcePackage: 'com.example.bank',
      title: 'BankXYZ',
      text: 'Rp25.000',
      receivedAt: PAST,
    });
    assert.equal(outcome.status, 'candidate');
    if (outcome.status !== 'candidate') return;
    assert.equal(outcome.candidate.needsReview, true);
    assert.ok(outcome.candidate.reviewReasons.includes('missing_type'));
    assert.ok(outcome.candidate.reviewReasons.includes('missing_description'));
    assert.ok(outcome.candidate.reviewReasons.includes('missing_date'));
  });

  test('malformed receivedAt never throws', () => {
    const outcome = parseNotification({
      sourcePackage: 'com.example.bank',
      title: 'BankXYZ',
      text: 'Pembayaran Rp10.000 ke Toko',
      receivedAt: Number.NaN,
    });
    assert.equal(outcome.status, 'ignored');
  });

  test('dedupe key is stable for identical content in the same minute', () => {
    const input = {
      sourcePackage: 'com.example.bank',
      title: 'BankXYZ',
      text: 'Pembayaran berhasil Rp150.000 ke Toko Maju pada 1 Jan 2020 10:30',
      receivedAt: PAST,
    };
    const a = parseNotification(input);
    const b = parseNotification({ ...input, receivedAt: PAST + 1000 });
    assert.equal(a.status, 'candidate');
    assert.equal(b.status, 'candidate');
    if (a.status !== 'candidate' || b.status !== 'candidate') return;
    assert.equal(a.candidate.dedupeKey, b.candidate.dedupeKey);
  });
});

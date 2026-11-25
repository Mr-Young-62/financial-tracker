/**
 * Modular, rule-based parser that turns raw Android notification text into a
 * transaction candidate draft.
 *
 * Design constraints:
 * - Rules are explicit and unit-testable; no guessing. When the text does not
 *   clearly describe a transaction, the candidate is marked for review
 *   (`needsReview`) instead of inventing values.
 * - Pure module: no Capacitor, no storage, no logging of raw content.
 */
import { CurrencyCode, NotificationDraft, TransactionType } from '../types';
import { computeDedupeKey } from './notificationDedup';

export interface NotificationInput {
  sourcePackage: string;
  title?: string;
  text?: string;
  /** Epoch millis when the notification was posted (Android postTime). */
  receivedAt: number;
}

export type ParseOutcome =
  | { status: 'candidate'; candidate: NotificationDraft }
  | { status: 'ignored'; reason: IgnoreReason };

export type IgnoreReason =
  | 'no_text'
  | 'no_amount'
  | 'ambiguous_amount'
  | 'unsupported_currency'
  | 'not_a_transaction';

/** Reason codes that require the user to review/edit the draft before confirming. */
export type ReviewReason =
  | 'missing_type'
  | 'missing_description'
  | 'missing_date'
  | 'multiple_amounts';

interface AmountMatch {
  amount: number;
  currency: CurrencyCode;
  /** Index in the source string, used to pick the first explicit amount. */
  index: number;
}

/**
 * Currency markers, checked in this order. Longer/More specific markers come
 * first so "S$" is not shadowed by "$" and "Rp" is not shadowed by "IDR".
 * Only explicitly marked amounts are accepted — bare numbers are never guessed.
 */
const CURRENCY_PATTERNS: Array<{ marker: RegExp; currency: CurrencyCode }> = [
  { marker: /(?<!\w)IDR/i, currency: 'IDR' },
  { marker: /(?<!\w)Rp/i, currency: 'IDR' },
  { marker: /(?<!\w)USD/i, currency: 'USD' },
  { marker: /S\$/i, currency: 'SGD' },
  { marker: /(?<!\w)SGD/i, currency: 'SGD' },
  { marker: /(?<!\w)RM/i, currency: 'MYR' },
  { marker: /(?<!\w)EUR/i, currency: 'EUR' },
  { marker: /€/u, currency: 'EUR' },
  { marker: /(?<!\w)JPY/i, currency: 'JPY' },
  { marker: /¥/u, currency: 'JPY' },
  { marker: /\$/, currency: 'USD' },
];

/**
 * Number immediately following a currency marker (anchored; optional single
 * space allowed). Accepts: "150.000", "150,000", "150000", "12.50", "12,50".
 * The value is normalised below depending on separator shape.
 */
const AMOUNT_AFTER_MARKER = /^ ?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d{1,2})?)/;

/**
 * Explicit transaction-type keyword rules (Indonesian + English), checked
 * case-insensitively against the combined title/text.
 */
const EXPENSE_KEYWORDS = [
  'berhasil dibayar',
  'berhasil belanja',
  'membayar',
  'membeli',
  'pembelian',
  'pembayaran',
  'berbelanja',
  'didebit',
  'debit',
  'transfer keluar',
  'penarikan',
  'tarik tunai',
  'spent',
  'paid',
  'payment',
  'debit card',
  'purchase',
  'withdrawal',
  'purchase made',
];

const INCOME_KEYWORDS = [
  'menerima',
  'diterima',
  'masuk',
  'pemasukan',
  'kredit masuk',
  'setoran',
  'dikreditkan',
  'received',
  'credited',
  'credit',
  'deposit',
  'refund',
  'cashback',
  'gaji',
  'transfer masuk',
];

/**
 * Phrase that, when combined with an amount, indicates the notification is NOT
 * a transaction (balance inquiries, promo messages, etc.). Checked first.
 */
const NON_TRANSACTION_PATTERNS: RegExp[] = [
  /saldo\s+(?:anda|akun|rekening|saat\s+ini)/i,
  /sisa\s+saldo/i,
  /balance\s+(?:is|of|in\s+account)/i,
  /promo\s+(?:khusus|menarik)/i,
  /kode\s+(?:otp|verifikasi)/i,
  /verification\s+code/i,
  /unduh\s+aplikasi/i,
  /t\u00f6nghetkan\s+notifikasi/i,
];

/** Description/merchant extraction patterns: capture text after a direction word. */
const DESCRIPTION_PATTERNS: RegExp[] = [
  /\b(?:kepada|ke|to|untuk pembayaran ke|di|at|dari|from|dengan|with)\s+([^\n.,;]{2,60})/i,
  /(?:merchant|penerima|payee)\s*[:\-]\s*([^\n.,;]{2,60})/i,
];

/** Explicit date patterns found in notification bodies. Order matters. */
const DATE_PATTERNS: Array<{ re: RegExp; order: 'dmy' | 'ymd' }> = [
  { re: /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/, order: 'dmy' },
  { re: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, order: 'ymd' },
];

const MONTHS_ID = [
  'jan', 'feb', 'mar', 'apr', 'mei', 'jun',
  'jul', 'agt', 'sep', 'okt', 'nov', 'des',
];
const MONTHS_EN = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

const TIME_PATTERN = /\b(\d{1,2})[:.](\d{2})\b/;

/**
 * Normalises amount strings to a number.
 *
 * Rules (explicit, no guessing beyond standard separator conventions):
 * - Both separators present  -> last one is decimal, other is grouping:
 *   "1,234.56" -> 1234.56, "1.234,56" -> 1234.56
 * - Single separator, repeated -> grouping: "1.234.567" -> 1234567
 * - Single separator, once, 3-digit tail, short head -> grouping (ID/EU
 *   convention): "1.234" / "1,234" -> 1234
 * - Otherwise -> decimal: "12.50" / "12,50" -> 12.5
 * - No separator -> plain integer.
 */
export function normalizeAmountNumber(raw: string): number | null {
  if (!/^\d+(?:[.,]\d+)*$/.test(raw)) return null;

  const toNumber = (value: string): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const lastDot = raw.lastIndexOf('.');
  const lastComma = raw.lastIndexOf(',');
  const lastSep = Math.max(lastDot, lastComma);
  if (lastSep < 0) return toNumber(raw);

  const sepChar = raw[lastSep];
  const otherChar = sepChar === '.' ? ',' : '.';
  const tail = raw.slice(lastSep + 1);

  if (raw.includes(otherChar)) {
    // Both separators: last is decimal, other is grouping.
    return toNumber(raw.split(otherChar).join('').replace(sepChar, '.'));
  }

  const sepCount = raw.split(sepChar).length - 1;
  if (sepCount > 1) {
    // Pure grouping must have3-digit groups: "1.234.567" OK, "12.34.56.78.9" not.
    if (/^\d{1,3}(?:[.,]\d{3})+$/.test(raw)) {
      return toNumber(raw.replace(/[.,]/g, ''));
    }
    return null;
  }

  const head = raw.slice(0, lastSep);
  if (tail.length === 3 && head.length <= 3) {
    // Ambiguous single separator with grouping shape: treat as grouping.
    return toNumber(head + tail);
  }

  // Decimal shape: "12.50", "12,50", "1.2345"
  return toNumber(head + '.' + tail);
}

/** Finds all explicitly marked amounts in the text, in order of appearance. */
export function findMarkedAmounts(combined: string): AmountMatch[] {
  const results: Array<AmountMatch & { spanEnd: number }> = [];

  for (const { marker, currency } of CURRENCY_PATTERNS) {
    marker.lastIndex = 0;
    const global = new RegExp(marker.source, marker.flags.includes('g') ? marker.flags : `${marker.flags}g`);
    let match: RegExpExecArray | null;
    while ((match = global.exec(combined)) !== null) {
      const after = combined.slice(match.index + match[0].length);
      const numMatch = AMOUNT_AFTER_MARKER.exec(after);
      if (!numMatch) continue;
      const value = normalizeAmountNumber(numMatch[1]);
      if (value === null || value <= 0) continue;
      results.push({
        amount: value,
        currency,
        index: match.index,
        spanEnd: match.index + match[0].length + numMatch[0].length,
      });
      global.lastIndex = match.index + match[0].length + numMatch[0].length;
    }
  }

  results.sort((a, b) => a.index - b.index || b.spanEnd - a.spanEnd);

  // Drop overlapping matches: "S$10" would otherwise yield both SGD ("S$")
  // and USD ("$") entries. Keep the marker that starts first at each spot.
  const deduped: AmountMatch[] = [];
  let coveredUntil = -1;
  for (const entry of results) {
    if (entry.index < coveredUntil) continue;
    coveredUntil = entry.spanEnd;
    deduped.push({ amount: entry.amount, currency: entry.currency, index: entry.index });
  }
  return deduped;
}

function detectType(combined: string): TransactionType | null {
  const haystack = combined.toLowerCase();
  let expenseHits = 0;
  let incomeHits = 0;

  for (const kw of EXPENSE_KEYWORDS) {
    if (haystack.includes(kw)) expenseHits += 1;
  }
  for (const kw of INCOME_KEYWORDS) {
    if (haystack.includes(kw)) incomeHits += 1;
  }

  if (expenseHits > 0 && incomeHits === 0) return 'EXPENSE';
  if (incomeHits > 0 && expenseHits === 0) return 'INCOME';
  // Conflicting or absent signals -> do not guess.
  return null;
}

function extractDescription(combined: string): string | null {
  for (const pattern of DESCRIPTION_PATTERNS) {
    const match = pattern.exec(combined);
    if (match && match[1]) {
      const cleaned = match[1].replace(/\s+/g, ' ').trim();
      if (cleaned.length >= 2) return cleaned;
    }
  }
  return null;
}

function extractDate(combined: string): { iso: string | null } {
  const now = new Date();

  for (const { re, order } of DATE_PATTERNS) {
    const match = re.exec(combined);
    if (!match) continue;
    const [y, m, d] =
      order === 'dmy'
        ? [Number(match[3]), Number(match[2]), Number(match[1])]
        : [Number(match[1]), Number(match[2]), Number(match[3])];
    if (m < 1 || m > 12 || d < 1 || d > 31) continue;

    const time = TIME_PATTERN.exec(combined);
    const hh = time ? Number(time[1]) : 12;
    const mm = time ? Number(time[2]) : 0;
    if (hh > 23 || mm > 59) continue;

    const date = new Date(y, m - 1, d, hh, mm, 0, 0);
    // Reject overflow dates like 31/02
    if (date.getMonth() !== m - 1 || date.getDate() !== d) continue;
    if (date.getTime() > now.getTime() + 24 * 60 * 60 * 1000) continue;
    return { iso: date.toISOString() };
  }

  // Month-name dates: "12 Jan 2026", "12 January 2026"
  const monthRe = /\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/;
  const monthMatch = monthRe.exec(combined);
  if (monthMatch) {
    const day = Number(monthMatch[1]);
    const monthWord = monthMatch[2].toLowerCase().slice(0, 3);
    const year = Number(monthMatch[3]);
    let monthIdx = MONTHS_ID.indexOf(monthWord);
    if (monthIdx < 0) monthIdx = MONTHS_EN.indexOf(monthWord);
    if (monthIdx >= 0 && day >= 1 && day <= 31) {
      const time = TIME_PATTERN.exec(combined);
      const hh = time ? Number(time[1]) : 12;
      const mm = time ? Number(time[2]) : 0;
      const date = new Date(year, monthIdx, day, hh <= 23 ? hh : 12, mm <= 59 ? mm : 0, 0, 0);
      if (
        date.getMonth() === monthIdx &&
        date.getDate() === day &&
        date.getTime() <= now.getTime() + 24 * 60 * 60 * 1000
      ) {
        return { iso: date.toISOString() };
      }
    }
  }

  return { iso: null };
}

function makeDedupeKey(input: NotificationInput): string {
  return computeDedupeKey(
    input.sourcePackage,
    input.title ?? '',
    input.text ?? '',
    input.receivedAt
  );
}

/**
 * Parses a raw notification into a draft candidate, or explains why it was
 * ignored. Never throws: malformed input yields an `ignored` outcome.
 */
export function parseNotification(input: NotificationInput): ParseOutcome {
  try {
    const title = (input.title ?? '').trim();
    const text = (input.text ?? '').trim();
    const combined = `${title}\n${text}`.replace(/\s+/g, ' ').trim();

    if (!combined) {
      return { status: 'ignored', reason: 'no_text' };
    }

    // Non-transaction notifications (balance, OTP, promo) are dropped early.
    for (const pattern of NON_TRANSACTION_PATTERNS) {
      if (pattern.test(combined)) {
        return { status: 'ignored', reason: 'not_a_transaction' };
      }
    }

    const amounts = findMarkedAmounts(combined);
    if (amounts.length === 0) {
      return { status: 'ignored', reason: 'no_amount' };
    }

    // Use the FIRST explicitly marked amount; flag when several exist so the
    // user picks the right one instead of us guessing.
    const chosen = amounts[0];
    const reviewReasons: Array<ReviewReason> = [];
    if (amounts.length > 1) reviewReasons.push('multiple_amounts');

    const type = detectType(combined);
    if (!type) reviewReasons.push('missing_type');

    const description = extractDescription(combined);
    if (!description) reviewReasons.push('missing_description');

    const { iso } = extractDate(combined);
    if (!iso) reviewReasons.push('missing_date');

    if (input.receivedAt <= 0 || Number.isNaN(input.receivedAt)) {
      return { status: 'ignored', reason: 'no_text' };
    }

    const draft: NotificationDraft = {
      id: `ndraft-${makeDedupeKey(input)}-${input.receivedAt}`,
      dedupeKey: makeDedupeKey(input),
      sourcePackage: input.sourcePackage,
      title,
      text,
      type,
      amount: chosen.amount,
      currency: chosen.currency,
      description: description ?? '',
      transactionDate: iso,
      needsReview: reviewReasons.length > 0,
      reviewReasons,
      receivedAt: new Date(input.receivedAt).toISOString(),
      createdAt: new Date().toISOString(),
    };

    return { status: 'candidate', candidate: draft };
  } catch {
    // Parser failures must never crash the pipeline; treat as non-transaction.
    return { status: 'ignored', reason: 'not_a_transaction' };
  }
}

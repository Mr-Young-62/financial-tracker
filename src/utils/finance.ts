import { RecurringInterval, Transaction } from '../types';

export type PeriodFilter = 'today' | 'this_week' | 'this_month' | 'this_year' | 'all';

export interface DateRange {
  start: Date;
  end: Date;
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

/**
 * Returns a local-time date range for a named period.
 * `all` intentionally returns null because it has no lower/upper bound.
 */
export function getPeriodRange(
  period: PeriodFilter,
  reference: Date = new Date()
): DateRange | null {
  if (period === 'all') return null;

  if (period === 'today') {
    return { start: startOfDay(reference), end: endOfDay(reference) };
  }

  if (period === 'this_week') {
    const weekStart = startOfDay(reference);
    const mondayOffset = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return { start: weekStart, end: endOfDay(weekEnd) };
  }

  if (period === 'this_month') {
    const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
    return { start: startOfDay(start), end: endOfDay(end) };
  }

  // this_year
  return {
    start: startOfDay(new Date(reference.getFullYear(), 0, 1)),
    end: endOfDay(new Date(reference.getFullYear(), 11, 31)),
  };
}

export function getPeriodLabel(
  period: PeriodFilter,
  reference: Date = new Date()
): string {
  if (period === 'all') return 'All records';

  if (period === 'today') {
    return `Today, ${reference.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
  }

  const range = getPeriodRange(period, reference);
  if (!range) return 'All records';

  if (period === 'this_week') {
    const startLabel = range.start.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
    const endLabel = range.end.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `${startLabel} – ${endLabel}`;
  }

  if (period === 'this_month') {
    return reference.toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
  }

  return String(reference.getFullYear());
}

export function isDateInPeriod(
  isoDate: string,
  period: PeriodFilter,
  reference: Date = new Date()
): boolean {
  const range = getPeriodRange(period, reference);
  if (!range) return true;

  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return false;

  return timestamp >= range.start.getTime() && timestamp <= range.end.getTime();
}

export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: PeriodFilter,
  reference: Date = new Date()
): Transaction[] {
  if (period === 'all') return transactions;
  return transactions.filter((tx) => isDateInPeriod(tx.transactionDate, period, reference));
}

export function getWeekDays(reference: Date = new Date()): Date[] {
  const start = startOfDay(reference);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

/* ------------------------------------------------------------------ */
/* Date-only helpers (avoid timezone drift for recurring schedules)    */
/* ------------------------------------------------------------------ */

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function toDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toDateInputValue(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return toDateOnlyString(new Date());
  return toDateOnlyString(parsed);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
}

export function addRecurringInterval(
  date: Date,
  interval: RecurringInterval
): Date {
  switch (interval) {
    case 'DAILY':
      return addDays(date, 1);
    case 'WEEKLY':
      return addDays(date, 7);
    case 'YEARLY':
      return addMonthsClamped(date, 12);
    case 'MONTHLY':
    default:
      return addMonthsClamped(date, 1);
  }
}

export function isRecurringDue(
  nextRunDate: string,
  reference: Date = new Date()
): boolean {
  return startOfDay(parseDateOnly(nextRunDate)).getTime() <= endOfDay(reference).getTime();
}

export function recurringOccurrenceKey(
  recurringId: string,
  occurrenceDate: string
): string {
  return `rec-${recurringId}-${occurrenceDate}`;
}

export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

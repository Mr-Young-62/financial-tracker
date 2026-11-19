import {
  Budget,
  Category,
  CurrencyCode,
  RecurringTransaction,
  Transaction,
} from '../types';

export interface AppStateSnapshot {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurringList: RecurringTransaction[];
  currency: CurrencyCode;
}

const STORAGE_KEY = 'financial-tracker:state:v1';
const API_STATE_URL = '/api/v1/state';

function isArrayOfObjects(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every((item) => item !== null && typeof item === 'object');
}

export function isAppStateSnapshot(value: unknown): value is AppStateSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppStateSnapshot>;
  return (
    isArrayOfObjects(candidate.categories) &&
    isArrayOfObjects(candidate.transactions) &&
    isArrayOfObjects(candidate.budgets) &&
    isArrayOfObjects(candidate.recurringList) &&
    typeof candidate.currency === 'string'
  );
}

export function loadCachedState(): AppStateSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isAppStateSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCachedState(snapshot: AppStateSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage can be full or disabled; the remote API remains the fallback.
  }
}

export async function fetchRemoteState(): Promise<AppStateSnapshot | null> {
  if (typeof fetch === 'undefined') return null;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(API_STATE_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { data?: unknown };
    return isAppStateSnapshot(payload.data) ? payload.data : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function saveRemoteState(snapshot: AppStateSnapshot): Promise<boolean> {
  if (typeof fetch === 'undefined') return false;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(API_STATE_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(snapshot),
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export type CurrencyCode = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'MYR' | 'JPY';

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  symbol: string;
  rateToUsd: number; // 1 unit in USD
  decimalDigits: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  IDR: { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', rateToUsd: 0.000063, decimalDigits: 0 },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', rateToUsd: 1.0, decimalDigits: 2 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', rateToUsd: 1.085, decimalDigits: 2 },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rateToUsd: 0.755, decimalDigits: 2 },
  MYR: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', rateToUsd: 0.225, decimalDigits: 2 },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rateToUsd: 0.0066, decimalDigits: 0 },
};

export type CategoryType = 'INCOME' | 'EXPENSE';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  colorHex: string;
  icon: string;
  isSystem?: boolean;
}

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  description: string;
  notes?: string;
  transactionDate: string; // ISO date string
  tags: string[];
  idempotencyKey: string;
  syncStatus: 'SYNCED' | 'PENDING';
  createdAt: string;
}

/**
 * A transaction candidate captured from an Android notification. Drafts always
 * require explicit user confirmation before becoming a Transaction.
 */
export interface NotificationDraft {
  id: string;
  /** Stable content hash used to prevent duplicate drafts (see notificationDedup). */
  dedupeKey: string;
  sourcePackage: string;
  /** Notification title as provided by the source app (kept locally only). */
  title: string;
  /** Notification body as provided by the source app (kept locally only). */
  text: string;
  type: TransactionType | null;
  amount: number | null;
  currency: CurrencyCode | null;
  description: string;
  /** ISO date string parsed from the notification text, or null when unavailable. */
  transactionDate: string | null;
  needsReview: boolean;
  /** Machine-readable reasons why the draft needs user review (never raw content). */
  reviewReasons: string[];
  /** ISO timestamp of when the notification was posted. */
  receivedAt: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  monthlyLimit: number;
  currency: CurrencyCode;
}

export type RecurringInterval = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RecurringTransaction {
  id: string;
  categoryId?: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  currency: CurrencyCode;
  description: string;
  interval: RecurringInterval;
  nextRunDate: string;
  lastRunDate?: string;
  isActive: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  baseCurrency: CurrencyCode;
  isAuthenticated: boolean;
}

export interface SyncQueueItem {
  id: string;
  action: 'CREATE_TX' | 'UPDATE_TX' | 'DELETE_TX';
  payload: any;
  timestamp: string;
  idempotencyKey: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
}

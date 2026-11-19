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

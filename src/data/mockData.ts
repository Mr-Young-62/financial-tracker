import { Category, Transaction, Budget, RecurringTransaction, CurrencyCode, CURRENCIES } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  // Income
  { id: 'cat-inc-1', name: 'Salary', type: 'INCOME', colorHex: '#10B981', icon: 'Briefcase', isSystem: true },
  { id: 'cat-inc-2', name: 'Business', type: 'INCOME', colorHex: '#059669', icon: 'TrendingUp', isSystem: true },
  { id: 'cat-inc-3', name: 'Investment & Dividends', type: 'INCOME', colorHex: '#3B82F6', icon: 'LineChart', isSystem: true },
  { id: 'cat-inc-4', name: 'Freelance & Consult', type: 'INCOME', colorHex: '#8B5CF6', icon: 'Laptop', isSystem: true },
  { id: 'cat-inc-5', name: 'Other Income', type: 'INCOME', colorHex: '#64748B', icon: 'PlusCircle', isSystem: true },
  // Expense
  { id: 'cat-exp-1', name: 'Food & Dining', type: 'EXPENSE', colorHex: '#F59E0B', icon: 'Utensils', isSystem: true },
  { id: 'cat-exp-2', name: 'Transportation', type: 'EXPENSE', colorHex: '#3B82F6', icon: 'Car', isSystem: true },
  { id: 'cat-exp-3', name: 'Shopping & Retail', type: 'EXPENSE', colorHex: '#EC4899', icon: 'ShoppingBag', isSystem: true },
  { id: 'cat-exp-4', name: 'Entertainment & Fun', type: 'EXPENSE', colorHex: '#8B5CF6', icon: 'Film', isSystem: true },
  { id: 'cat-exp-5', name: 'Bills & Utilities', type: 'EXPENSE', colorHex: '#EF4444', icon: 'Zap', isSystem: true },
  { id: 'cat-exp-6', name: 'Healthcare & Medical', type: 'EXPENSE', colorHex: '#14B8A6', icon: 'HeartPulse', isSystem: true },
  { id: 'cat-exp-7', name: 'Education & Courses', type: 'EXPENSE', colorHex: '#6366F1', icon: 'GraduationCap', isSystem: true },
  { id: 'cat-exp-8', name: 'Housing & Rent', type: 'EXPENSE', colorHex: '#64748B', icon: 'Home', isSystem: true },
  { id: 'cat-exp-9', name: 'Other Expenses', type: 'EXPENSE', colorHex: '#94A3B8', icon: 'MoreHorizontal', isSystem: true },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-mock-1',
    categoryId: 'cat-exp-4',
    type: 'EXPENSE',
    amount: 10.99,
    currency: 'USD',
    description: 'Netflix',
    notes: 'Monthly 4K Family Subscription',
    transactionDate: '2026-11-09T18:20:00Z',
    tags: ['subscription', 'entertainment'],
    idempotencyKey: 'idem-nflx-001',
    syncStatus: 'SYNCED',
    createdAt: '2026-11-09T18:20:00Z',
  },
  {
    id: 'tx-mock-2',
    categoryId: 'cat-exp-3',
    type: 'EXPENSE',
    amount: 92.99,
    currency: 'USD',
    description: 'Amazon',
    notes: 'Online Shopping order',
    transactionDate: '2026-11-08T15:10:00Z',
    tags: ['shopping', 'delivery'],
    idempotencyKey: 'idem-amzn-002',
    syncStatus: 'SYNCED',
    createdAt: '2026-11-08T15:10:00Z',
  },
  {
    id: 'tx-mock-3',
    categoryId: 'cat-exp-1',
    type: 'EXPENSE',
    amount: 3.29,
    currency: 'USD',
    description: 'Starbucks',
    notes: 'Iced Caramel Macchiato',
    transactionDate: '2026-11-08T09:40:00Z',
    tags: ['coffee', 'dining'],
    idempotencyKey: 'idem-sbux-003',
    syncStatus: 'SYNCED',
    createdAt: '2026-11-08T09:40:00Z',
  },
  {
    id: 'tx-mock-4',
    categoryId: 'cat-exp-2',
    type: 'EXPENSE',
    amount: 16.99,
    currency: 'USD',
    description: 'Uber',
    notes: 'Downtown ride transit',
    transactionDate: '2026-11-07T21:15:00Z',
    tags: ['transit', 'ride'],
    idempotencyKey: 'idem-uber-004',
    syncStatus: 'SYNCED',
    createdAt: '2026-11-07T21:15:00Z',
  },
  {
    id: 'tx-001',
    categoryId: 'cat-inc-1',
    type: 'INCOME',
    amount: 18500000,
    currency: 'IDR',
    description: 'Monthly Salary PT Teknologi Nusantara',
    notes: 'Base salary + remote work allowance for November',
    transactionDate: '2026-11-01T08:30:00Z',
    tags: ['salary', 'payroll', 'tech'],
    idempotencyKey: 'idem-sal-nov-001',
    syncStatus: 'SYNCED',
    createdAt: '2026-11-01T08:30:00Z',
  },
  {
    id: 'tx-002',
    categoryId: 'cat-exp-5',
    type: 'EXPENSE',
    amount: 850000,
    currency: 'IDR',
    description: 'PLN Electricity Token & Internet Indihome',
    notes: 'House utilities bill paid via virtual account',
    transactionDate: '2026-11-02T10:15:00Z',
    tags: ['utilities', 'electricity', 'internet'],
    idempotencyKey: 'idem-util-nov-002',
    syncStatus: 'SYNCED',
    createdAt: '2026-11-02T10:15:00Z',
  },
  {
    id: 'tx-003',
    categoryId: 'cat-exp-1',
    type: 'EXPENSE',
    amount: 145000,
    currency: 'IDR',
    description: 'Artisan Coffee & Lunch with Team',
    notes: 'Specialty pour-over coffee and sourdough sandwich',
    transactionDate: '2026-11-04T12:45:00Z',
    tags: ['dining', 'coffee'],
    idempotencyKey: 'idem-coffee-nov-003',
    syncStatus: 'SYNCED',
    createdAt: '2026-11-04T12:45:00Z',
  },
  {
    id: 'tx-005',
    categoryId: 'cat-exp-2',
    type: 'EXPENSE',
    amount: 98000,
    currency: 'IDR',
    description: 'GrabCar to Client Office Sudirman',
    notes: 'Business trip meeting transportation',
    transactionDate: '2026-11-06T14:20:00Z',
    tags: ['transit', 'client-meeting'],
    idempotencyKey: 'idem-grab-nov-005',
    syncStatus: 'SYNCED',
    createdAt: '2026-11-06T14:20:00Z',
  },
  {
    id: 'tx-006',
    categoryId: 'cat-inc-4',
    type: 'INCOME',
    amount: 3200000,
    currency: 'IDR',
    description: 'Mobile App UI/UX Consultation Fee',
    notes: 'Design sprint milestone payout',
    transactionDate: '2026-11-07T16:00:00Z',
    tags: ['freelance', 'consulting'],
    idempotencyKey: 'idem-fl-nov-006',
    syncStatus: 'SYNCED',
    createdAt: '2026-11-07T16:00:00Z',
  },
  {
    id: 'tx-007',
    categoryId: 'cat-exp-3',
    type: 'EXPENSE',
    amount: 1250000,
    currency: 'IDR',
    description: 'Ergonomic Mechanical Keyboard & Mousepad',
    notes: 'Desk setup upgrade purchased online',
    transactionDate: '2026-11-08T11:10:00Z',
    tags: ['electronics', 'work-setup'],
    idempotencyKey: 'idem-tech-nov-007',
    syncStatus: 'SYNCED',
    createdAt: '2026-11-08T11:10:00Z',
  },
  {
    id: 'tx-008',
    categoryId: 'cat-exp-1',
    type: 'EXPENSE',
    amount: 65000,
    currency: 'IDR',
    description: 'Traditional Street Food Dinner',
    notes: 'Cash payment at local night market',
    transactionDate: '2026-11-08T19:30:00Z',
    tags: ['food', 'cash'],
    idempotencyKey: 'idem-cash-nov-008',
    syncStatus: 'SYNCED',
    createdAt: '2026-11-08T19:30:00Z',
  },
];

export const INITIAL_BUDGETS: Budget[] = [
  { id: 'b-1', categoryId: 'cat-exp-1', monthlyLimit: 3500000, currency: 'IDR' }, // Food
  { id: 'b-2', categoryId: 'cat-exp-2', monthlyLimit: 1200000, currency: 'IDR' }, // Transport
  { id: 'b-3', categoryId: 'cat-exp-3', monthlyLimit: 2000000, currency: 'IDR' }, // Shopping
  { id: 'b-4', categoryId: 'cat-exp-4', monthlyLimit: 1000000, currency: 'IDR' }, // Entertainment
  { id: 'b-5', categoryId: 'cat-exp-5', monthlyLimit: 1500000, currency: 'IDR' }, // Utilities
];

export const INITIAL_RECURRING: RecurringTransaction[] = [
  {
    id: 'rec-1',
    categoryId: 'cat-inc-1',
    type: 'INCOME',
    amount: 18500000,
    currency: 'IDR',
    description: 'Monthly Salary PT Teknologi Nusantara',
    interval: 'MONTHLY',
    nextRunDate: '2026-12-01',
    isActive: true,
  },
  {
    id: 'rec-2',
    categoryId: 'cat-exp-5',
    type: 'EXPENSE',
    amount: 550000,
    currency: 'IDR',
    description: 'Indihome Fiber 100Mbps Broadband',
    interval: 'MONTHLY',
    nextRunDate: '2026-11-15',
    isActive: true,
  },
  {
    id: 'rec-3',
    categoryId: 'cat-exp-4',
    type: 'EXPENSE',
    amount: 186000,
    currency: 'IDR',
    description: 'Netflix 4K Ultra HD Family Plan',
    interval: 'MONTHLY',
    nextRunDate: '2026-11-20',
    isActive: true,
  },
  {
    id: 'rec-4',
    categoryId: 'cat-exp-8',
    type: 'EXPENSE',
    amount: 3500000,
    currency: 'IDR',
    description: 'Apartment Maintenance & Rent Installment',
    interval: 'MONTHLY',
    nextRunDate: '2026-12-05',
    isActive: true,
  },
];

// Helper currency converter
export function convertCurrency(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return amount;
  const fromRate = CURRENCIES[from].rateToUsd;
  const toRate = CURRENCIES[to].rateToUsd;
  const amountInUsd = amount * fromRate;
  return amountInUsd / toRate;
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const conf = CURRENCIES[currency];
  return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: conf.decimalDigits,
    maximumFractionDigits: conf.decimalDigits,
  }).format(amount);
}

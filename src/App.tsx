/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import {
  CurrencyCode,
  Category,
  Transaction,
  Budget,
  RecurringTransaction,
  TransactionType,
} from './types';
import {
  INITIAL_CATEGORIES,
  formatCurrency,
} from './data/mockData';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsView } from './components/BudgetsView';
import { ReportsView } from './components/ReportsView';
import { RecurringView } from './components/RecurringView';
import { TransactionModal } from './components/TransactionModal';
import { ReceiptScannerModal, ScannedReceiptData } from './components/ReceiptScannerModal';
import { OfflineSyncModal } from './components/OfflineSyncModal';
import { LockScreen, SecuritySettingsModal } from './components/LockScreen';
import { AndroidBottomNav } from './components/AndroidBottomNav';
import { useTabSeo, TAB_SEO_REGISTRY } from './utils/seo';
import { PeriodFilter } from './utils/finance';
import {
  AppStateSnapshot,
  loadAppState,
  loadThemePreference,
  saveAppState,
  saveThemePreference,
} from './utils/storage';
import { hasPinConfigured } from './utils/security';
import { useLanguage } from './utils/i18n';
import {
  drainQueueIntoSnapshot,
  getCaptureHealth,
  CaptureHealth,
} from './utils/notificationPipeline';
import type { DedupEntry } from './utils/notificationDedup';
import { NotificationDraft } from './types';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { NotificationDraftsModal } from './components/NotificationDraftsModal';
import {
  addRecurringInterval,
  createId,
  endOfDay,
  parseDateOnly,
  recurringOccurrenceKey,
  toDateOnlyString,
} from './utils/finance';

type ToastTone = 'income' | 'expense' | 'info' | 'delete';

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

export default function App() {
  const { t } = useLanguage();

  // Security Lock state
  const [hasPin, setHasPin] = useState<boolean>(() => hasPinConfigured());
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);
  const [isChangingPin, setIsChangingPin] = useState<boolean>(false);

  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => loadThemePreference() ?? false);

  // App Navigation state
  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const paramTab = new URLSearchParams(window.location.search).get('tab');
      if (paramTab && TAB_SEO_REGISTRY[paramTab]) {
        return paramTab;
      }
    }
    return 'dashboard';
  });

  // Dynamic SEO & Document Head Metadata Service Hook
  useTabSeo(currentTab);

  // Currency & Filter states (currency locked to IDR)
  const currency: CurrencyCode = 'IDR';
  const [timeFilter, setTimeFilter] = useState<PeriodFilter>('this_month');

  // Data states (start clean with empty records on fresh installs)
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringList, setRecurringList] = useState<RecurringTransaction[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (message: string, tone: ToastTone = 'info') => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now(), message, tone });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Ref mirrors are updated immediately so rapid repeated actions cannot
  // re-post the same recurring occurrence before React re-renders.
  const transactionsRef = useRef(transactions);
  const recurringRef = useRef(recurringList);
  const processingRecurringRef = useRef(false);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  useEffect(() => {
    recurringRef.current = recurringList;
  }, [recurringList]);

  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const notificationDedupRef = useRef<DedupEntry[]>([]);
  const notificationDraftsRef = useRef<NotificationDraft[]>([]);

  const applySnapshot = (snapshot: AppStateSnapshot) => {
    transactionsRef.current = snapshot.transactions;
    recurringRef.current = snapshot.recurringList;
    setCategories(snapshot.categories);
    setTransactions(snapshot.transactions);
    setBudgets(snapshot.budgets);
    setRecurringList(snapshot.recurringList);
    const drafts = snapshot.notificationDrafts ?? [];
    notificationDraftsRef.current = drafts;
    setNotificationDrafts(drafts);
    notificationDedupRef.current = snapshot.notificationDedup ?? [];
  };

  // Hydrate state from local storage on startup.
  useEffect(() => {
    let cancelled = false;

    loadAppState()
      .then((saved) => {
        if (cancelled) return;
        if (saved) {
          applySnapshot(saved);
        }
      })
      .finally(() => {
        if (!cancelled) setIsHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Notification capture state (must be declared before the drain useEffect)
  const [captureHealth, setCaptureHealth] = useState<CaptureHealth | null>(null);
  const [notificationDrafts, setNotificationDrafts] = useState<NotificationDraft[]>([]);
  const [showNotificationSettings, setShowNotificationSettings] = useState<boolean>(false);
  const [showNotificationDrafts, setShowNotificationDrafts] = useState<boolean>(false);
  const [confirmingDraftId, setConfirmingDraftId] = useState<string | null>(null);

  useEffect(() => {
    notificationDraftsRef.current = notificationDrafts;
  }, [notificationDrafts]);

  // Drain native notification queue into snapshot on startup and resume.
  useEffect(() => {
    if (!isHydrated) return;
    let cancelled = false;

    const doDrain = async () => {
      const health = await getCaptureHealth();
      setCaptureHealth(health);
      if (!health.available || health.queueUnavailable) return;

      const snapshot: AppStateSnapshot = {
        categories,
        transactions,
        budgets,
        recurringList,
        currency,
        notificationDrafts: notificationDraftsRef.current,
        notificationDedup: notificationDedupRef.current,
      };

      const result = await drainQueueIntoSnapshot(snapshot, async (next) => {
        if (cancelled) return;
        // Apply drafts to local state immediately for UI responsiveness.
        notificationDedupRef.current = next.notificationDedup ?? notificationDedupRef.current;
        const nextDrafts = next.notificationDrafts ?? [];
        notificationDraftsRef.current = nextDrafts;
        setNotificationDrafts(nextDrafts);
        // Persist full snapshot (storage.ts handles drafts + dedupe).
        await saveAppState(next);
      });

      if (!cancelled) {
        notificationDedupRef.current = result.snapshot.notificationDedup ?? notificationDedupRef.current;
        const nextDrafts = result.snapshot.notificationDrafts ?? [];
        notificationDraftsRef.current = nextDrafts;
        setNotificationDrafts(nextDrafts);
        setCaptureHealth({ ...health, queueUnavailable: result.queueUnavailable });
      }
    };

    void doDrain();

    // Also listen for Capacitor 'resume' event (app returns to foreground).
    let resumeHandle: PluginListenerHandle | null = null;
    if (Capacitor.isNativePlatform()) {
      void CapacitorApp.addListener('resume', () => {
        void doDrain();
      }).then((handle) => {
        resumeHandle = handle;
      });
    }

    return () => {
      cancelled = true;
      if (resumeHandle) {
        void resumeHandle.remove();
      }
    };
  }, [isHydrated, categories, transactions, budgets, recurringList, currency]);

  // Persist every state change directly to local storage once hydrated.
  useEffect(() => {
    if (!isHydrated) return;

    const snapshot: AppStateSnapshot = {
      categories,
      transactions,
      budgets,
      recurringList,
      currency,
      notificationDrafts,
      notificationDedup: notificationDedupRef.current,
    };

    void saveAppState(snapshot);
  }, [
    categories,
    transactions,
    budgets,
    recurringList,
    currency,
    notificationDrafts,
    isHydrated,
  ]);

  const handleTabChange = (newTab: string) => {
    if (newTab === currentTab) return;
    setCurrentTab(newTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Modals
  const [showTxModal, setShowTxModal] = useState<boolean>(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState<boolean>(false);
  const [receiptScannerType, setReceiptScannerType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [scannedReceiptData, setScannedReceiptData] = useState<ScannedReceiptData | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txModalType, setTxModalType] = useState<TransactionType>('EXPENSE');
  const [showDataModal, setShowDataModal] = useState<boolean>(false);

  useEffect(() => {
    if (!showTxModal) {
      setConfirmingDraftId(null);
    }
  }, [showTxModal]);

  // Android hardware/gesture back button handling
  const lastBackPressRef = useRef<number>(0);
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const backExitMessageRef = useRef(t.toasts.pressBackToExit);
  backExitMessageRef.current = t.toasts.pressBackToExit;
  const backStateRef = useRef({
    isUnlocked,
    isChangingPin,
    showTxModal,
    showDataModal,
    showSecurityModal,
    showNotificationSettings,
    showNotificationDrafts,
    currentTab,
  });
  backStateRef.current = {
    isUnlocked,
    isChangingPin,
    showTxModal,
    showDataModal,
    showSecurityModal,
    showNotificationSettings,
    showNotificationDrafts,
    currentTab,
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removed = false;
    let listenerHandle: PluginListenerHandle | null = null;

    void CapacitorApp.addListener('backButton', () => {
      const state = backStateRef.current;

      // 1. Jika layar terkunci atau sedang mengubah PIN -> keluar aplikasi
      if (!state.isUnlocked || state.isChangingPin) {
        void CapacitorApp.exitApp();
        return;
      }

      // 2. Jika ada modal terbuka -> tutup modal tersebut
      if (state.showNotificationDrafts) {
        lastBackPressRef.current = 0;
        setShowNotificationDrafts(false);
        return;
      }
      if (state.showNotificationSettings) {
        lastBackPressRef.current = 0;
        setShowNotificationSettings(false);
        return;
      }
      if (state.showTxModal) {
        lastBackPressRef.current = 0;
        setShowTxModal(false);
        return;
      }
      if (state.showDataModal) {
        lastBackPressRef.current = 0;
        setShowDataModal(false);
        return;
      }
      if (state.showSecurityModal) {
        lastBackPressRef.current = 0;
        setShowSecurityModal(false);
        return;
      }

      // 3. Jika sedang di tab selain dashboard -> kembali ke dashboard
      if (state.currentTab !== 'dashboard') {
        lastBackPressRef.current = 0;
        setCurrentTab('dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 4. Di dashboard tanpa modal -> konfirmasi tekan 2x dalam 2 detik
      const now = Date.now();
      if (now - lastBackPressRef.current <= 2000) {
        lastBackPressRef.current = 0;
        void CapacitorApp.exitApp();
      } else {
        lastBackPressRef.current = now;
        showToastRef.current(backExitMessageRef.current, 'info');
      }
    }).then((handle) => {
      if (removed) {
        void handle.remove();
      } else {
        listenerHandle = handle;
      }
    });

    return () => {
      removed = true;
      if (listenerHandle) {
        void listenerHandle.remove();
      }
    };
  }, []);

  const openNewTransaction = (type: TransactionType = 'EXPENSE') => {
    setEditingTx(null);
    setTxModalType(type);
    setScannedReceiptData(null);
    setConfirmingDraftId(null);
    setShowTxModal(true);
  };

  const openEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setTxModalType(tx.type);
    setConfirmingDraftId(null);
    setShowTxModal(true);
  };

  // Sync dark class on documentElement and persist theme preference locally
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveThemePreference(isDark);
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  // Handlers for Transactions
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id' | 'idempotencyKey' | 'syncStatus' | 'createdAt'> & { id?: string }
  ) => {
    const existing = txData.id
      ? transactionsRef.current.find((t) => t.id === txData.id) ?? null
      : null;

    const newTx: Transaction = {
      ...txData,
      id: existing?.id ?? txData.id ?? createId('tx'),
      idempotencyKey: existing?.idempotencyKey ?? createId('idem'),
      syncStatus: 'SYNCED',
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };

    if (existing) {
      transactionsRef.current = transactionsRef.current.map((tx) =>
        tx.id === newTx.id ? newTx : tx
      );
      setTransactions(transactionsRef.current);
    } else {
      transactionsRef.current = [newTx, ...transactionsRef.current];
      setTransactions(transactionsRef.current);
    }

    // If this save came from a notification draft confirmation, remove the draft
    // only after the transaction has been added to state (persisted by effect).
    if (!existing && confirmingDraftId) {
      const draftIdToRemove = confirmingDraftId;
      setNotificationDrafts((prev) => {
        const next = prev.filter((d) => d.id !== draftIdToRemove);
        notificationDraftsRef.current = next;
        return next;
      });
      setConfirmingDraftId(null);
    }

    const formattedAmount = formatCurrency(newTx.amount, newTx.currency);
    if (existing) {
      showToast(t.toasts.txUpdated(newTx.description, formattedAmount), 'info');
    } else if (newTx.type === 'INCOME') {
      showToast(t.toasts.incomeAdded(formattedAmount), 'income');
    } else {
      showToast(t.toasts.expenseAdded(formattedAmount), 'expense');
    }
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactionsRef.current.find((t) => t.id === id);
    if (!tx) return;

    const confirmed = window.confirm(
      t.toasts.confirmDeleteTx(tx.description)
    );
    if (!confirmed) return;

    transactionsRef.current = transactionsRef.current.filter((t) => t.id !== id);
    setTransactions(transactionsRef.current);
    const formattedAmount = formatCurrency(tx.amount, tx.currency);
    showToast(t.toasts.txDeleted(tx.description, formattedAmount), 'delete');
  };

  // Notification draft handlers
  const handleConfirmDraft = (draft: NotificationDraft) => {
    // Pre-fill TransactionModal with draft data
    setEditingTx(null);
    setTxModalType(draft.type ?? 'EXPENSE');
    setConfirmingDraftId(draft.id);
    setScannedReceiptData({
      amount: draft.amount ?? undefined,
      description: draft.description || undefined,
      categoryId: undefined, // let user pick
      transactionDate: draft.transactionDate ?? undefined,
      notes: `From ${draft.sourcePackage}: ${draft.text.slice(0, 200)}`,
      tags: ['notification', draft.sourcePackage],
    });
    setShowNotificationDrafts(false);
    setShowTxModal(true);
  };

  const handleDeleteDraft = async (draftId: string) => {
    const confirmed = window.confirm(t.notificationCapture.confirmDeleteDraft);
    if (!confirmed) return;

    const nextDrafts = notificationDraftsRef.current.filter((d) => d.id !== draftId);
    notificationDraftsRef.current = nextDrafts;
    setNotificationDrafts(nextDrafts);

    const snapshot: AppStateSnapshot = {
      categories,
      transactions,
      budgets,
      recurringList,
      currency,
      notificationDrafts: nextDrafts,
      notificationDedup: notificationDedupRef.current,
    };
    await saveAppState(snapshot);

    showToast(t.notificationCapture.draftDeleted, 'delete');
  };

  const handleNotificationHealthChange = (health: CaptureHealth) => {
    setCaptureHealth(health);
  };

  // Handlers for Budgets
  const handleSaveBudget = (budget: Budget) => {
    setBudgets((prev) => {
      const idx = prev.findIndex((b) => b.id === budget.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = budget;
        return copy;
      }
      return [...prev, budget];
    });
  };

  const handleDeleteBudget = (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  // Handlers for Recurring
  const handleAddRecurring = (item: Omit<RecurringTransaction, 'id'>) => {
    const newItem: RecurringTransaction = {
      ...item,
      id: createId('rec'),
    };
    setRecurringList((prev) => [...prev, newItem]);
  };

  const handleToggleRecurringActive = (id: string) => {
    setRecurringList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  /**
   * Posts every due occurrence exactly once, then advances nextRunDate.
   * The deterministic idempotency key (`rec-<id>-<YYYY-MM-DD>`) is the
   * duplicate guard, so pressing the button repeatedly is safe.
   */
  const handleProcessDueSchedules = (): number => {
    if (processingRecurringRef.current) return 0;
    processingRecurringRef.current = true;

    try {
      const now = new Date();
      const dueCutoff = endOfDay(now).getTime();
      const existingKeys = new Set(
        transactionsRef.current.map((tx) => tx.idempotencyKey)
      );

      const created: Transaction[] = [];
      let createdAny = false;

      const updatedSchedules = recurringRef.current.map((schedule) => {
        if (!schedule.isActive) return schedule;

        let cursor = parseDateOnly(schedule.nextRunDate);
        let guard = 0;
        let scheduleCreated = false;

        // Catch up overdue schedules, but cap runaway loops at 60 occurrences.
        while (cursor.getTime() <= dueCutoff && guard < 60) {
          const occurrenceDate = toDateOnlyString(cursor);
          const idempotencyKey = recurringOccurrenceKey(
            schedule.id,
            occurrenceDate
          );

          if (!existingKeys.has(idempotencyKey)) {
            const tx: Transaction = {
              id: createId('tx'),
              categoryId: schedule.categoryId,
              type: schedule.type,
              amount: schedule.amount,
              currency: schedule.currency,
              description: `[Auto-Scheduled] ${schedule.description}`,
              notes: `Recurring ${schedule.interval.toLowerCase()} entry for ${occurrenceDate}`,
              transactionDate: new Date(`${occurrenceDate}T12:00:00`).toISOString(),
              tags: ['recurring', 'auto-schedule'],
              idempotencyKey,
              syncStatus: 'SYNCED',
              createdAt: new Date().toISOString(),
            };

            created.push(tx);
            existingKeys.add(idempotencyKey);
            scheduleCreated = true;
            createdAny = true;
          }

          cursor = addRecurringInterval(cursor, schedule.interval);
          guard += 1;
        }

        return {
          ...schedule,
          nextRunDate: toDateOnlyString(cursor),
          lastRunDate: scheduleCreated
            ? toDateOnlyString(now)
            : schedule.lastRunDate,
        };
      });

      recurringRef.current = updatedSchedules;
      setRecurringList(updatedSchedules);

      if (createdAny) {
        transactionsRef.current = [...created, ...transactionsRef.current];
        setTransactions(transactionsRef.current);
      }

      return created.length;
    } finally {
      processingRecurringRef.current = false;
    }
  };

  const currentSnapshot: AppStateSnapshot = {
    categories,
    transactions,
    budgets,
    recurringList,
    currency,
  };

  const handleRestoreBackup = (snapshot: AppStateSnapshot) => {
    applySnapshot(snapshot);
  };

  const handleClearData = () => {
    applySnapshot({
      categories: INITIAL_CATEGORIES,
      transactions: [],
      budgets: [],
      recurringList: [],
      currency,
    });
  };

  if (!isUnlocked) {
    return (
      <LockScreen
        mode={hasPin ? 'unlock' : 'setup'}
        onSuccess={() => {
          setHasPin(true);
          setIsUnlocked(true);
        }}
      />
    );
  }

  if (isChangingPin) {
    return (
      <LockScreen
        mode="setup"
        isChangePin
        onCancel={() => setIsChangingPin(false)}
        onSuccess={() => {
          setHasPin(true);
          setIsChangingPin(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF8F2] dark:bg-[#121019] text-[#181522] dark:text-[#F5F3FA] transition-colors flex flex-col font-sans selection:bg-[#EFEAFE] selection:text-[#704BEA]">

      {/* In-App Toast Notification */}
      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-[60] px-3 flex justify-center pointer-events-none"
        >
          <div
            className={`pointer-events-auto max-w-md w-full sm:w-auto px-3.5 py-2.5 rounded-2xl shadow-xl border backdrop-blur-md flex items-center gap-2.5 text-xs font-semibold animate-fadeIn ${
              toast.tone === 'income'
                ? 'bg-emerald-950/95 text-emerald-50 border-emerald-500/40'
                : toast.tone === 'expense'
                  ? 'bg-[#181522]/95 text-white border-[#704BEA]/50'
                  : toast.tone === 'delete'
                    ? 'bg-rose-950/95 text-rose-50 border-rose-500/40'
                    : 'bg-[#181522]/95 text-white border-white/15'
            }`}
          >
            {toast.tone === 'delete' ? (
              <Trash2 className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2
                className={`w-4 h-4 shrink-0 ${
                  toast.tone === 'income' ? 'text-emerald-400' : 'text-[#B8B0FF]'
                }`}
              />
            )}
            <span className="min-w-0 break-words">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top App Bar (Unified Soft Modern Top Bar Contract) */}
      <Header
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        isDark={isDark}
        toggleTheme={toggleTheme}
        onOpenDataModal={() => setShowDataModal(true)}
        onOpenSecurityModal={() => setShowSecurityModal(true)}
        onOpenNotificationSettings={() => setShowNotificationSettings(true)}
        notificationDraftsCount={notificationDrafts.length}
      />

      {/* Main Content Area (Fluid with responsive clearance for mobile floating dock) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-32 sm:pb-28 md:pb-16">
        {currentTab === 'dashboard' && (
          <DashboardView
            transactions={transactions}
            categories={categories}
            budgets={budgets}
            currency={currency}
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            onNavigateTab={handleTabChange}
            onSelectTransaction={openEditTransaction}
            onOpenNewTx={openNewTransaction}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            categories={categories}
            currency={currency}
        onOpenNewTx={() => openNewTransaction('EXPENSE')}
        onEditTx={openEditTransaction}
        onDeleteTx={handleDeleteTransaction}
          />
        )}

        {currentTab === 'budgets' && (
          <BudgetsView
            budgets={budgets}
            categories={categories}
            transactions={transactions}
            currency={currency}
            onSaveBudget={handleSaveBudget}
            onDeleteBudget={handleDeleteBudget}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            transactions={transactions}
            categories={categories}
            currency={currency}
          />
        )}

        {currentTab === 'recurring' && (
          <RecurringView
            recurringList={recurringList}
            categories={categories}
            currency={currency}
            onAddRecurring={handleAddRecurring}
            onProcessDueSchedules={handleProcessDueSchedules}
            onToggleActive={handleToggleRecurringActive}
          />
        )}

      </main>

      {/* Mobile Bottom Navigation (Visible strictly on mobile screens, hidden on desktop) */}
      <AndroidBottomNav
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        onOpenNewTx={() => openNewTransaction('EXPENSE')}
      />

      {/* Quiet, Minimalist Editorial Footer (§1.B Anti-slop) */}
      <footer className="mt-auto border-t border-[#EDE7DE] dark:border-[#22202E] bg-white/70 dark:bg-[#0E0D13]/70 backdrop-blur-xs py-6 mb-24 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#706B82] dark:text-[#9D98AC]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#16151D] dark:text-white">Financial Tracker</span>
            <span aria-hidden="true">·</span>
            <span>{t.footer.tagline}</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowDataModal(true)}
              className="min-h-[44px] px-2 hover:text-[#16151D] dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{t.footer.backupData}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Transaction Add / Edit Modal */}
      <TransactionModal
        isOpen={showTxModal}
        onClose={() => setShowTxModal(false)}
        onSave={handleSaveTransaction}
        editingTransaction={editingTx}
        initialType={txModalType}
        initialReceiptData={scannedReceiptData}
        categories={categories}
        currency={currency}
        onScanReceipt={() => {
          setReceiptScannerType(txModalType);
          setShowTxModal(false);
          setScannedReceiptData(null);
          setShowReceiptScanner(true);
        }}
      />

      {/* Local Data Management & Backup Modal */}
      <OfflineSyncModal
        isOpen={showDataModal}
        onClose={() => setShowDataModal(false)}
        snapshot={currentSnapshot}
        onRestoreBackup={handleRestoreBackup}
        onClearData={handleClearData}
      />

      {/* Local PIN & Biometric Security Settings Modal */}
      <SecuritySettingsModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        onChangePin={() => {
          setShowSecurityModal(false);
          setIsChangingPin(true);
        }}
        onLockNow={() => {
          setShowSecurityModal(false);
          setIsUnlocked(false);
        }}
      />

      {/* Notification Capture Settings Modal */}
      <NotificationSettingsModal
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
        onHealthChange={handleNotificationHealthChange}
      />

      {/* Notification Drafts Review Modal */}
      <NotificationDraftsModal
        isOpen={showNotificationDrafts}
        onClose={() => setShowNotificationDrafts(false)}
        drafts={notificationDrafts}
        onConfirmDraft={handleConfirmDraft}
        onDeleteDraft={handleDeleteDraft}
      />

      {/* Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={showReceiptScanner}
        onClose={() => setShowReceiptScanner(false)}
        type={receiptScannerType}
        categories={categories}
        onScanned={(data) => {
          setEditingTx(null);
          setTxModalType(receiptScannerType);
          setScannedReceiptData(data);
          setShowTxModal(true);
        }}
      />

    </div>
  );
}

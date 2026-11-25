import React, { useState, useMemo } from 'react';
import { 
  Transaction, 
  Category, 
  CurrencyCode 
} from '../types';
import { formatCurrency, convertCurrency } from '../data/mockData';
import { 
  Search, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  Trash2, 
  Edit3,
  Coffee,
  Car,
  X
} from 'lucide-react';
import { TransactionsSkeleton } from './Skeleton';
import {
  PeriodFilter,
  filterTransactionsByPeriod,
} from '../utils/finance';
import {
  getDateLocale,
  translateCategoryName,
  translatePeriodLabel,
  useLanguage,
} from '../utils/i18n';

const getMerchantBadge = (desc: string) => {
  const d = desc.toLowerCase();
  if (d.includes('netflix')) {
    return <div className="w-10 h-10 rounded-xl bg-[#121118] text-red-600 font-black text-base flex items-center justify-center shrink-0 shadow-xs">N</div>;
  }
  if (d.includes('amazon')) {
    return <div className="w-10 h-10 rounded-xl bg-[#121118] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">a</div>;
  }
  if (d.includes('starbucks') || d.includes('coffee')) {
    return <div className="w-10 h-10 rounded-xl bg-[#121118] text-emerald-400 flex items-center justify-center shrink-0 shadow-xs"><Coffee className="w-4 h-4" /></div>;
  }
  if (d.includes('uber') || d.includes('grab')) {
    return <div className="w-10 h-10 rounded-xl bg-[#121118] text-white flex items-center justify-center shrink-0 shadow-xs"><Car className="w-4 h-4" /></div>;
  }
  return null;
};

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  currency: CurrencyCode;
  onOpenNewTx: () => void;
  onEditTx: (tx: Transaction) => void;
  onDeleteTx: (id: string) => void;
  isLoading?: boolean;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  currency,
  onOpenNewTx,
  onEditTx,
  onDeleteTx,
  isLoading = false,
}) => {
  const { lang, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [selectedTxDetail, setSelectedTxDetail] = useState<Transaction | null>(null);

  const now = new Date();
  const periodLabel = translatePeriodLabel(periodFilter, lang, now);

  // Filter and sort transactions
  const filteredList = useMemo(() => {
    return filterTransactionsByPeriod(transactions, periodFilter, now)
      .filter((tx) => {
        // Search
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchDesc = tx.description.toLowerCase().includes(q);
          const matchNotes = tx.notes?.toLowerCase().includes(q) || false;
          const matchTags = tx.tags.some((t) => t.toLowerCase().includes(q));
          if (!matchDesc && !matchNotes && !matchTags) return false;
        }

        // Type
        if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;

        // Category
        if (categoryFilter !== 'ALL' && tx.categoryId !== categoryFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
        }
        const amtA = convertCurrency(a.amount, a.currency, currency);
        const amtB = convertCurrency(b.amount, b.currency, currency);
        if (sortBy === 'amount_desc') return amtB - amtA;
        return amtA - amtB;
      });
  }, [transactions, searchQuery, typeFilter, categoryFilter, periodFilter, sortBy, currency]);

  if (isLoading) {
    return <TransactionsSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header and Quick Stats */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#EAE5DC] dark:border-[#22202E]">
        <div>
          <div className="text-[11px] font-semibold text-[#8E85FA] dark:text-[#B8B2FF] tracking-wider uppercase mb-1">
            {t.transactions.eyebrow}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#16151D] dark:text-white">
            {t.transactions.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#706B82] dark:text-[#9D98AC] mt-1">
            {t.transactions.subtitle(filteredList.length, periodLabel)}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={onOpenNewTx}
            className="px-4 py-2 text-xs font-bold text-white dark:text-[#121118] bg-[#121118] dark:bg-[#B8B2FF] hover:bg-[#252230] dark:hover:bg-[#A8A0FC] btn-tactile rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t.transactions.recordBtn}</span>
          </button>
        </div>
      </section>

      {/* Filter Toolbar */}
      <section className="p-4 sm:p-5 bg-white dark:bg-[#181720] rounded-2xl border border-[#EAE5DC] dark:border-[#262432] shadow-xs space-y-4 card-hover-lift">
        
        {/* Search Bar + Sort Dropdown */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#868196] dark:text-[#9D98AC] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.transactions.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-white placeholder-[#868196] dark:placeholder-[#9D98AC] focus:outline-none focus:ring-2 focus:ring-[#8E85FA]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-[#F4F2F8] focus:outline-none focus:ring-2 focus:ring-[#8E85FA] cursor-pointer min-h-[40px]"
            >
              <option value="date_desc">{t.transactions.sortDateDesc}</option>
              <option value="date_asc">{t.transactions.sortDateAsc}</option>
              <option value="amount_desc">{t.transactions.sortAmountDesc}</option>
              <option value="amount_asc">{t.transactions.sortAmountAsc}</option>
            </select>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F1ECE3] dark:border-[#252230] text-xs">
          
          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-[#F1ECE3] dark:bg-[#1E1D27] rounded-xl overflow-x-auto max-w-full">
            {(['ALL', 'INCOME', 'EXPENSE'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-2.5 sm:px-3 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap btn-tactile cursor-pointer ${
                  typeFilter === type
                    ? 'bg-white dark:bg-[#282536] text-[#16151D] dark:text-white shadow-xs font-bold scale-[1.02]'
                    : 'text-[#686377] dark:text-[#9D98AC] hover:text-[#16151D] dark:hover:text-white'
                }`}
              >
                {type === 'ALL'
                  ? t.transactions.allTypes
                  : type === 'INCOME'
                    ? t.common.income
                    : t.common.expense}
              </button>
            ))}
          </div>

          {/* Period Filter */}
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
            className="px-3 py-1.5 font-semibold bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-[#F4F2F8] focus:outline-none focus:ring-2 focus:ring-[#8E85FA] cursor-pointer min-h-[40px]"
          >
            <option value="all">{t.transactions.allDates}</option>
            <option value="today">{t.transactions.today}</option>
            <option value="this_week">{t.transactions.thisWeek}</option>
            <option value="this_month">{t.transactions.thisMonth}</option>
            <option value="this_year">{t.transactions.thisYear}</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 font-semibold bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-[#F4F2F8] focus:outline-none focus:ring-2 focus:ring-[#8E85FA] cursor-pointer min-h-[40px]"
          >
            <option value="ALL">{t.transactions.allCategories}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {translateCategoryName(cat, lang)} ({cat.type === 'INCOME' ? t.common.income : t.common.expense})
              </option>
            ))}
          </select>

          {(searchQuery || typeFilter !== 'ALL' || categoryFilter !== 'ALL' || periodFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('ALL');
                setCategoryFilter('ALL');
                setPeriodFilter('all');
              }}
              className="text-xs font-semibold text-[#8E85FA] dark:text-[#B8B2FF] hover:underline px-2 btn-tactile cursor-pointer"
            >
              {t.transactions.resetFilters}
            </button>
          )}

        </div>

      </section>

      {/* Transactions List */}
      <section className="bg-white dark:bg-[#181720] rounded-2xl border border-[#EAE5DC] dark:border-[#262432] shadow-xs overflow-hidden card-hover-lift">
        {filteredList.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-[#16151D] dark:text-white">
              {t.transactions.emptyTitle}
            </p>
            <p className="text-xs text-[#706B82] dark:text-[#9D98AC] mt-1">
              {t.transactions.emptySubtitle}
            </p>
            <button
              onClick={onOpenNewTx}
              className="mt-4 px-4 py-2 text-xs font-bold text-white bg-[#121118] dark:bg-[#B8B2FF] dark:text-[#121118] rounded-xl shadow-xs"
            >
              {t.transactions.addFirstBtn}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F1ECE3] dark:divide-[#252230]">
            {filteredList.map((tx) => {
              const category = categories.find((c) => c.id === tx.categoryId);
              const converted = convertCurrency(tx.amount, tx.currency, currency);
              const dateStr = new Date(tx.transactionDate).toLocaleDateString(getDateLocale(lang), {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={tx.id}
                  className="p-3 sm:p-4 hover:bg-[#FAF7F2] dark:hover:bg-[#1E1D27] transition-all duration-200 flex items-center justify-between gap-2 sm:gap-4 group hover:translate-x-0.5 active:scale-[0.995]"
                >
                  {/* Left: Type Icon & Info */}
                  <div 
                    className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 cursor-pointer"
                    onClick={() => setSelectedTxDetail(tx)}
                  >
                    {(() => {
                      const badge = getMerchantBadge(tx.description);
                      if (badge) return badge;
                      return (
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                          tx.type === 'INCOME'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                        }`}>
                          {tx.type === 'INCOME'
                            ? <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5" />
                            : <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </div>
                      );
                    })()}

                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-semibold text-[#16151D] dark:text-white truncate">
                        {tx.description}
                      </div>

                      {/* Clean Unboxed Metadata with · separator (§1.A) */}
                      <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-[#706B82] dark:text-[#9D98AC] mt-0.5 sm:mt-1 truncate">
                        <span className="shrink-0">{dateStr}</span>
                        {category && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{translateCategoryName(category, lang)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <div className="text-right">
                      <div className={`text-xs sm:text-base font-mono font-bold tabular-nums ${
                        tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' :
                        tx.type === 'EXPENSE' ? 'text-rose-600 dark:text-rose-400' :
                        'text-[#16151D] dark:text-[#E2DFEC]'
                      }`}>
                        {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                        {formatCurrency(converted, currency)}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-[#868196] dark:text-[#9D98AC] font-mono truncate">
                        {tx.currency !== currency && `${formatCurrency(tx.amount, tx.currency)}`}
                      </div>
                    </div>

                    {/* Edit / Delete Buttons */}
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <button
                        onClick={() => onEditTx(tx)}
                        title={t.transactions.editTitle}
                        aria-label={t.transactions.editTitle}
                        className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 sm:p-1.5 text-[#868196] hover:text-[#16151D] dark:hover:text-white transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/5 btn-tactile cursor-pointer flex items-center justify-center"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteTx(tx.id)}
                        title={t.transactions.deleteTitle}
                        aria-label={t.transactions.deleteTitle}
                        className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 sm:p-1.5 text-[#868196] hover:text-rose-600 dark:hover:text-rose-400 transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/5 btn-tactile cursor-pointer flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Transaction Details Modal */}
      {selectedTxDetail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:pb-6">
          <div
            onClick={() => setSelectedTxDetail(null)}
            aria-hidden="true"
            className="absolute inset-0 bg-[#121118]/60 backdrop-blur-xs animate-fade-in"
          />
          <div className="relative w-full max-w-lg max-h-[88dvh] overflow-y-auto overscroll-contain bg-white dark:bg-[#181720] rounded-t-[28px] sm:rounded-3xl border border-[#EAE5DC] dark:border-[#262432] shadow-2xl p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 space-y-4 animate-sheet-up">
            <div className="mx-auto -mt-1 mb-1 h-1.5 w-10 rounded-full bg-[#DED6CA] dark:bg-[#3A3450] sm:hidden" />
            <div className="flex items-center justify-between pb-3 border-b border-[#F1ECE3] dark:border-[#252230]">
              <h3 className="text-base font-extrabold text-[#16151D] dark:text-white">
                {t.transactions.detailTitle}
              </h3>
              <button
                onClick={() => setSelectedTxDetail(null)}
                aria-label={t.common.close}
                className="p-1 rounded-lg text-[#706B82] hover:text-[#16151D] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-[#706B82] dark:text-[#9D98AC]">{t.transactions.description}</span>
                <div className="text-sm font-bold text-[#16151D] dark:text-white mt-0.5">
                  {selectedTxDetail.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[#706B82] dark:text-[#9D98AC]">{t.transactions.amount}</span>
                  <div className="text-base font-mono font-bold text-[#16151D] dark:text-white">
                    {formatCurrency(selectedTxDetail.amount, selectedTxDetail.currency)}
                  </div>
                </div>
                <div>
                  <span className="text-[#706B82] dark:text-[#9D98AC]">{t.transactions.type}</span>
                  <div className="font-semibold text-[#16151D] dark:text-white mt-0.5">
                    {selectedTxDetail.type === 'INCOME' ? t.common.income : t.common.expense}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[#706B82] dark:text-[#9D98AC]">{t.transactions.dateTime}</span>
                  <div className="text-[#16151D] dark:text-white mt-0.5 font-mono">
                    {new Date(selectedTxDetail.transactionDate).toLocaleString(getDateLocale(lang))}
                  </div>
                </div>
                <div>
                  <span className="text-[#706B82] dark:text-[#9D98AC]">{t.transactions.category}</span>
                  <div className="text-[#16151D] dark:text-white mt-0.5 font-medium">
                    {translateCategoryName(
                      categories.find((c) => c.id === selectedTxDetail.categoryId),
                      lang,
                      t.transactions.uncategorized
                    )}
                  </div>
                </div>
              </div>

              {selectedTxDetail.notes && (
                <div>
                  <span className="text-[#706B82] dark:text-[#9D98AC]">{t.transactions.notes}</span>
                  <div className="p-3 bg-[#FAF7F2] dark:bg-[#1E1D27] rounded-xl text-[#16151D] dark:text-[#E2DFEC] mt-1 border border-[#EAE5DC] dark:border-[#2D2A3B]">
                    {selectedTxDetail.notes}
                  </div>
                </div>
              )}

              {selectedTxDetail.tags && selectedTxDetail.tags.length > 0 && (
                <div>
                  <span className="text-[#706B82] dark:text-[#9D98AC]">{t.transactions.tags}</span>
                  <div className="flex flex-wrap gap-1.5 mt-1 text-[#8E85FA] dark:text-[#B8B2FF] font-mono">
                    {selectedTxDetail.tags.map((t) => (
                      <span key={t}>#{t}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-[#F1ECE3] dark:border-[#252230] space-y-1 text-[#868196] dark:text-[#9D98AC] text-[11px] font-mono">
                <div>ID: {selectedTxDetail.id}</div>
                <div>{t.transactions.idempotencyKey}: {selectedTxDetail.idempotencyKey}</div>
                <div>{t.transactions.syncStatus}: {selectedTxDetail.syncStatus}</div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  onEditTx(selectedTxDetail);
                  setSelectedTxDetail(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-[#121118] text-white dark:bg-[#B8B2FF] dark:text-[#121118] rounded-xl"
              >
                {t.transactions.editBtn}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

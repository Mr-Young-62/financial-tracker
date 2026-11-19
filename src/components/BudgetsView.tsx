import React, { useState, useMemo } from 'react';
import { Budget, Category, Transaction, CurrencyCode } from '../types';
import { formatCurrency, convertCurrency } from '../data/mockData';
import { Plus, AlertTriangle, Edit2, Trash2, X } from 'lucide-react';
import {
  filterTransactionsByPeriod,
} from '../utils/finance';
import {
  translateCategoryName,
  translatePeriodLabel,
  useLanguage,
} from '../utils/i18n';
import { formatThousandInput, parseThousandInput } from '../utils/formatters';

interface BudgetsViewProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  currency: CurrencyCode;
  onSaveBudget: (budget: Budget) => void;
  onDeleteBudget: (id: string) => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  budgets,
  categories,
  transactions,
  currency,
  onSaveBudget,
  onDeleteBudget,
}) => {
  const { lang, t } = useLanguage();
  const now = useMemo(() => new Date(), []);
  const periodLabel = translatePeriodLabel('this_month', lang, now);
  const monthlyTransactions = useMemo(
    () => filterTransactionsByPeriod(transactions, 'this_month', now),
    [transactions, now]
  );

  const [showModal, setShowModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories.find(c => c.type === 'EXPENSE')?.id || '');
  const [limitInput, setLimitInput] = useState<string>(formatThousandInput('2000000'));
  const [editingId, setEditingId] = useState<string | null>(null);

  // Compute status for all budgets using the current calendar month only.
  const budgetList = useMemo(() => {
    return budgets.map((b) => {
      const category = categories.find((c) => c.id === b.categoryId);
      const convertedLimit = convertCurrency(b.monthlyLimit, b.currency, currency);

      const spent = monthlyTransactions
        .filter((tx) => tx.type === 'EXPENSE' && tx.categoryId === b.categoryId)
        .reduce((sum, tx) => sum + convertCurrency(tx.amount, tx.currency, currency), 0);

      const percent = convertedLimit > 0 ? Math.round((spent / convertedLimit) * 100) : 0;
      const remaining = convertedLimit - spent;

      return {
        ...b,
        category,
        limitInCurrency: convertedLimit,
        spentInCurrency: spent,
        remainingInCurrency: remaining,
        percent,
      };
    });
  }, [budgets, categories, monthlyTransactions, currency]);

  // Overall budget utilization
  const totalBudgeted = budgetList.reduce((sum, b) => sum + b.limitInCurrency, 0);
  const totalSpentInBudgets = budgetList.reduce((sum, b) => sum + b.spentInCurrency, 0);
  const overallPercent = totalBudgeted > 0 ? Math.round((totalSpentInBudgets / totalBudgeted) * 100) : 0;

  const handleOpenAdd = () => {
    setEditingId(null);
    const expCat = categories.find((c) => c.type === 'EXPENSE');
    setSelectedCategoryId(expCat ? expCat.id : '');
    setLimitInput(formatThousandInput('2000000'));
    setShowModal(true);
  };

  const handleOpenEdit = (b: Budget) => {
    setEditingId(b.id);
    setSelectedCategoryId(b.categoryId);
    const convertedLimit = Math.round(convertCurrency(b.monthlyLimit, b.currency, currency));
    setLimitInput(formatThousandInput(String(convertedLimit)));
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLimit = parseThousandInput(limitInput);
    if (parsedLimit <= 0) return;

    const duplicate = budgets.find(
      (b) => b.categoryId === selectedCategoryId && b.id !== editingId
    );
    if (duplicate) {
      window.alert(t.budgets.duplicateAlert);
      return;
    }

    onSaveBudget({
      id: editingId || `b-${Date.now()}`,
      categoryId: selectedCategoryId,
      monthlyLimit: parsedLimit,
      currency: currency,
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Add Action */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#EAE5DC] dark:border-[#22202E]">
        <div>
          <div className="text-[11px] font-semibold text-[#8E85FA] dark:text-[#B8B2FF] tracking-wider uppercase mb-1">
            {t.budgets.eyebrow}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#16151D] dark:text-white">
            {t.budgets.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#706B82] dark:text-[#9D98AC] mt-1">
            {t.budgets.subtitle(periodLabel)}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 text-xs font-bold text-white dark:text-[#121118] bg-[#121118] dark:bg-[#B8B2FF] hover:bg-[#252230] dark:hover:bg-[#A8A0FC] active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t.budgets.setCategoryBudget}</span>
        </button>
      </section>

      {/* Aggregate Budget Card */}
      <section className="p-4 sm:p-6 bg-white dark:bg-[#181720] rounded-2xl border border-[#EAE5DC] dark:border-[#262432] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-[#706B82] dark:text-[#9D98AC]">
              {t.budgets.envelopeTotal(periodLabel)}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#16151D] dark:text-white mt-1 truncate">
              {formatCurrency(totalSpentInBudgets, currency)}{' '}
              <span className="text-xs sm:text-sm font-normal text-[#868196] dark:text-[#9D98AC]">
                {t.budgets.ofAmount(formatCurrency(totalBudgeted, currency))}
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-[#706B82] dark:text-[#9D98AC] font-medium">
              {t.budgets.overallUtilization}
            </span>
            <div className={`text-2xl font-extrabold font-mono tabular-nums ${
              overallPercent >= 100 ? 'text-rose-600 dark:text-rose-400' :
              overallPercent >= 80 ? 'text-amber-500' :
              'text-[#16151D] dark:text-white'
            }`}>
              {overallPercent}%
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="h-3 bg-[#F1ECE3] dark:bg-[#252230] rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              overallPercent >= 100 ? 'bg-rose-500' :
              overallPercent >= 90 ? 'bg-orange-500' :
              overallPercent >= 80 ? 'bg-amber-500' :
              'bg-[#8E85FA] dark:bg-[#B8B2FF]'
            }`}
            style={{ width: `${Math.min(overallPercent, 100)}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#706B82] dark:text-[#9D98AC] mt-3 pt-3 border-t border-[#F1ECE3] dark:border-[#252230] font-mono tabular-nums">
          <span className="min-w-0 truncate">
            {t.budgets.remainingToSpend(formatCurrency(Math.max(0, totalBudgeted - totalSpentInBudgets), currency))}
          </span>
          <span className="shrink-0">{t.budgets.activeCount(budgetList.length)}</span>
        </div>
      </section>

      {budgetList.length === 0 && (
        <section className="p-8 bg-white dark:bg-[#181720] rounded-2xl border border-dashed border-[#DDD7CD] dark:border-[#2D2A3B] text-center">
          <p className="text-sm font-semibold text-[#16151D] dark:text-white">
            {t.budgets.emptyTitle(periodLabel)}
          </p>
          <p className="text-xs text-[#706B82] dark:text-[#9D98AC] mt-1">
            {t.budgets.emptySubtitle}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 text-xs font-bold bg-[#121118] text-white dark:bg-[#B8B2FF] dark:text-[#121118] rounded-xl shadow-xs"
          >
            {t.budgets.setFirstBtn}
          </button>
        </section>
      )}

      {/* Individual Category Budgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {budgetList.map((item) => {
          let badgeStatus = t.budgets.statusNominal;
          let badgeColor = 'text-emerald-600 dark:text-emerald-400';
          let barColor = 'bg-emerald-500';

          if (item.percent >= 100) {
            badgeStatus = t.budgets.statusExceeded;
            badgeColor = 'text-rose-600 dark:text-rose-400';
            barColor = 'bg-rose-500';
          } else if (item.percent >= 90) {
            badgeStatus = t.budgets.statusCritical;
            badgeColor = 'text-orange-600 dark:text-orange-400';
            barColor = 'bg-orange-500';
          } else if (item.percent >= 80) {
            badgeStatus = t.budgets.statusWarning;
            badgeColor = 'text-amber-600 dark:text-amber-400';
            barColor = 'bg-amber-500';
          }

          return (
            <div
              key={item.id}
              className="p-4 sm:p-6 bg-white dark:bg-[#181720] rounded-2xl border border-[#EAE5DC] dark:border-[#262432] shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="w-3.5 h-3.5 rounded-full" 
                      style={{ backgroundColor: item.category?.colorHex || '#8E85FA' }} 
                    />
                    <h3 className="text-sm font-bold text-[#16151D] dark:text-white">
                      {translateCategoryName(item.category, lang, t.common.unassigned)}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      title={t.budgets.editLimitTitle}
                      aria-label={t.budgets.editLimitTitle}
                      className="p-1.5 text-[#868196] hover:text-[#16151D] dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteBudget(item.id)}
                      title={t.budgets.deleteBudgetTitle}
                      aria-label={t.budgets.deleteBudgetTitle}
                      className="p-1.5 text-[#868196] hover:text-rose-600 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                  <div className="min-w-0">
                    <span className="text-[#706B82] dark:text-[#9D98AC]">{t.budgets.spentLabel}</span>{' '}
                    <strong className="font-mono tabular-nums text-[#16151D] dark:text-white truncate">
                      {formatCurrency(item.spentInCurrency, currency)}
                    </strong>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[#706B82] dark:text-[#9D98AC]">{t.budgets.limitLabel}</span>{' '}
                    <span className="font-mono tabular-nums text-[#686377] dark:text-[#B3AED0] truncate">
                      {formatCurrency(item.limitInCurrency, currency)}
                    </span>
                  </div>
                </div>

                {/* Progress Track */}
                <div className="h-2 bg-[#F1ECE3] dark:bg-[#252230] rounded-full overflow-hidden mt-2.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`} 
                    style={{ width: `${Math.min(item.percent, 100)}%` }} 
                  />
                </div>
              </div>

              {/* Unboxed Status Footer */}
              <div className="mt-4 pt-3 border-t border-[#F1ECE3] dark:border-[#252230] flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                <span className={`font-semibold flex items-center gap-1.5 ${badgeColor}`}>
                  {item.percent >= 80 && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                  <span className="truncate">{badgeStatus}</span>
                </span>
                <span className="font-mono tabular-nums text-[#706B82] dark:text-[#9D98AC] truncate min-w-0">
                  {item.remainingInCurrency >= 0
                    ? t.budgets.leftAmount(formatCurrency(item.remainingInCurrency, currency))
                    : t.budgets.overAmount(formatCurrency(Math.abs(item.remainingInCurrency), currency))}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Set/Edit Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#121118]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form 
            onSubmit={handleSave}
            className="bg-white dark:bg-[#181720] rounded-3xl max-w-md w-full p-4 sm:p-6 border border-[#EAE5DC] dark:border-[#262432] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#F1ECE3] dark:border-[#252230]">
              <h3 className="text-base font-extrabold text-[#16151D] dark:text-white">
                {editingId ? t.budgets.modalEditTitle : t.budgets.modalAddTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label={t.common.close}
                className="p-1 text-[#706B82] hover:text-[#16151D] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#16151D] dark:text-[#E2DFEC] font-semibold mb-1">
                  {t.budgets.expenseCategory}
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2 min-h-[40px] bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8E85FA]"
                >
                  {categories.filter((c) => c.type === 'EXPENSE').map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {translateCategoryName(cat, lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#16151D] dark:text-[#E2DFEC] font-semibold mb-1">
                  {t.budgets.monthlyLimit(currency)}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  required
                  value={limitInput}
                  onChange={(e) => setLimitInput(formatThousandInput(e.target.value))}
                  className="w-full px-3.5 py-2 min-h-[40px] bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#8E85FA]"
                />
              </div>

              <div className="p-3 bg-[#FAF7F2] dark:bg-[#1E1D27] rounded-xl text-[#706B82] dark:text-[#9D98AC] border border-[#EAE5DC] dark:border-[#2D2A3B]">
                {t.budgets.thresholdNote}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 min-h-[40px] text-xs font-semibold text-[#706B82] dark:text-[#9D98AC] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 min-h-[40px] text-xs font-bold bg-[#121118] text-white dark:bg-[#B8B2FF] dark:text-[#121118] rounded-xl shadow-xs"
              >
                {t.budgets.saveBudget}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

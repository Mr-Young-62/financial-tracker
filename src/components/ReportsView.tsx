import React, { useMemo, useState } from 'react';
import { Transaction, Category, CurrencyCode } from '../types';
import { formatCurrency, convertCurrency } from '../data/mockData';
import { Download, Printer } from 'lucide-react';
import {
  PeriodFilter,
  filterTransactionsByPeriod,
} from '../utils/finance';
import {
  translateCategoryName,
  translatePeriodLabel,
  useLanguage,
} from '../utils/i18n';

interface ReportsViewProps {
  transactions: Transaction[];
  categories: Category[];
  currency: CurrencyCode;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  categories,
  currency,
}) => {
  const { lang, t } = useLanguage();
  const now = useMemo(() => new Date(), []);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('this_month');
  const periodLabel = translatePeriodLabel(periodFilter, lang, now);

  const filteredTransactions = useMemo(
    () => filterTransactionsByPeriod(transactions, periodFilter, now),
    [transactions, periodFilter, now]
  );

  // Compute Income, Expense, and Category Aggregates for the selected period
  const { totalIncome, totalExpense, netSavings, categoryTotals } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const catMap = new Map<string, number>();

    filteredTransactions.forEach((tx) => {
      const amt = convertCurrency(tx.amount, tx.currency, currency);
      if (tx.type === 'INCOME') {
        inc += amt;
      } else if (tx.type === 'EXPENSE') {
        exp += amt;
      }
      if (tx.type === 'EXPENSE' && tx.categoryId) {
        catMap.set(tx.categoryId, (catMap.get(tx.categoryId) || 0) + amt);
      }
    });

    const catList = Array.from(catMap.entries()).map(([catId, amount]) => {
      const category = categories.find((c) => c.id === catId);
      const percentage = exp > 0 ? Math.round((amount / exp) * 100) : 0;
      return {
        category,
        amount,
        percentage,
      };
    }).sort((a, b) => b.amount - a.amount);

    return {
      totalIncome: inc,
      totalExpense: exp,
      netSavings: inc - exp,
      categoryTotals: catList,
    };
  }, [filteredTransactions, categories, currency]);

  // Export to CSV Function
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Type', 'Amount', 'Currency', 'Category', 'Description', 'Notes', 'Tags'];
    const rows = filteredTransactions.map((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId)?.name || '';
      return [
        tx.id,
        new Date(tx.transactionDate).toISOString(),
        tx.type,
        tx.amount,
        tx.currency,
        `"${cat}"`,
        `"${tx.description.replace(/"/g, '""')}"`,
        `"${(tx.notes || '').replace(/"/g, '""')}"`,
        `"${tx.tags.join(',')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial_tracker_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Export Actions */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#EAE5DC] dark:border-[#22202E]">
        <div>
          <div className="text-[11px] font-semibold text-[#8E85FA] dark:text-[#B8B2FF] tracking-wider uppercase mb-1">
            {t.reports.eyebrow}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#16151D] dark:text-white">
            {t.reports.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#706B82] dark:text-[#9D98AC] mt-1">
            {t.reports.subtitle(periodLabel)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold text-[#16151D] dark:text-[#F4F2F8] bg-white dark:bg-[#181720] border border-[#DDD7CD] dark:border-[#2D2A3B] hover:bg-[#FAF7F2] dark:hover:bg-[#22202E] rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-[#868196] dark:text-[#9D98AC]" />
            <span>{t.reports.printReport}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 text-xs font-bold text-white dark:text-[#121118] bg-[#121118] dark:bg-[#B8B2FF] hover:bg-[#252230] dark:hover:bg-[#A8A0FC] active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{t.reports.exportCsv}</span>
          </button>
        </div>
      </section>

      {/* Period Selector */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-white dark:bg-[#181720] rounded-2xl border border-[#EAE5DC] dark:border-[#262432] shadow-xs">
        <div className="text-xs text-[#706B82] dark:text-[#9D98AC]">
          {t.reports.reportingPeriod}{' '}
          <strong className="text-[#16151D] dark:text-white">{periodLabel}</strong>
          <span aria-hidden="true"> · </span>
          {t.reports.txCount(filteredTransactions.length)}
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#F1ECE3] dark:bg-[#1E1D27] rounded-xl overflow-x-auto max-w-full">
          {([
            { id: 'today', label: t.reports.periods.today },
            { id: 'this_week', label: t.reports.periods.this_week },
            { id: 'this_month', label: t.reports.periods.this_month },
            { id: 'this_year', label: t.reports.periods.this_year },
            { id: 'all', label: t.reports.periods.all },
          ] as { id: PeriodFilter; label: string }[]).map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriodFilter(item.id)}
              className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap btn-tactile cursor-pointer ${
                periodFilter === item.id
                  ? 'bg-white dark:bg-[#282536] text-[#16151D] dark:text-white shadow-xs'
                  : 'text-[#686377] dark:text-[#9D98AC] hover:text-[#16151D] dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 sm:p-6 bg-white dark:bg-[#181720] rounded-2xl border border-[#EAE5DC] dark:border-[#262432] shadow-xs overflow-hidden">
          <span className="text-xs font-bold uppercase text-[#706B82] dark:text-[#9D98AC] tracking-wider">
            {t.reports.totalRevenue}
          </span>
          <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1 truncate">
            +{formatCurrency(totalIncome, currency)}
          </div>
          <div className="text-xs text-[#706B82] dark:text-[#9D98AC] mt-1">
            {t.reports.grossInflow}
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-white dark:bg-[#181720] rounded-2xl border border-[#EAE5DC] dark:border-[#262432] shadow-xs overflow-hidden">
          <span className="text-xs font-bold uppercase text-[#706B82] dark:text-[#9D98AC] tracking-wider">
            {t.reports.totalExpenditure}
          </span>
          <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1 truncate">
            -{formatCurrency(totalExpense, currency)}
          </div>
          <div className="text-xs text-[#706B82] dark:text-[#9D98AC] mt-1">
            {t.reports.cumulativeOutlay}
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-white dark:bg-[#181720] rounded-2xl border border-[#EAE5DC] dark:border-[#262432] shadow-xs overflow-hidden">
          <span className="text-xs font-bold uppercase text-[#706B82] dark:text-[#9D98AC] tracking-wider">
            {t.reports.netSavings}
          </span>
          <div className={`text-xl sm:text-2xl font-extrabold font-mono tabular-nums mt-1 truncate ${
            netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {netSavings >= 0 ? '+' : ''}{formatCurrency(netSavings, currency)}
          </div>
          <div className="text-xs text-[#706B82] dark:text-[#9D98AC] mt-1">
            {t.reports.savingsRate(totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0)}
          </div>
        </div>
      </div>

      {/* Expense Allocation Table */}
      <section className="p-4 sm:p-6 bg-white dark:bg-[#181720] rounded-2xl border border-[#EAE5DC] dark:border-[#262432] shadow-xs">
        <h2 className="text-base font-extrabold text-[#16151D] dark:text-white mb-1">
          {t.reports.allocationTitle}
        </h2>
        <p className="text-xs text-[#706B82] dark:text-[#9D98AC] mb-5">
          {t.reports.allocationSubtitle}
        </p>

        <div className="divide-y divide-[#F1ECE3] dark:divide-[#252230]">
          {categoryTotals.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#868196] dark:text-[#9D98AC]">
              {t.reports.emptyAllocation}
            </div>
          ) : categoryTotals.map(({ category, amount, percentage }) => (
            <div key={category?.id || 'unknown'} className="py-3.5 flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span 
                  className="w-3.5 h-3.5 rounded-full shrink-0" 
                  style={{ backgroundColor: category?.colorHex || '#8E85FA' }} 
                />
                <span className="text-xs font-semibold text-[#16151D] dark:text-[#E2DFEC] truncate">
                  {translateCategoryName(category, lang, t.common.unassigned)}
                </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-6 shrink-0">
                <div className="w-24 sm:w-40 h-2 bg-[#F1ECE3] dark:bg-[#252230] rounded-full overflow-hidden hidden sm:block">
                  <div 
                    className="h-full rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: category?.colorHex || '#8E85FA' 
                    }} 
                  />
                </div>
                <div className="text-right font-mono tabular-nums text-xs min-w-0">
                  <div className="font-bold text-[#16151D] dark:text-white truncate">
                    {formatCurrency(amount, currency)}
                  </div>
                  <div className="text-[#868196] dark:text-[#9D98AC] text-[11px]">
                    {t.reports.percentOfTotal(percentage)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

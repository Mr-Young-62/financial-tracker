import React, { useState } from 'react';
import { RecurringTransaction, Category, CurrencyCode, RecurringInterval } from '../types';
import { formatCurrency, convertCurrency } from '../data/mockData';
import { Plus, Repeat, Play, CheckCircle2, Calendar, X } from 'lucide-react';
import { isRecurringDue, toDateOnlyString } from '../utils/finance';
import {
  translateCategoryName,
  translateInterval,
  useLanguage,
} from '../utils/i18n';
import { formatThousandInput, parseThousandInput } from '../utils/formatters';

interface RecurringViewProps {
  recurringList: RecurringTransaction[];
  categories: Category[];
  currency: CurrencyCode;
  onAddRecurring: (item: Omit<RecurringTransaction, 'id'>) => void;
  onProcessDueSchedules: () => number;
  onToggleActive: (id: string) => void;
}

export const RecurringView: React.FC<RecurringViewProps> = ({
  recurringList,
  categories,
  currency,
  onAddRecurring,
  onProcessDueSchedules,
  onToggleActive,
}) => {
  const { lang, t } = useLanguage();
  const expenseCategories = categories.filter((category) => category.type === 'EXPENSE');
  const incomeCategories = categories.filter((category) => category.type === 'INCOME');

  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [amountInput, setAmountInput] = useState<string>(formatThousandInput('150000'));
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id || '');
  const [interval, setInterval] = useState<RecurringInterval>('MONTHLY');
  const [nextRunDate, setNextRunDate] = useState(toDateOnlyString(new Date()));
  const [processResult, setProcessResult] = useState<number | null>(null);

  const dueCount = recurringList.filter(
    (item) => item.isActive && isRecurringDue(item.nextRunDate)
  ).length;

  const handleProcess = () => {
    const posted = onProcessDueSchedules();
    setProcessResult(posted);
    setTimeout(() => setProcessResult(null), 5000);
  };

  const handleTypeChange = (nextType: 'INCOME' | 'EXPENSE') => {
    setType(nextType);
    const pool = nextType === 'INCOME' ? incomeCategories : expenseCategories;
    setCategoryId(pool[0]?.id || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseThousandInput(amountInput);
    if (!description.trim() || parsedAmount <= 0 || !categoryId) return;

    onAddRecurring({
      description,
      type,
      amount: parsedAmount,
      currency,
      categoryId,
      interval,
      nextRunDate,
      isActive: true,
    });
    setShowModal(false);
    setDescription('');
    setAmountInput(formatThousandInput('150000'));
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Trigger Controls */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#EAE5DC] dark:border-[#22202E]">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-[#8E85FA] dark:text-[#B8B2FF] tracking-wider uppercase mb-1">
            {t.recurring.eyebrow}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#16151D] dark:text-white">
            {t.recurring.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#706B82] dark:text-[#9D98AC] mt-1">
            {t.recurring.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleProcess}
            disabled={dueCount === 0}
            className="px-3.5 py-2 text-xs font-semibold text-[#16151D] dark:text-[#F4F2F8] bg-white dark:bg-[#181720] border border-[#DDD7CD] dark:border-[#2D2A3B] hover:bg-[#FAF7F2] dark:hover:bg-[#22202E] rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed btn-tactile cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 shrink-0 text-[#8E85FA] dark:text-[#B8B2FF] fill-[#8E85FA] dark:fill-[#B8B2FF]" />
            <span>{dueCount > 0 ? t.recurring.processDue(dueCount) : t.recurring.noDueSchedules}</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 text-xs font-bold text-white dark:text-[#121118] bg-[#121118] dark:bg-[#B8B2FF] hover:bg-[#252230] dark:hover:bg-[#A8A0FC] active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span>{t.recurring.newSchedule}</span>
          </button>
        </div>
      </section>

      {processResult !== null && (
        <div
          className={`p-3.5 border rounded-2xl text-xs flex items-center gap-2.5 ${
            processResult > 0
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-[#FAF7F2] dark:bg-[#1E1D27] border-[#EAE5DC] dark:border-[#2D2A3B] text-[#706B82] dark:text-[#9D98AC]'
          }`}
        >
          <CheckCircle2
            className={`w-4 h-4 shrink-0 ${
              processResult > 0 ? 'text-emerald-600' : 'text-[#8E85FA]'
            }`}
          />
          <span>
            {processResult > 0
              ? t.recurring.postedResult(processResult)
              : t.recurring.noneDueResult}
          </span>
        </div>
      )}

      {/* Recurring Schedules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {recurringList.map((item) => {
          const category = categories.find((c) => c.id === item.categoryId);
          const converted = convertCurrency(item.amount, item.currency, currency);
          const due = item.isActive && isRecurringDue(item.nextRunDate);

          return (
            <div
              key={item.id}
              className={`p-4 sm:p-6 rounded-2xl border transition-colors ${
                item.isActive
                  ? 'bg-white dark:bg-[#181720] border-[#EAE5DC] dark:border-[#262432] shadow-xs'
                  : 'bg-[#FAF7F2]/60 dark:bg-[#181720]/40 border-[#EAE5DC]/60 dark:border-[#262432]/60 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    item.type === 'INCOME' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                  }`}>
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#16151D] dark:text-white truncate">
                      {item.description}
                    </h3>
                    {/* Unboxed metadata (§1.A) */}
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#706B82] dark:text-[#9D98AC] mt-0.5">
                      <span>{translateInterval(item.interval, lang)}</span>
                      {category && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{translateCategoryName(category, lang)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onToggleActive(item.id)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors shrink-0 ${
                    item.isActive 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                      : 'bg-[#FAF7F2] dark:bg-[#1E1D27] border-[#DDD7CD] dark:border-[#2D2A3B] text-[#706B82] dark:text-[#9D98AC]'
                  }`}
                >
                  {item.isActive ? t.recurring.active : t.recurring.paused}
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F1ECE3] dark:border-[#252230] flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-xs">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[#706B82] dark:text-[#9D98AC] min-w-0">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {t.recurring.nextRun}{' '}
                    <strong className="font-mono text-[#16151D] dark:text-white">{item.nextRunDate}</strong>
                  </span>
                  {due && (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold shrink-0">
                      {t.recurring.dueNow}
                    </span>
                  )}
                </div>

                <div className={`font-mono font-bold tabular-nums text-sm min-w-0 max-w-full truncate ${
                  item.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {item.type === 'INCOME' ? '+' : '-'}{formatCurrency(converted, currency)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add Recurring Schedule */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#121118]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form 
            onSubmit={handleSubmit}
            className="bg-white dark:bg-[#181720] rounded-3xl max-w-md w-full p-4 sm:p-6 max-h-[90dvh] overflow-y-auto border border-[#EAE5DC] dark:border-[#262432] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#F1ECE3] dark:border-[#252230]">
              <h3 className="text-base font-extrabold text-[#16151D] dark:text-white">
                {t.recurring.modalTitle}
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
                  {t.recurring.description}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.recurring.descriptionPlaceholder}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8E85FA]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#16151D] dark:text-[#E2DFEC] font-semibold mb-1">
                    {t.recurring.scheduleType}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as 'INCOME' | 'EXPENSE')}
                    className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8E85FA]"
                  >
                    <option value="EXPENSE">{t.common.expense}</option>
                    <option value="INCOME">{t.common.income}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#16151D] dark:text-[#E2DFEC] font-semibold mb-1">
                    {t.recurring.frequency}
                  </label>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value as RecurringInterval)}
                    className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8E85FA]"
                  >
                    <option value="DAILY">{translateInterval('DAILY', lang)}</option>
                    <option value="WEEKLY">{translateInterval('WEEKLY', lang)}</option>
                    <option value="MONTHLY">{translateInterval('MONTHLY', lang)}</option>
                    <option value="YEARLY">{translateInterval('YEARLY', lang)}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#16151D] dark:text-[#E2DFEC] font-semibold mb-1">
                  {t.recurring.amountLabel(currency)}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(formatThousandInput(e.target.value))}
                  className="w-full px-3.5 py-2 bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#8E85FA]"
                />
              </div>

              <div>
                <label className="block text-[#16151D] dark:text-[#E2DFEC] font-semibold mb-1">
                  {t.recurring.category}
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8E85FA]"
                >
                  {(type === 'INCOME' ? incomeCategories : expenseCategories).map((category) => (
                    <option key={category.id} value={category.id}>
                      {translateCategoryName(category, lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#16151D] dark:text-[#E2DFEC] font-semibold mb-1">
                  {t.recurring.nextRunDate}
                </label>
                <input
                  type="date"
                  value={nextRunDate}
                  onChange={(e) => setNextRunDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8E85FA]"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#706B82] dark:text-[#9D98AC] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-[#121118] text-white dark:bg-[#B8B2FF] dark:text-[#121118] rounded-xl shadow-xs"
              >
                {t.recurring.createSchedule}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

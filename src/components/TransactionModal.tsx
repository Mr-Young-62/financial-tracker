import React, { useState, useEffect } from 'react';
import { 
  Transaction, 
  Category, 
  CurrencyCode, 
  TransactionType 
} from '../types';
import { ArrowDownRight, ArrowUpRight, X } from 'lucide-react';
import { toDateInputValue, toDateOnlyString } from '../utils/finance';
import { formatThousandInput, parseThousandInput } from '../utils/formatters';
import { translateCategoryName, useLanguage } from '../utils/i18n';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id' | 'idempotencyKey' | 'syncStatus' | 'createdAt'> & { id?: string }) => void;
  editingTransaction?: Transaction | null;
  initialType?: TransactionType;
  categories: Category[];
  currency: CurrencyCode;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTransaction,
  initialType = 'EXPENSE',
  categories,
  currency,
}) => {
  const { lang, t } = useLanguage();
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amountInput, setAmountInput] = useState<string>(formatThousandInput('50000'));
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionDate, setTransactionDate] = useState(toDateOnlyString(new Date()));
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isMounted, setIsMounted] = useState<boolean>(isOpen);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => setIsMounted(false), 300);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isMounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMounted]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const categoryForType = (nextType: TransactionType) =>
    categories.find((c) => c.type === nextType)?.id || '';

  useEffect(() => {
    if (!isOpen) return;
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountInput(formatThousandInput(String(Math.round(editingTransaction.amount))));
      setDescription(editingTransaction.description);
      setCategoryId(editingTransaction.categoryId || '');
      setTransactionDate(toDateInputValue(editingTransaction.transactionDate));
      setNotes(editingTransaction.notes || '');
      setTagsInput(editingTransaction.tags.join(', '));
    } else {
      setType(initialType);
      setAmountInput(formatThousandInput('50000'));
      setDescription('');
      setCategoryId(categoryForType(initialType));
      setTransactionDate(toDateOnlyString(new Date()));
      setNotes('');
      setTagsInput('');
    }
  }, [editingTransaction, isOpen, categories, initialType]);

  if (!isMounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseThousandInput(amountInput);
    if (!description.trim() || parsedAmount <= 0) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    onSave({
      id: editingTransaction ? editingTransaction.id : undefined,
      type,
      amount: parsedAmount,
      currency,
      description,
      categoryId,
      transactionDate: new Date(`${transactionDate}T12:00:00`).toISOString(),
      notes,
      tags,
    });
    onClose();
  };

  const availableCategories = categories.filter((c) => c.type === type);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:pb-6">
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`absolute inset-0 bg-[#121118]/60 backdrop-blur-xs transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <form 
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={editingTransaction ? t.txModal.editTitle : t.txModal.newTitle}
        className={`relative w-full max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain bg-white dark:bg-[#181720] rounded-t-[28px] sm:rounded-3xl border border-[#EAE5DC] dark:border-[#262432] shadow-2xl p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 space-y-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto -mt-1 mb-1 h-1.5 w-10 rounded-full bg-[#DED6CA] dark:bg-[#3A3450] sm:hidden" />
        <div className="flex items-center justify-between pb-3 border-b border-[#F1ECE3] dark:border-[#252230]">
          <h3 className="text-base font-extrabold text-[#16151D] dark:text-white">
            {editingTransaction ? t.txModal.editTitle : t.txModal.newTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="min-w-[44px] min-h-[44px] -my-2 -mr-2 flex items-center justify-center rounded-xl text-[#706B82] hover:text-[#16151D] dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transaction Type Segmented Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#F1ECE3] dark:bg-[#1E1D27] rounded-xl border border-[#DDD7CD] dark:border-[#2D2A3B]">
          <button
            type="button"
            onClick={() => {
              setType('EXPENSE');
              const c = categories.find((cat) => cat.type === 'EXPENSE');
              if (c) setCategoryId(c.id);
            }}
            className={`min-h-[44px] py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              type === 'EXPENSE'
                ? 'bg-white dark:bg-[#282536] text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-[#686377] dark:text-[#9D98AC] hover:text-[#16151D]'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{t.common.expense}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setType('INCOME');
              const c = categories.find((cat) => cat.type === 'INCOME');
              if (c) setCategoryId(c.id);
            }}
            className={`min-h-[44px] py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              type === 'INCOME'
                ? 'bg-white dark:bg-[#282536] text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-[#686377] dark:text-[#9D98AC] hover:text-[#16151D]'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>{t.common.income}</span>
          </button>

        </div>

        {/* Inputs */}
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[#16151D] dark:text-[#E2DFEC] font-semibold mb-1">
              {t.txModal.description}
            </label>
            <input
              type="text"
              required
              placeholder={t.txModal.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8E85FA]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-[#16151D] dark:text-[#E2DFEC] font-semibold mb-1">
                {t.txModal.amountLabel(currency)}
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                required
                value={amountInput}
                onChange={(e) => setAmountInput(formatThousandInput(e.target.value))}
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#8E85FA]"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-[#16151D] dark:text-[#E2DFEC] font-semibold mb-1">
                {t.txModal.date}
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full min-h-[44px] px-3 sm:px-3.5 py-2.5 bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8E85FA]"
              />
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-[#16151D] dark:text-[#E2DFEC] font-semibold mb-1">
              {t.txModal.category}
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2.5 bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8E85FA]"
            >
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {translateCategoryName(c, lang)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#16151D] dark:text-[#E2DFEC] font-semibold mb-1">
              {t.txModal.tags}
            </label>
            <input
              type="text"
              placeholder={t.txModal.tagsPlaceholder}
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8E85FA]"
            />
          </div>

          <div>
            <label className="block text-[#16151D] dark:text-[#E2DFEC] font-semibold mb-1">
              {t.txModal.notes}
            </label>
            <textarea
              rows={2}
              placeholder={t.txModal.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] rounded-xl text-[#16151D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8E85FA]"
            />
          </div>
        </div>

        <div className="pt-3 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2.5 text-xs font-semibold text-[#706B82] dark:text-[#9D98AC] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            className="min-h-[44px] px-5 py-2.5 text-xs font-bold bg-[#121118] text-white dark:bg-[#B8B2FF] dark:text-[#121118] hover:bg-[#252230] dark:hover:bg-[#A8A0FC] rounded-xl shadow-xs"
          >
            {editingTransaction ? t.txModal.saveChanges : t.txModal.recordTransaction}
          </button>
        </div>
      </form>
    </div>
  );
};

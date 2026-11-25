import React, { useEffect } from 'react';
import { ArrowDownRight, ArrowUpRight, BellRing, Check, Trash2, X } from 'lucide-react';
import { NotificationDraft } from '../types';
import { formatCurrency } from '../data/mockData';
import { useLanguage } from '../utils/i18n';

interface NotificationDraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: NotificationDraft[];
  /** Opens the TransactionModal pre-filled with this draft for confirmation. */
  onConfirmDraft: (draft: NotificationDraft) => void;
  onDeleteDraft: (draftId: string) => void;
}

/**
 * Review queue for drafts captured from Android notifications.
 * Nothing becomes a Transaction without an explicit confirmation here.
 */
export const NotificationDraftsModal: React.FC<NotificationDraftsModalProps> = ({
  isOpen,
  onClose,
  drafts,
  onConfirmDraft,
  onDeleteDraft,
}) => {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const reviewLabel = (draft: NotificationDraft): string => {
    const reasons = draft.reviewReasons.map(
      (reason) =>
        t.notificationCapture.reviewReasons[
          reason as keyof typeof t.notificationCapture.reviewReasons
        ] ?? reason
    );
    return reasons.join(' · ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:pb-6">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.notificationCapture.draftsTitle}
        className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] overflow-y-auto bg-white dark:bg-[#1A1726] border border-[#E5DDD0] dark:border-[#2E283F] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slideUp sm:animate-fadeIn"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 pt-5 pb-3 bg-white/95 dark:bg-[#1A1726]/95 backdrop-blur-sm border-b border-[#EDE7DE] dark:border-[#2C273B]">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#EFEAFE] dark:bg-[#2A2440] flex items-center justify-center shrink-0">
              <BellRing className="w-4.5 h-4.5 text-[#704BEA] dark:text-[#B8B0FF]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold tracking-tight leading-snug">
                {t.notificationCapture.draftsTitle}
              </h2>
              <p className="text-[11px] text-[#726B82] dark:text-[#A7A0B8] font-medium mt-0.5">
                {t.notificationCapture.draftsSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t.notificationCapture.draftsCloseAria}
            className="p-2 -mr-1.5 rounded-xl text-[#6D657C] dark:text-[#A7A0B8] hover:bg-black/5 dark:hover:bg-white/10 btn-tactile cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {drafts.length === 0 && (
            <p className="text-xs text-[#726B82] dark:text-[#A7A0B8] py-6 text-center leading-relaxed">
              {t.notificationCapture.draftsEmpty}
            </p>
          )}

          {drafts.map((draft) => {
            const isIncome = draft.type === 'INCOME';
            const amountText =
              draft.amount !== null && draft.currency
                ? formatCurrency(draft.amount, draft.currency)
                : '—';
            return (
              <div
                key={draft.id}
                className="rounded-2xl border border-[#E5DDD0] dark:border-[#2E283F] bg-[#FBF8F2] dark:bg-[#15121D] px-4 py-3.5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#9D98AC]">
                      {draft.type ? (
                        isIncome ? (
                          <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 text-[#704BEA]" />
                        )
                      ) : (
                        <BellRing className="w-3 h-3 text-amber-500" />
                      )}
                      <span className="truncate">
                        {draft.type
                          ? isIncome
                            ? t.common.income
                            : t.common.expense
                          : t.notificationCapture.reviewLabel}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="normal-case tracking-normal font-medium truncate">
                        {draft.sourcePackage}
                      </span>
                    </div>
                    <div className="text-sm font-extrabold mt-1 break-words">
                      {draft.description || draft.title}
                    </div>
                  </div>
                  <div className="text-sm font-black tabular-nums shrink-0">
                    {amountText}
                  </div>
                </div>

                {/* Raw notification preview (local only) */}
                <p className="text-[11px] leading-relaxed text-[#726B82] dark:text-[#A7A0B8] line-clamp-2 break-words">
                  {draft.text || draft.title}
                </p>

                {draft.needsReview && (
                  <div className="rounded-xl bg-amber-50/90 dark:bg-amber-500/10 border border-amber-300/60 dark:border-amber-500/30 px-3 py-2">
                    <div className="text-[10px] font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                      {t.notificationCapture.reviewLabel}
                    </div>
                    <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 mt-0.5">
                      {reviewLabel(draft)}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={() => onConfirmDraft(draft)}
                    className="flex-1 min-h-[40px] px-3 rounded-xl bg-[#704BEA] dark:bg-[#4B32A8] text-white text-xs font-bold flex items-center justify-center gap-1.5 btn-tactile cursor-pointer hover:opacity-95 transition-opacity"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    {t.notificationCapture.confirmBtn}
                  </button>
                  <button
                    onClick={() => onDeleteDraft(draft.id)}
                    aria-label={t.notificationCapture.deleteBtn}
                    className="min-h-[40px] px-3 rounded-xl border border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 btn-tactile cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.notificationCapture.deleteBtn}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

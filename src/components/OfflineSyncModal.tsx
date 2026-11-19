import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Info,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  AppStateSnapshot,
  exportBackupJson,
  parseBackupJson,
} from '../utils/storage';
import { translateServiceMessage, useLanguage } from '../utils/i18n';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: AppStateSnapshot;
  onRestoreBackup: (snapshot: AppStateSnapshot) => void;
  onClearData: () => void;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({
  isOpen,
  onClose,
  snapshot,
  onRestoreBackup,
  onClearData,
}) => {
  const { lang, t } = useLanguage();
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFeedback(null);
    setConfirmClear(false);
    setIsExporting(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setConfirmClear(false);
    try {
      const result = await exportBackupJson(snapshot, {
        title: t.backupModal.shareTitle,
        dialogTitle: t.backupModal.shareDialogTitle,
      });

      if (result.status === 'cancelled') {
        setFeedback({
          type: 'info',
          message: t.backupModal.exportCancelled,
        });
        return;
      }

      setFeedback({
        type: 'success',
        message:
          result.status === 'shared'
            ? t.backupModal.exportSharedSuccess(result.fileName)
            : t.backupModal.exportSuccess(result.fileName),
      });
    } catch {
      setFeedback({
        type: 'error',
        message: t.backupModal.exportError,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = parseBackupJson(text);
      if (!result.ok) {
        setFeedback({
          type: 'error',
          message: translateServiceMessage(result.error, lang),
        });
        return;
      }

      onRestoreBackup(result.snapshot);
      setConfirmClear(false);
      setFeedback({
        type: 'success',
        message: t.backupModal.restoreSuccess(
          result.snapshot.transactions.length,
          result.snapshot.budgets.length,
          result.snapshot.recurringList.length
        ),
      });
    } catch {
      setFeedback({
        type: 'error',
        message: t.backupModal.readError,
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmClear = () => {
    onClearData();
    setConfirmClear(false);
    setFeedback({
      type: 'success',
      message: t.backupModal.clearSuccess,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#121118]/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4">
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.backupModal.title}
        className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain bg-white dark:bg-[#181720] rounded-t-[28px] sm:rounded-3xl border border-[#EAE5DC] dark:border-[#262432] shadow-2xl p-4 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 space-y-4"
      >
        <div className="mx-auto -mt-1 mb-1 h-1.5 w-10 rounded-full bg-[#DED6CA] dark:bg-[#3A3450] sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#F1ECE3] dark:border-[#252230]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] dark:bg-[#252230] text-[#8E85FA] dark:text-[#B8B2FF] flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-[#16151D] dark:text-white truncate">
                {t.backupModal.title}
              </h3>
              <p className="text-xs text-[#706B82] dark:text-[#9D98AC] truncate">
                {t.backupModal.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.backupModal.closeAria}
            className="min-w-[44px] min-h-[44px] -my-2 -mr-2 flex items-center justify-center rounded-xl text-[#706B82] hover:text-[#16151D] dark:hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ringkasan Data Tersimpan Lokal */}
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-3 rounded-2xl bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#EAE5DC] dark:border-[#2D2A3B] min-w-0">
              <div className="text-[11px] font-semibold text-[#706B82] dark:text-[#9D98AC] truncate">
                {t.backupModal.transactions}
              </div>
              <div className="text-lg sm:text-xl font-extrabold font-mono tabular-nums text-[#16151D] dark:text-white mt-0.5">
                {snapshot.transactions.length}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#EAE5DC] dark:border-[#2D2A3B] min-w-0">
              <div className="text-[11px] font-semibold text-[#706B82] dark:text-[#9D98AC] truncate">
                {t.backupModal.budgets}
              </div>
              <div className="text-lg sm:text-xl font-extrabold font-mono tabular-nums text-[#16151D] dark:text-white mt-0.5">
                {snapshot.budgets.length}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#EAE5DC] dark:border-[#2D2A3B] min-w-0">
              <div className="text-[11px] font-semibold text-[#706B82] dark:text-[#9D98AC] truncate">
                {t.backupModal.schedules}
              </div>
              <div className="text-lg sm:text-xl font-extrabold font-mono tabular-nums text-[#16151D] dark:text-white mt-0.5">
                {snapshot.recurringList.length}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-[#706B82] dark:text-[#9D98AC]">
            <span className="min-w-0 truncate">
              {t.backupModal.activeCategories(snapshot.categories.length)}
            </span>
            <span className="font-mono shrink-0">
              {t.backupModal.currencyLabel}{' '}
              <strong className="text-[#16151D] dark:text-white">{snapshot.currency}</strong>
            </span>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            role="status"
            className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : feedback.type === 'info'
                ? 'bg-[#FAF7F2] dark:bg-[#1E1D27] border-[#DED6CA] dark:border-[#343146] text-[#5B5670] dark:text-[#C5C0D4]'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            ) : feedback.type === 'info' ? (
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#8E85FA] dark:text-[#B8B2FF]" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            )}
            <span className="min-w-0 break-words">{feedback.message}</span>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Backup & Restore Actions */}
        <div className="space-y-2.5">
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExport}
            className="w-full min-h-[44px] px-4 py-2.5 text-xs font-bold bg-[#121118] text-white dark:bg-[#B8B2FF] dark:text-[#121118] hover:bg-[#252230] dark:hover:bg-[#A8A0FC] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 btn-tactile cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>{isExporting ? t.backupModal.exportingBtn : t.backupModal.exportBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[44px] px-4 py-2.5 text-xs font-semibold text-[#16151D] dark:text-[#F4F2F8] bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#DDD7CD] dark:border-[#2D2A3B] hover:bg-[#F1ECE3] dark:hover:bg-[#262432] rounded-xl transition-colors flex items-center justify-center gap-2 btn-tactile cursor-pointer"
          >
            <Upload className="w-4 h-4 shrink-0 text-[#8E85FA] dark:text-[#B8B2FF]" />
            <span>{t.backupModal.restoreBtn}</span>
          </button>
        </div>

        {/* Danger Zone — Kosongkan Data */}
        <div className="pt-2 border-t border-[#F1ECE3] dark:border-[#252230]">
          {!confirmClear ? (
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setConfirmClear(true);
              }}
              className="w-full min-h-[44px] px-4 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/70 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-xl transition-colors flex items-center justify-center gap-2 btn-tactile cursor-pointer"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>{t.backupModal.clearBtn}</span>
            </button>
          ) : (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/70 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>{t.backupModal.clearConfirmText}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="min-h-[44px] px-3 py-2.5 text-xs font-semibold text-[#16151D] dark:text-[#E2DFEC] bg-white dark:bg-[#181720] border border-[#DDD7CD] dark:border-[#2D2A3B] hover:bg-[#FAF7F2] dark:hover:bg-[#22202E] rounded-xl transition-colors cursor-pointer"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  className="min-h-[44px] px-3 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {t.backupModal.confirmClearBtn}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-xs font-semibold text-[#706B82] dark:text-[#9D98AC] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { Category } from '../types';
import { translateCategoryName, useLanguage } from '../utils/i18n';
import { parseAmount } from '../utils/amount';

export interface ScannedReceiptData {
  amount?: number;
  description?: string;
  categoryId?: string;
  transactionDate?: string;
  notes?: string;
  tags?: string[];
}

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  type?: 'INCOME' | 'EXPENSE';
  onScanned: (data: ScannedReceiptData) => void;
}

const fileToBase64 = (file: File) =>
  new Promise<{ data: string; mimeType: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Tidak dapat membaca gambar'));
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve({ data: result.includes(',') ? result.split(',')[1] : result, mimeType: file.type || 'image/jpeg' });
    };
    reader.readAsDataURL(file);
  });

const parseDate = (value: unknown): string => {
  const fallback = new Date().toISOString().slice(0, 10);
  if (typeof value !== 'string') return fallback;
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const match = text.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  return fallback;
};

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  categories,
  type = 'EXPENSE',
  onScanned,
}) => {
  const { lang, t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setError('');
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
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isMounted]);

  if (!isMounted) return null;

  const scanFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(lang === 'id' ? 'Pilih file gambar struk.' : 'Please select a receipt image.');
      return;
    }

    setIsScanning(true);
    setError('');
    try {
      const image = await fileToBase64(file);
      const response = await fetch('/api/v1/receipt/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: image.data,
          mimeType: image.mimeType,
          language: lang,
          categories: categories
            .filter((category) => category.type === type)
            .map((category) => ({
              id: category.id,
              name: translateCategoryName(category, lang),
            })),
        }),
      });

      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok) {
        throw new Error(payload?.message || (lang === 'id' ? `Gagal membaca struk (${response.status}).` : `Failed to read receipt (${response.status}).`));
      }

      const result = payload?.data || {};
      const categoryName = String(result.categoryName || '').toLowerCase().trim();
      const categoriesForType = categories.filter((item) => item.type === type);
      const category = categoriesForType.find((item) =>
        translateCategoryName(item, lang).toLowerCase() === categoryName ||
        item.name.toLowerCase() === categoryName
      ) || categoriesForType[0];

      const amount = parseAmount(result.amount);

      onScanned({
        amount,
        description: String(result.description || result.merchant || '').trim(),
        categoryId: category?.id,
        transactionDate: parseDate(result.transactionDate),
        notes: String(result.notes || '').trim(),
        tags: Array.isArray(result.tags) ? result.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean) : [],
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (lang === 'id' ? 'Gagal membaca struk.' : 'Failed to read receipt.'));
    } finally {
      setIsScanning(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const openPicker = (mode: 'camera' | 'gallery') => {
    const input = inputRef.current;
    if (!input) return;
    if (mode === 'camera') {
      input.setAttribute('capture', 'environment');
    } else {
      input.removeAttribute('capture');
    }
    input.value = '';
    input.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:pb-6">
      <div onClick={onClose} className={`absolute inset-0 bg-[#121118]/60 backdrop-blur-xs transition-opacity ${isVisible ? 'opacity-100' : 'opacity-0'}`} />
      <div role="dialog" aria-modal="true" className={`relative w-full max-w-md rounded-t-[28px] sm:rounded-3xl border border-[#EAE5DC] dark:border-[#262432] bg-white dark:bg-[#181720] p-5 sm:p-6 shadow-2xl transition-transform ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between border-b border-[#F1ECE3] dark:border-[#252230] pb-3">
          <div>
            <h3 className="text-base font-extrabold text-[#16151D] dark:text-white">{lang === 'id' ? 'Scan Struk' : 'Scan Receipt'}</h3>
            <p className="mt-1 text-xs text-[#706B82] dark:text-[#9D98AC]">{lang === 'id' ? 'Gemini akan membaca detail transaksi.' : 'Gemini reads the transaction details.'}</p>
          </div>
          <button type="button" onClick={onClose} className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl"><X className="w-4 h-4" /></button>
        </div>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void scanFile(event.target.files?.[0])} />

        {isScanning ? (
          <div className="py-10 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#8E85FA]" />
            <p className="mt-3 text-sm font-bold text-[#16151D] dark:text-white">{lang === 'id' ? 'Membaca struk...' : 'Reading receipt...'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 py-5">
            <button type="button" onClick={() => openPicker('camera')} className="min-h-28 rounded-2xl border border-[#DDD7CD] dark:border-[#353145] bg-[#FAF7F2] dark:bg-[#1E1D27] flex flex-col items-center justify-center gap-2 text-xs font-bold">
              <Camera className="h-6 w-6 text-[#8E85FA]" />
              {lang === 'id' ? 'Ambil Foto' : 'Take Photo'}
            </button>
            <button type="button" onClick={() => openPicker('gallery')} className="min-h-28 rounded-2xl border border-[#DDD7CD] dark:border-[#353145] bg-[#FAF7F2] dark:bg-[#1E1D27] flex flex-col items-center justify-center gap-2 text-xs font-bold">
              <ImagePlus className="h-6 w-6 text-[#8E85FA]" />
              {lang === 'id' ? 'Pilih Gambar' : 'Choose Image'}
            </button>
          </div>
        )}

        {error && <p className="rounded-xl bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{error}</p>}
      </div>
    </div>
  );
};

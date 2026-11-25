import React from 'react';
import type { AvailableUpdate } from '../utils/update';

export const UpdateModal: React.FC<{ update: AvailableUpdate; onLater: () => void }> = ({ update, onLater }) => (
  <div className="fixed inset-0 z-[70] bg-[#121118]/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div role="dialog" aria-modal="true" aria-labelledby="update-title" className="w-full max-w-md rounded-3xl border border-[#EAE5DC] dark:border-[#262432] bg-white dark:bg-[#181720] p-5 sm:p-6 shadow-2xl">
      <div className="w-11 h-11 rounded-2xl bg-[#704BEA]/15 text-[#704BEA] dark:text-[#B8B2FF] flex items-center justify-center text-lg font-black">↑</div>
      <h2 id="update-title" className="mt-4 text-lg font-extrabold text-[#16151D] dark:text-white">Update tersedia</h2>
      <p className="mt-1 text-sm text-[#706B82] dark:text-[#9D98AC]">Financial Tracker versi {update.version} sudah tersedia.</p>
      {update.notes && <p className="mt-4 max-h-32 overflow-y-auto whitespace-pre-line text-xs text-[#706B82] dark:text-[#9D98AC]">{update.notes}</p>}
      <div className="mt-5 flex gap-2 justify-end">
        <button type="button" onClick={onLater} className="min-h-[44px] px-4 rounded-xl text-xs font-semibold text-[#706B82]">Nanti</button>
        <button type="button" onClick={() => window.open(update.downloadUrl, '_blank', 'noopener,noreferrer')} className="min-h-[44px] px-4 rounded-xl bg-[#704BEA] text-white text-xs font-bold">Update Sekarang</button>
      </div>
    </div>
  </div>
);

import React, { useState } from 'react';
import { PROJECT_FILES, ProjectFileNode } from '../data/projectFiles';
import { 
  FileCode, 
  Copy, 
  Check, 
  Terminal, 
  CheckCircle2,
  Download
} from 'lucide-react';

export const ArchitectureExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<ProjectFileNode>(PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<'ALL' | 'SERVER' | 'SYSTEM' | 'DOCS' | 'CONFIG'>('ALL');

  const filteredFiles = PROJECT_FILES.filter(
    (f) => moduleFilter === 'ALL' || f.module === moduleFilter
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    const jsonBlob = new Blob([JSON.stringify(PROJECT_FILES, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(jsonBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'financial-tracker-kmp-source-manifest.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Step Roadmaps */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#EAE5DC] dark:border-[#22202E]">
        <div>
          <div className="text-[11px] font-semibold text-[#8E85FA] dark:text-[#B8B2FF] tracking-wider uppercase mb-1">
            Multiplatform Architecture Explorer
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#16151D] dark:text-white">
            Kotlin Multiplatform & Ktor Architecture
          </h1>
          <p className="text-xs sm:text-sm text-[#706B82] dark:text-[#9D98AC] mt-1">
            Clean Architecture codebase structured for Android, iOS, macOS, Windows, Linux, and Ktor Server
          </p>
        </div>

        <button
          onClick={handleDownloadAll}
          className="px-3.5 py-2 text-xs font-semibold text-[#16151D] dark:text-[#F4F2F8] bg-white dark:bg-[#181720] border border-[#DDD7CD] dark:border-[#2D2A3B] hover:bg-[#FAF7F2] dark:hover:bg-[#22202E] rounded-xl transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-[#8E85FA] dark:text-[#B8B2FF]" />
          <span>Export Source Manifest</span>
        </button>
      </section>

      {/* 10-Step Implementation Roadmap Status */}
      <section className="p-5 bg-white dark:bg-[#181720] rounded-2xl border border-[#EAE5DC] dark:border-[#262432] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#706B82] dark:text-[#9D98AC]">
            Project Development Lifecycle (Tahap 1 – 10)
          </span>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Architecture & Code Verified</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
          {[
            { step: 'Tahap 1', label: 'Architecture & Gradle' },
            { step: 'Tahap 2', label: 'Database & Flyway' },
            { step: 'Tahap 3', label: 'Ktor REST & Auth' },
            { step: 'Tahap 4', label: 'Design System & M3' },
            { step: 'Tahap 5', label: 'Dashboard & Ledger' },
            { step: 'Tahap 6', label: 'Budgets & Categories' },
            { step: 'Tahap 7', label: 'Reports & Analytics' },
            { step: 'Tahap 8', label: 'Offline & SQLDelight' },
            { step: 'Tahap 9', label: 'Security & Idempotency' },
            { step: 'Tahap 10', label: 'Docker & Multiplatform' },
          ].map((item) => (
            <div 
              key={item.step} 
              className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#1E1D27] border border-[#EAE5DC] dark:border-[#2D2A3B]"
            >
              <div className="text-[10px] font-bold text-[#8E85FA] dark:text-[#B8B2FF] uppercase tracking-wider">
                {item.step}
              </div>
              <div className="font-semibold text-[#16151D] dark:text-white truncate mt-0.5">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Code Browser Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Module & File Tree (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Module Filter Tabs */}
          <div className="flex flex-wrap gap-1 p-1 bg-[#F1ECE3] dark:bg-[#1E1D27] rounded-xl text-xs font-medium border border-[#DDD7CD] dark:border-[#2D2A3B]">
            {(['ALL', 'SERVER', 'SYSTEM', 'DOCS', 'CONFIG'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModuleFilter(m)}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  moduleFilter === m
                    ? 'bg-white dark:bg-[#282536] text-[#16151D] dark:text-white font-semibold shadow-xs'
                    : 'text-[#686377] dark:text-[#9D98AC] hover:text-[#16151D]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Files List */}
          <div className="bg-white dark:bg-[#181720] rounded-2xl border border-[#EAE5DC] dark:border-[#262432] shadow-xs divide-y divide-[#F1ECE3] dark:divide-[#252230] overflow-hidden">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 ${
                    isSelected
                      ? 'bg-[#FAF7F2] dark:bg-[#252230] text-[#16151D] dark:text-white'
                      : 'hover:bg-[#FAF7F2]/60 dark:hover:bg-[#252230]/50 text-[#706B82] dark:text-[#9D98AC]'
                  }`}
                >
                  <FileCode className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-[#8E85FA] dark:text-[#B8B2FF]' : 'text-[#868196]'}`} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate text-[#16151D] dark:text-white">
                      {file.name}
                    </div>
                    <div className="text-[11px] text-[#868196] dark:text-[#9D98AC] truncate mt-0.5 font-mono">
                      {file.path}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick CLI Execution Tips */}
          <div className="p-4 bg-[#121118] text-slate-200 rounded-2xl border border-[#2B273C] space-y-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-[#B8B2FF] font-semibold">
              <Terminal className="w-4 h-4" />
              <span>Run Local Multiplatform Build</span>
            </div>
            <div className="p-2 bg-[#1C1A26] rounded-xl text-slate-300 select-all border border-[#2B273C]">
              ./gradlew :system:desktopApp:run
            </div>
            <div className="p-2 bg-[#1C1A26] rounded-xl text-slate-300 select-all border border-[#2B273C]">
              docker-compose up -d
            </div>
          </div>
        </div>

        {/* File Content & Syntax Viewport (8 Cols) */}
        <div className="lg:col-span-8 bg-[#121118] rounded-2xl border border-[#2B273C] shadow-xs flex flex-col overflow-hidden text-slate-200">
          
          {/* File Top Bar */}
          <div className="px-5 py-3.5 bg-[#1C1A26] border-b border-[#2B273C] flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-mono font-bold text-slate-100 truncate">
                {selectedFile.path}
              </div>
              <div className="text-[11px] text-[#A7A2B6] truncate mt-0.5">
                {selectedFile.description}
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#282536] hover:bg-[#343046] text-white border border-[#3C3752] flex items-center gap-1.5 transition-colors shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Code Viewer */}
          <pre className="p-5 font-mono text-xs text-slate-300 overflow-x-auto max-h-[640px] leading-relaxed">
            <code>{selectedFile.content}</code>
          </pre>
        </div>

      </div>

    </div>
  );
};

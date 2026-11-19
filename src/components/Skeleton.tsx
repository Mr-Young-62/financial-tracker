import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Universal Skeleton Shimmer Primitive
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style }) => {
  return (
    <div 
      className={`animate-shimmer rounded-xl ${className}`} 
      style={style}
      aria-hidden="true"
    />
  );
};

/**
 * Dashboard View Shimmer Loader
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-fadeIn" role="status" aria-label="Loading dashboard records...">
      
      {/* Top Greeting & Period Switcher Placeholder */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2 border-b border-[#E6DFD4] dark:border-[#262234]">
        <div className="space-y-2">
          <Skeleton className="w-40 h-3.5 rounded-full" />
          <Skeleton className="w-80 h-9 rounded-2xl" />
          <Skeleton className="w-64 h-3.5 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-40 h-10 rounded-2xl hidden sm:block" />
          <Skeleton className="w-72 h-10 rounded-2xl" />
        </div>
      </div>

      {/* Dual Pillar Stage Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Pillar: Main Joy Card Placeholder */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white/70 dark:bg-[#1B1824]/70 rounded-[32px] p-6 sm:p-7 border border-[#E6DFD4] dark:border-[#2C273B] space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2.5">
                <Skeleton className="w-32 h-3.5 rounded-full" />
                <Skeleton className="w-56 h-11 rounded-2xl" />
                <Skeleton className="w-44 h-3.5 rounded-full" />
              </div>
              <Skeleton className="w-12 h-12 rounded-full shrink-0" />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between">
                <Skeleton className="w-32 h-3 rounded-full" />
                <Skeleton className="w-24 h-3 rounded-full" />
              </div>
              <Skeleton className="w-full h-4 rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="w-24 h-2.5 rounded-full" />
                <Skeleton className="w-24 h-2.5 rounded-full" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2.5 pt-2">
              <Skeleton className="h-11 rounded-2xl" />
              <Skeleton className="h-11 rounded-2xl" />
              <Skeleton className="h-11 rounded-2xl" />
              <Skeleton className="h-11 rounded-2xl" />
            </div>
          </div>

          {/* Treat Check Banner Placeholder */}
          <div className="p-5 rounded-[28px] bg-white/70 dark:bg-[#1B1824]/70 border border-[#E6DFD4] dark:border-[#2C273B] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="w-36 h-3 rounded-full" />
                <Skeleton className="w-52 h-4 rounded-md" />
              </div>
            </div>
            <Skeleton className="w-28 h-9 rounded-2xl shrink-0" />
          </div>
        </div>

        {/* Right Pillar: Velocity Chart Placeholder */}
        <div className="lg:col-span-5 bg-white/70 dark:bg-[#1B1824]/70 rounded-[32px] p-6 sm:p-7 border border-[#E6DFD4] dark:border-[#2C273B] space-y-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="w-24 h-3 rounded-full" />
              <Skeleton className="w-36 h-4 rounded-md" />
            </div>
            <Skeleton className="w-20 h-4 rounded-full" />
          </div>

          <div className="flex items-end justify-between px-2 pt-8 pb-2 h-32 gap-3">
            {[40, 75, 95, 55, 100, 30, 45].map((val, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <Skeleton className="w-full rounded-t-xl" style={{ height: `${val}%` }} />
                <Skeleton className="w-6 h-2 rounded-full" />
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-3 border-t border-[#E6DFD4] dark:border-[#2C273B]">
            <Skeleton className="w-28 h-3 rounded-full" />
            <Skeleton className="w-full h-2 rounded-full" />
            <Skeleton className="w-full h-2 rounded-full" />
          </div>
        </div>

      </div>

      {/* 4-Card KPI Strip Placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-5 bg-white/70 dark:bg-[#1B1824]/70 rounded-2xl border border-[#E6DFD4] dark:border-[#2C273B] space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="w-24 h-3 rounded-full" />
              <Skeleton className="w-8 h-8 rounded-xl" />
            </div>
            <Skeleton className="w-36 h-7 rounded-xl" />
            <Skeleton className="w-28 h-3 rounded-full" />
          </div>
        ))}
      </div>

      {/* Recent Ledger Shimmer Rows */}
      <div className="p-6 bg-white/70 dark:bg-[#1B1824]/70 rounded-2xl border border-[#E6DFD4] dark:border-[#2C273B] space-y-4">
        <div className="flex justify-between items-center mb-2">
          <div className="space-y-1">
            <Skeleton className="w-28 h-3 rounded-full" />
            <Skeleton className="w-48 h-5 rounded-md" />
          </div>
          <Skeleton className="w-20 h-4 rounded-full" />
        </div>

        <div className="space-y-3 divide-y divide-[#F2ECE2] dark:divide-[#282337]">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="pt-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-1.5 h-9 rounded-full shrink-0" />
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="w-40 sm:w-60 h-4 rounded-md" />
                  <Skeleton className="w-28 sm:w-40 h-3 rounded-full" />
                </div>
              </div>
              <div className="space-y-1.5 text-right">
                <Skeleton className="w-20 h-4 rounded-md ml-auto" />
                <Skeleton className="w-12 h-2.5 rounded-full ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

/**
 * Transactions View Shimmer Loader
 */
export const TransactionsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-fadeIn" role="status" aria-label="Loading ledger...">
      <div className="flex justify-between items-end pb-2 border-b border-[#EAE5DC] dark:border-[#22202E]">
        <div className="space-y-1.5">
          <Skeleton className="w-36 h-3 rounded-full" />
          <Skeleton className="w-56 h-8 rounded-xl" />
          <Skeleton className="w-44 h-3.5 rounded-full" />
        </div>
        <Skeleton className="w-32 h-10 rounded-2xl" />
      </div>

      <div className="p-4 bg-white/70 dark:bg-[#1B1824]/70 rounded-2xl border border-[#E6DFD4] dark:border-[#2C273B] flex flex-wrap gap-3">
        <Skeleton className="flex-1 min-w-[200px] h-10 rounded-xl" />
        <Skeleton className="w-28 h-10 rounded-xl" />
        <Skeleton className="w-28 h-10 rounded-xl" />
        <Skeleton className="w-28 h-10 rounded-xl" />
      </div>

      <div className="p-6 bg-white/70 dark:bg-[#1B1824]/70 rounded-2xl border border-[#E6DFD4] dark:border-[#2C273B] space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-[#F2ECE2] dark:border-[#282337] last:border-0">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="w-48 h-4 rounded-md" />
                <Skeleton className="w-32 h-3 rounded-full" />
              </div>
            </div>
            <div className="space-y-1.5 text-right">
              <Skeleton className="w-24 h-4 rounded-md ml-auto" />
              <Skeleton className="w-16 h-2.5 rounded-full ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

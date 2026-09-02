import { Skeleton } from './Skeleton';

export function RtCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/40 bg-white/60 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/60">
      <div className="pointer-events-none absolute inset-0 skeleton-shimmer" />

      {/* Header: title + badge */}
      <div className="relative mb-3 flex items-center justify-between">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Status bar */}
      <Skeleton className="relative mb-3 h-9 w-full" />

      {/* File info rows */}
      <div className="relative space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>

      {/* Action buttons */}
      <div className="relative flex gap-1.5 pt-3">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-20" />
      </div>
    </div>
  );
}

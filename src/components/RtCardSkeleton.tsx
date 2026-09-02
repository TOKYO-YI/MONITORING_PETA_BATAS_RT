import { Skeleton } from './Skeleton';

export function RtCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* Header: title + badge */}
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Status bar */}
      <Skeleton className="mb-3 h-9 w-full" />

      {/* File info rows */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5 pt-3">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-20" />
      </div>
    </div>
  );
}

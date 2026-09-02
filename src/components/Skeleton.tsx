import { cn } from '@/lib/utils';

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700', className)}
    />
  );
}

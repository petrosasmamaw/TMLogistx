import React from 'react';

export function Skeleton({ className = '' }) {
  return <div className={`skeleton-shimmer rounded-md bg-slate-200/80 ${className}`} aria-hidden="true" />;
}

export function StatCardsSkeleton({ count = 4 }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${Math.min(count, 5)} gap-4`} style={{ gridTemplateColumns: `repeat(${Math.min(count, 5)}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel p-5 rounded-2xl flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 6 }) {
  return (
    <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden p-4 space-y-3">
      <div className="flex gap-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 py-2 border-t border-slate-100">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SessionLayoutSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <div className="lg:hidden border-b border-slate-200 bg-white px-4 py-3 flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
      <aside className="w-64 border-r border-slate-200 bg-white p-5 space-y-4 hidden lg:block">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-16" />
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
      </aside>
      <main className="flex-1 portal-main space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <StatCardsSkeleton count={5} />
        <TableSkeleton rows={8} cols={7} />
      </main>
    </div>
  );
}

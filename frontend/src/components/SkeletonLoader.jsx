import React from 'react';

export function RestaurantCardSkeleton() {
  return (
    <div className="rounded-3xl border border-stone-200/60 dark:border-zinc-800/80 p-4 space-y-4 bg-white dark:bg-zinc-900/40">
      <div className="w-full h-48 rounded-2xl skeleton-shimmer"></div>
      <div className="space-y-2">
        <div className="h-6 w-2/3 rounded-md skeleton-shimmer"></div>
        <div className="h-4 w-full rounded-md skeleton-shimmer"></div>
        <div className="flex items-center space-x-2 pt-2">
          <div className="h-4 w-1/4 rounded-md skeleton-shimmer"></div>
          <div className="h-4 w-1/4 rounded-md skeleton-shimmer"></div>
          <div className="h-4 w-1/4 rounded-md skeleton-shimmer"></div>
        </div>
      </div>
    </div>
  );
}

export function MenuItemSkeleton() {
  return (
    <div className="flex justify-between items-center p-4 border border-stone-200/50 dark:border-zinc-800/50 rounded-2xl bg-white/40 dark:bg-zinc-900/20">
      <div className="space-y-2 flex-1 mr-4">
        <div className="h-5 w-1/3 rounded-md skeleton-shimmer"></div>
        <div className="h-4 w-2/3 rounded-md skeleton-shimmer"></div>
        <div className="h-4 w-12 rounded-md skeleton-shimmer"></div>
      </div>
      <div className="w-24 h-24 rounded-xl skeleton-shimmer shrink-0"></div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className="h-28 rounded-2xl skeleton-shimmer"></div>
        ))}
      </div>
      <div className="h-72 rounded-3xl skeleton-shimmer"></div>
    </div>
  );
}

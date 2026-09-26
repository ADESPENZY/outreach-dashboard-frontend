import React from 'react';

// Per-panel skeletons. The original whole-page ProgressSkeleton was removed
// with the panel-by-panel loading rewrite: every panel now owns its query, so
// nothing needs a single blocking placeholder for the entire grid.


export function KpiRowSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 animate-pulse" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-4 md:p-5">
          <div className="w-9 h-9 rounded-xl bg-neutral-dark" />
          <div className="h-9 w-20 rounded bg-neutral-dark mt-3" />
          <div className="h-3.5 w-24 rounded bg-neutral-dark/70 mt-3" />
          <div className="h-3 w-16 rounded bg-neutral-dark/50 mt-2" />
          <div className="h-8 mt-3 rounded bg-neutral-dark/40" />
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ rows = 5 }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6 space-y-4 animate-pulse" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-4 w-24 rounded bg-neutral-dark shrink-0" />
          <div className="h-6 flex-1 rounded bg-neutral-dark/60" />
          <div className="h-4 w-8 rounded bg-neutral-dark shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Panel-shaped placeholder for a chart that is still being fetched as a
 * separate JS chunk. Same card chrome as the real panel, so the page does not
 * reflow when ECharts arrives.
 */
export function ChartPanelSkeleton({ height = 280, lines = 2 }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm animate-pulse" aria-hidden="true">
      <div className="px-4 md:px-6 py-5 border-b border-neutral-dark space-y-2">
        <div className="h-4 w-40 rounded bg-neutral-dark" />
        {lines > 1 && <div className="h-3 w-56 max-w-full rounded bg-neutral-dark/60" />}
      </div>
      <div className="px-4 md:px-6 py-5">
        <div className="rounded-xl bg-neutral-dark/40" style={{ height }} />
      </div>
    </div>
  );
}

import React from 'react';

// Moved unchanged from the original single-file ProgressPage.

export default function ProgressSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-5">
            <div className="w-9 h-9 rounded-xl bg-neutral-dark" />
            <div className="h-8 w-16 rounded bg-neutral-dark mt-3" />
            <div className="h-3 w-20 rounded bg-neutral-dark/70 mt-3" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-24 rounded bg-neutral-dark shrink-0" />
                <div className="h-6 flex-1 rounded bg-neutral-dark/60" />
                <div className="h-4 w-8 rounded bg-neutral-dark shrink-0" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-dark shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 w-3/4 rounded bg-neutral-dark" />
                  <div className="h-3 w-1/2 rounded bg-neutral-dark/70" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-dark shrink-0" />
              <div className="h-5 w-28 rounded bg-neutral-dark" />
            </div>
            <div className="flex justify-between gap-2">
              {Array.from({ length: 7 }).map((_, i) => <div key={i} className="w-8 h-8 rounded-full bg-neutral-dark/70" />)}
            </div>
            <div className="h-24 rounded-xl bg-neutral-dark/50" />
          </div>
          <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3.5 w-2/3 rounded bg-neutral-dark" />
                <div className="h-2.5 w-full rounded-full bg-neutral-dark/60" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Per-panel skeletons ──────────────────────────────────────────────────────
// The page mounts panels independently now, so each one waits on its own query
// instead of the whole grid being held behind the slowest.

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

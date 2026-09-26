import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

// Moved unchanged from the original single-file ProgressPage.

export default function DeltaChip({ delta }) {
  if (delta == null || delta === 0) return null;
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
      {up ? <ArrowUp className="w-3 h-3" aria-hidden="true" /> : <ArrowDown className="w-3 h-3" aria-hidden="true" />}
      {Math.abs(delta)}%
    </span>
  );
}

import React from 'react';
import { motion } from 'framer-motion';

// A 7-bar mini chart. Deliberately plain divs rather than ECharts: at this size
// an axis-less bar row is all markup, and the page already draws its pipeline
// and strategy bars the same way — pulling a chart engine in for 7 rectangles
// would cost more than it shows.

const ACCENT_BAR = {
  blue:    'bg-blue-400',
  teal:    'bg-accent-teal',
  emerald: 'bg-emerald-500',
  orange:  'bg-gradient-to-t from-primary-dark to-primary-light',
};

/**
 * @param {number[]} data      one value per day, oldest → newest
 * @param {string}   label     describes what the bars ARE (goes to screen readers)
 * @param {boolean}  loading   show a resting shimmer instead of bars
 */
export default function Sparkline({ data = [], label, accent = 'blue', loading = false }) {
  if (loading) {
    return (
      <div className="flex items-end gap-1 h-8 mt-3" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} className="flex-1 rounded-sm bg-neutral-dark animate-pulse" style={{ height: '40%' }} />
        ))}
      </div>
    );
  }

  if (!data.length) return null;

  const max = Math.max(...data, 1);
  const total = data.reduce((n, v) => n + v, 0);

  return (
    <div
      role="img"
      aria-label={total === 0 ? `${label}: nothing yet` : `${label}: ${data.join(', ')}`}
      className="flex items-end gap-1 h-8 mt-3"
    >
      {data.map((value, i) => {
        // A zero day still gets a visible stub, so the row always reads as
        // seven days rather than looking like missing data.
        const pct = value === 0 ? 0 : Math.max((value / max) * 100, 12);
        return (
          <span key={i} className="flex-1 h-full flex items-end" aria-hidden="true">
            {value === 0 ? (
              <span className="w-full h-[2px] rounded-sm bg-neutral-dark" />
            ) : (
              <motion.span
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className={`w-full rounded-sm ${ACCENT_BAR[accent] ?? ACCENT_BAR.blue}`}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}

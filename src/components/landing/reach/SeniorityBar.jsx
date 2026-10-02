import { useCallback, useLayoutEffect, useRef } from 'react';
import { BAR_LABEL, SENIORITY } from './reachContent';

/**
 * The seniority mix as one stacked bar.
 *
 * Each band is laid out at its true width and the whole bar is revealed
 * left to right by a clip, so a band appears to grow from nothing to its
 * share without any of them being stretched — animating the widths themselves
 * would mean seven simultaneous layout passes on every scroll frame.
 *
 * Scrubbed, not played: the section hands in progress.
 */

/** Keeps the pill ends while the bar is part-revealed. */
const clipAt = (p) => `inset(0 ${(1 - p) * 100}% 0 0 round 9999px)`;

export default function SeniorityBar({ reduced, onReady, className = '' }) {
  const barRef = useRef(null);

  const draw = useCallback((raw) => {
    const bar = barRef.current;
    if (!bar) return;
    bar.style.clipPath = clipAt(Math.max(0, Math.min(1, raw)));
  }, []);

  useLayoutEffect(() => {
    if (reduced) { draw(1); return undefined; }
    draw(0);
    if (onReady) return onReady({ draw });
    return undefined;
  }, [reduced, onReady, draw]);

  return (
    <div className={className}>
      <div
        ref={barRef}
        role="img"
        aria-label={BAR_LABEL}
        className="flex h-3 w-full overflow-hidden rounded-full bg-stone"
        style={{ clipPath: clipAt(reduced ? 1 : 0) }}
      >
        {SENIORITY.map((s) => (
          <div key={s.label} style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
        ))}
      </div>

      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2.5">
        {SENIORITY.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[13px] leading-none">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-secondary-dark">{s.label}</span>
            <span className="font-semibold text-ink">
              {s.pct}
              %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

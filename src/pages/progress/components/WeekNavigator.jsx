import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';

import { PROGRESS_RANGES } from '../hooks/useProgress';
import { formatWeekRange } from '../utils/format';

// "‹ Sep 21–27 ›" plus the range picker. The arrows only exist for week
// ranges; a 30-day or 12-month window has nothing to step through.

function RangeDropdown({ activeKey, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  // activeKey is null once the arrows have stepped past "Last week" — the date
  // range beside this control is then the honest label, so the trigger just
  // says which KIND of range is showing.
  const active = PROGRESS_RANGES.find((r) => r.key === activeKey);
  const triggerLabel = active?.label ?? 'Custom week';

  // Close on outside click and on Escape — tap-reachable, never hover-only.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl border border-neutral-dark bg-white text-sm font-semibold text-black-light hover:bg-neutral transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light/20"
      >
        <span className="truncate max-w-[9rem]">{triggerLabel}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-secondary-dark transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-neutral-dark bg-white p-1 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] animate-in fade-in zoom-in-95 duration-200 origin-top-right"
        >
          {PROGRESS_RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              role="menuitem"
              onClick={() => { onSelect(r.key); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-2 min-h-[44px] px-3 rounded-lg text-sm text-left transition-colors ${
                r.key === activeKey
                  ? 'bg-neutral font-semibold text-black-light'
                  : 'text-secondary-dark hover:bg-neutral hover:text-black-light'
              }`}
            >
              {r.label}
              {r.key === activeKey && <Check className="w-4 h-4 text-primary-light shrink-0" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * @param {{start:string,end:string,is_current:boolean,has_prev:boolean,has_next:boolean}|null} week
 */
export default function WeekNavigator({ week, isWeek, rangeKey, onSelectRange, onStepWeek, loading = false }) {
  const arrowClass =
    'inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-xl border border-neutral-dark bg-white text-secondary-dark ' +
    'hover:bg-neutral hover:text-black-light transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light/20 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white';

  const activeRange = PROGRESS_RANGES.find((r) => r.key === rangeKey);

  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2 min-w-0">
        {isWeek && (
          <button
            type="button"
            className={arrowClass}
            onClick={() => onStepWeek(-1)}
            disabled={loading || !week?.has_prev}
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
        )}

        <div className="min-w-0">
          {loading ? (
            <span className="block h-5 w-32 rounded bg-neutral-dark animate-pulse" aria-hidden="true" />
          ) : (
            <p className="text-sm md:text-base font-bold font-montserrat text-black-light truncate">
              {isWeek ? formatWeekRange(week?.start, week?.end) : activeRange?.label}
            </p>
          )}
          <p className="text-xs text-secondary-dark truncate">
            {isWeek
              ? (week?.is_current ? 'This week so far' : 'Completed week')
              : 'Totals across the whole window'}
          </p>
        </div>

        {isWeek && (
          <button
            type="button"
            className={arrowClass}
            onClick={() => onStepWeek(1)}
            disabled={loading || !week?.has_next}
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <RangeDropdown activeKey={rangeKey} onSelect={onSelectRange} />
    </div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

import DeltaChip from './DeltaChip';
import Sparkline from './Sparkline';
import { useCountUp } from '../hooks/useCountUp';
import { pctChange } from '../utils/format';
import { RISE } from '../animations';

// One stat tile: a number, what it counts, an optional chip, and a 7-day
// sparkline. Replaces the old HeroTile, which could only show a week figure
// and had no room to say what its denominator was.

const ACCENT = {
  blue:    { bar: 'bg-blue-400/40',        chip: 'bg-blue-50 text-blue-500' },
  teal:    { bar: 'bg-accent-teal/40',     chip: 'bg-accent-teal/10 text-accent-teal' },
  emerald: { bar: 'bg-emerald-400/40',     chip: 'bg-emerald-50 text-emerald-600' },
  orange:  { bar: 'bg-primary-light/40',   chip: 'bg-primary-light/10 text-primary-dark' },
};

function CountUp({ value, decimals = 0 }) {
  const shown = useCountUp(value, { decimals });
  return <>{shown}</>;
}

/**
 * @param {number|null} value    null renders the `empty` message instead
 * @param {string|null} empty    why there is no number yet
 * @param {{now:number, before:number}|null} delta  rendered only when a
 *        previous period exists AND it had data — a percentage against zero
 *        is not a comparison.
 * @param {{count:number, period:string}|null} chip  "+3 this week"
 */
export default function KpiCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  decimals = 0,
  helper,
  empty = null,
  delta = null,
  chip = null,
  accent = 'blue',
  hero = false,
  celebrate = false,
  spark = [],
  sparkLabel,
  sparkLoading = false,
}) {
  const tone = ACCENT[accent] ?? ACCENT.blue;
  const deltaPct = delta && delta.before > 0 ? pctChange(delta.now, delta.before) : null;

  return (
    <motion.div
      variants={RISE}
      whileHover={{ y: -4, transition: { duration: 0.25, ease: 'easeOut' } }}
      className={`relative overflow-hidden bg-white rounded-2xl border shadow-sm p-4 md:p-5 transition-shadow duration-300 hover:shadow-md ${
        celebrate
          ? 'border-emerald-200 shadow-emerald-100'
          : hero
            ? 'border-primary-light/40 shadow-primary-light/10'
            : 'border-neutral-dark'
      }`}
    >
      <span className={`absolute inset-x-0 top-0 h-1 ${celebrate ? 'bg-emerald-400/60' : tone.bar}`} aria-hidden="true" />
      {hero && !celebrate && (
        <span aria-hidden="true" className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-primary-light/10 blur-2xl" />
      )}
      {/* Somebody replied in this period. A soft green wash and one sparkle —
          no confetti library, and nothing that keeps moving after it lands.
          motion-reduce disables the entrance for anyone who asked for that. */}
      {celebrate && (
        <motion.span
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl motion-reduce:transition-none"
        />
      )}

      <div className="flex items-start justify-between gap-2">
        {Icon && (
          <motion.span
            initial={celebrate ? { scale: 0.85, rotate: -8 } : false}
            animate={celebrate ? { scale: 1, rotate: 0 } : false}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            className={`relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              celebrate ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200' : tone.chip
            }`}
          >
            <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
            {celebrate && (
              <Sparkles
                className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-amber-400 motion-safe:animate-pulse"
                aria-hidden="true"
              />
            )}
          </motion.span>
        )}
        {deltaPct != null && <DeltaChip delta={deltaPct} />}
      </div>

      {empty ? (
        <p className="text-sm font-semibold text-secondary-dark mt-4 leading-snug">
          {empty}
        </p>
      ) : (
        <p className="text-3xl md:text-4xl font-bold text-black font-montserrat mt-3 leading-none tracking-tight tabular-nums">
          <CountUp value={value ?? 0} decimals={decimals} />{suffix}
        </p>
      )}

      <p className="text-sm font-medium text-black-light mt-2">{label}</p>
      <p className="text-xs text-secondary-dark mt-0.5 leading-snug">{helper}</p>

      {chip && (
        <p className="mt-2">
          {chip.count > 0 ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 tabular-nums">
              +{chip.count} {chip.period}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral text-secondary-dark border border-neutral-dark">
              none {chip.period}
            </span>
          )}
        </p>
      )}

      <Sparkline data={spark} label={sparkLabel} accent={accent} loading={sparkLoading} />
    </motion.div>
  );
}

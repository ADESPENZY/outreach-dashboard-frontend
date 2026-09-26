import React from 'react';
import { motion } from 'framer-motion';
import { Flame, ArrowUp, ArrowDown, CalendarCheck } from 'lucide-react';
import { pctChange } from '../utils/format';
import { RISE } from '../animations';

// Moved unchanged from the original single-file ProgressPage.

function StreakDots({ days }) {
  if (!days?.length) return null;
  return (
    <div className="flex items-center justify-between gap-1.5">
      {days.map((d, i) => {
        const isToday = i === days.length - 1;
        return (
          <div key={d.date} className="flex flex-col items-center gap-1.5 flex-1">
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25 + i * 0.06, type: 'spring', stiffness: 300, damping: 18 }}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                d.active
                  ? 'bg-gradient-to-br from-amber-400 to-primary-light text-white shadow-sm shadow-amber-200'
                  : isToday
                    ? 'bg-white border-2 border-dashed border-neutral-dark text-secondary-dark/40'
                    : 'bg-neutral text-secondary-dark/30'
              }`}
            >
              {d.active
                ? <Flame className="w-4 h-4" aria-hidden="true" />
                : <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />}
            </motion.span>
            <span className={`text-[10px] font-semibold uppercase ${isToday ? 'text-black-light' : 'text-secondary-dark/60'}`}>
              {isToday ? 'Now' : d.weekday}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function WeekRow({ label, thisVal, lastVal }) {
  const delta = pctChange(thisVal, lastVal);
  const up = delta != null && delta > 0;
  const down = delta != null && delta < 0;
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-secondary-dark">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-sm font-semibold text-black-light tabular-nums">
          {lastVal} <span className="text-secondary-dark/50 font-normal">→</span> {thisVal}
        </span>
        {(up || down) && (
          <span className={`flex items-center gap-0.5 text-xs font-bold tabular-nums ${up ? 'text-emerald-600' : 'text-red-500'}`}>
            {up ? <ArrowUp className="w-3 h-3" aria-hidden="true" /> : <ArrowDown className="w-3 h-3" aria-hidden="true" />}
            {Math.abs(delta)}%
          </span>
        )}
      </span>
    </div>
  );
}

// `weeksLabel` is a prop because the week is navigable now: at week_offset -3
// this block compares that week to the one before it, and a hardcoded "This
// week vs last week" would be describing a different pair than it is showing.
export default function StreakMomentum({
  streak, weeks, community, weeksLabel = 'This week vs last week',
}) {
  const showTopPct = community.active_users >= 10 && community.top_pct != null && community.top_pct <= 50;
  return (
    <motion.section variants={RISE} className="relative overflow-hidden bg-white rounded-2xl border border-neutral-dark shadow-sm">
      {/* warm ember glow behind the streak */}
      <span aria-hidden="true" className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl" />

      <div className="px-4 md:px-6 py-5 space-y-5">
        {/* Streak headline */}
        <div className="flex items-center gap-3">
          <span className="relative w-12 h-12 shrink-0">
            {streak.days > 0 && streak.active_today && (
              <span className="absolute inset-0 rounded-2xl bg-amber-400/30 animate-ping" aria-hidden="true" />
            )}
            <span className={`relative w-12 h-12 rounded-2xl flex items-center justify-center ${
              streak.days > 0
                ? 'bg-gradient-to-br from-amber-400 to-primary-light text-white shadow-lg shadow-amber-200'
                : 'bg-neutral text-secondary-dark'
            }`}>
              <Flame className="w-6 h-6" aria-hidden="true" />
            </span>
          </span>
          <div className="min-w-0">
            {streak.days > 0 ? (
              <>
                <p className="text-xl font-bold text-black font-montserrat leading-tight">
                  {streak.days} day streak
                </p>
                <p className="text-xs text-secondary-dark mt-0.5">
                  {streak.active_today
                    ? "You've been active every day — keep it going."
                    : 'Do one thing today to keep it alive.'}
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-black font-montserrat leading-tight">Start a streak today</p>
                <p className="text-xs text-secondary-dark mt-0.5">Review an opportunity or approve an introduction.</p>
              </>
            )}
          </div>
        </div>

        {/* Last 7 days */}
        <StreakDots days={streak.recent_days} />

        {/* Week over week */}
        <div className="rounded-xl bg-neutral/60 border border-neutral-dark px-4 py-3">
          <p className="text-[10px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/60 mb-1">
            {weeksLabel}
          </p>
          {weeks.has_last ? (
            <div className="divide-y divide-neutral-dark">
              <WeekRow label="New intros" thisVal={weeks.this.sent_new}       lastVal={weeks.last.sent_new} />
              <WeekRow label="Follow-ups" thisVal={weeks.this.sent_followups} lastVal={weeks.last.sent_followups} />
              <WeekRow label="Delivered"  thisVal={weeks.this.delivered}      lastVal={weeks.last.delivered} />
              <WeekRow label="Replied"    thisVal={weeks.this.replied}        lastVal={weeks.last.replied} />
            </div>
          ) : (
            <p className="text-sm text-secondary-dark py-1.5">Your first week — let's set the baseline!</p>
          )}
        </div>

        {/* Social proof — honest versions only */}
        {(showTopPct || community.sent_week > 0) && (
          <div className="flex items-start gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            </span>
            <p className="text-sm text-secondary-dark leading-relaxed">
              {showTopPct ? (
                <>You're in the <strong className="font-semibold text-black-light">top {community.top_pct}%</strong> of ApplyDir users this week. Keep going.</>
              ) : (
                <>You've sent <strong className="font-semibold text-black-light">{community.sent_week} introduction{community.sent_week === 1 ? '' : 's'}</strong> this week — most job seekers never send a single cold introduction.</>
              )}
            </p>
          </div>
        )}
      </div>
    </motion.section>
  );
}

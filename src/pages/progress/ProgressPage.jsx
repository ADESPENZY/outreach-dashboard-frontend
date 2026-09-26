import React, { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Send, Building2, PartyPopper, TrendingUp, Flame, AlertCircle } from 'lucide-react';

import { useProgress } from './hooks/useProgress';

import WeekNavigator from './components/WeekNavigator';
import KpiCard from './components/KpiCard';
import ActivityTimeline from './components/ActivityTimeline';
import RecentIntroductions from './components/RecentIntroductions';
import StreakMomentum from './components/StreakMomentum';
import StrategyPerformance from './components/StrategyPerformance';
import EmptyProgress from './components/EmptyProgress';
import { KpiRowSkeleton, PanelSkeleton, ChartPanelSkeleton } from './components/ProgressSkeleton';

import { STAGGER } from './animations';

// The three ECharts panels are split out of this route's chunk on purpose.
// ECharts is ~575 kB raw even registered module-by-module, which is an order
// of magnitude more than the rest of the page; bundling it here would hold the
// numbers, the pipeline and the activity feed behind a chart library on a
// phone connection. Lazily they share one chunk that streams in behind a
// skeleton, and the text content paints immediately.
const OutreachAreaChart  = lazy(() => import('./components/OutreachAreaChart'));
const OutcomesDonut      = lazy(() => import('./components/OutcomesDonut'));
const PipelineFunnelBars = lazy(() => import('./components/PipelineFunnelBars'));

// ── Progress — the fitness tracker for your job search ─────────────────────
// One page that answers "is this working?": the selected period's numbers, the
// company pipeline, a human-readable activity feed, the strategy A/B readout,
// and streak + momentum.
//
// Composition only. Panels live in ./components, every derived number in
// ./hooks/useProgress, shared helpers in ./hooks and ./utils.

const KPI_ICONS = {
  introductions: Send,
  reached:       Building2,
  replies:       PartyPopper,
  reply_rate:    TrendingUp,
};

export default function ProgressPage() {
  const {
    week, isWeek, rangeKey, selectRange, stepWeek,
    kpis, progress, strategies, hasStrategyData, weeksLabel, seriesDays, periodLabel,
    isLoading, isKpiLoading, isError, refetch, isSparkLoading,
  } = useProgress();

  const streakDays = progress?.streak?.days ?? 0;
  const isEmpty = !isLoading && !isError && progress?.hero?.sent_all === 0;

  return (
    <div className="relative isolate p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-6 animate-fade-in font-roboto">

      {/* Ambient depth — faint warm glows, same device as Opportunities */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-28 right-0 -z-10 h-72 w-72 rounded-full bg-primary-light/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute top-[36rem] -left-24 -z-10 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold font-montserrat text-black-light">
            Your Progress
          </h1>
          <p className="text-sm text-secondary-dark mt-1">
            Is it working? Here's your outreach story — introductions, replies, interviews.
          </p>
        </div>
        {streakDays > 0 && (
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold ring-1 ring-inset ring-amber-600/20 whitespace-nowrap"
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            {streakDays} day streak
          </motion.span>
        )}
      </div>

      {isError ? (
        <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm px-6 py-16 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-secondary-dark/60" aria-hidden="true" />
          <p className="text-sm text-secondary-dark mb-4">Couldn't load your progress.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="min-h-[44px] bg-neutral hover:bg-neutral-dark text-black-light text-sm font-semibold rounded-xl px-5 transition-all"
          >
            Try again
          </button>
        </div>
      ) : isEmpty ? (
        <EmptyProgress />
      ) : (
        <>
          {/* ── Range control ───────────────────────────────────────── */}
          <WeekNavigator
            week={week}
            isWeek={isWeek}
            rangeKey={rangeKey}
            onSelectRange={selectRange}
            onStepWeek={stepWeek}
            loading={isLoading}
          />

          {/* ── KPIs ────────────────────────────────────────────────── */}
          {isKpiLoading ? (
            <KpiRowSkeleton />
          ) : (
            <motion.section
              aria-label="Outreach at a glance"
              variants={STAGGER}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5"
            >
              {/* `key` is pulled OUT of the spread: each kpi carries its own
                  key field, and spreading that into JSX makes React warn and
                  take the key from the object rather than the attribute. */}
              {kpis.map(({ key, ...kpi }) => (
                <KpiCard key={key} icon={KPI_ICONS[key]} sparkLoading={isSparkLoading} {...kpi} />
              ))}
            </motion.section>
          )}

          {/* ── Panels ──────────────────────────────────────────────── */}
          <motion.div
            variants={STAGGER}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
          >
            {/* Main column — the story */}
            <div className="lg:col-span-2 space-y-6 min-w-0">
              <Suspense fallback={<ChartPanelSkeleton height={220} />}>
                <OutreachAreaChart
                  days={seriesDays}
                  rangeLabel={periodLabel}
                  loading={isSparkLoading}
                />
              </Suspense>

              {isLoading ? (
                <PanelSkeleton rows={4} />
              ) : (
                <Suspense fallback={<ChartPanelSkeleton height={176} />}>
                  <PipelineFunnelBars stages={progress.stages} />
                </Suspense>
              )}
              {/* Owns its own query and its own skeleton, so the roster does
                  not wait on /progress/ and vice versa. */}
              <RecentIntroductions />

              {isLoading ? <PanelSkeleton rows={4} /> : <ActivityTimeline initial={progress.timeline} />}
            </div>

            {/* Rail — momentum & learning */}
            <div className="space-y-6 min-w-0">
              <Suspense fallback={<ChartPanelSkeleton height={140} lines={2} />}>
                <OutcomesDonut
                  reached={progress?.hero?.reached_all ?? 0}
                  replied={progress?.hero?.replied_all ?? 0}
                  loading={isLoading}
                />
              </Suspense>
              {isLoading ? (
                <PanelSkeleton rows={3} />
              ) : (
                <StreakMomentum
                  streak={progress.streak}
                  weeks={progress.weeks}
                  community={progress.community}
                  weeksLabel={weeksLabel}
                />
              )}
              {hasStrategyData && <StrategyPerformance strategies={strategies} />}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

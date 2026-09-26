import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getProgress, getProgressSeries } from '../../../services/apiProgress';
import { getAnalytics } from '../../../services/apiAnalytics';

// ── The range picker ────────────────────────────────────────────────────────
// Two shapes of range, and they read from different places:
//
//   mode 'week'   — /progress/?week_offset=N. The server owns what a week IS
//                   (Monday 00:00 in the user's timezone), so the arrows just
//                   move an integer and never do date arithmetic.
//   mode 'series' — /progress/series/ range_totals. There is no "last 30 days"
//                   on /progress/, and inventing one in the browser would
//                   disagree with the server's day boundaries.
export const PROGRESS_RANGES = [
  { key: 'this_week', label: 'This week',    mode: 'week',   weekOffset: 0 },
  { key: 'last_week', label: 'Last week',    mode: 'week',   weekOffset: -1 },
  { key: 'last_30',   label: 'Last 30 days', mode: 'series', spanDays: 30 },
  { key: 'all_time',  label: 'All time',     mode: 'series', spanDays: 366 },
];

const SPARK_DAYS = 7;

/** YYYY-MM-DD, `back` days before today (browser-local). */
function isoDaysAgo(back) {
  const d = new Date();
  d.setDate(d.getDate() - back);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Which window to ask the series endpoint for.
 *
 * `end` is deliberately never sent: the server resolves it to today in the
 * USER's timezone, which is the edge that matters and the one the browser can
 * get wrong. `start` is only sent when 30 days is not enough, and its
 * browser-local rounding only ever moves the far edge of a 12-month window.
 */
function seriesParamsFor(range) {
  if (range.mode === 'series' && range.spanDays > 30) {
    return { start: isoDaysAgo(range.spanDays - 1) };
  }
  return {};
}

export function useProgress() {
  // `key` is only a hint for which dropdown row to tick — the week arrows move
  // weekOffset on their own, and the DISPLAYED label comes from the server's
  // week block, never from this state. That way the label cannot drift from
  // the data the way a locally-formatted date would.
  const [range, setRange] = useState(PROGRESS_RANGES[0]);
  const [weekOffset, setWeekOffset] = useState(0);

  const isWeek = range.mode === 'week';

  const selectRange = useCallback((key) => {
    const next = PROGRESS_RANGES.find((r) => r.key === key) ?? PROGRESS_RANGES[0];
    setRange(next);
    if (next.mode === 'week') setWeekOffset(next.weekOffset);
  }, []);

  const stepWeek = useCallback((delta) => {
    setRange((current) => (current.mode === 'week' ? current : PROGRESS_RANGES[0]));
    setWeekOffset((current) => current + delta);
  }, []);

  // One id for the whole selection. It goes into every range-dependent query
  // key, so changing the range refetches those panels rather than showing last
  // range's numbers under this range's label.
  const rangeId = isWeek ? `week:${weekOffset}` : `series:${range.key}`;
  const seriesParams = useMemo(() => seriesParamsFor(range), [range]);

  // Which dropdown row to tick, derived from where we ACTUALLY are rather than
  // from what was last picked: stepping back twice from "This week" is no
  // longer this week, and the menu must not still claim it is. Null means the
  // arrows have walked past the named rows.
  const rangeKey = useMemo(() => {
    if (!isWeek) return range.key;
    if (weekOffset === 0) return 'this_week';
    if (weekOffset === -1) return 'last_week';
    return null;
  }, [isWeek, range, weekOffset]);

  const progressQuery = useQuery({
    queryKey: ['progress', rangeId],
    queryFn: () => getProgress(isWeek ? weekOffset : 0),
  });

  const seriesQuery = useQuery({
    queryKey: ['progress-series', rangeId, seriesParams.start ?? 'default'],
    queryFn: () => getProgressSeries(seriesParams),
  });

  // Strategy performance is all-time and does NOT vary with the range, so its
  // key stays range-free: adding rangeId would refetch identical rows on every
  // range change and split the cache this shares with Opportunities.
  const analyticsQuery = useQuery({
    queryKey: ['analytics', 30],
    queryFn: () => getAnalytics(30),
  });

  const data = progressQuery.data;
  const series = seriesQuery.data;

  const week = data?.week ?? null;
  const spark = useMemo(() => (series?.days ?? []).slice(-SPARK_DAYS), [series]);

  /** What the selected range calls its own span, for helper copy under a number. */
  const periodLabel = useMemo(() => {
    if (!isWeek) {
      // "All time" asks for 366 days because that is the server's ceiling, so
      // the copy says twelve months rather than claiming all of history.
      return range.spanDays > 30 ? 'in the last 12 months' : 'in the last 30 days';
    }
    if (week?.is_current) return 'this week';
    return weekOffset === -1 ? 'last week' : 'that week';
  }, [isWeek, range, week, weekOffset]);

  /**
   * The four KPI tiles. Only the first is period-scoped; the rest are all-time
   * totals with the period shown as a chip, which is what stops the hero and
   * the pipeline disagreeing about what "replied" counts.
   */
  const kpis = useMemo(() => {
    if (!data) return [];

    const hero = data.hero;
    const rate = hero.reply_rate ?? { numerator: 0, denominator: 0, pct: 0 };
    const totals = series?.range_totals;

    // Period figures come from whichever endpoint owns this range.
    const introductions = isWeek ? hero.sent_new_period : totals?.sent_new;
    const replies = isWeek ? hero.replied_period : totals?.replied_received;

    // A delta needs a previous period to compare against. Week mode has one
    // (`weeks.last`); a 30-day or 12-month window has none, so no chip.
    const previous = isWeek && data.weeks?.has_last ? data.weeks.last : null;

    const sparkNew = spark.map((d) => d.sent_new);
    const sparkReplies = spark.map((d) => d.replied_received);

    return [
      {
        key: 'introductions',
        label: 'Introductions sent',
        value: introductions,
        helper: periodLabel,
        delta: previous ? { now: introductions, before: previous.sent_new } : null,
        accent: 'blue',
        spark: sparkNew,
        sparkLabel: 'Introductions sent per day, last 7 days',
      },
      {
        key: 'reached',
        label: 'Companies reached',
        value: hero.reached_all,
        helper: 'all time',
        accent: 'teal',
        spark: sparkNew,
        sparkLabel: 'Introductions sent per day, last 7 days',
      },
      {
        key: 'replies',
        label: 'Replies',
        value: hero.replied_all,
        helper: 'companies, all time',
        // No period chip on an all-time range: "+N in the last 12 months"
        // next to the same number it is a subset of says nothing.
        chip: isWeek || range.spanDays <= 30
          ? { count: replies, period: periodLabel }
          : null,
        accent: 'emerald',
        hero: true,
        spark: sparkReplies,
        sparkLabel: 'Replies received per day, last 7 days',
      },
      {
        key: 'reply_rate',
        label: 'Reply rate',
        value: rate.denominator > 0 ? rate.pct : null,
        suffix: '%',
        decimals: 1,
        // The number means nothing until somebody has been reached, so the
        // card says that instead of rendering a confident 0%.
        empty: rate.denominator === 0 ? 'No companies reached yet' : null,
        helper: rate.denominator > 0
          ? `${rate.numerator} of ${rate.denominator} companies replied`
          : 'Your first introduction starts the count',
        accent: 'orange',
        spark: sparkReplies,
        sparkLabel: 'Replies received per day, last 7 days',
      },
    ];
  }, [data, series, spark, isWeek, range, periodLabel]);

  return {
    // selection
    range,
    rangeId,
    rangeKey,
    isWeek,
    week,
    selectRange,
    stepWeek,
    periodLabel,
    // What the week-over-week panel is actually comparing at this offset.
    weeksLabel: isWeek && !week?.is_current
      ? 'That week vs the one before'
      : 'This week vs last week',
    // data
    kpis,
    progress: data,
    // The full gap-filled day list for the selected range — the area chart
    // plots all of it, the sparklines take the last 7.
    seriesDays: series?.days ?? [],
    strategies: analyticsQuery.data?.strategy_performance,
    // per-panel loading, so the numbers are not held back by the sparklines
    isLoading: progressQuery.isLoading,
    // In a series range the KPI VALUES come from the series call, so the row
    // has to wait for it. Rendering `?? 0` in the meantime would show a
    // confident zero that then jumps to the real figure.
    isKpiLoading: progressQuery.isLoading || (!isWeek && seriesQuery.isLoading),
    isError: progressQuery.isError,
    refetch: progressQuery.refetch,
    isSparkLoading: seriesQuery.isLoading,
  };
}

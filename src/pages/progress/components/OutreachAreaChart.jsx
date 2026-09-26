import React, { useMemo, useState } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { motion } from 'framer-motion';
import { LineChart } from 'lucide-react';

import {
  echarts, CHART_COLORS, CHART_INK, CHART_FONT,
  tooltipBase, DASHED_AXIS_POINTER, AXIS_LABEL, areaGradient,
} from '../utils/chartTheme';
import { useChartResize } from '../hooks/useChartResize';
import { RISE } from '../animations';

// "Outreach over time" — the shape of the work, next to the totals above it.
//
// TWO series, and follow-ups are deliberately NOT one of them. Stacking them
// under Sent would make the orange band's height mean sent_new + followups
// while the KPI card above it reads sent_new — the same colour standing for
// two different numbers on one screen. Follow-ups are automated re-touches of
// people already counted, so they belong in a breakdown, not in the headline
// trend. The tooltip still names the day's follow-ups as context.

const SERIES = [
  { key: 'sent_new',         name: 'Sent',    color: CHART_COLORS.sent },
  { key: 'replied_received', name: 'Replies', color: CHART_COLORS.replied },
];

/** "21 Sep" from a YYYY-MM-DD the server already resolved in the user's zone. */
function axisLabelFor(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function LegendChips({ hidden, onToggle }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {SERIES.map((s) => {
        const off = hidden[s.key];
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onToggle(s.key)}
            aria-pressed={!off}
            className={`inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light/20 ${
              off
                ? 'border-neutral-dark bg-neutral text-secondary-dark'
                : 'border-neutral-dark bg-white text-black-light hover:bg-neutral'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: off ? CHART_INK.border : s.color }}
              aria-hidden="true"
            />
            {s.name}
            <span className="sr-only">{off ? '(hidden)' : '(shown)'}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-[220px] md:h-[280px] flex items-end gap-1.5 px-2 pb-6 animate-pulse" aria-hidden="true">
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-neutral-dark"
          style={{ height: `${25 + ((i * 37) % 55)}%` }}
        />
      ))}
    </div>
  );
}

/**
 * @param {{date:string, sent_new:number, sent_followups:number, replied_received:number}[]} days
 * @param {string} rangeLabel  what window these days cover, for the empty copy
 */
export default function OutreachAreaChart({ days = [], rangeLabel = 'this range', loading = false }) {
  const [hidden, setHidden] = useState({});
  const { wrapperRef, onChartReady } = useChartResize();

  const toggle = (key) => setHidden((h) => ({ ...h, [key]: !h[key] }));

  const hasAnySend = useMemo(
    () => days.some((d) => d.sent_new > 0 || d.sent_followups > 0 || d.replied_received > 0),
    [days],
  );

  const option = useMemo(() => {
    const dates = days.map((d) => axisLabelFor(d.date));
    const followups = days.map((d) => d.sent_followups);

    return {
      // Chart text has to match the surrounding card, and ECharts does not
      // inherit CSS font-family into the canvas.
      textStyle: { fontFamily: CHART_FONT },
      animationDuration: 600,
      animationEasing: 'cubicOut',
      grid: { left: 2, right: 10, top: 16, bottom: 2, containLabel: true },
      tooltip: tooltipBase({
        trigger: 'axis',
        axisPointer: DASHED_AXIS_POINTER,
        formatter: (params) => {
          if (!params?.length) return '';
          const idx = params[0].dataIndex;
          const rows = params
            .map(
              (p) =>
                `<div style="display:flex;align-items:center;gap:8px;margin-top:4px">
                   <span style="width:8px;height:8px;border-radius:9999px;background:${p.color};display:inline-block"></span>
                   <span style="color:${CHART_INK.muted}">${p.seriesName}</span>
                   <strong style="margin-left:auto;color:${CHART_INK.text}">${p.value}</strong>
                 </div>`,
            )
            .join('');
          // Follow-ups are not plotted, but naming them here explains a day
          // where nothing new went out yet the inbox was still busy.
          const extra = followups[idx] > 0
            ? `<div style="display:flex;align-items:center;gap:8px;margin-top:6px;padding-top:6px;border-top:1px solid ${CHART_INK.border}">
                 <span style="color:${CHART_INK.muted}">Follow-ups</span>
                 <strong style="margin-left:auto;color:${CHART_INK.muted}">${followups[idx]}</strong>
               </div>`
            : '';
          return `<div style="font-weight:700;color:${CHART_INK.text}">${params[0].axisValue}</div>${rows}${extra}`;
        },
      }),
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLabel: {
          ...AXIS_LABEL,
          hideOverlap: true,
          // A 366-day range cannot show 366 ticks; let ECharts thin them.
          margin: 12,
        },
        axisLine: { lineStyle: { color: CHART_INK.border } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        // Counts are whole people — never draw a 0.5 gridline.
        minInterval: 1,
        axisLabel: AXIS_LABEL,
        splitLine: { lineStyle: { color: CHART_INK.border, type: 'dashed' } },
      },
      series: SERIES.filter((s) => !hidden[s.key]).map((s) => ({
        name: s.name,
        type: 'line',
        smooth: true,
        // Without this, the spline overshoots between a peak and a run of zero
        // days and dips BELOW the axis — drawing negative introductions on a
        // day nothing was sent. Monotone interpolation cannot overshoot.
        smoothMonotone: 'x',
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        emphasis: { focus: 'series', itemStyle: { borderColor: CHART_INK.white, borderWidth: 2 } },
        lineStyle: { width: 2.5, color: s.color },
        itemStyle: { color: s.color },
        areaStyle: { color: areaGradient(s.color), origin: 'start' },
        data: days.map((d) => d[s.key]),
      })),
    };
  }, [days, hidden]);

  return (
    <motion.section variants={RISE} className="bg-white rounded-2xl border border-neutral-dark shadow-sm transition-shadow duration-300 hover:shadow-md">
      <div className="px-4 md:px-6 py-5 border-b border-neutral-dark flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-black-light font-montserrat">Outreach over time</h2>
          <p className="text-xs text-secondary-dark mt-0.5">
            Introductions going out, replies coming back. Follow-ups are in the tooltip, not the lines.
          </p>
        </div>
        <LegendChips hidden={hidden} onToggle={toggle} />
      </div>

      <div className="px-2 md:px-4 py-4">
        {loading ? (
          <ChartSkeleton />
        ) : !hasAnySend ? (
          <div className="h-[220px] md:h-[280px] flex flex-col items-center justify-center text-center px-6">
            <span className="w-12 h-12 rounded-2xl bg-neutral flex items-center justify-center mb-3">
              <LineChart className="w-5 h-5 text-secondary-dark" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-black-light">Nothing went out {rangeLabel}</p>
            <p className="text-xs text-secondary-dark mt-1 max-w-xs leading-relaxed">
              This chart fills in as introductions send. Try a wider range, or approve one from Opportunities.
            </p>
          </div>
        ) : (
          <div ref={wrapperRef} className="h-[220px] md:h-[280px] w-full">
            <ReactEChartsCore
              echarts={echarts}
              option={option}
              onChartReady={onChartReady}
              // notMerge: a range change replaces the series outright rather
              // than merging last range's points into this one.
              // lazyUpdate: batch the redraw into the next frame, so toggling
              // a legend chip does not force a synchronous re-render.
              notMerge
              lazyUpdate
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
        )}
      </div>
    </motion.section>
  );
}


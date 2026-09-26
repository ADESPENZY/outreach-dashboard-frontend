import React, { useMemo } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { motion } from 'framer-motion';

import {
  echarts, CHART_COLORS, CHART_INK, CHART_FONT, tooltipBase,
} from '../utils/chartTheme';
import { useChartResize } from '../hooks/useChartResize';
import { RISE } from '../animations';

// "Where your introductions stand" — of the companies actually reached, how
// many have answered.
//
// Every slice is a COMPANY counted once, the same unit the KPI cards and the
// pipeline use. That is the whole point of the chart: one denominator, no
// mixing of emails and companies in a single ring.

// A 4-of-239 slice is 6 degrees — a hairline nobody can see or tap. minAngle
// floors the ANGLE only; the legend and tooltip always print the true count,
// so a floored slice is never a misread number.
const MIN_SLICE_ANGLE = 8;

function Legend({ slices, total }) {
  return (
    <ul className="space-y-1.5 min-w-0">
      {slices.map((s) => {
        const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
        return (
          <li key={s.name} className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: s.color }}
              aria-hidden="true"
            />
            <span className="text-sm text-secondary-dark truncate min-w-0">{s.name}</span>
            <span className="ml-auto shrink-0 text-sm font-bold text-black-light font-montserrat tabular-nums">
              {s.value}
              <span className="ml-1.5 font-normal text-xs text-secondary-dark">{pct}%</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * @param {number} reached   distinct companies emailed, all time
 * @param {number} replied   distinct companies that replied, all time
 * @param {number|null} bounced  distinct companies whose mail bounced. NULL
 *        when the API cannot supply it — the slice is then omitted rather than
 *        filled with a per-EMAIL bounce count, which has a different
 *        denominator and would make every percentage in the ring wrong.
 */
export default function OutcomesDonut({ reached = 0, replied = 0, bounced = null, loading = false }) {
  const { wrapperRef, onChartReady } = useChartResize();

  const slices = useMemo(() => {
    const awaiting = Math.max(reached - replied, 0);
    const out = [
      { name: 'Awaiting reply', value: awaiting, color: CHART_COLORS.awaiting },
      { name: 'Replied',        value: replied,  color: CHART_COLORS.replied },
    ];
    if (bounced != null) {
      out.push({ name: 'Bounced', value: bounced, color: CHART_COLORS.bounced });
    }
    return out;
  }, [reached, replied, bounced]);

  const total = slices.reduce((n, s) => n + s.value, 0);

  const option = useMemo(() => ({
    textStyle: { fontFamily: CHART_FONT },
    animationDuration: 600,
    tooltip: tooltipBase({
      trigger: 'item',
      formatter: (p) => `<strong style="color:${CHART_INK.text}">${p.name}</strong><br/>${p.value} compan${p.value === 1 ? 'y' : 'ies'} (${p.percent}%)`,
    }),
    series: [{
      type: 'pie',
      radius: ['62%', '88%'],
      center: ['50%', '50%'],
      minAngle: MIN_SLICE_ANGLE,
      avoidLabelOverlap: false,
      padAngle: 2,
      itemStyle: { borderRadius: 6, borderColor: CHART_INK.white, borderWidth: 2 },
      label: { show: false },
      labelLine: { show: false },
      emphasis: { scale: true, scaleSize: 4 },
      data: slices.map((s) => ({ name: s.name, value: s.value, itemStyle: { color: s.color } })),
    }],
  }), [slices]);

  return (
    <motion.section variants={RISE} className="bg-white rounded-2xl border border-neutral-dark shadow-sm">
      <div className="px-4 md:px-6 py-5 border-b border-neutral-dark">
        <h2 className="text-base font-bold text-black-light font-montserrat">Where your introductions stand</h2>
        <p className="text-xs text-secondary-dark mt-0.5">
          Every company you've reached, counted once — all time.
        </p>
      </div>

      <div className="px-4 md:px-6 py-5">
        {loading ? (
          <div className="flex items-center gap-5 animate-pulse" aria-hidden="true">
            <div className="w-[128px] h-[128px] rounded-full border-[18px] border-neutral-dark shrink-0" />
            <div className="flex-1 space-y-3 min-w-0">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-3.5 rounded bg-neutral-dark" />
              ))}
            </div>
          </div>
        ) : total === 0 ? (
          <p className="text-sm text-secondary-dark py-6 text-center">
            No companies reached yet — this fills in with your first introduction.
          </p>
        ) : (
          <div className="flex items-center gap-4 md:gap-5">
            <div ref={wrapperRef} className="relative w-[128px] h-[128px] md:w-[140px] md:h-[140px] shrink-0">
              <ReactEChartsCore
                echarts={echarts}
                option={option}
                onChartReady={onChartReady}
                notMerge
                lazyUpdate
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
              {/* The centre number is HTML, not an ECharts label: it stays
                  selectable, scales with the page and is read by a screen
                  reader, none of which a canvas label does. */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl md:text-3xl font-bold text-black font-montserrat leading-none tabular-nums">
                  {replied}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary-dark/70 mt-1">
                  replied
                </span>
              </div>
            </div>

            <Legend slices={slices} total={total} />
          </div>
        )}

        {bounced == null && total > 0 && (
          <p className="text-xs text-secondary-dark/80 mt-4 pt-3 border-t border-neutral-dark leading-relaxed">
            Bounces aren't shown: the API reports them per email, not per company,
            and mixing the two would skew every share above.
          </p>
        )}
      </div>
    </motion.section>
  );
}

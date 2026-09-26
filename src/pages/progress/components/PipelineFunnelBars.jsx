import React, { useMemo, useState } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import { advanceStage } from '../../../services/apiProgress';
import StageItems from './StageItems';
import {
  echarts, CHART_COLORS, CHART_INK, CHART_FONT, tooltipBase,
} from '../utils/chartTheme';
import { useChartResize } from '../hooks/useChartResize';
import { RISE } from '../animations';

// The pipeline, as real bars instead of div widths. Everything the div version
// could do still works: tap a stage to see who is in it, and advance a company
// from that list.
//
// The canvas is the PICTURE. The stage buttons under it are the CONTROL — a
// canvas cannot be tabbed to, focused or read by a screen reader, so making
// the chart the only way to open a stage would have made the panel
// keyboard-inaccessible (DESIGN_GUIDE §8). Both paths set the same state.

const STAGE_COLORS = {
  reached_out: CHART_COLORS.reached,
  replied:     CHART_COLORS.replied,
  interview:   CHART_COLORS.interview,
  offer:       CHART_COLORS.offer,
};

// 4 replies against 239 reached is under two pixels of bar. barMinHeight sets
// a floor on the drawn LENGTH only — the value label beside every bar always
// prints the true count, so a floored bar can be seen but never misread.
const MIN_BAR_PX = 8;
const ROW_PX = 44;

export default function PipelineFunnelBars({ stages = [] }) {
  const [openStage, setOpenStage] = useState(null);
  const [advancingId, setAdvancingId] = useState(null);
  const queryClient = useQueryClient();
  const { wrapperRef, onChartReady } = useChartResize();

  const advance = useMutation({
    mutationFn: advanceStage,
    onSuccess: (_, vars) => {
      toast.success(vars.stage === 'interview' ? 'Moved to Interview 🎉' : 'Moved to Offer 🏆');
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => setAdvancingId(null),
  });

  const handleAdvance = (item, stage, id) => {
    setAdvancingId(id);
    advance.mutate({
      stage,
      trackerJobId: item.tracker_job_id,
      scrapedJobId: item.scraped_job_id,
    });
  };

  const toggleStage = (key) => setOpenStage((cur) => (cur === key ? null : key));

  // ECharts stacks a category axis bottom-up, so reverse to read top-down.
  const ordered = useMemo(() => [...stages].reverse(), [stages]);
  const open = stages.find((s) => s.key === openStage) ?? null;

  const option = useMemo(() => ({
    textStyle: { fontFamily: CHART_FONT },
    animationDuration: 700,
    animationEasing: 'cubicOut',
    grid: { left: 0, right: 28, top: 4, bottom: 4, containLabel: true },
    tooltip: tooltipBase({
      trigger: 'item',
      formatter: (p) =>
        `<strong style="color:${CHART_INK.text}">${p.name}</strong><br/>`
        + `${p.value} compan${p.value === 1 ? 'y' : 'ies'}`
        + `<br/><span style="color:${CHART_INK.muted}">Tap to see who</span>`,
    }),
    xAxis: { type: 'value', show: false, minInterval: 1 },
    yAxis: {
      type: 'category',
      data: ordered.map((s) => s.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: CHART_INK.text,
        fontFamily: CHART_FONT,
        fontSize: 13,
        fontWeight: 600,
        // Keeps the four labels from collapsing into "Reached o…" on a phone.
        width: 92,
        overflow: 'truncate',
      },
    },
    series: [{
      type: 'bar',
      barMinHeight: MIN_BAR_PX,
      barWidth: 18,
      itemStyle: { borderRadius: [0, 6, 6, 0] },
      cursor: 'pointer',
      label: {
        show: true,
        position: 'right',
        distance: 8,
        color: CHART_INK.text,
        fontFamily: CHART_FONT,
        fontSize: 13,
        fontWeight: 700,
      },
      emphasis: { itemStyle: { opacity: 0.85 } },
      data: ordered.map((s) => ({
        value: s.count,
        name: s.label,
        itemStyle: { color: STAGE_COLORS[s.key] ?? CHART_COLORS.reached },
      })),
    }],
  }), [ordered]);

  const onEvents = useMemo(() => ({
    click: (params) => {
      const stage = ordered[params.dataIndex];
      if (stage) toggleStage(stage.key);
    },
  }), [ordered]);

  return (
    <motion.section variants={RISE} className="bg-white rounded-2xl border border-neutral-dark shadow-sm overflow-hidden transition-shadow duration-300 hover:shadow-md">
      <div className="px-4 md:px-6 py-5 border-b border-neutral-dark">
        <h2 className="text-base font-bold text-black-light font-montserrat">Your pipeline</h2>
        <p className="text-xs text-secondary-dark mt-0.5">
          Every company, counted once at its furthest stage — tap a stage to see who's there.
        </p>
      </div>

      <div className="px-3 md:px-5 pt-4">
        <div
          ref={wrapperRef}
          className="w-full"
          style={{ height: `${Math.max(stages.length, 1) * ROW_PX}px` }}
        >
          <ReactEChartsCore
            echarts={echarts}
            option={option}
            onEvents={onEvents}
            onChartReady={onChartReady}
            notMerge
            lazyUpdate
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
      </div>

      {/* The accessible control surface for the same toggle. */}
      <div className="px-3 md:px-5 py-3 flex flex-wrap gap-2">
        {stages.map((stage) => {
          const isOpen = openStage === stage.key;
          return (
            <button
              key={stage.key}
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggleStage(stage.key)}
              className={`inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light/20 ${
                isOpen
                  ? 'border-primary-light/40 bg-primary-light/5 text-black-light'
                  : 'border-neutral-dark bg-white text-secondary-dark hover:bg-neutral hover:text-black-light'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: STAGE_COLORS[stage.key] }}
                aria-hidden="true"
              />
              <span className="truncate">{stage.label}</span>
              <span className="tabular-nums text-secondary-dark">{stage.count}</span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mx-3 md:mx-5 mb-4 px-3 md:px-4 rounded-xl bg-neutral/50 border border-neutral-dark">
              <StageItems stage={open} onAdvance={handleAdvance} advancingId={advancingId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

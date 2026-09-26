import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Modular registration, not `import ReactECharts from 'echarts-for-react'`.
// The full bundle pulls every chart type, every component and both renderers
// into this lazy route; registering the three chart types the page actually
// draws keeps the Progress chunk a fraction of that. The legends here are
// plain HTML buttons, so LegendComponent is deliberately NOT registered.
echarts.use([
  LineChart, BarChart, PieChart,
  GridComponent, TooltipComponent,
  CanvasRenderer,
]);

export { echarts };

// ── Tokens ─────────────────────────────────────────────────────────────────
// ECharts takes literal colors, so these are the hex values behind the
// DESIGN_GUIDE §1 classes. This file is the ONLY place a Progress chart is
// allowed to name a hex — nothing here may be inlined into a component.
export const CHART_COLORS = {
  sent:      '#FF5B2E',  // primary-light — introductions
  replied:   '#10B981',  // emerald-500   — replied / success
  bounced:   '#EF4444',  // red-500       — issue
  awaiting:  '#6B7280',  // secondary-dark — neutral, still open
  interview: '#FF5B2E',  // primary-light — matches the old stage dot
  offer:     '#F59E0B',  // amber-500     — warming / attention
  reached:   '#6B7280',  // secondary-dark
};

export const CHART_INK = {
  text:   '#1A1A1A',  // black-light
  muted:  '#6B7280',  // secondary-dark
  border: '#F3F4F6',  // neutral-dark
  white:  '#FFFFFF',
};

// `font-roboto` in this codebase resolves to Bricolage Grotesque — the Tailwind
// config repoints both font keys at one typeface app-wide (see its comment).
// Naming "Roboto" here would make these charts the only text in the app in a
// different face, and it is not loaded. This mirrors what font-roboto renders.
export const CHART_FONT = 'Bricolage Grotesque, system-ui, sans-serif';

// ── Shared option fragments ────────────────────────────────────────────────

/** White card tooltip. `triggerOn` includes click so it works on touch. */
export function tooltipBase(extra = {}) {
  return {
    backgroundColor: CHART_INK.white,
    borderColor: CHART_INK.border,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: CHART_INK.text, fontFamily: CHART_FONT, fontSize: 12 },
    extraCssText: 'box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1); border-radius: 12px;',
    // Hover on desktop, tap on touch — without the click trigger a phone user
    // can never see a value.
    triggerOn: 'mousemove|click',
    confine: true,
    ...extra,
  };
}

/** Dashed vertical guide that follows the cursor across an axis-trigger chart. */
export const DASHED_AXIS_POINTER = {
  type: 'line',
  lineStyle: { color: CHART_INK.muted, width: 1, type: 'dashed' },
};

export const AXIS_LABEL = {
  color: CHART_INK.muted,
  fontFamily: CHART_FONT,
  fontSize: 11,
};

/**
 * Vertical gradient from a solid-ish top to transparent — the area fill under
 * a line series.
 */
export function areaGradient(hex, topOpacity = 0.28) {
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: withAlpha(hex, topOpacity) },
    { offset: 1, color: withAlpha(hex, 0) },
  ]);
}

/** #RRGGBB + alpha → rgba(), so opacity never needs a second hardcoded color. */
export function withAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

import { useCallback, useEffect, useRef } from 'react';

/**
 * Keep an ECharts instance sized to its container.
 *
 * echarts-for-react only listens to WINDOW resize, which misses every resize
 * the window does not cause: the sidebar drawer opening, a panel expanding
 * under the chart, the lazy route mounting into a container that is still
 * being laid out. Those all leave the canvas at its first measured width,
 * which on a phone is often 0 and renders blank.
 *
 * Returns { wrapperRef, onChartReady } — spread onto the wrapper div and the
 * chart respectively.
 */
export function useChartResize() {
  const wrapperRef = useRef(null);
  const chartRef = useRef(null);

  const onChartReady = useCallback((instance) => {
    chartRef.current = instance;
    // First paint can land before the container has its final width.
    requestAnimationFrame(() => instance.resize());
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      // Coalesce: a drawer transition fires this on every animation frame, and
      // resizing a canvas is not free.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => chartRef.current?.resize());
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return { wrapperRef, onChartReady };
}

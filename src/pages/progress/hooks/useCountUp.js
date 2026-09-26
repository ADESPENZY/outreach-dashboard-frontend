import { useEffect, useState } from 'react';

// Moved unchanged from the original single-file ProgressPage.

/** Count from 0 to `target` with a cubic ease-out. Handles one decimal. */
export function useCountUp(target, { duration = 900, decimals = 0 } = {}) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return undefined; }
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Number((target * eased).toFixed(decimals)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, decimals]);
  return val;
}

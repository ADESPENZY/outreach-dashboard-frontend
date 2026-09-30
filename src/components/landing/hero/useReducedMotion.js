import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * True when the visitor has asked the OS to reduce motion.
 *
 * Read synchronously on the first render (not in an effect) so the hero can
 * decide whether to hide anything *before* the browser paints — a component
 * that starts at `false` and flips later would show one frame of motion to
 * exactly the people who asked not to see it.
 */
export default function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(QUERY);
    const onChange = (e) => setReduced(e.matches);
    // Safari < 14 only has the deprecated listener API.
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  return reduced;
}

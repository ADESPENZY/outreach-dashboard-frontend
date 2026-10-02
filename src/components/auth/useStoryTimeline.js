import { useEffect, useRef, useState } from 'react';
import { STORY_START_DELAY_MS } from './authMotion';

/**
 * Runs a story's `{ at, phase }` steps on a loop and returns the current phase.
 *
 * - First render returns the last step's phase: the finished frame paints
 *   first, and the loop only starts `startDelayMs` later.
 * - `enabled: false` (reduced motion) holds the finished frame and schedules
 *   nothing at all.
 * - Hidden tab: every timer is cleared. Back on the tab, the loop restarts
 *   from its beginning.
 * - Unmount clears every timer it ever set.
 */
export default function useStoryTimeline(
  { steps, loopMs },
  { enabled = true, startDelayMs = STORY_START_DELAY_MS } = {},
) {
  const finalPhase = steps[steps.length - 1].phase;
  const [phase, setPhase] = useState(finalPhase);

  // Steps are module constants in practice; a ref keeps the effect from
  // restarting the loop if a caller ever passes a fresh array.
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  useEffect(() => {
    if (!enabled) {
      setPhase(finalPhase);
      return undefined;
    }

    let timers = [];
    const clearAll = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers = timers.filter((t) => t !== id);
        fn();
      }, ms);
      timers.push(id);
    };

    const runLoop = () => {
      clearAll();
      stepsRef.current.forEach(({ at, phase: p }) => later(() => setPhase(p), at));
      later(runLoop, loopMs);
    };

    const onVisibility = () => {
      clearAll();
      if (document.visibilityState === 'visible') runLoop();
    };

    if (document.visibilityState === 'visible') later(runLoop, startDelayMs);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearAll();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, loopMs, startDelayMs, finalPhase]);

  return phase;
}

import { useEffect, useState } from 'react';

/*
 * useIsMobile — true below the app's md (768px) mobile↔desktop line.
 *
 * CSS gating (`md:hidden` / `hidden md:block`) can only hide or show what has
 * already been rendered; it cannot choose a navigate() target. Settings deep
 * links have to pick a DIFFERENT destination per breakpoint — the section route
 * on mobile, `?tab=` on desktop — so the decision has to happen in JS, at click
 * time. That is what this hook is for; it is not a substitute for CSS gating
 * anywhere else.
 *
 * Mirrors the useIsDesktop pattern in JobDetailDrawer.jsx: initialised
 * synchronously from matchMedia so the first render already has the right
 * answer, and kept live through a `change` listener so rotating a tablet or
 * resizing a desktop window updates the target.
 */
const MOBILE_QUERY = '(max-width: 767px)';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

export default useIsMobile;

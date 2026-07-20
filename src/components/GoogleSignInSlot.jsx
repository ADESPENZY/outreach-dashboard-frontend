import { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

/**
 * Wraps the GoogleLogin button and makes its failure VISIBLE.
 *
 * The button is an iframe injected by Google's GSI script. When an ad-blocker,
 * privacy shield, or flaky network blocks that script, @react-oauth/google
 * renders NOTHING — the sign-in option silently vanishes on that device.
 * This slot polls for the script and, if it never arrives, swaps in a clear
 * explanation + retry instead of an empty void.
 */
export default function GoogleSignInSlot({ children }) {
  const [state, setState] = useState(() =>
    window.google?.accounts?.id ? 'ready' : 'loading'
  );

  useEffect(() => {
    if (state !== 'loading') return undefined;
    let cancelled = false;
    const startedAt = Date.now();
    const tick = () => {
      if (cancelled) return;
      if (window.google?.accounts?.id) { setState('ready'); return; }
      if (Date.now() - startedAt > 6000) { setState('failed'); return; }
      setTimeout(tick, 250);
    };
    tick();
    return () => { cancelled = true; };
  }, [state]);

  if (state === 'failed') {
    return (
      <div className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-left">
        <p className="flex items-center gap-2 text-xs font-semibold text-amber-300">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          Google sign-in couldn&rsquo;t load on this device
        </p>
        <p className="text-[11px] text-amber-200/70 mt-1 leading-relaxed">
          An ad-blocker, privacy shield, or network filter is likely blocking Google&rsquo;s
          sign-in script. Sign in with your username below — or allow{' '}
          <span className="font-semibold">accounts.google.com</span> and retry.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 hover:text-amber-200 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center min-h-[44px]">
      {children}
    </div>
  );
}

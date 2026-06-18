import { useEffect, useState, useCallback } from 'react';
import { Rocket, RefreshCw, X } from 'lucide-react';

// Version the bundle was built with (injected by vite.config.js from
// public/version.json). Falls back to 'dev' when running unbuilt locally.
const BUILD_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const POLL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Graceful update prompt for the Vercel free tier (no Skew Protection).
 * Silently polls /version.json; when the deployed version differs from the
 * one this bundle was built with, it shows a non-blocking "Update available"
 * card so the user can refresh when they're ready — instead of the app
 * breaking on a missing chunk after a deploy.
 */
export default function VersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(async () => {
    try {
      // cache-busting query + no-store so we never read a stale cached file
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.version && data.version !== BUILD_VERSION) {
        setUpdateAvailable(true);
      }
    } catch {
      /* offline or transient network error — ignore, we'll try again next tick */
    }
  }, []);

  useEffect(() => {
    // Don't nag during local dev, where there's no deployed build to compare to.
    if (BUILD_VERSION === 'dev') return;

    const id = setInterval(check, POLL_MS);
    // Re-check the moment the user returns to the tab — catches updates fast
    // without waiting out the full interval.
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[300px] max-w-[calc(100vw-2rem)] animate-fade-in font-roboto">
      <div className="relative bg-white rounded-2xl border border-neutral-dark shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] p-4">
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="absolute top-2.5 right-2.5 p-1 rounded-lg text-secondary-dark/50 hover:text-black-light hover:bg-neutral transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center shadow-lg shadow-primary-light/25 shrink-0">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 pr-4">
            <p className="text-sm font-bold text-black font-montserrat">A new version is ready</p>
            <p className="text-xs text-secondary-dark mt-0.5">
              Refresh to get the latest update. Your work is saved.
            </p>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-light to-primary-dark text-white text-sm font-semibold rounded-xl shadow-sm hover:opacity-90 transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Refresh now
        </button>
      </div>
    </div>
  );
}

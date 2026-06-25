import React, { useEffect, useState } from 'react';

/**
 * ApplyDirLoader — the single, branded loading identity for ApplyDir.
 *
 * Until we have a logo, this animation IS our visual identity. There are three
 * variants, all built from the same signature element: an orange gradient
 * "shimmer" bar that sweeps left→right across a neutral track.
 *
 *   import { ApplyDirLoader } from '@/components/ui/ApplyDirLoader';
 *
 *   <ApplyDirLoader.Screen isLoading={loading} />   // full-page
 *   <ApplyDirLoader.Inline message="Finding opportunities..." />
 *   <ApplyDirLoader.Inline size="sm" />
 *   <ApplyDirLoader.Button variant="light" />       // on orange buttons
 *   <ApplyDirLoader.Button variant="dark" />        // on white/ghost buttons
 *
 * Design rules (DESIGN_GUIDE.md): brand palette only, Montserrat for the
 * wordmark + Roboto for supporting text, no opacity below 0.6 on readable text,
 * respects prefers-reduced-motion, works at 375px.
 */

/* ── The signature element ───────────────────────────────────────────────
 * A neutral-dark track with an orange gradient highlight sweeping across it.
 * `motion-reduce:` swaps the sweep for a static, centered gradient fill so
 * reduced-motion users still get the brand mark without movement.
 */
function ShimmerBar({ className = '' }) {
  return (
    <div
      className={`relative h-0.5 overflow-hidden rounded-full bg-neutral-dark ${className}`}
    >
      <div
        className="absolute inset-y-0 left-0 w-2/3 rounded-full bg-gradient-to-r from-primary-light to-primary-dark animate-shimmer motion-reduce:animate-none motion-reduce:left-1/2 motion-reduce:-translate-x-1/2"
      />
    </div>
  );
}

/* ── VARIANT 1: full-page screen ─────────────────────────────────────────── */
function Screen({ isLoading = true }) {
  // Keep the node mounted through the fade-out, then unmount.
  const [mounted, setMounted] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      setMounted(true);
      return undefined;
    }
    const t = setTimeout(() => setMounted(false), 300); // matches duration-300
    return () => clearTimeout(t);
  }, [isLoading]);

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading ApplyDir"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 transition-opacity duration-300 ${
        isLoading ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Wordmark */}
      <div className="font-montserrat text-2xl font-bold tracking-tight">
        <span className="bg-gradient-to-r from-primary-light to-primary-dark bg-clip-text text-transparent">
          Apply
        </span>
        <span className="text-black-light">Dir</span>
      </div>

      {/* Signature shimmer bar */}
      <ShimmerBar className="mt-4 w-32" />

      {/* Tagline — fades in after a short beat (held hidden until then) */}
      <p
        className="mt-4 font-roboto text-xs text-secondary-dark animate-fade-in motion-reduce:animate-none"
        style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
      >
        Your AI Headhunter
      </p>
    </div>
  );
}

/* ── VARIANT 2: inline / section loader ────────────────────────────────────
 * Fills whatever container it's placed in. `size` controls padding.
 */
function Inline({ message, size = 'md' }) {
  const pad = size === 'sm' ? 'py-4' : 'py-10';
  const barWidth = size === 'sm' ? 'w-16' : 'w-20';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message || 'Loading'}
      className={`flex w-full flex-col items-center justify-center ${pad} animate-fade-in motion-reduce:animate-none`}
    >
      <ShimmerBar className={barWidth} />
      {message ? (
        <p className="mt-3 font-roboto text-sm text-secondary-dark">{message}</p>
      ) : null}
    </div>
  );
}

/* ── VARIANT 3: button spinner ─────────────────────────────────────────────
 * Drop-in replacement for `Loader2 animate-spin`. Same 1rem (w-4 h-4) box and
 * inline-flex alignment so it never shifts button layout.
 *   variant="light"  → white arc, for orange/primary buttons (default)
 *   variant="dark"   → orange arc, for white/secondary/ghost buttons
 */
function Button({ variant = 'light', className = '' }) {
  const ring =
    variant === 'dark'
      ? 'border-primary-light/30 border-t-primary-light'
      : 'border-white/40 border-t-white';

  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-flex items-center justify-center ${className}`}
    >
      <span
        className={`h-4 w-4 rounded-full border-2 ${ring} animate-spinner motion-reduce:animate-none`}
      />
    </span>
  );
}

export const ApplyDirLoader = { Screen, Inline, Button };

export default ApplyDirLoader;

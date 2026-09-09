import { createElement, useEffect, useRef, useState } from 'react';

/**
 * Shared building blocks for the marketing page.
 *
 * Deliberately self-contained: nothing in components/landing/ imports from the
 * product app, so the whole folder can be lifted into its own Vite project the
 * day marketing needs to move off the SPA. The only shared dependencies are the
 * Tailwind brand tokens and components/brand/Logo.
 */

/** Reveals children once, when they first scroll into view. */
export function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    // Reduced motion (or no IntersectionObserver) gets the content immediately.
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setShown(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.06 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={shown ? { animationDelay: `${delay}ms` } : undefined}
      className={`${shown ? 'animate-rise' : 'opacity-0'} motion-reduce:animate-none motion-reduce:opacity-100 ${className}`}
    >
      {children}
    </div>
  );
}

/** Full-bleed band. `tone` picks the ground; content is capped and centred. */
export function Section({ id, tone = 'paper', className = '', children }) {
  const grounds = {
    paper: 'bg-white text-ink',
    stone: 'bg-stone text-ink',
    ink: 'bg-ink text-white',
  };
  return (
    <section id={id} className={`${grounds[tone]} px-5 sm:px-8 ${className}`}>
      <div className="mx-auto w-full max-w-6xl py-20 sm:py-28">{children}</div>
    </section>
  );
}

/** Small tracked label that opens a section. */
export function Eyebrow({ children, tone = 'paper' }) {
  const color = tone === 'ink' ? 'text-white/45' : 'text-secondary-dark';
  return (
    <p className={`mb-5 text-[13px] tracking-[0.02em] ${color}`}>{children}</p>
  );
}

/** Display heading. Tight negative tracking, per the identity. */
export function Heading({ children, className = '', as = 'h2' }) {
  // createElement rather than a renamed destructure so the tag stays a plain
  // string and the lint rule can still see it.
  return createElement(
    as,
    { className: `text-[clamp(1.9rem,4.4vw,3.4rem)] font-bold leading-[1.03] tracking-[-0.028em] ${className}` },
    children,
  );
}

export function Lead({ children, tone = 'paper', className = '' }) {
  const color = tone === 'ink' ? 'text-white/65' : 'text-[#3A3632]';
  return (
    <p className={`mt-5 max-w-[62ch] text-[clamp(1rem,1.35vw,1.15rem)] leading-relaxed ${color} ${className}`}>
      {children}
    </p>
  );
}

/** Primary action. Orange is the only accent, so it appears once per view. */
export function CtaButton({ href, children, tone = 'orange', className = '', ...rest }) {
  const styles = {
    orange:
      'bg-primary-light text-white hover:bg-primary-dark shadow-sm hover:shadow-md',
    ink: 'bg-ink text-white hover:bg-ink-soft',
    ghostOnInk:
      'border border-white/20 text-white hover:border-white/45 hover:bg-white/[0.06]',
    ghost:
      'border border-stone-line text-ink hover:border-ink/30 hover:bg-stone',
  };
  return (
    <a
      href={href}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-[15px] font-semibold transition-all duration-200 ${styles[tone]} ${className}`}
      {...rest}
    >
      {children}
    </a>
  );
}

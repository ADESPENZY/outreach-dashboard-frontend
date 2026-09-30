/**
 * A one-slot registry for the page's Lenis instance.
 *
 * LandingPage owns the instance; the hero's "See how it works" button needs to
 * ask it to scroll. Passing it down through props would thread it through
 * components that have no other reason to know about it, and reaching for a
 * global would be worse — this keeps the handoff to two named functions.
 *
 * Nothing here assumes Lenis exists: with reduced motion the page never creates
 * one, and the native path below is the whole fallback.
 */

let lenis = null;

export function registerLenis(instance) {
  lenis = instance;
  return () => { if (lenis === instance) lenis = null; };
}

/** Scroll to an element, smoothly if we can, honestly if we cannot. */
export function scrollToEl(el, { offset = 0 } = {}) {
  if (!el) return;
  if (lenis?.scrollTo) {
    lenis.scrollTo(el, { offset, duration: 1.1 });
    return;
  }
  const top = el.getBoundingClientRect().top + window.scrollY + offset;
  // `smooth` is ignored when the visitor asks for reduced motion, which is the
  // behaviour we want — it just jumps.
  window.scrollTo({ top, behavior: 'smooth' });
}

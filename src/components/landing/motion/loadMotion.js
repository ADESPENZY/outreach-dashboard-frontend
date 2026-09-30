/**
 * One shared, cached handle on gsap + ScrollTrigger.
 *
 * Every animated piece of the landing page needs the same two modules, and each
 * one used to import them itself. That worked, but it meant the plugin was
 * registered several times over and each caller had its own copy of the
 * "has it loaded yet" logic. This keeps a single in-flight promise: the first
 * caller starts the download, everyone else awaits the same result, and
 * registerPlugin runs exactly once.
 *
 * Still a dynamic import, so neither library is in the entry bundle — the
 * headline and the cards paint before any of this arrives.
 */

let pending = null;

export default function loadMotion() {
  if (!pending) {
    pending = Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        gsap.registerPlugin(ScrollTrigger);
        return { gsap, ScrollTrigger };
      })
      .catch((err) => {
        // Don't cache a failure — a later caller (or a retry after a flaky
        // network) should be able to try again rather than inherit the reject.
        pending = null;
        throw err;
      });
  }
  return pending;
}

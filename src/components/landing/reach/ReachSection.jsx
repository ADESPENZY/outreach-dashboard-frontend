import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import SeniorityBar from './SeniorityBar';
import TitleStream from './TitleStream';
import useReducedMotion from '../hero/useReducedMotion';
import loadMotion from '../motion/loadMotion';
import { SECTION, STATS } from './reachContent';

/**
 * Who the introductions actually went to.
 *
 * The section above argues that reaching a person beats reaching a form. This
 * one is the evidence: three numbers, the titles themselves drifting past, and
 * the seniority mix. Nothing here is inferred at build time — every figure is
 * written into reachContent.js by hand, so no export can ever leak a name.
 *
 * No pin. Scroll only decides how far the bar has drawn.
 */

/**
 * Counts up when the stats are properly on screen.
 *
 * The final figures are what the component renders, so they are in the DOM for
 * a crawler and for anyone who never sees the animation. The count-up zeroes
 * them only once gsap has actually loaded — if the import fails, the real
 * numbers are already sitting there and nothing has to recover.
 */
function useCountUp(enabled) {
  const [el, setEl] = useState(null);

  useEffect(() => {
    if (!enabled || !el) return undefined;

    let cancelled = false;
    let io;
    let tweens = [];

    loadMotion().then(({ gsap }) => {
      if (cancelled) return;
      const nums = gsap.utils.toArray(el.querySelectorAll('[data-count]'));
      const fades = gsap.utils.toArray(el.querySelectorAll('[data-fade]'));
      if (!nums.length && !fades.length) return;

      gsap.set(fades, { autoAlpha: 0, y: 8 });
      nums.forEach((n) => { n.textContent = '0'; });

      const run = () => {
        nums.forEach((n) => {
          const target = Number(n.dataset.count);
          const box = { v: 0 };
          tweens.push(gsap.to(box, {
            v: target,
            duration: 1.2,
            ease: 'power2.out',
            onUpdate: () => { n.textContent = String(Math.round(box.v)); },
            onComplete: () => { n.textContent = String(target); },
          }));
        });
        tweens.push(gsap.to(fades, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }));
      };

      // Literally "40% of the stats are showing" — simpler and more honest
      // here than a scroll offset guessed against the viewport height.
      io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        io = null;
        run();
      }, { threshold: 0.4 });
      io.observe(el);
    }).catch(() => { /* the real numbers are already rendered */ });

    return () => {
      cancelled = true;
      io?.disconnect();
      tweens.forEach((t) => t.kill());
    };
  }, [enabled, el]);

  return setEl;
}

export default function ReachSection() {
  const reduced = useReducedMotion();
  const [sectionEl, setSectionEl] = useState(null);
  const setStatsEl = useCountUp(!reduced);
  const bar = useRef(null);

  const onBarReady = useCallback((api) => {
    bar.current = api;
    return () => { bar.current = null; };
  }, []);

  useLayoutEffect(() => {
    if (reduced || !sectionEl) return undefined;

    let cancelled = false;
    let scrub;

    loadMotion().then(({ ScrollTrigger }) => {
      if (cancelled) return;
      scrub = ScrollTrigger.create({
        trigger: sectionEl.querySelector('[data-bar]') ?? sectionEl,
        start: 'top 90%',
        end: 'top 45%',
        scrub: 0.6,
        onUpdate: (self) => bar.current?.draw(self.progress),
      });
    }).catch(() => {
      // Without gsap the bar would stay clipped to nothing, which is worse
      // than no animation at all.
      bar.current?.draw(1);
    });

    return () => { cancelled = true; scrub?.kill(); };
  }, [reduced, sectionEl]);

  return (
    <section id="reach" ref={setSectionEl} className="bg-[#FBFAF9] text-ink">
      <div className="mx-auto w-full max-w-6xl px-5 pt-20 sm:px-8 sm:pt-28">
        <p className="text-xs uppercase tracking-widest text-secondary-dark">{SECTION.eyebrow}</p>
        <h2 className="mt-4 max-w-[20ch] text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.04] tracking-[-0.03em] text-ink">
          {SECTION.heading}
        </h2>

        <dl ref={setStatsEl} className="mt-12 grid gap-8 sm:mt-14 md:grid-cols-3 md:gap-6">
          {STATS.map((s) => (
            <div key={s.label}>
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <span
                  {...(s.to === null ? { 'data-fade': '' } : { 'data-count': s.to })}
                  className="block text-[clamp(2.5rem,5vw,3.75rem)] font-bold leading-none tracking-[-0.04em] text-ink"
                >
                  {s.value}
                </span>
                <span className="mt-3 block max-w-[22ch] text-sm leading-relaxed text-secondary-dark">
                  {s.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Full bleed: the drift should run off both sides of the page, not sit
          inside the column like a widget. */}
      <TitleStream reduced={reduced} className="mt-14 sm:mt-20" />

      <div className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
        <div data-bar className="mt-16 sm:mt-20">
          <SeniorityBar reduced={reduced} onReady={onBarReady} />
        </div>
        <p className="mt-12 text-xs leading-relaxed text-secondary-dark">{SECTION.footnote}</p>
      </div>
    </section>
  );
}

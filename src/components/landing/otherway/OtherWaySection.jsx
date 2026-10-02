import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Conveyor from './Conveyor';
import DirectLine from './DirectLine';
import useReducedMotion from '../hero/useReducedMotion';
import loadMotion from '../motion/loadMotion';
import { PANELS, ROWS, SECTION } from './otherWayContent';

/**
 * The comparison, as one stage with two layers rather than a table.
 *
 * On desktop the stage is pinned and a divider wipes across it: you arrive in
 * the middle of the auto-apply machine, and scrolling pushes it off the stage
 * until only the ApplyDir side is left. The argument is made by taking the
 * chaos away, not by putting a tick next to it.
 *
 * On a phone there is no room for a wipe, so the two layers simply stack and
 * each plays when it is properly on screen. Same scene, same copy, no pin.
 */

const START_PCT = 85;       // how much of the stage the chaos owns on arrival
const WIPE_IN = 0.15;       // before this, hold on the chaos
const WIPE_OUT = 0.75;      // after this, hold on ApplyDir
const REVEAL_PLAY = 0.6;    // right layer plays once it is this far revealed

/** Where the divider sits for a given scroll progress. */
function dividerAt(p) {
  if (p <= WIPE_IN) return START_PCT;
  if (p >= WIPE_OUT) return 0;
  return START_PCT * (1 - (p - WIPE_IN) / (WIPE_OUT - WIPE_IN));
}

const STAGE = 'relative overflow-hidden rounded-[28px] border border-stone-line';

/**
 * True from the md breakpoint up.
 *
 * The stacked stages need this because their shape is a prop, not a class: a
 * phone-shaped scene scaled up to a 1152px column renders at three and a half
 * times size, with 45px body text. Desktop reduced motion gets the wide scene.
 */
function useWideViewport() {
  const q = '(min-width: 768px)';
  const [wide, setWide] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : true
  ));
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(q);
    const onChange = (e) => setWide(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return wide;
}

/** The label that sits inside a layer, so the wipe carries it off or on. */
function StageLabel({ tone, label, caption, align = 'left' }) {
  const dark = tone === 'dark';
  return (
    <div
      className={`pointer-events-none absolute top-0 z-[1] p-5 sm:p-7 ${
        align === 'right' ? 'right-0 text-right' : 'left-0'
      }`}
    >
      <p className={`text-[13px] font-semibold ${dark ? 'text-white/70' : 'text-ink'}`}>{label}</p>
      <p className={`mt-1 max-w-[24ch] text-xs leading-relaxed ${dark ? 'text-white/40' : 'text-secondary-dark'}`}>
        {caption}
      </p>
    </div>
  );
}

export default function OtherWaySection() {
  const reduced = useReducedMotion();
  const wideViewport = useWideViewport();
  const [sectionEl, setSectionEl] = useState(null);
  // Only reduced motion ever shows the stacked pair on a wide screen; without
  // it the stacked block is hidden from md up and stays phone-shaped.
  const stackedWide = reduced && wideViewport;

  const pinRef = useRef(null);
  const rightRef = useRef(null);
  const dividerRef = useRef(null);
  const conveyor = useRef(null);
  const direct = useRef(null);

  const onConveyorReady = useCallback((api) => {
    conveyor.current = api;
    return () => { conveyor.current = null; };
  }, []);
  const onDirectReady = useCallback((api) => {
    direct.current = api;
    return () => { direct.current = null; };
  }, []);

  /**
   * One value drives the whole stage: where the divider is. The right layer is
   * clipped to it, the handle is positioned by it, and both layers are told
   * whether they are worth animating from it.
   */
  const applyDivider = useCallback((d) => {
    if (rightRef.current) rightRef.current.style.clipPath = `inset(0 0 0 ${d}%)`;
    if (dividerRef.current) dividerRef.current.style.left = `${d}%`;
    conveyor.current?.setActive(d >= 5);
    direct.current?.setRevealed((100 - d) / 100 > REVEAL_PLAY);
  }, []);

  useLayoutEffect(() => {
    if (reduced || !sectionEl) return undefined;

    let cancelled = false;
    let mm;
    let rowTweens = [];

    loadMotion().then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return;
      const q = gsap.utils.selector(sectionEl);

      // The pin is desktop-only: matchMedia means the mobile build never
      // creates it at all, rather than creating one against a hidden element.
      mm = gsap.matchMedia();
      mm.add('(min-width: 768px)', () => {
        applyDivider(START_PCT);
        const st = ScrollTrigger.create({
          trigger: pinRef.current,
          start: 'top top',
          end: '+=150%',
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => applyDivider(dividerAt(self.progress)),
          onRefresh: (self) => applyDivider(dividerAt(self.progress)),
        });
        return () => {
          st.kill();
          applyDivider(START_PCT);
        };
      });

      // The rows: each statement arrives, then its old answer is struck out.
      const rows = q('[data-row]');
      const strikes = q('[data-strike]');
      gsap.set(rows, { opacity: 0, y: 16 });
      gsap.set(strikes, { scaleX: 0, transformOrigin: 'left center' });

      rowTweens.push(
        gsap.to(rows, {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.12,
          ease: 'power2.out',
          scrollTrigger: { trigger: q('[data-rows]')[0], start: 'top 85%', once: true },
        }),
        gsap.to(strikes, {
          scaleX: 1,
          duration: 0.45,
          stagger: 0.12,
          delay: 0.3,
          ease: 'power2.inOut',
          scrollTrigger: { trigger: q('[data-rows]')[0], start: 'top 85%', once: true },
        }),
      );
    }).catch(() => { /* no motion: the section stands as written */ });

    return () => {
      cancelled = true;
      mm?.revert();
      rowTweens.forEach((t) => { t.scrollTrigger?.kill(); t.kill(); });
    };
  }, [reduced, sectionEl, applyDivider]);

  // `pinned` is what decides who drives the layer, not `wide` — in reduced
  // motion the stacked pair is wide too, and it must not take the handles the
  // divider writes through.
  const left = (wide, pinned) => (
    <>
      <Conveyor
        reduced={reduced}
        wide={wide}
        activeThreshold={pinned ? 0 : 0.4}
        onReady={pinned ? onConveyorReady : undefined}
        className="absolute inset-0"
      />
      <StageLabel tone="dark" label={PANELS.left.label} caption={PANELS.left.caption} />
    </>
  );

  const right = (wide, pinned) => (
    <>
      <DirectLine
        reduced={reduced}
        wide={wide}
        playThreshold={pinned ? null : 0.4}
        onReady={pinned ? onDirectReady : undefined}
        className="absolute inset-0"
      />
      <StageLabel label={PANELS.right.label} caption={PANELS.right.caption} align={pinned ? 'right' : 'left'} />
    </>
  );

  return (
    <section id="why" ref={setSectionEl} className="bg-[#FBFAF9] text-ink">
      <div className="mx-auto w-full max-w-6xl px-5 pt-20 sm:px-8 sm:pt-28">
        <p className="text-xs uppercase tracking-widest text-secondary-dark">{SECTION.eyebrow}</p>
        <h2 className="mt-4 max-w-[20ch] text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.04] tracking-[-0.03em] text-ink">
          {SECTION.heading}
        </h2>
      </div>

      {/* Desktop: one stage, pinned, wiped. */}
      {!reduced && (
        <div className="hidden md:block">
          <div ref={pinRef} className="flex h-screen items-center justify-center overflow-hidden px-8 pt-20">
            <div
              data-stage="pinned"
              className={`${STAGE} aspect-[16/8] w-[min(100%,calc((100vh-11rem)*2))] max-w-6xl bg-[#161413]`}
            >
              {/* Both layers carry an explicit z-index. Without one the left
                  layer's label (which needs to sit above its own canvas) would
                  paint over the right layer entirely, because a positioned
                  child with a z-index escapes a parent that has none. */}
              <div data-layer="left" className="absolute inset-0 z-0">{left(true, true)}</div>
              <div
                ref={rightRef}
                data-layer="right"
                className="absolute inset-0 z-[1] bg-[#FBFAF9]"
                style={{ clipPath: `inset(0 0 0 ${START_PCT}%)` }}
              >
                {right(true, true)}
              </div>

              {/* The divider. Above both layers, so it reads as the edge
                  between them rather than as part of either. */}
              <div
                ref={dividerRef}
                data-divider
                aria-hidden="true"
                className="absolute inset-y-0 z-[2] w-0.5 -translate-x-1/2 bg-primary-light"
                style={{ left: `${START_PCT}%` }}
              >
                <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.18)]">
                  <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] text-primary-light" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7.5 5 3.5 10l4 5M12.5 5l4 5-4 5" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone, and anyone who asked for reduced motion: the two layers
          stacked, each playing on its own. */}
      <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${reduced ? 'pt-14' : 'pt-14 md:hidden'}`}>
        <div className="grid gap-5">
          <div
            data-stage="stacked-left"
            className={`${STAGE} bg-[#161413] ${stackedWide ? 'aspect-[16/8]' : 'aspect-[4/5]'}`}
          >
            {left(stackedWide, false)}
          </div>
          <div
            data-stage="stacked-right"
            className={`${STAGE} bg-[#FBFAF9] ${stackedWide ? 'aspect-[16/8]' : 'aspect-[4/5]'}`}
          >
            {right(stackedWide, false)}
          </div>
        </div>
      </div>

      {/* Three statements. A grid, not a table — a screen reader should hear
          three labelled pairs, not tabular data. */}
      <div className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
        <div data-rows className="mt-16 border-t border-stone-line sm:mt-20">
          {ROWS.map((r) => (
            <div
              key={r.label}
              data-row
              className="grid gap-3 border-b border-stone-line py-8 md:grid-cols-[200px_minmax(0,1fr)] md:items-center md:gap-10"
            >
              <p className="text-xs uppercase tracking-widest text-secondary-dark">{r.label}</p>
              <div>
                <span className="relative inline-block text-sm text-secondary-dark">
                  {r.auto}
                  <span
                    data-strike
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 block h-px w-full bg-current"
                  />
                </span>
                <p className="mt-2 flex items-baseline gap-3 text-[clamp(1.5rem,3vw,2.25rem)] font-bold leading-tight tracking-[-0.02em] text-ink">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2 w-2 shrink-0 translate-y-[-0.35em] rounded-full bg-primary-light"
                  />
                  {r.ours}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

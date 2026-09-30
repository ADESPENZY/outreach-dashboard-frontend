import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import VoidCanvas from './VoidCanvas';
import { coreGlowRadius } from './vortexMetrics';
import EscapeCard from './EscapeCard';
import InboxNode from './InboxNode';
import ThreadLine from './ThreadLine';
import useReducedMotion from './useReducedMotion';
import { scrollToEl } from './smoothScroll';
import loadMotion from '../motion/loadMotion';

/**
 * Scene 1: applications spiralling into the void, and the one CV that doesn't.
 *
 * The correction that shapes this whole file: the visitor's CV must never enter
 * the vortex. It spawns among the crowd on the rim, ignites, and then takes a
 * route that stays strictly outside the core's glow radius all the way to a
 * hiring manager's inbox. `flightPath` enforces that by construction — the arc
 * radius is clamped to the glow radius plus a margin at every sample — so the
 * picture can never accidentally say "your CV got swallowed too".
 *
 * gsap is never imported at the top level: the headline, the CTAs and the card
 * are real DOM that paints before any motion code arrives.
 */

const HEADLINE = ['Stop', 'applying', 'into', 'the', 'void.'];

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]';

const DESKTOP = '(min-width: 1024px)';
const DEG = Math.PI / 180;
const EIGHT_OCLOCK = 150 * DEG;   // screen coords: y grows downward
const ORBIT_SWEEP = 14 * DEG;     // how far it drifts with the crowd before igniting
const ARC_SAMPLES = 90;

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia(DESKTOP).matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(DESKTOP);
    const onChange = (e) => setIsDesktop(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return isDesktop;
}

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/**
 * Everything positional the scene needs, derived from one measurement.
 *
 * Kept as a pure function of the box so the canvas, the card, the inbox and
 * both threads all read the same numbers and cannot drift apart.
 */
function heroGeometry({ width, height, wide, viewportH }) {
  const center = wide
    ? { x: width * 0.68, y: height * 0.5 }
    : { x: width * 0.5, y: Math.min(height * 0.5, viewportH * 0.3) };

  const glow = coreGlowRadius(wide);
  const clearance = glow + (wide ? 64 : 34);
  const ringOuter = Math.min(width, height) * 0.62;

  // The inbox: the destination, and the thing the vortex is being contrasted
  // with. Desktop places it up and to the right of the core; mobile tucks it
  // into the top-right of the vortex area. Both clamp inside the hero.
  const node = wide ? { w: 220, h: 104, pad: 24 } : { w: 150, h: 92, pad: 16 };
  const inbox = wide
    ? { x: center.x + 250, y: center.y - 200 }
    : { x: width - node.pad - node.w / 2, y: center.y - 118 };
  inbox.x = clamp(inbox.x, node.pad + node.w / 2, width - node.pad - node.w / 2);
  inbox.y = clamp(inbox.y, node.pad + node.h / 2, height - node.pad - node.h / 2);

  // Spawn on the rim at 8 o'clock, pulled in only as far as it takes to stay
  // clear of the copy — the left column on lg, the stacked text below lg.
  const cardHalf = (wide ? 200 : 160) * 0.35 / 2;
  const minX = wide ? width * 0.48 : node.pad + cardHalf;
  const maxY = wide ? Infinity : viewportH * 0.38 - 24;

  const dirX = Math.cos(EIGHT_OCLOCK);
  const dirY = Math.sin(EIGHT_OCLOCK);
  let r0 = ringOuter;
  if (dirX < 0) r0 = Math.min(r0, (center.x - minX) / -dirX);
  if (dirY > 0 && Number.isFinite(maxY)) r0 = Math.min(r0, (maxY - center.y) / dirY);
  // Clearance wins any argument: staying outside the glow is the whole point.
  r0 = Math.max(r0, clearance);

  // The flight ends at the node's message slot, a little below its middle.
  const target = { x: inbox.x, y: inbox.y + node.h * 0.18 };
  const r1 = Math.max(Math.hypot(target.x - center.x, target.y - center.y), clearance);

  /**
   * Which way round the core to travel — always away from the copy.
   *
   * On lg the copy owns the left column, so the route sweeps down and around
   * the right. Below lg the copy sits directly *under* the vortex, and the same
   * sweep would drag the thread straight through the headline (the canvas
   * keep-off ramp governs particles, not this path), so it goes up and over the
   * top instead. The orbit drifts the same way, so the crowd hand-off and the
   * flight read as one continuous movement.
   */
  const dir = wide ? -1 : 1;
  const thetaSpawn = EIGHT_OCLOCK;
  const theta0 = thetaSpawn + dir * ORBIT_SWEEP;

  let theta1 = Math.atan2(target.y - center.y, target.x - center.x);
  if (dir < 0) { while (theta1 > theta0) theta1 -= Math.PI * 2; }
  else { while (theta1 < theta0) theta1 += Math.PI * 2; }

  return {
    center, clearance, glow, ringOuter, r0, r1,
    dir, thetaSpawn, theta0, theta1, inbox, node, target,
  };
}

/** A point on the flight arc at `t` (0..1). Never inside `clearance`. */
function flightPoint(geo, t) {
  const theta = geo.theta0 + (geo.theta1 - geo.theta0) * t;
  const r = Math.max(geo.r0 + (geo.r1 - geo.r0) * t, geo.clearance);
  return { x: geo.center.x + r * Math.cos(theta), y: geo.center.y + r * Math.sin(theta) };
}

function flightD(geo) {
  let d = '';
  for (let i = 0; i <= ARC_SAMPLES; i += 1) {
    const p = flightPoint(geo, i / ARC_SAMPLES);
    d += `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
  }
  return d.trim();
}

export default function HeroVoid({ sectionRef }) {
  const reduced = useReducedMotion();
  const isDesktop = useIsDesktop();

  const wordsRef = useRef([]);
  const trailApi = useRef(null);

  const [sectionEl, setSectionEl] = useState(null);
  const [cardEl, setCardEl] = useState(null);
  const [inboxEl, setInboxEl] = useState(null);
  const [geo, setGeo] = useState(null);

  const attachSection = useCallback(
    (el) => {
      if (sectionRef) sectionRef.current = el;   // the nav still wants a ref
      setSectionEl(el);
    },
    [sectionRef],
  );

  /**
   * On mobile the centre is pinned to 30% of the *viewport*, not of the
   * section: the section grows past 100svh once the copy stacks under it, and a
   * fraction of that taller box would push the vortex down behind the text.
   */
  const getCenter = useCallback(
    ({ width, height }) =>
      (isDesktop
        ? { x: width * 0.68, y: height * 0.5 }
        : { x: width * 0.5, y: Math.min(height * 0.5, window.innerHeight * 0.3) }),
    [isDesktop],
  );

  // One measurement, shared by everything positional.
  useLayoutEffect(() => {
    if (!sectionEl) return undefined;
    const measure = () => {
      const { width, height } = sectionEl.getBoundingClientRect();
      if (!width || !height) return;
      setGeo(heroGeometry({ width, height, wide: isDesktop, viewportH: window.innerHeight }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sectionEl);
    return () => ro.disconnect();
  }, [sectionEl, isDesktop]);

  const buildFlightD = useCallback(() => (geo ? flightD(geo) : ''), [geo]);
  const onTrailReady = useCallback((api) => {
    trailApi.current = api;
    return () => { trailApi.current = null; };
  }, []);

  // Headline reveal. Hidden synchronously before paint, so there is no flash of
  // finished text; revealed by gsap, or by the failsafe if gsap never lands.
  useLayoutEffect(() => {
    const nodes = wordsRef.current.filter(Boolean);
    if (!nodes.length || reduced) return undefined;

    nodes.forEach((n) => { n.style.transform = 'translateY(115%)'; });

    let cancelled = false;
    let tween;
    const failsafe = setTimeout(() => {
      if (cancelled) return;
      nodes.forEach((n) => {
        n.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        n.style.transform = 'translateY(0)';
      });
    }, 2000);

    loadMotion()
      .then(({ gsap }) => {
        if (cancelled) return;
        clearTimeout(failsafe);
        // Hand gsap a clean slate. If the raw `translateY(115%)` above is left
        // in place, gsap reads it back off the computed matrix as a *pixel* y
        // offset — it cannot recover the percentage — and then animates only
        // the yPercent it adds on top, leaving the words parked 115% down for
        // good. Clearing first (and pinning y:0) keeps the whole offset in the
        // one property the tween actually drives.
        nodes.forEach((n) => { n.style.transform = ''; });
        tween = gsap.fromTo(
          nodes,
          { y: 0, yPercent: 115 },
          { y: 0, yPercent: 0, duration: 0.7, ease: 'expo.out', stagger: 0.06 },
        );
      })
      .catch(() => { /* failsafe above reveals the words */ });

    return () => {
      cancelled = true;
      clearTimeout(failsafe);
      tween?.kill();
    };
  }, [reduced]);

  /* ── The loop: crowd → ignite → flight → inbox → hold ─────────────────── */
  useLayoutEffect(() => {
    if (reduced || !sectionEl || !cardEl || !inboxEl || !geo) return undefined;

    let cancelled = false;
    let tl;
    let io;
    let onVisibility;

    loadMotion()
      .then(({ gsap }) => {
        if (cancelled) return;
        const q = gsap.utils.selector(sectionEl);
        const one = (s) => q(s)[0];

        const wrap = one('[data-flight]');
        const card = cardEl;
        const ignite = one('[data-ignite]');
        const glowEl = one('[data-glow]');
        const labelCv = one('[data-label-cv]');
        const labelEmail = one('[data-label-email]');
        const faceCv = one('[data-face-cv]');
        const faceEmail = one('[data-face-email]');
        const trail = one('[data-trail]');
        const pulse = one('[data-inbox-pulse]');
        const msgNew = one('[data-inbox-new]');
        const msgDone = one('[data-inbox-delivered]');

        const orbit = { a: geo.thetaSpawn };
        const flight = { p: 0 };

        const placeOrbit = () => {
          gsap.set(wrap, {
            x: geo.center.x + geo.r0 * Math.cos(orbit.a),
            y: geo.center.y + geo.r0 * Math.sin(orbit.a),
          });
        };
        const placeFlight = () => {
          const pt = flightPoint(geo, flight.p);
          gsap.set(wrap, { x: pt.x, y: pt.y });
          trailApi.current?.draw(flight.p);
        };

        tl = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: 'none' } });

        // a) One of the crowd: small, grey, unlabelled, drifting with the stream.
        tl.call(() => { orbit.a = geo.thetaSpawn; flight.p = 0; })
          .set(card, { scale: 0.35, opacity: 0, rotation: -6 })
          .set([ignite, glowEl, labelCv, labelEmail, faceEmail], { opacity: 0 })
          .set(faceCv, { opacity: 1 })
          .set([pulse, msgNew, msgDone], { opacity: 0 })
          .set(trail, { opacity: 1 })
          .call(() => { placeOrbit(); trailApi.current?.draw(0); })
          .to(card, { opacity: 1, duration: 0.3 }, 0)
          .to(orbit, { a: geo.theta0, duration: 0.9, onUpdate: placeOrbit }, 0)

          // b) Ignite: it stops being one of the crowd.
          .to([ignite, glowEl], { opacity: 1, duration: 0.35 }, 0.9)
          .to(labelCv, { opacity: 1, duration: 0.3 }, 1.0)
          .to(card, { scale: 0.8, rotation: 0, duration: 0.5, ease: 'back.out(1.6)' }, 0.9)

          // c) Flight: strictly outside the core, trail drawing behind it.
          .to(flight, { p: 1, duration: 1.8, ease: 'power2.inOut', onUpdate: placeFlight }, 1.5)

          // d) Halfway, the CV becomes the introduction.
          .to([faceCv, labelCv], { opacity: 0, duration: 0.3 }, 2.4)
          .to([faceEmail, labelEmail], { opacity: 1, duration: 0.3 }, 2.4)

          // e) Arrival: into the slot, and the inbox answers.
          .to(card, { scale: 0, opacity: 0, duration: 0.35, ease: 'power2.in' }, 3.15)
          .to(pulse, { opacity: 1, duration: 0.18 }, 3.3)
          .to(pulse, { opacity: 0, duration: 0.45 }, 3.5)
          .to(msgNew, { opacity: 1, duration: 0.3 }, 3.45)
          .to(msgDone, { opacity: 1, duration: 0.3 }, 3.75)

          // f) Hold, then clear and go again.
          .to([msgNew, msgDone], { opacity: 0, duration: 0.45 }, 5.85)
          .to(trail, { opacity: 0, duration: 0.45 }, 5.85)
          .set({}, {}, 6.9);

        // Nothing should be burning frames off-screen or in a background tab.
        let onScreen = true;
        const sync = () => {
          if (onScreen && document.visibilityState === 'visible') tl.play();
          else tl.pause();
        };
        io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }, { threshold: 0 });
        io.observe(sectionEl);
        onVisibility = () => sync();
        document.addEventListener('visibilitychange', onVisibility);

        // Let the headline land first.
        gsap.delayedCall(1.0, sync);
      })
      .catch(() => { /* no motion: the static frame below is what shows */ });

    return () => {
      cancelled = true;
      io?.disconnect();
      if (onVisibility) document.removeEventListener('visibilitychange', onVisibility);
      tl?.kill();
    };
  }, [reduced, sectionEl, cardEl, inboxEl, geo]);

  const onSeeHow = (e) => {
    e.preventDefault();
    scrollToEl(document.getElementById('how'));
  };

  return (
    <section
      id="hero"
      ref={attachSection}
      className="relative min-h-[100svh] overflow-hidden bg-ink"
    >
      <VoidCanvas
        getCenter={getCenter}
        reduced={reduced}
        className="absolute inset-0 h-full w-full"
      />

      {/* Mobile only: lift the copy off the vortex without dimming the core. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-[#101010] via-[#101010]/92 to-transparent lg:hidden"
      />

      {/* The route out. Drawn by the loop, or shown complete under reduced
          motion so the still frame still tells the story. */}
      <div data-trail="" className="pointer-events-none absolute inset-0 z-10">
        <ThreadLine
          sectionEl={sectionEl}
          reduced={reduced}
          buildD={buildFlightD}
          onReady={reduced ? undefined : onTrailReady}
          remeasureKey={geo}
          className="absolute inset-0 h-full w-full"
        />
      </div>

      {geo && (
        <InboxNode
          attach={setInboxEl}
          left={geo.inbox.x}
          top={geo.inbox.y}
          reduced={reduced}
        />
      )}

      {/* The travelling card. Three nested boxes on purpose: the outer one is
          the only thing the timeline moves, the middle centres the card on that
          point, and the inner is what scales — so position and scale never
          fight over the same transform. */}
      {!reduced && geo && (
        <div data-flight="" className="pointer-events-none absolute left-0 top-0 z-30">
          <div className="-translate-x-1/2 -translate-y-1/2">
            <EscapeCard attach={setCardEl} />
          </div>
        </div>
      )}

      <div className="relative z-20 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-end px-5 pb-20 pt-[38svh] sm:px-8 lg:grid lg:grid-cols-2 lg:items-center lg:justify-normal lg:gap-12 lg:pb-0 lg:pt-0">
        <div className="min-w-0">
          <p className="mb-5 text-xs uppercase tracking-widest text-white/60">Your AI headhunter</p>

          <h1 className="text-[clamp(2.4rem,7.2vw,4.3rem)] font-bold leading-[1.02] tracking-[-0.032em] text-white">
            {HEADLINE.map((word, i) => (
              <Fragment key={word}>
                {i > 0 && ' '}
                {/* overflow-hidden is the clip mask each word rises out of; the
                    padding gives descenders room so "applying" isn't shaved. */}
                <span className="inline-block overflow-hidden pb-[0.18em] align-bottom">
                  <span
                    ref={(el) => { wordsRef.current[i] = el; }}
                    className="inline-block will-change-transform"
                  >
                    {word}
                  </span>
                </span>
              </Fragment>
            ))}
          </h1>

          <p className="mt-6 max-w-[46ch] text-[clamp(1.02rem,1.4vw,1.2rem)] leading-relaxed text-white/75">
            ApplyDir finds the person who hires, writes your introduction, and sends it
            from your own inbox.
          </p>
          <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-white/60">
            For professionals in any field, anywhere, who&rsquo;d rather be introduced
            than filtered.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              id="hero-cta"
              to="/register"
              className={`inline-flex h-12 items-center justify-center rounded-xl bg-primary-light px-6 text-[15px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary-dark hover:shadow-md ${FOCUS_RING}`}
            >
              Get introduced
            </Link>
            <a
              href="#how"
              onClick={onSeeHow}
              className={`inline-flex h-12 items-center justify-center rounded-xl border border-white/20 px-6 text-[15px] font-semibold text-white/70 transition-all duration-200 hover:border-white/45 hover:bg-white/[0.06] hover:text-white ${FOCUS_RING}`}
            >
              See how it works
            </a>
          </div>

          <p className="mt-4 text-[13px] text-white/60">
            Free during early access · No card · You approve every message
          </p>
        </div>
      </div>

      {/* The scroll-scrubbed thread now leaves the inbox, not the card: the
          story continues from where the introduction landed. */}
      <ThreadLine
        sectionEl={sectionEl}
        fromEl={inboxEl}
        reduced={reduced}
        remeasureKey={geo}
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      />
    </section>
  );
}

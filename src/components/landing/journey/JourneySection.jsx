import { Fragment, useCallback, useLayoutEffect, useRef, useState } from 'react';
import JourneyCard from './JourneyCard';
import OrgScan from './OrgScan';
import ProgressRail from './ProgressRail';
import ThreadLine from '../hero/ThreadLine';
import useReducedMotion from '../hero/useReducedMotion';
import loadMotion from '../motion/loadMotion';
import { BEATS, SR_HEADING } from './journeyContent';

/**
 * Scene 2: one card, six beats, scrubbed by scroll while the section is pinned.
 *
 * Two rules shape the timing. Every beat finishes its work in the first 45% of
 * its unit and then *holds* — and the snap label sits inside that hold, so a
 * snapped rest can never land on a half-played transition. And the pin starts
 * below the sticky nav rather than under it, measured at runtime.
 *
 * Reduced motion gets a different tree entirely, not a disabled version of this
 * one: six stacked states, each in its finished form, no pin, no snap, no tilt
 * and no flood.
 */

const INK = '#101010';
const WARM = '#FBFAF9';
const MUTED = '#57534E';
const THREAD_ORANGE = '#FF5B2E';
const THREAD_DARK = '#B82E07';

const BEAT_UNITS = 1;
const TOTAL = BEATS.length * BEAT_UNITS;
const THREAD_SHARE = 0.1;

/** Where each beat is settled. The snap targets these, never the boundaries. */
const LABEL_AT = [0.62, 1.62, 2.62, 3.62, 4.62, 5.85];

/** Beat 6's flood runs over the first 70% of the unit. */
const WIPE_FROM = 5.0;
const WIPE_TO = 5.7;

const NAV_FALLBACK = 72;
const CARD_GUTTER = 64;        // breathing room under the nav, per the brief
const TILT_VELOCITY = 4;       // deg, scroll-driven
const TILT_POINTER = 3;        // deg, pointer-driven

const navHeight = () =>
  document.querySelector('header')?.getBoundingClientRect().height ?? NAV_FALLBACK;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/** Captions animate a word at a time, so each one is split up front. */
const words = (s) => s.split(' ');

/* ── Reduced motion ─────────────────────────────────────────────────────── */

function StaticJourney() {
  return (
    <section id="how" className="bg-ink px-5 sm:px-8">
      <h2 className="sr-only">{SR_HEADING}</h2>
      <div className="mx-auto w-full max-w-6xl py-20 sm:py-28">
        {BEATS.map((b) => {
          const warm = b.n === 6;
          return (
            <div
              key={b.n}
              className={`-mx-5 px-5 py-10 sm:-mx-8 sm:px-8 ${warm ? 'bg-[#FBFAF9]' : ''}`}
            >
              {/* Counter per beat; the rail is motion furniture, so it is not
                  rendered here at all. */}
              <p className={`text-xs tracking-widest ${warm ? 'text-secondary-dark' : 'text-white/50'}`}>
                {b.label}
              </p>
              <p
                className={`mt-3 max-w-[18ch] text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-[1.05] tracking-[-0.03em] ${
                  warm ? 'text-ink' : 'text-white'
                }`}
              >
                {b.caption}
              </p>
              <div className="mt-6 max-w-[440px]">
                <JourneyCard beat={b.n} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── The scrubbed scene ─────────────────────────────────────────────────── */

function AnimatedJourney() {
  const [sectionEl, setSectionEl] = useState(null);
  const [pinEl, setPinEl] = useState(null);
  const [cardEl, setCardEl] = useState(null);
  const stageRef = useRef(null);
  const threadApi = useRef(null);
  const trailApi = useRef(null);

  const onThreadReady = useCallback((api) => {
    threadApi.current = api;
    return () => { threadApi.current = null; };
  }, []);
  const onTrailReady = useCallback((api) => {
    trailApi.current = api;
    return () => { trailApi.current = null; };
  }, []);

  /** The envelope's exit: a short curved continuation of the thread. */
  const buildTrailD = useCallback(({ width }) => {
    if (!cardEl || !pinEl) return '';
    const card = cardEl.getBoundingClientRect();
    const pin = pinEl.getBoundingClientRect();
    const sx = card.left - pin.left + card.width / 2;
    const sy = card.top - pin.top;
    const ex = Math.min(sx + 190, width - 24);
    const ey = Math.max(sy - 165, 24);
    return `M ${sx} ${sy} C ${sx + 30} ${sy - 95}, ${ex - 70} ${ey + 55}, ${ex} ${ey}`;
  }, [cardEl, pinEl]);

  useLayoutEffect(() => {
    if (!sectionEl || !pinEl || !cardEl || !stageRef.current) return undefined;

    let mm;
    let cancelled = false;

    loadMotion()
      .then(({ gsap }) => {
        if (cancelled) return;
        const q = gsap.utils.selector(sectionEl);
        const one = (sel) => q(sel)[0];

        const capWords = BEATS.map((b) => q(`[data-capword="${b.n}"]`));
        const counterStrip = one('[data-counter-strip]');
        const counters = q('[data-counter]');

        const card = cardEl;
        const jobview = one('[data-j="jobview"]');
        const emailview = one('[data-j="emailview"]');
        const followups = one('[data-j="followups"]');
        const reply = one('[data-j="reply"]');
        const contact = one('[data-j="contact"]');
        const buttons = one('[data-j="buttons"]');
        const reachout = one('[data-j="reachout"]');
        const ring = one('[data-j="ring"]');
        const approve = one('[data-j="approve"]');
        const stage = one('[data-j="stage"]');
        const fill = one('[data-j="stage-fill"]');
        const labels = q('[data-j^="stage-label-"]');
        const lines = q('[data-j^="eline-"]');
        const carets = q('[data-j^="caret-"]');
        const wordBefore = one('[data-j="word-before"]');
        const wordAfter = one('[data-j="word-after"]');
        const dots = q('[data-j^="fdot-"]');
        const pill = one('[data-j="pill"]');

        const org = one('[data-o="root"]');
        const scan = one('[data-o="scan"]');
        const glow = one('[data-o="glow"]');

        const cursor = one('[data-cursor]');
        const envelope = one('[data-envelope]');
        const cardGlow = one('[data-card-glow]');
        const trailWrap = one('[data-trail]');
        const tiltV = one('[data-tilt-v]');
        const tiltP = one('[data-tilt-p]');
        const fitter = one('[data-fitter]');
        const wipe = one('[data-wipe]');

        const railFillsV = q('[data-rail-fill="v"]');
        const railFillsH = q('[data-rail-fill="h"]');
        const railDots = BEATS.map((_, i) => q(`[data-rail-dot$="-${i}"]`));

        const toStage = (el, dx = 0, dy = 0) => {
          const s = stageRef.current.getBoundingClientRect();
          const r = el.getBoundingClientRect();
          return {
            x: r.left - s.left + r.width / 2 + dx,
            y: r.top - s.top + r.height / 2 + dy,
          };
        };

        /* ── Beat 6's flood ──────────────────────────────────────────────
           A radial wipe, not a flat fade. Each piece of copy flips to its warm
           colour as the edge reaches it, which is why the distances are
           measured rather than tweened on a shared clock.                   */
        let wipeOrigin = { x: 0, y: 0 };
        let wipeMax = 0;
        let warmables = [];

        const measureWipe = () => {
          const pin = pinEl.getBoundingClientRect();
          const r = (reply ?? card).getBoundingClientRect();
          wipeOrigin = {
            x: r.left - pin.left + r.width / 2,
            y: r.top - pin.top + r.height / 2,
          };
          // Far corner of the pinned box.
          const corners = [[0, 0], [pin.width, 0], [0, pin.height], [pin.width, pin.height]];
          wipeMax = Math.max(...corners.map(([x, y]) => Math.hypot(x - wipeOrigin.x, y - wipeOrigin.y)));

          const dist = (el) => {
            if (!el) return Infinity;
            const b = el.getBoundingClientRect();
            return Math.hypot(
              b.left - pin.left + b.width / 2 - wipeOrigin.x,
              b.top - pin.top + b.height / 2 - wipeOrigin.y,
            );
          };
          warmables = [
            ...capWords.flat().map((el) => ({ el, d: dist(el), prop: 'color', dark: '', warm: INK })),
            ...counters.map((el) => ({ el, d: dist(el), prop: 'color', dark: '', warm: MUTED })),
            ...q('[data-rail-track]').map((el) => ({ el, d: dist(el), prop: 'backgroundColor', dark: '', warm: 'rgba(16,16,16,0.12)' })),
            ...q('[data-rail-dot-bg]').map((el) => ({ el, d: dist(el), prop: 'backgroundColor', dark: '', warm: 'rgba(16,16,16,0.15)' })),
            // The pill already sits stone-on-white inside the card, so it has
            // nothing to switch to — it is listed for completeness only.
            ...(pill ? [{ el: pill, d: dist(pill), prop: '', dark: '', warm: '' }] : []),
          ];
        };

        const paintWipe = (r) => {
          if (wipe) wipe.style.clipPath = `circle(${r}px at ${wipeOrigin.x}px ${wipeOrigin.y}px)`;
          for (const w of warmables) {
            if (!w.prop) continue;
            w.el.style[w.prop] = r > w.d ? w.warm : w.dark;
          }
          const thread = threadApi.current?.path;
          if (thread) thread.setAttribute('stroke', r > wipeMax * 0.45 ? THREAD_DARK : THREAD_ORANGE);
        };

        /* ── Depth ───────────────────────────────────────────────────────── */
        const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
        let rotV;
        let rotPX;
        let rotPY;
        let settle;
        let onPointer;

        const fitCard = () => {
          if (!fitter || !card) return;
          fitter.style.transform = 'scale(1)';
          const maxH = window.innerHeight - navHeight() - CARD_GUTTER;
          const h = card.getBoundingClientRect().height;
          const s = h > maxH ? Math.max(0.6, maxH / h) : 1;
          fitter.style.transform = `scale(${s})`;
        };

        mm = gsap.matchMedia();

        const build = (end) => {
          gsap.set(card, { y: 40, opacity: 0 });
          gsap.set([emailview, followups, reply], { opacity: 0 });
          gsap.set(contact, { opacity: 0, y: -6 });
          gsap.set(approve, { opacity: 0, y: 8 });
          gsap.set(fill, { scaleX: 0.2 });
          gsap.set(labels.slice(1), { opacity: 0 });
          gsap.set(lines, { clipPath: 'inset(0 100% 0 0)' });
          gsap.set(carets, { opacity: 0 });
          gsap.set(org, { opacity: 0 });
          gsap.set(glow, { opacity: 0 });
          gsap.set(dots, { scale: 0.35, opacity: 0.25 });
          gsap.set([cursor, envelope], { opacity: 0 });
          gsap.set(scan, { x: 0 });
          gsap.set(cardGlow, { opacity: 0.1 });
          gsap.set(trailWrap, { opacity: 0 });
          // Every caption starts below its mask except the first.
          capWords.forEach((ws, i) => gsap.set(ws, { yPercent: i === 0 ? 0 : 115, opacity: 1 }));
          gsap.set(railDots.flat(), { opacity: 0 });
          gsap.set(railFillsV, { scaleY: 0 });
          gsap.set(railFillsH, { scaleX: 0 });

          pinEl.style.minHeight = `calc(100svh - ${navHeight()}px)`;
          measureWipe();
          paintWipe(0);
          fitCard();

          rotV = gsap.quickTo(tiltV, 'rotateX', { duration: 0.5, ease: 'power3.out' });
          settle = gsap.delayedCall(0.12, () => rotV(0)).pause();
          rotPX = gsap.quickTo(tiltP, 'rotateX', { duration: 0.6, ease: 'power3.out' });
          rotPY = gsap.quickTo(tiltP, 'rotateY', { duration: 0.6, ease: 'power3.out' });

          if (fine) {
            onPointer = (e) => {
              const b = cardEl.getBoundingClientRect();
              const nx = clamp((e.clientX - (b.left + b.width / 2)) / (b.width / 2), -1, 1);
              const ny = clamp((e.clientY - (b.top + b.height / 2)) / (b.height / 2), -1, 1);
              rotPY(nx * TILT_POINTER);
              rotPX(-ny * TILT_POINTER);
            };
            window.addEventListener('pointermove', onPointer, { passive: true });
          }

          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: sectionEl,
              // Start below the sticky nav, not underneath it.
              start: () => `top ${navHeight()}px`,
              end,
              scrub: 0.6,
              pin: pinEl,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              snap: {
                snapTo: 'labelsDirectional',
                duration: { min: 0.25, max: 0.6 },
                delay: 0.08,
                ease: 'power2.inOut',
              },
              onRefresh: () => { measureWipe(); fitCard(); },
              onUpdate: (self) => {
                if (!tiltV || !fine) return;
                const v = clamp(self.getVelocity() / 260, -TILT_VELOCITY, TILT_VELOCITY);
                rotV(v);
                // One reusable call, restarted — not a new tween per tick.
                settle.restart(true);
              },
            },
          });

          // The thread draws over the first tenth, then breathes while pinned.
          const thread = { p: 0 };
          tl.to(thread, {
            p: 1,
            duration: TOTAL * THREAD_SHARE,
            onUpdate: () => threadApi.current?.draw(thread.p),
          }, 0);

          /* Beat 1 — it finds the role. Work 0 → 0.45, hold to 0.82. */
          tl.addLabel('beat1', LABEL_AT[0])
            .to(card, { y: 0, opacity: 1, duration: 0.35, ease: 'expo.out' }, 0.05);

          /* Beat 2 — you say yes. */
          tl.addLabel('beat2', LABEL_AT[1])
            .to(cursor, { opacity: 1, duration: 0.1 }, 1.0)
            .fromTo(
              cursor,
              { x: () => toStage(reachout).x - 90, y: () => toStage(reachout).y + 70 },
              { x: () => toStage(reachout).x, y: () => toStage(reachout).y, duration: 0.2, ease: 'power2.inOut' },
              1.0,
            )
            .to(reachout, { scale: 0.96, duration: 0.05 }, 1.20)
            .to(ring, { opacity: 1, duration: 0.05 }, 1.20)
            .to(reachout, { scale: 1, duration: 0.07 }, 1.25)
            .to(ring, { opacity: 0, duration: 0.1 }, 1.25)
            .to(fill, { scaleX: 0.4, duration: 0.12 }, 1.25)
            .to([buttons, cursor], { opacity: 0, duration: 0.12 }, 1.32)
            .to(cardGlow, { opacity: 0.15, duration: 0.3 }, 1.0);

          /* Beat 3 — it finds the person who decides. */
          tl.addLabel('beat3', LABEL_AT[2])
            .to(org, { opacity: 1, duration: 0.1 }, 2.0)
            .fromTo(
              scan,
              { x: 0 },
              { x: () => org.getBoundingClientRect().width, duration: 0.2, ease: 'power1.inOut' },
              2.05,
            )
            .to(glow, { opacity: 1, duration: 0.08 }, 2.22)
            .to(contact, { opacity: 1, y: 0, duration: 0.12 }, 2.28)
            .to(fill, { scaleX: 0.6, duration: 0.12 }, 2.28)
            .to(labels[0], { opacity: 0, duration: 0.08 }, 2.28)
            .to(labels[1], { opacity: 1, duration: 0.08 }, 2.28)
            .to(org, { opacity: 0, duration: 0.1 }, 2.35)
            .to(cardGlow, { opacity: 0.2, duration: 0.3 }, 2.0);

          /* Beat 4 — it writes, you approve. */
          tl.addLabel('beat4', LABEL_AT[3])
            .to(jobview, { opacity: 0, duration: 0.08 }, 3.0)
            .to(emailview, { opacity: 1, duration: 0.08 }, 3.05);
          lines.forEach((line, i) => {
            const at = 3.10 + i * 0.07;
            tl.to(carets[i], { opacity: 1, duration: 0.01 }, at)
              .to(line, { clipPath: 'inset(0 0% 0 0)', duration: 0.07 }, at)
              .to(carets[i], { opacity: 0, duration: 0.01 }, at + 0.07);
          });
          tl.fromTo(
            cursor,
            { x: () => toStage(wordBefore).x, y: () => toStage(wordBefore).y + 30 },
            { opacity: 1, x: () => toStage(wordBefore).x, y: () => toStage(wordBefore).y, duration: 0.05 },
            3.26,
          )
            .to(cursor, { scale: 0.8, duration: 0.02 }, 3.31)
            .to(cursor, { scale: 1, duration: 0.02 }, 3.33)
            .to(cursor, { scale: 0.8, duration: 0.02 }, 3.35)
            .to(cursor, { scale: 1, duration: 0.02 }, 3.37)
            .to(wordBefore, { opacity: 0, duration: 0.04 }, 3.36)
            .to(wordAfter, { opacity: 1, duration: 0.04 }, 3.36)
            .to(approve, { opacity: 1, y: 0, duration: 0.07 }, 3.38)
            .to(cursor, { x: () => toStage(approve).x, y: () => toStage(approve).y, duration: 0.06, ease: 'power2.inOut' }, 3.38)
            .to(approve, { scale: 0.96, duration: 0.03 }, 3.40)
            .to(approve, { scale: 1, duration: 0.03 }, 3.43)
            .to(fill, { scaleX: 0.8, duration: 0.07 }, 3.38)
            .to(cursor, { opacity: 0, duration: 0.03 }, 3.42)
            .to(cardGlow, { opacity: 0.25, duration: 0.3 }, 3.0);

          /* Beat 5 — sent from your inbox. The envelope rides the thread's
             own continuation rather than a second, hand-rolled path. */
          const trail = { p: 0 };
          tl.addLabel('beat5', LABEL_AT[4])
            .to([emailview, stage, approve], { opacity: 0, duration: 0.08 }, 4.0)
            .to(card, { scale: 0.25, opacity: 0, duration: 0.12, ease: 'power2.in' }, 4.03)
            .to([envelope, trailWrap], { opacity: 1, duration: 0.06 }, 4.10)
            .fromTo(
              trail,
              { p: 0 },
              {
                p: 1,
                duration: 0.2,
                ease: 'power2.inOut',
                onUpdate: () => {
                  const api = trailApi.current;
                  if (!api) return;
                  api.draw(trail.p);
                  const pt = api.pointAt(trail.p);
                  gsap.set(envelope, { x: pt.x - trailStart.x, y: pt.y - trailStart.y });
                },
              },
              4.14,
            )
            .to([envelope, trailWrap], { opacity: 0, duration: 0.07 }, 4.30)
            .to(card, { scale: 1, opacity: 1, duration: 0.1, ease: 'power2.out' }, 4.28)
            .to(followups, { opacity: 1, duration: 0.08 }, 4.34)
            .to(cardGlow, { opacity: 0.3, duration: 0.3 }, 4.0);
          dots.forEach((dot, i) => {
            tl.to(dot, { scale: 1, opacity: 1, duration: 0.05 }, 4.36 + i * 0.03);
          });

          /* Beat 6 — they reply, and the ground floods warm. */
          const flood = { r: 0 };
          tl.addLabel('beat6', LABEL_AT[5])
            .to(followups, { opacity: 0, duration: 0.1 }, 5.0)
            .to(reply, { opacity: 1, duration: 0.15 }, 5.08)
            .to(stage, { opacity: 1, duration: 0.1 }, 5.08)
            .to(fill, { scaleX: 1, duration: 0.12 }, 5.12)
            .to(labels[1], { opacity: 0, duration: 0.08 }, 5.12)
            .to(labels[2], { opacity: 1, duration: 0.08 }, 5.12)
            .fromTo(
              flood,
              { r: 0 },
              {
                r: () => wipeMax,
                duration: WIPE_TO - WIPE_FROM,
                ease: 'power2.inOut',
                onUpdate: () => paintWipe(flood.r),
              },
              WIPE_FROM,
            )
            // The card keeps its own colours; only its glow goes.
            .to(cardGlow, { opacity: 0, duration: 0.15 }, WIPE_TO - 0.15)
            // The wipe only covers the pinned box. The pin spacer below it is
            // still the section's own background, and that band is what the
            // page lands on once the pin releases — so the section flips to
            // warm the instant the wipe has covered the viewport. A set, not a
            // tween: by this point the wipe is already opaque over every pixel
            // you can see, so there is nothing to cross-fade, and it reverses
            // cleanly on scrub-back.
            .set(sectionEl, { backgroundColor: WARM }, WIPE_TO);

          /* Captions: words out, words in, both scrubbed. */
          capWords.forEach((ws, i) => {
            const at = i * BEAT_UNITS;
            if (i > 0) {
              tl.to(ws, { yPercent: 0, duration: 0.3, stagger: 0.04, ease: 'expo.out' }, at - 0.12);
            }
            if (i < capWords.length - 1) {
              tl.to(ws, { yPercent: -115, opacity: 0, duration: 0.2, stagger: 0.03, ease: 'power2.in' }, at + 0.82);
            }
          });

          /* The counter rolls; the rail fills. */
          BEATS.forEach((_, i) => {
            if (i > 0) {
              tl.to(counterStrip, { yPercent: -(100 / BEATS.length) * i, duration: 0.28, ease: 'power3.out' }, i - 0.1);
            }
            tl.to(railDots[i], { opacity: 1, duration: 0.15 }, i === 0 ? 0.05 : i - 0.05);
          });
          tl.fromTo(railFillsV, { scaleY: 0 }, { scaleY: 1, duration: TOTAL, ease: 'none' }, 0)
            .fromTo(railFillsH, { scaleX: 0 }, { scaleX: 1, duration: TOTAL, ease: 'none' }, 0);

          tl.set({}, {}, TOTAL);

          // The tip breathes while the scene is pinned — independent of scroll.
          const tip = threadApi.current?.dot;
          // Animate the radius, not a scale. The tip is an SVG <circle>
          // positioned by cx/cy, so a transform scales it away from its own
          // centre and parks a stray dot in the corner of the frame.
          const pulse = tip
            ? gsap.to(tip, { attr: { r: 5 }, opacity: 0.55, duration: 0.9, repeat: -1, yoyo: true, ease: 'sine.inOut' })
            : null;

          const onResize = () => {
            pinEl.style.minHeight = `calc(100svh - ${navHeight()}px)`;
            measureWipe();
            fitCard();
          };
          window.addEventListener('resize', onResize);

          return () => {
            window.removeEventListener('resize', onResize);
            if (onPointer) window.removeEventListener('pointermove', onPointer);
            pulse?.kill();
            settle?.kill();
            tl.scrollTrigger?.kill();
            tl.kill();
          };
        };

        // Measured once per build so the envelope's offsets are relative to
        // where the trail actually starts.
        let trailStart = { x: 0, y: 0 };
        const captureTrailStart = () => {
          const api = trailApi.current;
          trailStart = api ? api.pointAt(0) : { x: 0, y: 0 };
        };
        captureTrailStart();

        mm.add('(min-width: 1024px)', () => build('+=270%'));
        mm.add('(max-width: 1023.98px)', () => build('+=220%'));
      })
      .catch(() => { /* no motion: the scene renders in its beat-1 state */ });

    return () => {
      cancelled = true;
      mm?.revert();
    };
  }, [sectionEl, pinEl, cardEl, buildTrailD]);

  return (
    <section
      id="how"
      ref={setSectionEl}
      className="relative"
      style={{ backgroundColor: INK }}
    >
      <h2 className="sr-only">{SR_HEADING}</h2>

      <div
        ref={setPinEl}
        className="relative flex items-center overflow-hidden px-4 sm:px-8"
        style={{ minHeight: `calc(100svh - ${NAV_FALLBACK}px)` }}
      >
        {/* The flood. Above the dark ground, below everything else. */}
        <div
          data-wipe=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{ backgroundColor: WARM, clipPath: 'circle(0px at 50% 50%)' }}
        />

        <ThreadLine
          sectionEl={pinEl}
          fromEl={cardEl}
          reduced={false}
          mode="ceilingToCard"
          onReady={onThreadReady}
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
        />
        {/* The envelope's exit route — the same path machinery, a different
            segment of the same thread. Only on screen while the envelope is. */}
        <div data-trail="" className="pointer-events-none absolute inset-0 z-[1]" style={{ opacity: 0 }}>
          <ThreadLine
            sectionEl={pinEl}
            fromEl={cardEl}
            reduced={false}
            buildD={buildTrailD}
            onReady={onTrailReady}
            className="absolute inset-0 h-full w-full"
          />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0 self-center">
            {/* Counter. The digit rolls; the " / 06" never moves. */}
            <div className="flex items-center gap-1 text-xs tracking-widest text-white/50">
              <span className="relative block h-[1.1em] overflow-hidden">
                <span data-counter-strip="" className="block">
                  {BEATS.map((b) => (
                    <span
                      key={`c${b.n}`}
                      data-counter={b.n}
                      className="flex h-[1.1em] items-center text-white/50"
                    >
                      {b.label}
                    </span>
                  ))}
                </span>
              </span>
            </div>

            {/* The rail sits under the counter at both sizes: vertical on lg+,
                horizontal below it. */}
            <div className="mt-4 lg:hidden">
              <ProgressRail />
            </div>
            <div className="mt-5 hidden lg:block">
              <ProgressRail vertical />
            </div>

            <div className="relative mt-4 grid items-center justify-items-start">
              {BEATS.map((b) => (
                <p
                  key={`t${b.n}`}
                  data-cap={b.n}
                  className="col-start-1 row-start-1 max-w-[16ch] text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.04] tracking-[-0.03em] text-white"
                >
                  {words(b.caption).map((w, i) => (
                    <Fragment key={`${b.n}-${w}-${i}`}>
                      {i > 0 && ' '}
                      {/* The mask each word rises out of, with room for
                          descenders so nothing is shaved. */}
                      <span className="inline-block overflow-hidden pb-[0.16em] -mb-[0.16em] align-bottom">
                        <span data-capword={b.n} className="inline-block will-change-transform">
                          {w}
                        </span>
                      </span>
                    </Fragment>
                  ))}
                </p>
              ))}
            </div>

          </div>

          <div ref={stageRef} className="relative mx-auto w-full max-w-[440px]">
            <OrgScan className="pointer-events-none absolute bottom-full left-0 right-0 mb-4 h-[110px]" />

            {/* Depth, outside in: the bloom, the scale-to-fit, the two tilts. */}
            <div
              data-card-glow=""
              aria-hidden="true"
              style={{
                opacity: 0.1,
                background: 'radial-gradient(closest-side, #FF5B2E, transparent)',
                filter: 'blur(80px)',
              }}
              className="pointer-events-none absolute inset-0 -z-10 scale-125"
            />
            <div data-fitter="" className="origin-top">
              <div style={{ perspective: '1200px' }}>
                <div data-tilt-v="">
                  <div data-tilt-p="" style={{ boxShadow: '0 30px 80px -20px rgba(0,0,0,0.6)' }} className="rounded-2xl">
                    <JourneyCard attach={setCardEl} />
                  </div>
                </div>
              </div>
            </div>

            <svg
              data-envelope=""
              viewBox="0 0 48 36"
              className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-16 w-20 -translate-x-1/2 -translate-y-1/2"
              style={{ opacity: 0 }}
              aria-hidden="true"
            >
              <rect x="1.5" y="1.5" width="45" height="33" rx="4" fill="#fff" stroke="#FF5B2E" strokeWidth="2.5" />
              <path d="M2.5 4.5L24 20 45.5 4.5" fill="none" stroke="#FF5B2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <svg
              data-cursor=""
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-0 top-0 z-30 h-5 w-5 -translate-x-1/2 -translate-y-1/2 drop-shadow"
              style={{ opacity: 0 }}
              aria-hidden="true"
            >
              <path d="M5 2.5l13.5 8.2-5.8 1.2-2.4 5.6L5 2.5z" fill="#101010" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function JourneySection() {
  const reduced = useReducedMotion();
  return reduced ? <StaticJourney /> : <AnimatedJourney />;
}

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import JourneyCard from './JourneyCard';
import OrgScan from './OrgScan';
import ThreadLine from '../hero/ThreadLine';
import useReducedMotion from '../hero/useReducedMotion';
import loadMotion from '../motion/loadMotion';
import { BEATS, SR_HEADING } from './journeyContent';

/**
 * Scene 2: one card, six beats, scrubbed by scroll while the section is pinned.
 *
 * The whole scene is transform / opacity / clip-path, with one colour change at
 * the end (beat 6 takes the section from ink to the warm ground, and the copy
 * the other way) — nothing animates a property that triggers layout.
 *
 * Reduced motion gets a different tree entirely, not a disabled version of this
 * one: six stacked states, each in its finished form, no pin and no scrub.
 */

const INK = '#101010';
const WARM = '#FBFAF9';
const MUTED = '#57534E';     // the counter, once the ground goes warm
const BEAT_UNITS = 1;        // every beat is the same length on the timeline
const TOTAL = BEATS.length * BEAT_UNITS;
const THREAD_SHARE = 0.1;    // the thread draws over the first 10%

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
              <p
                className={`text-xs tracking-widest ${warm ? 'text-secondary-dark' : 'text-white/50'}`}
              >
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
  const stageRef = useRef(null);      // the card column — cursor/envelope live here
  const threadApi = useRef(null);

  const onThreadReady = useCallback((api) => {
    threadApi.current = api;
    return () => { threadApi.current = null; };
  }, []);

  useLayoutEffect(() => {
    if (!sectionEl || !pinEl || !cardEl || !stageRef.current) return undefined;

    let mm;
    let cancelled = false;

    loadMotion()
      .then(({ gsap }) => {
        if (cancelled) return;
        const q = gsap.utils.selector(sectionEl);
        const one = (sel) => q(sel)[0];

        const caps = q('[data-cap]');
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

        const org = one('[data-o="root"]');
        const scan = one('[data-o="scan"]');
        const glow = one('[data-o="glow"]');

        const cursor = one('[data-cursor]');
        const envelope = one('[data-envelope]');

        /** Where a target sits relative to the cursor's own offset parent. */
        const toStage = (el, dx = 0, dy = 0) => {
          const s = stageRef.current.getBoundingClientRect();
          const r = el.getBoundingClientRect();
          return {
            x: r.left - s.left + r.width / 2 + dx,
            y: r.top - s.top + r.height / 2 + dy,
          };
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

          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: sectionEl,
              start: 'top top',
              end,
              scrub: 0.8,
              pin: pinEl,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          // The thread drops in over the first 10% of the whole scene.
          const thread = { p: 0 };
          tl.to(thread, {
            p: 1,
            duration: TOTAL * THREAD_SHARE,
            onUpdate: () => threadApi.current?.draw(thread.p),
          }, 0);

          /* Beat 1 — it finds the role. */
          // Each beat lands its payoff around its own midpoint and then holds,
          // rather than resolving on the boundary — so any given scroll
          // position reads as one finished state, not a transition.
          tl.addLabel('beat1', 0)
            .to(card, { y: 0, opacity: 1, duration: 0.35, ease: 'expo.out' }, 0.05);

          /* Beat 2 — you say yes. */
          tl.addLabel('beat2', 1)
            .to(cursor, { opacity: 1, duration: 0.15 }, 1)
            .fromTo(
              cursor,
              { x: () => toStage(reachout).x - 90, y: () => toStage(reachout).y + 70 },
              { x: () => toStage(reachout).x, y: () => toStage(reachout).y, duration: 0.4, ease: 'power2.inOut' },
              1,
            )
            .to(reachout, { scale: 0.96, duration: 0.1 }, 1.45)
            .to(ring, { opacity: 1, duration: 0.1 }, 1.45)
            .to(reachout, { scale: 1, duration: 0.15 }, 1.55)
            .to(ring, { opacity: 0, duration: 0.25 }, 1.55)
            .to(fill, { scaleX: 0.4, duration: 0.3 }, 1.5)
            .to([buttons, cursor], { opacity: 0, duration: 0.25 }, 1.7);

          /* Beat 3 — it finds the person who decides. */
          tl.addLabel('beat3', 2)
            .to(org, { opacity: 1, duration: 0.2 }, 2)
            .fromTo(
              scan,
              { x: 0 },
              { x: () => org.getBoundingClientRect().width, duration: 0.34, ease: 'power1.inOut' },
              2.04,
            )
            .to(glow, { opacity: 1, duration: 0.12 }, 2.30)
            .to(contact, { opacity: 1, y: 0, duration: 0.2 }, 2.40)
            .to(fill, { scaleX: 0.6, duration: 0.2 }, 2.40)
            .to(labels[0], { opacity: 0, duration: 0.12 }, 2.40)
            .to(labels[1], { opacity: 1, duration: 0.12 }, 2.40)
            .to(org, { opacity: 0, duration: 0.22 }, 2.64);

          /* Beat 4 — it writes, you approve. Slot 3.0 → 4.0. */
          tl.addLabel('beat4', 3)
            .to(jobview, { opacity: 0, duration: 0.12 }, 3.0)
            .to(emailview, { opacity: 1, duration: 0.12 }, 3.08);
          lines.forEach((line, i) => {
            const at = 3.08 + i * 0.12;
            tl.to(carets[i], { opacity: 1, duration: 0.01 }, at)
              .to(line, { clipPath: 'inset(0 0% 0 0)', duration: 0.11 }, at)
              .to(carets[i], { opacity: 0, duration: 0.01 }, at + 0.11);
          });
          tl.fromTo(
            cursor,
            { x: () => toStage(wordBefore).x, y: () => toStage(wordBefore).y + 36 },
            { opacity: 1, x: () => toStage(wordBefore).x, y: () => toStage(wordBefore).y, duration: 0.09 },
            3.44,
          )
            // Double tap on the word, then the user's edit lands.
            .to(cursor, { scale: 0.8, duration: 0.035 }, 3.54)
            .to(cursor, { scale: 1, duration: 0.035 }, 3.575)
            .to(cursor, { scale: 0.8, duration: 0.035 }, 3.61)
            .to(cursor, { scale: 1, duration: 0.035 }, 3.645)
            .to(wordBefore, { opacity: 0, duration: 0.07 }, 3.66)
            .to(wordAfter, { opacity: 1, duration: 0.07 }, 3.66)
            .to(approve, { opacity: 1, y: 0, duration: 0.11 }, 3.70)
            .to(cursor, { x: () => toStage(approve).x, y: () => toStage(approve).y, duration: 0.13, ease: 'power2.inOut' }, 3.72)
            .to(approve, { scale: 0.96, duration: 0.05 }, 3.86)
            .to(approve, { scale: 1, duration: 0.05 }, 3.91)
            .to(fill, { scaleX: 0.8, duration: 0.13 }, 3.86)
            .to(cursor, { opacity: 0, duration: 0.08 }, 3.92);

          /* Beat 5 — sent from your inbox. Slot 4.0 → 5.0. */
          tl.addLabel('beat5', 4)
            .to([emailview, stage, approve], { opacity: 0, duration: 0.14 }, 4.02)
            .to(card, { scale: 0.25, opacity: 0, duration: 0.22, ease: 'power2.in' }, 4.06)
            .fromTo(
              envelope,
              { opacity: 0, scale: 0.5, x: 0, y: 0 },
              { opacity: 1, scale: 1, duration: 0.16 },
              4.18,
            )
            // Two axes with different eases read as one curved arc.
            .to(envelope, { x: 140, duration: 0.42, ease: 'power1.in' }, 4.30)
            .to(envelope, { y: -140, duration: 0.42, ease: 'power2.out' }, 4.30)
            .to(envelope, { opacity: 0, duration: 0.18 }, 4.56)
            .to(card, { scale: 1, opacity: 1, duration: 0.2, ease: 'power2.out' }, 4.46)
            .to(followups, { opacity: 1, duration: 0.16 }, 4.56);
          dots.forEach((dot, i) => {
            tl.to(dot, { scale: 1, opacity: 1, duration: 0.12 }, 4.68 + i * 0.09);
          });

          /* Beat 6 — they reply, and the page warms up. Slot 5.0 → 6.0. */
          tl.addLabel('beat6', 5)
            .to(followups, { opacity: 0, duration: 0.16 }, 5.02)
            .to(reply, { opacity: 1, duration: 0.24 }, 5.14)
            .to(stage, { opacity: 1, duration: 0.16 }, 5.14)
            .to(fill, { scaleX: 1, duration: 0.22 }, 5.18)
            .to(labels[1], { opacity: 0, duration: 0.12 }, 5.18)
            .to(labels[2], { opacity: 1, duration: 0.12 }, 5.18)
            // The one colour move in the scene: ink ground → warm, copy the
            // other way, so the page carries on warm after the pin releases.
            .to(sectionEl, { backgroundColor: WARM, duration: 0.45 }, 5.10)
            .to(caps, { color: INK, duration: 0.45 }, 5.10)
            .to(counters, { color: MUTED, duration: 0.45 }, 5.10);

          // Captions: one visible at a time, crossfading and rising 12px.
          caps.forEach((cap, i) => {
            const at = i * BEAT_UNITS;
            if (i === 0) {
              gsap.set(cap, { opacity: 1, y: 0 });
            } else {
              gsap.set(cap, { opacity: 0, y: 12 });
              tl.to(cap, { opacity: 1, y: 0, duration: 0.3 }, at - 0.1);
            }
            if (i < caps.length - 1) {
              tl.to(cap, { opacity: 0, y: -12, duration: 0.3 }, at + BEAT_UNITS - 0.4);
            }
          });
          counters.forEach((c, i) => {
            const at = i * BEAT_UNITS;
            gsap.set(c, { opacity: i === 0 ? 1 : 0 });
            if (i > 0) tl.to(c, { opacity: 1, duration: 0.3 }, at - 0.1);
            if (i < counters.length - 1) tl.to(c, { opacity: 0, duration: 0.3 }, at + BEAT_UNITS - 0.4);
          });

          // Pin the timeline's length to exactly six units. Without this the
          // duration is wherever the last tween happens to end (~5.55), the
          // scrub maps scroll onto that, and every beat drifts earlier than the
          // sixth of the scroll it is supposed to own — beat 6 never finishes
          // before the pin releases. The tail doubles as a hold on the final
          // state, which the scene wants anyway.
          tl.set({}, {}, TOTAL);

          return () => { tl.scrollTrigger?.kill(); tl.kill(); };
        };

        mm.add('(min-width: 1024px)', () => build('+=360%'));
        mm.add('(max-width: 1023.98px)', () => build('+=280%'));
      })
      .catch(() => { /* no motion: the scene renders in its beat-1 state */ });

    return () => {
      cancelled = true;
      mm?.revert();
    };
  }, [sectionEl, pinEl, cardEl]);

  return (
    <section
      id="how"
      ref={setSectionEl}
      className="relative"
      style={{ backgroundColor: INK }}
    >
      <h2 className="sr-only">{SR_HEADING}</h2>

      <div ref={setPinEl} className="relative flex min-h-[100svh] items-center overflow-hidden px-4 sm:px-8">
        <ThreadLine
          sectionEl={pinEl}
          fromEl={cardEl}
          reduced={false}
          mode="ceilingToCard"
          onReady={onThreadReady}
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        />

        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Counter + caption. All six are real text in the DOM; only one is
              ever visible. */}
          <div className="min-w-0">
            <div className="relative grid">
              {BEATS.map((b) => (
                <p
                  key={`c${b.n}`}
                  data-counter={b.n}
                  className="col-start-1 row-start-1 text-xs tracking-widest text-white/50"
                >
                  {b.label}
                </p>
              ))}
            </div>
            <div className="relative mt-4 grid">
              {BEATS.map((b) => (
                <p
                  key={`t${b.n}`}
                  data-cap={b.n}
                  className="col-start-1 row-start-1 max-w-[16ch] text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.04] tracking-[-0.03em] text-white"
                >
                  {b.caption}
                </p>
              ))}
            </div>
          </div>

          {/* The card, plus the two overlays that need to escape its clip. */}
          <div ref={stageRef} className="relative mx-auto w-full max-w-[440px]">
            <OrgScan className="pointer-events-none absolute bottom-full left-0 right-0 mb-4 h-[110px]" />

            <JourneyCard attach={setCardEl} />

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

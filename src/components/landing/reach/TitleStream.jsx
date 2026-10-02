import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import loadMotion from '../motion/loadMotion';
import { STREAM_LABEL, STREAM_ROWS } from './reachContent';

/**
 * Two rows of job titles drifting past in opposite directions.
 *
 * The point is volume and seniority at a glance — you are not meant to read
 * every card, only to register that these are people, with jobs, not a careers
 * page. So it never stops to be read: it drifts, and the mask at both edges
 * means there is no first card and no last one.
 *
 * The loop is seamless because each row renders its cards twice and the track
 * travels exactly -50%, which is one full set. That only holds if every item
 * is the same width *including* its trailing space, so the gap is padding on
 * each card rather than a flex `gap` — a flex gap sits between items and the
 * duplicated track would drift by half a gap on every lap.
 */

const LOOP_SECONDS = 45;

/**
 * Both edges dissolve, so cards enter and leave rather than popping.
 *
 * In pixels, not percentages: a percentage fade is generous on a 1440 page and
 * barely 25px on a phone, which reads as a card cut off rather than one on its
 * way out. The fade should look the same at every width.
 */
const FADE = 'linear-gradient(to right, transparent 0, #000 56px, #000 calc(100% - 56px), transparent 100%)';
const EDGE_FADE = { maskImage: FADE, WebkitMaskImage: FADE };

function Card({ title, sector }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-stone-line bg-white px-3 py-2.5 shadow-sm md:gap-3 md:px-4 md:py-3">
      <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-primary-light" strokeWidth={2} />
      <div className="min-w-0">
        <p className="whitespace-nowrap text-[13px] font-semibold leading-tight text-ink md:text-sm">
          {title}
        </p>
        <p className="mt-0.5 whitespace-nowrap text-[11px] leading-tight text-secondary-dark md:text-xs">
          {sector}
        </p>
      </div>
    </div>
  );
}

/** One set of cards. Rendered twice per row; the copy is hidden from AT. */
function Set({ cards, duplicate }) {
  return (
    <ul className="flex shrink-0" aria-hidden={duplicate ? 'true' : undefined}>
      {cards.map((c) => (
        <li key={c.title} className="shrink-0 pr-3 md:pr-4">
          <Card title={c.title} sector={c.sector} />
        </li>
      ))}
    </ul>
  );
}

export default function TitleStream({ reduced, className = '' }) {
  const [el, setEl] = useState(null);

  useEffect(() => {
    if (reduced || !el) return undefined;

    let cancelled = false;
    let tl;
    let io;
    let onVisibility;
    let onEnter;
    let onLeave;
    let onScreen = false;
    let hovered = false;

    loadMotion().then(({ gsap }) => {
      if (cancelled) return;
      const tracks = gsap.utils.toArray(el.querySelectorAll('[data-track]'));
      if (!tracks.length) return;

      tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      tracks.forEach((track, i) => {
        // Row 1 travels left, row 2 travels right. Both cover exactly one set.
        const [from, to] = i === 0 ? [0, -50] : [-50, 0];
        tl.fromTo(
          track,
          { xPercent: from },
          { xPercent: to, duration: LOOP_SECONDS, repeat: -1, ease: 'none' },
          0,
        );
      });

      const sync = () => {
        const run = onScreen && !hovered && document.visibilityState === 'visible';
        if (run) tl.play(); else tl.pause();
        el.setAttribute('data-stream', run ? 'running' : 'paused');
        el.setAttribute('data-hover', hovered ? 'true' : 'false');
      };

      io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }, { threshold: 0 });
      io.observe(el);

      onVisibility = () => sync();
      document.addEventListener('visibilitychange', onVisibility);

      // Pointer, not mouse: a touch "enter" would pause the stream for good
      // on a phone, where there is no leave event to start it again.
      onEnter = (e) => { if (e.pointerType === 'mouse') { hovered = true; sync(); } };
      onLeave = (e) => { if (e.pointerType === 'mouse') { hovered = false; sync(); } };
      el.addEventListener('pointerenter', onEnter);
      el.addEventListener('pointerleave', onLeave);

      sync();
    }).catch(() => { /* no motion: the cards simply sit where they are */ });

    return () => {
      cancelled = true;
      io?.disconnect();
      if (onVisibility) document.removeEventListener('visibilitychange', onVisibility);
      if (onEnter) el.removeEventListener('pointerenter', onEnter);
      if (onLeave) el.removeEventListener('pointerleave', onLeave);
      tl?.kill();
    };
  }, [reduced, el]);

  return (
    <div
      ref={setEl}
      data-stream={reduced ? 'static' : 'paused'}
      data-hover="false"
      className={`overflow-hidden ${className}`}
      style={EDGE_FADE}
    >
      <h3 className="sr-only">{STREAM_LABEL}</h3>
      {STREAM_ROWS.map((cards, i) => (
        <div
          key={cards[0].title}
          // Row 2 is the second half of a sample, not a second argument — on a
          // phone one row says the same thing without the clutter.
          className={i === 0 ? '' : 'mt-3 hidden md:block md:mt-4'}
        >
          <div data-track className="flex w-max will-change-transform">
            <Set cards={cards} />
            <Set cards={cards} duplicate />
          </div>
        </div>
      ))}
    </div>
  );
}

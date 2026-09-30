import { useLayoutEffect, useRef } from 'react';
import loadMotion from '../motion/loadMotion';

/**
 * The orange thread leaving the CV card, drawn as you scroll.
 *
 * ── Extending the thread for later scenes ────────────────────────────────────
 * The path is assembled from an ordered list of *segment builders*. Scene 1's
 * drop is built in; anything passed in `segments` is appended after it, each
 * builder continuing the line from wherever the previous one stopped:
 *
 *     ({ width, height, start, cursor }) => ({ d, end })
 *
 *       width, height  the hero box, in px
 *       start          the anchor: bottom-centre of the CV card
 *       cursor         where the previous segment finished
 *       d              SVG commands WITHOUT a leading `M` (e.g. 'C x1 y1, …')
 *       end            {x, y} the point `d` finishes on
 *
 * The opening `M start.x start.y` is emitted here, so a builder only ever
 * returns the continuation. To add scene 2:
 *
 *     const INTO_SCENE_2 = ({ width, cursor }) => ({
 *       d: `C ${cursor.x} ${cursor.y + 200}, ${width * 0.2} …`,
 *       end: { x: …, y: … },
 *     });
 *     <ThreadLine segments={[INTO_SCENE_2]} … />
 *
 * Everything downstream — total length, dash scrub, the tip dot, the resize
 * rebuild — is derived from the assembled path, so nothing else has to change.
 *
 * Builders must be stable references (module scope, or useMemo'd): the effect
 * re-runs whenever the array identity changes.
 */

/** Hero: card → bottom edge of the section at 50% x, as one smooth S. */
const dropToFloor = ({ height, width, cursor }) => {
  const endX = width * 0.5;
  const endY = height;
  const run = endY - cursor.y;
  return {
    d: `C ${cursor.x} ${cursor.y + run * 0.45}, ${endX} ${cursor.y + run * 0.62}, ${endX} ${endY}`,
    end: { x: endX, y: endY },
  };
};

/** Journey: top edge at 50% x → curving into the anchor's top-centre. */
const dropFromCeiling = ({ cursor, anchor }) => {
  const run = anchor.y - cursor.y;
  return {
    d: `C ${cursor.x} ${cursor.y + run * 0.45}, ${anchor.x} ${cursor.y + run * 0.6}, ${anchor.x} ${anchor.y}`,
    end: { x: anchor.x, y: anchor.y },
  };
};

const NO_EXTRA = [];

/**
 * @param {'cardToFloor'|'ceilingToCard'} mode  Which end the thread is anchored
 *        to. `cardToFloor` starts at the element and runs to the section floor;
 *        `ceilingToCard` starts at the section ceiling and runs into it.
 * @param {(api: {draw, pointAt, length}) => (() => void)|void} onReady
 *        When given, ThreadLine does NOT create its own ScrollTrigger — it hands
 *        back `draw(0..1)` so a caller can fold the reveal into a timeline it
 *        already owns, plus `pointAt(0..1)` for anything that has to travel the
 *        same route. Return a cleanup if you set anything up.
 * @param {({width, height}) => string} buildD
 *        Supplies the whole path (including the leading `M`) instead of deriving
 *        it from `fromEl`. Used for the flight arc, whose shape is owned by the
 *        hero's geometry rather than by an element's edges.
 * @param {unknown} remeasureKey  Bump to force a re-measure when the anchor
 *        moves for a reason the ResizeObserver cannot see (the section itself
 *        has not changed size).
 */
export default function ThreadLine({
  sectionEl,
  fromEl,
  reduced,
  mode = 'cardToFloor',
  onReady,
  buildD,
  remeasureKey,
  segments = NO_EXTRA,
  className = '',
}) {
  const svgRef = useRef(null);
  const pathRef = useRef(null);
  const dotRef = useRef(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const path = pathRef.current;
    const dot = dotRef.current;
    const section = sectionEl;
    const from = fromEl;
    // buildD supplies its own geometry, so it needs no anchor element.
    if (!svg || !path || !dot || !section || (!from && !buildD)) return undefined;

    let length = 0;
    let cancelled = false;
    let tween;
    let scrollTrigger;

    function build() {
      const sRect = section.getBoundingClientRect();
      const width = sRect.width;
      const height = sRect.height;
      if (!width || !height) return;

      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

      // A supplied path owns its own geometry and has no anchor element, so the
      // element measurement below must not run for it.
      if (buildD) {
        const d = buildD({ width, height });
        if (!d) return;
        path.setAttribute('d', d);
        length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`;
        return;
      }

      const fRect = from.getBoundingClientRect();
      const ceiling = mode === 'ceilingToCard';
      // Where the element sits, in section coordinates.
      const anchor = {
        x: fRect.left - sRect.left + fRect.width / 2,
        y: ceiling ? fRect.top - sRect.top : fRect.top - sRect.top + fRect.height,
      };
      const start = ceiling ? { x: width * 0.5, y: 0 } : anchor;
      const first = ceiling ? dropFromCeiling : dropToFloor;

      let cursor = start;
      let d = `M ${start.x} ${start.y}`;
      for (const builder of [first, ...segments]) {
        const seg = builder({ width, height, start, cursor, anchor });
        if (!seg?.d) continue;
        d += ` ${seg.d}`;
        cursor = seg.end ?? cursor;
      }
      path.setAttribute('d', d);

      length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
    }

    function place(drawn) {
      if (!length) return;
      const p = path.getPointAtLength(Math.max(0, Math.min(length, drawn)));
      dot.setAttribute('cx', p.x);
      dot.setAttribute('cy', p.y);
      dot.style.opacity = drawn > 2 ? '1' : '0';
    }

    build();

    if (reduced) {
      path.style.strokeDashoffset = '0';
      place(length);
      const roStatic = new ResizeObserver(() => { build(); place(length); });
      roStatic.observe(section);
      return () => roStatic.disconnect();
    }

    path.style.strokeDashoffset = `${length}`;
    place(0);

    /** Draw the thread to `progress` (0..1). */
    const draw = (progress) => {
      const p = Math.max(0, Math.min(1, progress));
      path.style.strokeDashoffset = `${length * (1 - p)}`;
      place(length * p);
    };

    const ro = new ResizeObserver(() => {
      const before = length;
      const offset = parseFloat(path.style.strokeDashoffset || before) || 0;
      const progress = before ? 1 - offset / before : 0;
      build();
      draw(progress);
      scrollTrigger?.refresh();
    });
    ro.observe(section);

    // Caller drives the reveal from its own timeline.
    if (onReady) {
      const api = {
        draw,
        /** The point at `progress` along the path, in section coordinates. */
        pointAt: (progress) => {
          if (!length) return { x: 0, y: 0 };
          const p = Math.max(0, Math.min(1, progress));
          const pt = path.getPointAtLength(length * p);
          return { x: pt.x, y: pt.y };
        },
        get length() { return length; },
      };
      const undo = onReady(api);
      return () => {
        ro.disconnect();
        if (typeof undo === 'function') undo();
      };
    }

    loadMotion()
      .then(({ gsap }) => {
        if (cancelled) return;
        tween = gsap.to(path, {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
          },
          onUpdate: () => {
            const offset = Number(gsap.getProperty(path, 'strokeDashoffset')) || 0;
            place(length - offset);
          },
        });
        scrollTrigger = tween.scrollTrigger;
      })
      .catch(() => {
        // No gsap → show the thread rather than an invisible one.
        path.style.strokeDashoffset = '0';
        place(length);
      });

    return () => {
      cancelled = true;
      ro.disconnect();
      scrollTrigger?.kill();
      tween?.kill();
    };
  }, [sectionEl, fromEl, reduced, segments, mode, onReady, buildD, remeasureKey]);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      preserveAspectRatio="none"
      className={className}
    >
      <path
        ref={pathRef}
        fill="none"
        stroke="#FF5B2E"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 6px rgba(255, 91, 46, 0.55))' }}
      />
      <circle
        ref={dotRef}
        r="3"
        fill="#FF5B2E"
        style={{
          opacity: 0,
          transition: 'opacity 0.2s linear',
          filter: 'drop-shadow(0 0 7px rgba(255, 91, 46, 0.9))',
        }}
      />
    </svg>
  );
}

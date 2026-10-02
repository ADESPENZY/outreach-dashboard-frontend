import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import loadMotion from '../motion/loadMotion';
import { PANELS } from './otherWayContent';
import { lineGeo } from './stageGeometry';

/**
 * The ApplyDir layer: one CV, one line, one person.
 *
 * Deliberately almost empty. The layer underneath is busy because volume is
 * its whole argument; this one has to feel like the opposite, so there is a
 * single path across a lot of white and nothing moves except what the line is
 * carrying.
 *
 * It plays once, when the section says the layer is properly revealed — not on
 * a scrub. A line that draws backwards when you nudge the wheel reads as a
 * widget; this one should read as something that happened.
 */

const ORANGE = '#FF5B2E';
const EMERALD = '#10B981';
const TONE = { primary: ORANGE, emerald: EMERALD };

export default function DirectLine({ reduced, wide, playThreshold = null, onReady, className = '' }) {
  const [el, setEl] = useState(null);
  const tl = useRef(null);
  const wanted = useRef(false);
  const g = lineGeo(wide);

  /** The section flips this when the layer passes its reveal threshold. */
  const setRevealed = useCallback((on) => {
    wanted.current = on;
    const t = tl.current;
    if (!t) return;
    if (on) t.play(); else t.reverse();
  }, []);

  useLayoutEffect(() => {
    if (!onReady) return undefined;
    return onReady({ setRevealed });
  }, [onReady, setRevealed]);

  // Reduced motion: the finished frame, written straight to the DOM. The whole
  // point of the layer is that it arrived, so it has to show arrival.
  useLayoutEffect(() => {
    if (!reduced || !el) return;
    const path = el.querySelector('[data-line]');
    const env = el.querySelector('[data-envelope]');
    if (path) {
      path.style.strokeDasharray = 'none';
      path.style.strokeDashoffset = '0';
      if (env) {
        const end = path.getPointAtLength(path.getTotalLength());
        env.setAttribute('transform', `translate(${end.x - g.envW / 2} ${end.y - g.envH / 2})`);
        env.style.opacity = '1';
      }
    }
    el.querySelectorAll('[data-inbox-row]').forEach((r) => { r.style.opacity = '1'; });
  }, [reduced, el, g.envW, g.envH]);

  useEffect(() => {
    if (reduced || !el) return undefined;

    let cancelled = false;
    let t;
    let io;

    loadMotion().then(({ gsap }) => {
      if (cancelled) return;
      const q = gsap.utils.selector(el);
      const path = q('[data-line]')[0];
      const tip = q('[data-tip]')[0];
      const env = q('[data-envelope]')[0];
      const ring = q('[data-ring]')[0];
      const rows = q('[data-inbox-row]');
      if (!path) return;

      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.set([tip, env], { opacity: 0 });
      gsap.set(rows, { opacity: 0, x: -8 });
      gsap.set(ring, { opacity: 0, attr: { r: g.avatar.r + 4 } });

      // The tip and the envelope ride the same head, so they can never
      // disagree about how far along the line the introduction has got.
      const place = (p) => {
        const at = path.getPointAtLength(len * p);
        if (tip) { tip.setAttribute('cx', at.x); tip.setAttribute('cy', at.y); }
        if (env) env.setAttribute('transform', `translate(${at.x - g.envW / 2} ${at.y - g.envH / 2})`);
      };

      const head = { p: 0 };
      t = gsap.timeline({ paused: true });
      t.to(tip, { opacity: 1, duration: 0.2 }, 0)
        .to(env, { opacity: 1, duration: 0.25 }, 0.1)
        .to(path, { strokeDashoffset: 0, duration: 1.15, ease: 'power1.inOut' }, 0)
        .to(head, { p: 1, duration: 1.15, ease: 'power1.inOut', onUpdate: () => place(head.p) }, 0)
        .to(tip, { opacity: 0, duration: 0.2 }, 1.05)
        // Arrival: the ring pulses out once, then the two rows appear in order.
        .fromTo(
          ring,
          { opacity: 0.9, attr: { r: g.avatar.r + 4 } },
          { opacity: 0, attr: { r: g.avatar.r + 18 }, duration: 0.7, ease: 'power2.out' },
          1.1,
        )
        .to(rows, { opacity: 1, x: 0, duration: 0.4, stagger: 0.28, ease: 'power2.out' }, 1.2);

      place(0);
      tl.current = t;
      if (wanted.current) t.play();

      // Stacked on a phone there is no divider to gate this, so the layer
      // watches for itself and plays once, the first time it is really on
      // screen. It never reverses: arrival is not something to take back.
      if (playThreshold !== null) {
        io = new IntersectionObserver(([e]) => {
          if (!e.isIntersecting) return;
          io.disconnect();
          io = null;
          wanted.current = true;
          t.play();
        }, { threshold: playThreshold });
        io.observe(el);
      }
    }).catch(() => { /* no motion: the layer stands as drawn */ });

    return () => {
      cancelled = true;
      tl.current = null;
      io?.disconnect();
      t?.kill();
    };
  }, [reduced, el, playThreshold, g.avatar.r, g.envW, g.envH]);

  const cvGlow = `drop-shadow(0 0 ${wide ? 10 : 7}px rgba(255, 91, 46, 0.35))`;
  const inboxGlow = `drop-shadow(0 0 ${wide ? 28 : 18}px rgba(255, 91, 46, 0.3))`;
  const ar = g.avatar.r;

  return (
    <div ref={setEl} data-directline="" aria-hidden="true" className={className}>
      <svg viewBox={`0 0 ${g.w} ${g.h}`} className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        {/* The CV */}
        <g style={{ filter: cvGlow }}>
          <rect
            x={g.card.x}
            y={g.card.y}
            width={g.card.w}
            height={g.card.h}
            rx={wide ? 12 : 8}
            fill="#FFFFFF"
            stroke={ORANGE}
            strokeWidth="2"
          />
          {[0.16, 0.3, 0.4, 0.5].map((f, i) => (
            <rect
              key={f}
              x={g.card.x + g.card.w * 0.14}
              y={g.card.y + g.card.h * f}
              width={g.card.w * (i === 0 ? 0.42 : i === 3 ? 0.4 : 0.72)}
              height={g.card.h * 0.028}
              rx={g.card.h * 0.014}
              fill={i === 0 ? '#C9C3BD' : '#E4E0DC'}
            />
          ))}
        </g>

        {/* The one line */}
        <path
          data-line
          d={g.d}
          fill="none"
          stroke={ORANGE}
          strokeWidth="2"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 5px rgba(255, 91, 46, 0.45))' }}
        />
        <circle
          data-tip
          r={wide ? 4 : 3}
          fill={ORANGE}
          style={{ opacity: 0, filter: 'drop-shadow(0 0 6px rgba(255, 91, 46, 0.9))' }}
        />

        {/* The envelope it carries */}
        <g data-envelope style={{ opacity: 0 }}>
          <rect width={g.envW} height={g.envH} rx="2.5" fill="#FFFFFF" stroke={ORANGE} strokeWidth="2" />
          <path
            d={`M1.5 3L${g.envW / 2} ${g.envH * 0.62}L${g.envW - 1.5} 3`}
            fill="none"
            stroke={ORANGE}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* The inbox. Same build as the hero's node, on light instead of dark. */}
        <g style={{ filter: inboxGlow }}>
          <rect
            x={g.ib.x}
            y={g.ib.y}
            width={g.ib.w}
            height={g.ib.h}
            rx={wide ? 16 : 12}
            fill="#FFFFFF"
            stroke="rgba(255, 91, 46, 0.35)"
            strokeWidth="1.5"
          />
        </g>
        <circle
          data-ring
          cx={g.avatar.cx}
          cy={g.avatar.cy}
          r={ar + 4}
          fill="none"
          stroke={ORANGE}
          strokeWidth="2"
          style={{ opacity: 0 }}
        />
        <circle cx={g.avatar.cx} cy={g.avatar.cy} r={ar} fill="#F4F2F0" stroke="#E4E0DC" strokeWidth="1.25" />
        <g transform={`translate(${g.avatar.cx} ${g.avatar.cy})`}>
          <circle cy={-ar * 0.26} r={ar * 0.36} fill="#C9C3BD" />
          <path
            d={`M${-ar * 0.62} ${ar * 0.72}c0-${ar * 0.36} ${ar * 0.29}-${ar * 0.58} ${ar * 0.62}-${ar * 0.58}s${ar * 0.62} ${ar * 0.22} ${ar * 0.62} ${ar * 0.58}`}
            fill="#C9C3BD"
          />
        </g>
        <text
          x={g.textX}
          y={g.avatar.cy - (wide ? 3 : 2)}
          fontSize={g.font.name}
          fontWeight="600"
          fill="#101010"
          fontFamily="inherit"
        >
          {PANELS.right.avatar}
        </text>
        <text
          x={g.textX}
          y={g.avatar.cy + (wide ? 17 : 14)}
          fontSize={g.font.sub}
          fill="#6B7280"
          fontFamily="inherit"
        >
          {PANELS.right.inbox}
        </text>
        <line
          x1={g.ib.x + (wide ? 30 : 20)}
          y1={g.dividerY}
          x2={g.ib.x + g.ib.w - (wide ? 30 : 20)}
          y2={g.dividerY}
          stroke="#EDEAE7"
          strokeWidth="1"
        />

        {PANELS.right.rows.map((row, i) => (
          <g key={row.text} data-inbox-row style={{ opacity: 0 }}>
            <circle cx={g.rowDot} cy={g.rowY[i] - g.font.row * 0.32} r={g.dotR} fill={TONE[row.tone]} />
            <text
              x={g.rowTextX}
              y={g.rowY[i]}
              fontSize={g.font.row}
              fontWeight={i === 0 ? '600' : '400'}
              fill={i === 0 ? '#101010' : '#6B7280'}
              fontFamily="inherit"
            >
              {row.text}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import loadMotion from '../motion/loadMotion';
import { PANELS } from './otherWayContent';
import { beltGeo } from './stageGeometry';

/**
 * The auto-apply layer: a belt feeding CVs into an applicant tracking system.
 *
 * Two dozen CVs at once, moving fast, because volume is the entire argument on
 * this side. The belt is machinery and runs on its own clock; the pile is a
 * one-shot that builds as you watch and then stays built, so the layer reads
 * as "this has been happening for a while" rather than resetting every lap.
 *
 * Greys and one red only. Nothing here is allowed to be brand orange: the
 * point of the stage is that this is the colourless half.
 */

const CYCLE = 2.6;          // one CV's whole journey — deliberately brisk
const TRAVEL_F = 0.74;      // of that, the share spent riding the belt
const SCAN_SECONDS = 1.6;
const PILE_SECONDS = 2.8;

/** A small CV: a card with three ruled lines. */
function CardShape({ w, h }) {
  const p = w * 0.2;
  const lw = w - p * 2;
  return (
    <g>
      <rect width={w} height={h} rx="2.5" fill="#D6D1CC" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <rect x={p} y={h * 0.2} width={lw} height={h * 0.07} rx="1" fill="#8E8781" />
      <rect x={p} y={h * 0.38} width={lw} height={h * 0.07} rx="1" fill="#A9A29C" />
      <rect x={p} y={h * 0.56} width={lw * 0.6} height={h * 0.07} rx="1" fill="#A9A29C" />
    </g>
  );
}

export default function Conveyor({ reduced, wide, activeThreshold = 0, onReady, className = '' }) {
  const [el, setEl] = useState(null);
  const api = useRef({ active: true, sync: null });
  const g = beltGeo(wide);
  const clipId = wide ? 'ow-belt-w' : 'ow-belt-t';
  const funnelId = wide ? 'ow-funnel-w' : 'ow-funnel-t';

  // The section gates this layer: once the divider has swept past it there is
  // nothing left to see, so the loops should not keep burning frames.
  useLayoutEffect(() => {
    if (!onReady) return undefined;
    return onReady({
      setActive: (v) => {
        api.current.active = v;
        api.current.sync?.();
      },
    });
  }, [onReady]);

  useEffect(() => {
    if (reduced || !el) return undefined;

    let cancelled = false;
    let belt;
    let pile;
    let io;
    let onVisibility;
    let onScreen = false;
    // Held across the effect: the ref object itself never changes identity,
    // so this is the same gate the section writes through.
    const gate = api.current;

    loadMotion().then(({ gsap }) => {
      if (cancelled) return;
      const q = gsap.utils.selector(el);
      const cards = q('[data-belt-card]');
      const tread = q('[data-tread]');
      const rollers = q('[data-roller]');
      const scan = q('[data-scan]');
      const layers = q('[data-pile-layer]');

      // Every child repeats forever and the parent just plays, so there is no
      // outer lap to wrap: the belt never empties out and refills.
      belt = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      belt.to(tread, { strokeDashoffset: -24, duration: 0.45, repeat: -1 }, 0);
      belt.to(rollers, { rotation: 360, transformOrigin: 'center', duration: 0.9, repeat: -1 }, 0);

      // The scanner, reading each CV at the mouth before it drops.
      belt.fromTo(
        scan,
        { y: 0 },
        { y: g.spoutY - g.mouthY, duration: SCAN_SECONDS, repeat: -1, ease: 'none' },
        0,
      );

      // One clock, and each CV reads its own position off it at a fixed offset.
      // Staggering 24 separate tweens inside one looping timeline leaves the
      // belt visibly bare for a moment on every lap; a phase does not.
      const span = g.lipX - g.startX;
      const phase = { t: 0 };
      gsap.set(cards, { transformOrigin: 'center center' });

      const placeCards = () => {
        cards.forEach((card, i) => {
          const u = (phase.t + i / cards.length) % 1;
          if (u < TRAVEL_F) {
            const k = u / TRAVEL_F;
            gsap.set(card, { x: g.startX + span * k, y: 0, rotation: 0, opacity: Math.min(1, k / 0.04) });
          } else {
            // Over the lip: it tips and drops out of sight into the funnel.
            const k = (u - TRAVEL_F) / (1 - TRAVEL_F);
            gsap.set(card, {
              x: g.startX + span,
              y: g.fallY * k * k,
              rotation: 28 * k,
              opacity: 1 - Math.max(0, (k - 0.4) / 0.6),
            });
          }
        });
      };

      belt.to(phase, { t: 1, duration: CYCLE, repeat: -1, ease: 'none', onUpdate: placeCards }, 0);
      placeCards();

      // The pile is a one-shot: it builds while you watch, then stays. Each
      // layer lands with its stamp, so the stamp reads as applied on arrival.
      pile = gsap.timeline({ paused: true });
      gsap.set(layers, { opacity: 0, y: -g.layerH * 2 });
      pile.to(layers, {
        opacity: 1,
        y: 0,
        duration: PILE_SECONDS / g.layers,
        stagger: PILE_SECONDS / g.layers,
        ease: 'power2.out',
      });

      const sync = () => {
        const run = gate.active && onScreen && document.visibilityState === 'visible';
        if (run) { belt.play(); pile.play(); } else { belt.pause(); pile.pause(); }
        el.setAttribute('data-belt', run ? 'running' : 'paused');
      };
      gate.sync = sync;

      io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }, { threshold: activeThreshold });
      io.observe(el);
      onVisibility = () => sync();
      document.addEventListener('visibilitychange', onVisibility);
      sync();
    }).catch(() => { /* no motion: the belt simply stands still */ });

    return () => {
      cancelled = true;
      gate.sync = null;
      io?.disconnect();
      if (onVisibility) document.removeEventListener('visibilitychange', onVisibility);
      belt?.kill();
      pile?.kill();
    };
  }, [
    reduced, el, activeThreshold,
    g.cards, g.startX, g.lipX, g.fallY, g.layerH, g.layers, g.mouthY, g.spoutY,
  ]);

  return (
    <div
      ref={setEl}
      data-conveyor=""
      data-belt={reduced ? 'static' : 'paused'}
      aria-hidden="true"
      className={className}
    >
      <svg viewBox={`0 0 ${g.w} ${g.h}`} className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          {/* Everything past the lip is hidden, so cards really do vanish into
              the funnel rather than sliding over the top of it. */}
          <clipPath id={clipId}>
            <rect x="0" y="0" width={g.cx + g.mouthHalf} height={g.mouthY + 2} />
          </clipPath>
          <clipPath id={funnelId}>
            <path d={g.funnelD} />
          </clipPath>
        </defs>

        {/* The funnel. Drawn before the belt so the belt's lip overlaps it. */}
        <path d={g.funnelD} fill="#3F3A36" />
        <rect
          x={g.cx - g.spoutHalf}
          y={g.spoutY}
          width={g.spoutHalf * 2}
          height={g.tubeY - g.spoutY}
          fill="#2E2A27"
        />
        <text
          x={g.cx}
          y={g.mouthY + (g.spoutY - g.mouthY) * 0.5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={g.font.funnel}
          fontWeight="700"
          letterSpacing="2"
          fill="#F4F2F0"
          fontFamily="inherit"
        >
          {PANELS.left.funnel}
        </text>

        {/* The scanner sweep, clipped to the funnel so it reads as inside it. */}
        <g clipPath={`url(#${funnelId})`}>
          <line
            data-scan
            x1={g.cx - g.mouthHalf}
            y1={g.mouthY}
            x2={g.cx + g.mouthHalf}
            y2={g.mouthY}
            stroke="rgba(239,68,68,0.6)"
            strokeWidth="2"
            style={{ opacity: reduced ? 0 : 1 }}
          />
        </g>

        {/* The pile, overflowing the bottom edge. */}
        <g>
          {Array.from({ length: g.layers }, (_, i) => {
            const y = g.pileBase - (i + 1) * g.layerH;
            // Each sheet lands slightly off-centre and slightly crooked, so
            // ten of them read as dropped rather than stacked by a machine.
            const skew = ((i % 3) - 1) * g.pileHalf * 0.3;
            const tilt = ((i % 5) - 2) * 1.5;
            const stamped = i % 3 === 0;
            return (
              // Outer group holds the resting place; gsap animates the inner
              // one, so the drop-in never fights the tilt.
              <g key={i} transform={`translate(${g.cx + skew} ${y}) rotate(${tilt})`}>
                <g data-pile-layer>
                  <rect
                    x={-g.pileHalf}
                    y={0}
                    width={g.pileHalf * 2}
                    height={g.layerH * 0.86}
                    rx={g.layerH * 0.18}
                    fill={i % 2 ? '#C9C3BD' : '#D6D1CC'}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1"
                  />
                  {stamped && (
                    <g transform={`translate(${g.pileHalf * 0.34} ${g.layerH * 0.42}) rotate(-8)`}>
                      <rect
                        x={-g.stampW / 2}
                        y={-g.stampH / 2}
                        width={g.stampW}
                        height={g.stampH}
                        rx="2"
                        fill="none"
                        stroke="rgba(239,68,68,0.7)"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={g.font.stamp}
                        fontWeight="700"
                        letterSpacing="1"
                        fill="rgba(239,68,68,0.7)"
                        fontFamily="inherit"
                      >
                        {PANELS.left.stamp.toUpperCase()}
                      </text>
                    </g>
                  )}
                </g>
              </g>
            );
          })}
        </g>

        <g clipPath={`url(#${clipId})`}>
          <rect
            x={g.startX}
            y={g.beltY}
            width={g.lipX - g.startX + g.cardW * 2}
            height={g.beltH}
            rx={g.beltH / 2}
            fill="#2A2724"
          />
          <line
            data-tread
            x1={g.startX + 6}
            y1={g.beltY + g.beltH / 2}
            x2={g.lipX + g.cardW * 2}
            y2={g.beltY + g.beltH / 2}
            stroke="#4A4541"
            strokeWidth={g.beltH * 0.28}
            strokeLinecap="round"
            strokeDasharray="6 18"
          />
          {[0.1, 0.4, 0.7, 1].map((f) => (
            <g
              key={f}
              data-roller
              transform={`translate(${g.startX + (g.lipX - g.startX) * f} ${g.beltY + g.beltH * 1.9})`}
            >
              <circle r={g.beltH * 0.78} fill="#241F1D" stroke="#4A4541" strokeWidth="1.25" />
              <line
                x1="0"
                y1={-g.beltH * 0.42}
                x2="0"
                y2={g.beltH * 0.42}
                stroke="#6B6560"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            </g>
          ))}
          {Array.from({ length: g.cards }, (_, i) => {
            // Without motion nothing ever places these, and an empty belt
            // reads as broken rather than still. So the static frame lays them
            // out along it by hand, dropping the ones that would be mid-fall.
            const u = i / g.cards;
            const riding = u < TRAVEL_F;
            const restX = g.startX + (g.lipX - g.startX) * (u / TRAVEL_F);
            return (
              <g
                key={i}
                data-belt-card
                style={{ opacity: reduced && riding ? 1 : 0 }}
                transform={reduced && riding ? `translate(${restX} 0)` : undefined}
              >
                <g transform={`translate(0 ${g.beltY - g.cardH})`}>
                  <CardShape w={g.cardW} h={g.cardH} />
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

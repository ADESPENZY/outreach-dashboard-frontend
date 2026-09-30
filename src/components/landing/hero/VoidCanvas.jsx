import { useEffect, useRef } from 'react';
import { coreGlowRadius } from './vortexMetrics';

/**
 * The vortex: a slow spiral of tiny CV cards being pulled into an orange core.
 *
 * Plain canvas on purpose — 140 sprites at 60fps is nothing for 2D context, and
 * it keeps the landing entry bundle free of any animation library. Nothing here
 * is imported by the rest of the page, so the whole effect can be deleted in one
 * file if it ever stops earning its place.
 */

const ORANGE = '255, 91, 46';
const INK = '#101010';
const INK_RGBA = 'rgba(16, 16, 16, 0.22)';   // one frame's worth of fade for the trails
const MIN_RADIUS = 12;          // pulled in past this → the void ate it, respawn
const POINTER_MAX = 40;         // px the core may drift toward the cursor
const POINTER_LERP = 0.05;
const INNER_SPEEDUP = 4;        // angular speed at the core, relative to the rim
const RING_TURN_SECONDS = 12;   // one rotation of the dashed core ring
const TRAIL_MARGIN = 14;        // px of headroom the streaks need above the copy
const TAU = Math.PI * 2;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Classic smoothstep: 0 below `a`, 1 above `b`, eased in between. */
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * A single falling CV: width 14–34px, portrait, faint white.
 *
 * Live particles spawn on a ring between 0.45 and 0.62 of the short side, so
 * the field stays a disc around the core rather than a screen-wide snowstorm.
 * `spread` seeds the initial field across the whole range instead, biased 60/40
 * toward the inner half — which is roughly where the shrink law settles anyway,
 * so the vortex looks the same one second in as one minute in.
 */
function seedParticle(ring, spread) {
  const w = 14 + Math.random() * 20;
  let radius;
  if (spread) {
    const half = ring.outer / 2;
    radius = Math.random() < 0.6
      ? MIN_RADIUS + Math.random() * (half - MIN_RADIUS)
      : half + Math.random() * (ring.outer - half);
  } else {
    radius = ring.inner + Math.random() * (ring.outer - ring.inner);
  }
  return {
    angle: Math.random() * TAU,
    radius,
    spin: 0.18 + Math.random() * 0.10,
    w,
    h: w * 1.28,
    alpha: 0.08 + Math.random() * 0.37,   // 0.08–0.45
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/**
 * @param {(rect: {width:number,height:number}) => {x:number,y:number}} getCenter
 *        Where the core sits, in canvas pixels. Owned by HeroVoid so the card
 *        and the thread line can anchor to the same point.
 */
export default function VoidCanvas({ getCenter, reduced, className = '' }) {
  const canvasRef = useRef(null);
  // getCenter is rebuilt on every breakpoint change; hold it in a ref so the
  // RAF loop always reads the current one without re-running the effect.
  const centerFn = useRef(getCenter);
  centerFn.current = getCenter;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let ring = { inner: 1, outer: 1 };
    let glowR = 160;
    let discR = 34;
    let wide = true;          // lg+ — decides which keep-off ramp applies
    let rampA = 0;            // ramp start, canvas px (x when wide, y when not)
    let rampB = 1;            // ramp end
    let particles = [];
    let needsClear = true;    // full wipe on the first frame and after a resize
    const core = { x: 0, y: 0 };
    const pointer = { x: null, y: null };
    let raf = 0;
    let last = 0;
    let running = false;
    let visible = true;

    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;

    /**
     * Where the keep-off ramp sits.
     *
     * The baseline is the design's fractions of the canvas — 42%→56% across on
     * lg+, 38%→52% down below it. Those are right in spirit but they are guesses
     * about where the copy is, and two things break the guess: the hero runs
     * ~20% taller than the viewport on mobile (the copy stacks under the vortex
     * but is placed in svh units, so a fraction of the taller canvas lands below
     * the text), and the copy column is a larger share of the width at 1024 than
     * at 1440. So we also measure the copy and take whichever bound is stricter.
     * The ramp then tracks the text instead of approximating it, at any size.
     */
    function measureRamp(rect) {
      const hero = canvas.parentElement;
      const h1 = hero?.querySelector('h1');
      const col = h1?.parentElement;

      if (wide) {
        // Horizontally, everything in the copy column has to stay clear.
        let right = 0;
        if (col) {
          const guarded = [h1, ...col.querySelectorAll(':scope > p'), ...col.querySelectorAll(':scope > div > a')];
          for (const el of guarded) {
            const r = el.getBoundingClientRect();
            if (r.width) right = Math.max(right, r.right - rect.left);
          }
        }
        rampA = Math.max(width * 0.42, right);
        rampB = Math.max(width * 0.56, rampA + width * 0.14);
      } else {
        // Vertically, the headline is the top of what must stay clean. The
        // margin is for the trails: a card fading out just above the cut still
        // smears a few px downward before it decays, and that smear was landing
        // inside the headline's box.
        const ref = Math.min(height, window.innerHeight || height);
        const top = h1 ? h1.getBoundingClientRect().top - rect.top - TRAIL_MARGIN : Infinity;
        rampB = Math.min(ref * 0.52, top);
        rampA = rampB - ref * 0.14;
      }
    }

    function measure() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const short = Math.min(width, height);
      ring = { inner: short * 0.45, outer: short * 0.62 };
      wide = window.innerWidth >= 1024;
      glowR = coreGlowRadius(wide);
      discR = wide ? 34 : 24;
      measureRamp(rect);

      const want = window.innerWidth < 768 ? 50 : 140;
      if (particles.length !== want) {
        particles = Array.from({ length: want }, () => seedParticle(ring, true));
      } else {
        for (const p of particles) p.radius = Math.min(p.radius, ring.outer);
      }
      const c = centerFn.current({ width, height });
      core.x = c.x;
      core.y = c.y;
      needsClear = true;
    }

    /** Keeps the field off the copy: a soft edge, not a hard clip. */
    function keepOff(x, y) {
      return wide
        ? smoothstep(rampA, rampB, x)
        : 1 - smoothstep(rampA, rampB, y);
    }

    function render(dt, t) {
      const base = centerFn.current({ width, height });
      let tx = base.x;
      let ty = base.y;
      if (fine && pointer.x !== null) {
        const dx = pointer.x - base.x;
        const dy = pointer.y - base.y;
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(POINTER_MAX, d) / d;
        tx = base.x + dx * k;
        ty = base.y + dy * k;
      }
      core.x += (tx - core.x) * POINTER_LERP;
      core.y += (ty - core.y) * POINTER_LERP;

      if (needsClear || dt === 0) {
        ctx.clearRect(0, 0, width, height);
        needsClear = false;
      } else {
        // Fade the previous frame toward the section ground instead of wiping
        // it: each card leaves a short streak along its own orbit.
        ctx.fillStyle = INK_RGBA;
        ctx.fillRect(0, 0, width, height);
      }

      // Core bloom, breathing.
      const pulse = 0.82 + 0.18 * Math.sin(t * 0.9);
      const g = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, glowR);
      g.addColorStop(0, `rgba(${ORANGE}, ${0.28 * pulse})`);
      g.addColorStop(0.45, `rgba(${ORANGE}, ${0.10 * pulse})`);
      g.addColorStop(1, `rgba(${ORANGE}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(core.x - glowR, core.y - glowR, glowR * 2, glowR * 2);

      for (const p of particles) {
        if (dt > 0) {
          p.radius -= (16 + p.radius * 0.055) * dt;
          // Angular speed ramps from 1× at the rim to INNER_SPEEDUP× at the
          // core, so the last turn before a card vanishes is the fast one.
          const nearCore = 1 - clamp((p.radius - MIN_RADIUS) / (ring.outer - MIN_RADIUS), 0, 1);
          p.angle += p.spin * (1 + (INNER_SPEEDUP - 1) * nearCore) * dt;
          if (p.radius < MIN_RADIUS) Object.assign(p, seedParticle(ring, false));
        }

        const near = clamp((p.radius - MIN_RADIUS) / (ring.outer - MIN_RADIUS), 0, 1);
        const scale = 0.32 + 0.68 * near ** 0.55;

        // Squashed orbit reads as a disc seen at an angle rather than a flat ring.
        const x = core.x + Math.cos(p.angle) * p.radius;
        const y = core.y + Math.sin(p.angle) * p.radius * 0.62;
        if (x < -60 || x > width + 60 || y < -60 || y > height + 60) continue;

        const a = p.alpha * clamp(near * 2.4, 0, 1) * keepOff(x, y);
        if (a <= 0.004) continue;

        // Tangent of that ellipse, so each card banks into its own travel.
        const tangent = Math.atan2(Math.cos(p.angle) * 0.62, -Math.sin(p.angle));

        const w = p.w * scale;
        const h = p.h * scale;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tangent);

        roundRectPath(ctx, -w / 2, -h / 2, w, h, Math.min(3.5, w * 0.14));
        ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.14})`;
        ctx.fill();
        ctx.lineWidth = Math.max(0.6, 0.9 * scale);
        ctx.strokeStyle = `rgba(255, 255, 255, ${a})`;
        ctx.stroke();

        // Three skeleton lines, batched into one stroke.
        const pad = w * 0.2;
        const gap = h * 0.2;
        const top = -h / 2 + h * 0.27;
        ctx.beginPath();
        for (let i = 0; i < 3; i += 1) {
          const yy = top + i * gap;
          const len = (i === 2 ? 0.55 : 1) * (w - pad * 2);
          ctx.moveTo(-w / 2 + pad, yy);
          ctx.lineTo(-w / 2 + pad + len, yy);
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${a * 0.7})`;
        ctx.lineWidth = Math.max(0.5, 0.7 * scale);
        ctx.stroke();

        ctx.restore();
      }

      // The void itself, on top: anything that got this far is gone.
      ctx.beginPath();
      ctx.arc(core.x, core.y, discR, 0, TAU);
      ctx.fillStyle = INK;
      ctx.fill();

      // A slow dashed ring around the mouth — the only thing here that reads as
      // machinery rather than weather.
      ctx.save();
      ctx.translate(core.x, core.y);
      ctx.rotate((t / RING_TURN_SECONDS) * TAU);
      ctx.beginPath();
      ctx.arc(0, 0, discR, 0, TAU);
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(${ORANGE}, 0.45)`;
      ctx.stroke();
      ctx.restore();
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      render(dt, now / 1000);
    }

    function start() {
      if (running || reduced) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    measure();

    if (reduced) {
      // One clean frame, no loop and no trails. dt = 0 freezes the field where
      // it was seeded and forces the full clear.
      render(0, 0);
      const roStatic = new ResizeObserver(() => { measure(); render(0, 0); });
      roStatic.observe(canvas);
      return () => roStatic.disconnect();
    }

    const ro = new ResizeObserver(() => measure());
    ro.observe(canvas);

    // Don't burn a RAF loop on a hero nobody is looking at.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && document.visibilityState === 'visible') start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && visible) start();
      else stop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let onPointerMove;
    if (fine) {
      onPointerMove = (e) => {
        const rect = canvas.getBoundingClientRect();
        pointer.x = e.clientX - rect.left;
        pointer.y = e.clientY - rect.top;
      };
      window.addEventListener('pointermove', onPointerMove, { passive: true });
    }

    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      if (onPointerMove) window.removeEventListener('pointermove', onPointerMove);
    };
  }, [reduced]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}

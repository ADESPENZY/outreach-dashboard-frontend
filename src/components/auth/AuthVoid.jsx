import { motion } from 'framer-motion';
import { VOID_TURN_SECONDS } from './authMotion';

/**
 * The void, as a backdrop for the story panel: bottom-right, mostly cropped.
 *
 * Plain DOM on purpose. hero/VoidCanvas.jsx is tied to the landing hero (it
 * measures the hero's h1), and a slow 140s turn needs no canvas.
 *
 * Under <MotionConfig reducedMotion="user"> the rotation drops out and the
 * still frame is what shows.
 */

const SIZE = 640;
const C = SIZE / 2;

// Ring insets (px from the 640px circle's edge) → radii.
const RINGS = [40, 120, 200];
const radius = (inset) => C - inset;

/**
 * The CVs: ~15 small portrait outlines on the rings. Fixed, not random, so the
 * frame is the same on every load. Each: [ring index, angle deg, width px, tilt deg].
 */
const CVS = [
  [0, 192, 24, -14], [0, 214, 20, 9], [0, 238, 26, -4], [0, 262, 18, 17], [0, 300, 22, -11], [0, 150, 22, 6],
  [1, 186, 22, 12], [1, 222, 18, -8], [1, 252, 26, 4], [1, 284, 20, -16], [1, 120, 24, 10],
  [2, 200, 20, -6], [2, 240, 24, 14], [2, 276, 18, -12], [2, 60, 22, 8],
];

export default function AuthVoid({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -bottom-[220px] -right-[200px] h-[640px] w-[640px] ${className}`}
    >
      {/* Glow */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,theme(colors.primary.light/42%)_0%,transparent_66%)]" />

      {/* Rings and CVs turn together */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: VOID_TURN_SECONDS, ease: 'linear', repeat: Infinity }}
      >
        {RINGS.map((inset) => (
          <div
            key={inset}
            className="absolute rounded-full border border-white/[0.07]"
            style={{ inset: `${inset}px` }}
          />
        ))}

        {CVS.map(([ring, angle, w, tilt], i) => {
          const r = radius(RINGS[ring]);
          const a = (angle * Math.PI) / 180;
          const h = (w * 4) / 3;
          return (
            <span
              key={i}
              className="absolute rounded-[3px] border border-white/25"
              style={{
                width: `${w}px`,
                height: `${h}px`,
                left: `${C + r * Math.cos(a) - w / 2}px`,
                top: `${C + r * Math.sin(a) - h / 2}px`,
                transform: `rotate(${tilt}deg)`,
              }}
            />
          );
        })}
      </motion.div>

      {/* Centre disc */}
      <div className="absolute left-1/2 top-1/2 h-[116px] w-[116px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-void" />
    </div>
  );
}

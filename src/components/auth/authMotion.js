/**
 * Shared motion values for /login and /register (AUTH_DESIGN_GUIDE.md §7).
 *
 * Framer Motion only on these pages. Every page wraps itself in
 * <MotionConfig reducedMotion="user">, so transforms drop out for anyone who
 * asked the OS to reduce motion; opacity fades still run.
 */

export const EASE_OUT = [0.2, 0.7, 0.2, 1];
export const EASE_IN_OUT = [0.4, 0, 0.2, 1];

/** Visible focus for every control on an ink ground. */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-ink';

/* ── Form ─────────────────────────────────────────────────────────────── */

/** Page load: each block rises 12px and fades in, 0.06s apart. */
export const riseContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export const riseItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

/** Error shake, applied to the block at fault only. */
export const SHAKE_X = [0, -7, 6, -4, 3, 0];
export const SHAKE_TRANSITION = { duration: 0.42, ease: EASE_IN_OUT };

/** PillButton: the arrow circle nudges right on hover; the button dips on press. */
export const pillButtonVariants = {
  rest: { scale: 1 },
  hover: { scale: 1 },
  press: { scale: 0.985 },
};

export const pillCircleVariants = {
  rest: { x: 0, transition: { duration: 0.25, ease: EASE_OUT } },
  hover: { x: 4, transition: { duration: 0.25, ease: EASE_OUT } },
  press: { x: 4, transition: { duration: 0.25, ease: EASE_OUT } },
};

/** Done state: the check pops 0.6 → 1.08 → 1. */
export const checkPop = {
  initial: { scale: 0.6, opacity: 0 },
  animate: { scale: [0.6, 1.08, 1], opacity: 1 },
  transition: { duration: 0.4, ease: EASE_OUT },
};

/** Icon swaps inside the button circle. */
export const iconSwap = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
};

/** How long the "done" state shows before the redirect. Spec cap: 400ms. */
export const DONE_HOLD_MS = 350;

/* ── Story ────────────────────────────────────────────────────────────── */

/** One full turn of the void's rings and CVs. */
export const VOID_TURN_SECONDS = 140;

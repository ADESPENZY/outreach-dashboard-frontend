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
  // Signup step change (AnimatePresence mode="wait"): out fades, in rises.
  exit: { opacity: 0, transition: { duration: 0.25, ease: EASE_OUT } },
};

/** Email domain chips: the row opens from 0 height and fades. */
export const chipsRow = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: 0.25, ease: EASE_OUT } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.25, ease: EASE_OUT } },
};

/** How long "You're in." shows before the post-signup redirect. */
export const SIGNUP_DONE_HOLD_MS = 1200;

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

/** First paint shows the finished frame; the loop starts this much later. */
export const STORY_START_DELAY_MS = 2200;

/**
 * Login story, ms from loop start (§7). Phases:
 * 0 clear · 1 card A · 2 Delivered · 3 timeline, Day 3 · 4 Day 7 ·
 * 5 reply, Day 14 cancelled. The last step is also the finished frame.
 */
export const LOGIN_TIMELINE = {
  steps: [
    { at: 0, phase: 0 },
    { at: 700, phase: 1 },
    { at: 1700, phase: 2 },
    { at: 3400, phase: 3 },
    { at: 5000, phase: 4 },
    { at: 6800, phase: 5 },
  ],
  loopMs: 12600,
};

/** Story card in/out. Out is quicker: it is the loop clearing, not narration. */
export const storyCard = {
  out: { opacity: 0, y: 14, transition: { duration: 0.3, ease: EASE_IN_OUT } },
  in: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

/** Thread segment draws from the top. */
export const threadDraw = { duration: 0.8, ease: EASE_IN_OUT };

/** Timeline fill grows from the left. */
export const timelineFill = { duration: 0.9, ease: EASE_IN_OUT };

/** Caption change: the new one rises 14px while the old one fades. */
export const captionSwap = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

/** Small fades inside a card ("Delivered", progress segments). */
export const storyFade = { duration: 0.4, ease: EASE_OUT };

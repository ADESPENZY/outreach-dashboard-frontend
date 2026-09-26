// Shared entrance variants for the Progress page sections.
// Moved unchanged from the original single-file ProgressPage.

// Staggered entrance — sections cascade in like the Opportunities feed.
export const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
export const RISE = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

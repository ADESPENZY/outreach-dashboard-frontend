/**
 * Numbers the vortex and the things that must avoid it both depend on.
 *
 * Its own module because the canvas draws the glow and the hero routes the
 * user's CV around it — if these two ever disagree, the scene starts saying the
 * opposite of what it means.
 */

/** How far the orange core bloom reaches, in px. */
export const coreGlowRadius = (wide) => (wide ? 160 : 110);

/**
 * One coordinate system for both stage layers, at both shapes.
 *
 * The stage is 16/8 on desktop and 4/5 on mobile — the same scene at two very
 * different aspect ratios — so neither layer can hardcode pixel positions.
 * Everything below is derived from a box, and the boxes are deliberately sized
 * close to the stage's real rendered width (1152 is exactly max-w-6xl; 340 is
 * about a 375 phone less its gutters). That keeps the SVG scale near 1:1, so a
 * fontSize of 10 really is about 10px on screen at both ends and the small
 * type does not collapse on a phone.
 */

export const BOX = {
  wide: { w: 1152, h: 576 },
  tall: { w: 340, h: 425 },
};

/** The auto-apply layer: belt, funnel, pile. */
export function beltGeo(wide) {
  const { w, h } = wide ? BOX.wide : BOX.tall;

  const cx = w * 0.58;             // funnel centre line
  const beltY = h * 0.3;
  const startX = -w * 0.1;         // cards enter from off-stage
  const lipX = cx - w * 0.09;      // where they tip off the end

  const mouthY = h * 0.42;
  const spoutY = h * 0.6;
  const tubeY = h * 0.65;
  const mouthHalf = w * 0.19;
  const spoutHalf = w * 0.055;

  const layers = 10;
  const layerH = h * 0.038;
  // Narrow enough to read as a stack of CVs seen edge-on. Wider than this and
  // ten of them look like shelving, not paper.
  const pileHalf = w * 0.095;
  const pileBase = h * 1.03;       // past the bottom edge, so it is cut off

  return {
    w, h, cx, beltY, startX, lipX,
    beltH: wide ? 14 : 9,
    mouthY, spoutY, tubeY, mouthHalf, spoutHalf,
    funnelD: `M ${cx - mouthHalf} ${mouthY} L ${cx + mouthHalf} ${mouthY} `
           + `L ${cx + spoutHalf} ${spoutY} L ${cx - spoutHalf} ${spoutY} Z`,
    layers, layerH, pileHalf, pileBase,
    // The tall belt is a third of the length, so the same 24 would sit on top
    // of one another. Fewer cards, same density.
    cards: wide ? 24 : 13,
    cardW: wide ? 27 : 15,
    cardH: wide ? 36 : 20,
    fallY: h * 0.22,
    font: { funnel: wide ? 17 : 12, stamp: wide ? 10 : 8 },
    stampW: wide ? 62 : 44,
    stampH: wide ? 16 : 12,
  };
}

/** The ApplyDir layer: one CV, one line, one inbox. */
export function lineGeo(wide) {
  const { w, h } = wide ? BOX.wide : BOX.tall;

  // On the tall stage the label sits across the top of the layer, so the CV
  // starts below it — at y 36 the two overlapped and the caption read through
  // the card.
  const card = wide
    ? { x: 110, y: 190, w: 150, h: 196 }
    : { x: 26, y: 108, w: 92, h: 112 };

  const ib = wide
    ? { x: 700, y: 170, w: 380, h: 220 }
    : { x: 30, y: 250, w: 280, h: 160 };

  const pad = wide ? 30 : 20;
  const r = wide ? 22 : 17;
  const avatar = { cx: ib.x + pad + r, cy: ib.y + pad + r, r };
  const textX = ib.x + pad + 2 * r + (wide ? 16 : 12);
  const dividerY = ib.y + pad + 2 * r + (wide ? 18 : 14);

  // The route in, drawn as a shallow curve rather than a wire: on the wide
  // stage it crosses the gap, on the tall one it has to come down instead.
  // Stops short of the card rather than on its edge: the envelope rests at the
  // end of the line, and an envelope straddling the border reads as a glitch.
  const d = wide
    ? `M ${card.x + card.w} ${card.y + card.h * 0.5} C ${card.x + card.w + 170} ${card.y + card.h * 0.5}, `
      + `${ib.x - 190} ${ib.y + 82}, ${ib.x - 28} ${ib.y + 82}`
    : `M ${card.x + card.w} ${card.y + card.h * 0.5} C ${card.x + card.w + 80} ${card.y + card.h * 0.5}, `
      + `${ib.x + 150} ${ib.y - 64}, ${ib.x + 138} ${ib.y - 26}`;

  return {
    w, h, card, ib, avatar, textX, dividerY,
    d,
    rowDot: ib.x + pad + (wide ? 6 : 4),
    rowTextX: ib.x + pad + (wide ? 24 : 18),
    rowY: [dividerY + (wide ? 34 : 26), dividerY + (wide ? 72 : 56)],
    dotR: wide ? 4.5 : 3.5,
    font: { name: wide ? 16 : 13, sub: wide ? 13 : 11, row: wide ? 14 : 12 },
    envW: wide ? 26 : 19,
    envH: wide ? 19 : 14,
  };
}

# ApplyDir — identity, v2

Start with **ApplyDir-brand-identity.html** (the full document) or
**ApplyDir-logo-usage.html** (one page, printable). Both embed the font and work
offline. Every SVG here is outlined and carries no signing metadata.

---

## What changed, and why

The concept held. The execution did not.

The v1 mark had two arms of equal weight meeting at a point. That is a symmetric
arrowhead — the most occupied shape in software iconography (play, forward, next,
media, navigation). Whatever it was drawn from, it was going to keep landing in that
neighbourhood, and the "A" reading collapsed at small sizes because the crossbar
closed into a solid triangle.

The fix is structural, not cosmetic. A real capital A has a **thin left diagonal and
a thick right one**. Rotated ninety degrees, that becomes a **thin top arm (14 units)
and a heavy bottom arm (25 units)**. No play button, chevron, or navigation glyph has
asymmetric arms — they are mirror-symmetric by construction. That asymmetry is what
makes this read as a letterform that happens to point, rather than an arrow that
happens to have a bar in it. Both inner edges now converge on a single notch at
x = 70, so the arms taper into the apex instead of running parallel, and the crossbar
is drawn lighter than either arm, as it is in type.

Three genuinely different directions were drawn and rejected before landing here:

| Direction | Why it was cut |
|---|---|
| **Aperture** — crossbar detached from the lower arm | Indistinguishable from the control above 32 px, and the gap closed below it. Fragility with no gain. |
| **Displaced** — the apex sliced off and moved forward | Best of the three: the tip travelling reads as the introduction leaving. But it fragments into two blobs at 16 px and looks like a broken glyph. |
| **Line-through** — a stack of bars with one pulled forward | The most literal statement of the product and the most generic picture: it is a hamburger menu or a sort icon. Rejected on sight at 16 px. |

The honest finding was that the alternatives lost more than they gained. So this is a
refinement rather than a replacement — with the one change that actually mattered.

---

## The system

**Mark.** The capital A of ApplyDir turned ninety degrees to face right. 74 × 76 units,
near-square, so it drops into a tile, an avatar, or a favicon without special-casing.
Chisel-cut apex. One open counter, never filled.

**Wordmark.** Bricolage Grotesque Bold (variable, `wght` 700 / `opsz` 96), converted to
outlines, re-kerned by hand at `Ap`, `pl`, `ly`, `yD`. The dot on the **i** is the only
colour inside the word.

**Two cuts.** Standard at 32 px and above. Small cut below it — arms thickened to
19/28, counter widened, notch pulled back to x = 66 so the letter survives the pixel
grid. It is the only permitted redraw.

---

## Files

Everything lives in `Frontend/Job_Automation/brand/`. Vectors in `svg/`, rasters at the
top level, drop-in product files in `code/`. Every SVG here was regenerated from the v2
master paths, so none carries C2PA signing metadata (that stripped 7.7 KB off the
horizontal lockup alone).

### `svg/` - 20 vectors
| Group | Files |
|---|---|
| Horizontal lockup | `applydir-logo-horizontal.svg` + `-reversed` `-mono-black` `-mono-white` |
| Stacked lockup | `applydir-logo-stacked.svg` + `-reversed` `-mono-black` `-mono-white` |
| Mark, standard cut | `applydir-mark.svg` + `-black` `-white` |
| Mark, small cut | `applydir-mark-small.svg` + `-black` `-white` |
| App icon | `applydir-app-icon.svg` (ink tile) + `-orange` |
| Maskable | `applydir-maskable-icon.svg` + `-orange` - full bleed, no corner radius |
| Favicon | `applydir-favicon.svg` (32 px cut) + `applydir-favicon-16.svg` |

### Rasters
| File | Use |
|---|---|
| `applydir-app-icon-1024/512/192.png` | Store listing, web manifest `any` |
| `applydir-maskable-icon-512/192.png` | Web manifest `maskable` |
| `applydir-apple-touch-icon-180.png` | iOS home screen |
| `applydir-icon-32/16.png` | Legacy favicon fallbacks |
| `favicon.ico` | Multi-resolution ICO |
| `applydir-mark-1024.png`, `-white-1024.png` | Transparent mark, print and slides |
| `applydir-email-signature-1x/2x.png` + `-reversed-1x/2x` | 36 px and 72 px tall, transparent - mail clients do not render SVG |
| `og-image.png` | 1200x630 social card, text outlined |

`brand-sheet.png` is a render of all 20 vectors, regenerated whenever the set changes.

Not produced: the 2400 px rasters and `og-image-alt.png` from the source manifest.
Neither blocks the landing page.

## Shipping it (`code/`)

| File | Status |
|---|---|
| `code/Logo.jsx` | **Shipped** to `src/components/brand/Logo.jsx`. Lints clean. |
| `code/site.webmanifest` | Ready. Separate `any` and `maskable` entries; replaces the `vite-plugin-pwa` generated manifest in `vite.config.js`. |
| `code/index-head.html` | **Not yet applied** - favicon block, canonical, OG and Twitter tags. |
| `code/DESIGN_GUIDE-typography-patch.md` | **Not yet applied** - replaces section 2 of `DESIGN_GUIDE.md`, adds section 2b. |

Live in `public/`: `favicon.ico`, `applydir-favicon.svg`, `applydir-apple-touch-icon-180.png`,
`applydir-app-icon-192/512.png`, `applydir-maskable-icon-192/512.png`, `og-image.png`.

Live in the app: the horizontal lockup renders in the sidebar, the legal pages, and
reversed on all four auth screens. The old rocket glyph is gone from every lockup.

Still referencing the old rocket: `index.html` (favicon links) and the
`vite-plugin-pwa` manifest in `vite.config.js`, plus the stale `public/logo.svg` and
`public/pwa-*.png`. Those come out with the `index-head.html` change.

### One correction to the source files

`Logo.jsx` shipped with the horizontal lockup at `viewBox="0 0 737.68 142.00"` while the
SVG master uses `144.33`. The wordmark descenders on `p`, `p` and `y` reach y = 144.41,
so 142.00 clipped them flat. The component now uses `144.33` to match the master.

## Where it was checked

Sidebar at 26 px on white · auth screens reversed on `#0B0C10` · browser tab at 16 px ·
Android and iOS home screens including circular crop · beside a sender name in a cold
email · pasted into a chat client as a link preview.

## Non-negotiables

- Signal Orange `#FF5B2E` is the only accent. Ink `#101010` for type and reversed fields.
- Roughly 70% white or stone, 25% ink, 5% orange.
- Clear space on all four sides equals the crossbar width.
- Never stretch, rotate, recolour, outline, fill the counter, or place on a mid tone.
- One mark per surface. Never re-typeset the wordmark in a live font.

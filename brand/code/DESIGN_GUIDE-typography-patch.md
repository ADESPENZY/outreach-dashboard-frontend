# DESIGN_GUIDE patch — sections 2 and (new) 2b

The guide currently specifies Montserrat for headings and Roboto for body, and warns
against Inter. The Tailwind config has since repointed `font-montserrat`,
`font-roboto`, and `font-sans` at **Bricolage Grotesque**, so all three keys now
resolve to one family. Replace §2 with the following, and add §2b.

---

## 2. Typography

### The typeface

**Bricolage Grotesque** — one variable family, app-wide. The `montserrat` and `roboto`
Tailwind keys are kept and repointed rather than renamed, so existing `font-*` classes
pick it up without touching component files. Renaming those keys is a separate,
reviewable change.

Load it as a variable font with the `opsz`, `wdth`, and `wght` axes intact. Do not ship
static weights — the optical-size axis is what keeps display text tight and body text
readable, and it is the reason this face does not look like every other grotesque.

**Never use Inter, Montserrat, or Roboto.** If any of the three is still referenced in
`index.html` or via an `@import` in `src/index.css`, remove it — a render-blocking
`@import` for a font that no longer exists is pure latency.

### Axis settings

| Role | `wght` | `opsz` | Tracking |
|---|---|---|---|
| Page titles, hero headlines | 700 | 96 | −3.5% |
| Section and card headings | 600 | 48 | −2% |
| Body, descriptions | 400 | 16–24 | 0 |
| Interface labels, nav, buttons | 500–600 | 16 | 0 |
| Helper text, captions | 400 | 12 | 0 |

Set with `font-variation-settings`, e.g.
`font-variation-settings:"wght" 700,"opsz" 96`.

### Rules

- Sentence case everywhere, including buttons, labels, and section headers. The old
  uppercase micro-label style (`text-[10px]` tracked, uppercase) is retired — it reads
  as template chrome and fails the 12px floor.
- Never letterspace lowercase. Only headlines get negative tracking.
- `leading-relaxed` for paragraphs, `leading-tight` for headlines.
- Floor stays at 12px (`text-xs`) for anything a user must read.

---

## 2b. The logo (new section)

Use the `Logo` component. Never re-typeset the wordmark in a live font, never rebuild
the mark from primitives, never apply the orange gradient to the wordmark.

```jsx
import Logo from "@/components/brand/Logo";

<Logo height={28} />                      // sidebar, header — horizontal lockup
<Logo tone="reversed" height={28} />      // on ink or on photography
<Logo variant="mark" height={20} />       // avatars, favicons, tight spaces
<Logo variant="stacked" height={120} />   // auth screens, covers
```

- The lockup appears **once** per screen, top left. It does not repeat in the footer of
  an app page.
- Clear space on all four sides equals the crossbar width — roughly 20% of the mark's
  height. Nothing enters that field.
- Below 32px use `<Logo variant="mark" small />`; the small cut thickens the arms so
  the counter survives the pixel grid.
- The mark never rotates, stretches, gains an outline, or sits on a mid tone.
- Orange stays an accent. Existing rule holds: roughly 70% white or stone, 25% ink,
  5% orange. If a screen looks orange, it is wrong.

### Loader

`ui/ApplyDirLoader.jsx` keeps the orange shimmer sweep. Where a mark is needed in a
loading state, use `<Logo variant="mark" />` at rest with the shimmer behind it — do
not animate, spin, or pulse the mark itself.

# ApplyDir — identity assets

Open **ApplyDir-brand-identity.html** first. It is the full presentation: rationale,
construction, clear space, colour, type, application mockups, category positioning,
and misuse rules. The font is embedded, so it renders correctly offline.

## The mark

The capital **A** of ApplyDir, rotated ninety degrees to face right. Upright it is the
initial; turned, it is an arrowhead — the introduction the product performs. Arms taper
toward a chisel-cut apex; the crossbar spans flush from outer edge to outer edge and
encloses the only counter, which is never filled.

## Files

Everything lives in `Frontend/Job_Automation/brand/`. Vector masters are in `svg/`,
raster exports sit at the top level, and `code/` holds the drop-in product files.

### `svg/` - vector masters

| File | Use |
|---|---|
| `applydir-logo-horizontal.svg` | Primary lockup, light backgrounds |
| `applydir-logo-horizontal-reversed.svg` | Ink and photographic backgrounds |
| `applydir-logo-horizontal-mono-black.svg` / `-mono-white.svg` | Single-colour print, engraving, embossing |
| `applydir-logo-stacked.svg` / `-reversed.svg` | Square formats, merchandise, covers |
| `applydir-mark.svg` / `-black.svg` / `-white.svg` | Symbol alone, 32 px and up |
| `applydir-mark-small.svg` | Small-size cut, below 32 px |
| `applydir-app-icon.svg` / `-orange.svg` | App tiles |
| `applydir-favicon.svg` | 32 px cut |
| `applydir-favicon-16.svg` | Explicit 16 px cut |

### Raster exports

| File | Use |
|---|---|
| `applydir-app-icon-1024.png` | Master tile, App Store / Play listing |
| `applydir-app-icon-512.png` / `-192.png` | Web manifest icons |
| `applydir-apple-touch-icon-180.png` | iOS home screen |
| `applydir-icon-32.png` / `-16.png` | Legacy favicon fallbacks |
| `favicon.ico` | 32 px multi-res ICO |
| `og-image.png` | 1200x630 social card |

All SVGs are outlined - no font dependency. The wordmark was drawn from Bricolage
Grotesque Bold (variable, `opsz` 96, `wght` 700), converted to paths, and re-kerned at
four joins: `Ap`, `pl`, `ly`, `yD`. The C2PA signing manifest was stripped from the
horizontal master (12.3 KB down to 4.6 KB); it is provenance metadata, not artwork.

Not yet produced: a 2400 px raster and the alternate social card (`og-image-alt.png`).
Neither blocks the landing page.

## Shipping it (`code/`)

| File | Status |
|---|---|
| `code/Logo.jsx` | **Shipped** to `src/components/brand/Logo.jsx`. Lints clean. |
| `code/site.webmanifest` | Ready. Goes to the site root; replaces the `vite-plugin-pwa` generated manifest in `vite.config.js`. |
| `code/index-head.html` | **Not yet applied** - replaces the favicon block in `index.html` and adds canonical, OG and Twitter cards. Part of the landing-page work. |
| `code/DESIGN_GUIDE-typography-patch.md` | **Not yet applied** - replaces section 2 of `DESIGN_GUIDE.md` and adds section 2b on logo usage. |

Already copied to `public/`: `applydir-favicon.svg`, `applydir-apple-touch-icon-180.png`,
`applydir-app-icon-192.png`, `applydir-app-icon-512.png`, `og-image.png`. These are
additive and collide with nothing.

`favicon.ico` is deliberately **not** copied yet - `public/favicon.ico` is still the old
rocket icon, and swapping it belongs with the `index-head.html` change so the icon and
the tags that point at it move together.

The old rocket assets (`logo.svg`, `pwa-*.png`, `maskable-icon-512x512.png`) are still
live and still referenced by `index.html` and the PWA manifest. They come out in the
same change.

## Non-negotiables

- Orange `#FF5B2E` is the only accent. Ink `#101010` for type and reversed fields.
- Never stretch, rotate, recolour, outline, or place the mark on a mid tone.
- Clear space on all four sides equals the crossbar width.
- One mark per surface.
- Two cuts only: the standard mark at 32 px and above, the small-size cut below it.

## Note on the design system

`DESIGN_GUIDE.md` still specifies Montserrat + Roboto. The Tailwind config has already
moved to Bricolage Grotesque app-wide (`font-montserrat`, `font-roboto` and `font-sans`
all resolve to it), so the guide is stale on typography.
`code/DESIGN_GUIDE-typography-patch.md` is the replacement text; apply it before this
identity ships into the product.

The colour tokens are NOT stale: `primary-light` `#FF5B2E` and `primary-dark` `#B82E07`
in `tailwind.config.js` match this identity exactly. Note that the identity adds Ink
`#101010` and Stone `#F4F2F0`, which have no Tailwind token yet.

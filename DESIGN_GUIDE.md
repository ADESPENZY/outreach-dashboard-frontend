# ApplyDir — Design Guide

> Everything a developer needs to build consistent ApplyDir UI **without a
> designer**. All tokens here come from `tailwind.config.js` and
> `src/index.css` (this guide lives alongside them in
> `Frontend/Job_Automation/`). When in doubt, use a token from this guide —
> never invent a value.

> **Brand feel:** clean, warm, confident. White surfaces, near-black text, a
> signature **orange** for everything that matters, and calm gray for everything
> that doesn't. Montserrat for personality (headings/brand), Roboto for clarity
> (everything you read).

---

## 1. Color System

ApplyDir uses two layers: the **brand palette** (what you reach for 95% of the time) and the **shadcn token layer** (HSL CSS-variables that power the
`components/ui/*` primitives). Build with the brand palette.

### Brand palette — use these

| Token (Tailwind class) | Hex | Use it for | Do NOT use it for |
|---|---|---|---|
| `primary-light` | `#FF5B2E` | The signature orange. Primary CTAs, active nav, focus accents, links, icons that need emphasis | Body text, large background fills (it's loud — accents only) |
| `primary-dark` | `#B82E07` | The darker end of the orange gradient, hover/pressed states on primary buttons | Default text; standalone fills bigger than a button |
| **orange gradient** | `from-primary-light to-primary-dark` | The hero gradient on primary buttons, brand mark, avatar, key icons | More than one element per view — keep it special |
| `black` | `#000000` | Headings, the strongest text | Body paragraphs (use `black-light`), borders |
| `black-light` | `#1A1A1A` | Primary body/heading text on white | Backgrounds |
| `white` | `#FFFFFF` | Page-on-card surfaces, button text on orange, card backgrounds | Text on white (obviously) |
| `secondary-dark` | `#6B7280` | **The standard muted/secondary text color** — captions, descriptions, helper text, inactive nav | Headings, primary CTAs |
| `secondary-light` | `#F9FAFB` | Very subtle tinted backgrounds | Text |
| `accent-teal` | `#0A9396` | Positive/secondary signal accents ("ready to send", success-ish highlights) | Primary CTAs (orange owns those) |
| `neutral` | `#F9FAFB` | App background, subtle hover fills, chips | Text |
| `neutral-dark` | `#F3F4F6` | **The standard border color** + hover backgrounds | Text; primary surfaces |

> **`neutral-dark` is the default border everywhere** (`border border-neutral-dark`).
> If you need a border, that's your token — not `gray-200`.

### Status colors (de-facto, used as raw Tailwind utilities)

Status badges/dots use Tailwind's named scales directly. Keep these consistent:

| Meaning | Dot / icon | Text | Soft background |
|---|---|---|---|
| **LIVE / Active / Success / Replied** | `emerald-500` `#10B981` | `emerald-600/700` | `emerald-50` |
| **Warming** | `amber-400/500` (or 🔥 `Flame`) | `amber-600` | `amber-50` |
| **Issue / Error / Danger** | `red-500/600` `#EF4444` | `red-600` | `red-50` |
| **Opened** | `purple-500` | `purple-500` | `purple-50` |
| **Sent (count)** | `blue-500` | `blue-500` | `blue-50` |
| **Premium/attention (rare)** | `amber` + `Crown` | `amber-700` | `amber-50` |

### Overlay palette — the live interview console only

The interview copilot's answer panel (`components/interview/LiveAnswerPanel.jsx`)
is the **one deliberately dark surface** in the app: it is read at a glance over a
video call, in-page and in the floating Picture-in-Picture window, where a white
card glares. It is not dark mode (§7 still stands) — it is one dark component,
and it uses tokens like everything else.

| Token | Hex | Use it for |
|---|---|---|
| `overlay` | `#0F1115` | The console surface |
| `overlay-raised` | `#171A21` | Its top bar and footer |
| `overlay-line` | `#262B36` | 1px borders inside it |
| `overlay-text` | `#E7E9EE` | Text on it (use `/85` for body copy) |
| `overlay-muted` | `#98A1B2` | Labels and secondary text on it |

`primary-light` stays the **only** accent on this surface (style chips, cues,
the streaming caret `animate-caret`). Don't introduce a second dark surface
without a reason as concrete as this one.

### shadcn token layer (powers `components/ui/*` only)

These are HSL CSS variables in `index.css`. In **light mode** they're mostly
grayscale. You rarely touch these directly — they exist so the shadcn `Input`,
`Label`, etc. work. Reference only:

| Token | Light value (hex≈) | Role |
|---|---|---|
| `background` / `foreground` | `#FFFFFF` / `#0A0A0A` | App base bg / text |
| `primary` (DEFAULT) | `#171717` (near-black) | shadcn primary — **note: this is NOT the brand orange.** Brand CTAs use `primary-light/dark` explicitly |
| `muted-foreground` | `#737373` | shadcn muted text |
| `destructive` | `#EF4444` | shadcn danger |
| `border` / `input` / `ring` | `#E5E5E5` / `#E5E5E5` / `#0A0A0A` | shadcn primitive borders/rings |
| `chart-1..5` | orange/teal/navy/yellow/orange | ECharts series colors |

> **Gotcha:** `primary` (DEFAULT, near-black) ≠ the brand orange. Always write
> `primary-light` / `primary-dark` for brand orange so you never accidentally
> render the near-black shadcn primary.

---

## 2. Typography

### Fonts (the only two)

| Font | Tailwind class | Source |
|---|---|---|
| **Montserrat** | `font-montserrat` | Google Fonts |
| **Roboto** | `font-roboto` | Google Fonts |

> ⚠️ **Loading note (needs fixing):** today Roboto loads via a render-blocking
> `@import` in `src/index.css`, while `index.html` loads **Inter** (unused) +
> a partial Montserrat. The correct setup is to load **Montserrat + Roboto**
> via `<link>` in `index.html` (preconnects already present), remove **Inter**,
> and delete the CSS `@import`. **Never use Inter** — it isn't part of the system.

### What each font is for

| Element | Font | Why |
|---|---|---|
| **Headings** (`h1`–`h3`, card titles) | `font-montserrat` **bold** | Personality, structure |
| **Brand name** ("ApplyDIR") | `font-montserrat` bold, with orange gradient on "Apply" | Identity |
| **Body text** (paragraphs, descriptions) | `font-roboto` | Readability |
| **Labels / captions / helper text** | `font-roboto`, small, `secondary-dark` | Quiet support text |
| **Buttons** | `font-montserrat` **semibold/bold** for primary CTAs; `font-roboto` is fine for subtle/text buttons | CTAs get weight |
| **Uppercase micro-labels** (section headers like "MAIN", "CONNECTED INBOXES") | `font-montserrat`, `text-[10px]`, `font-bold`, `uppercase`, `tracking-widest`, `secondary-dark/60` | The established section-label style |

### Size scale (de-facto usage)

| Tailwind | px | Use |
|---|---|---|
| `text-3xl` | 30 | Page titles (`h1`) |
| `text-2xl` | 24 | Section/hero headings |
| `text-lg` | 18 | Card titles, sub-headers |
| `text-base` | 16 | Emphasised body, card headings |
| `text-sm` | 14 | **Default body / UI text** |
| `text-xs` | 12 | Captions, helper text, badges |
| `text-[10px]` / `text-[11px]` | 10–11 | Uppercase micro-labels only (non-essential decoration) |

**Line height:** use `leading-relaxed` for paragraphs, `leading-snug`/`leading-tight`
for headings. Default Tailwind leading is fine for UI text.

> **Floor:** never render readable text below **12px** (`text-xs`). The
> `text-[10px]`/`[11px]` sizes are reserved for decorative uppercase labels, and
> even those should bump to `text-xs` on mobile where possible.

---

## 3. Spacing & Layout

| Thing | Standard | Token |
|---|---|---|
| **Page padding** | 16px mobile → 32px desktop | `p-4 md:p-8` |
| **Max content width** | 1400px, centered | `max-w-[1400px] mx-auto` |
| **Card padding** | 20–24px | `px-6 py-5` (header) / `px-6 py-5` (body) |
| **Card header divider** | bottom border | `border-b border-neutral-dark` |
| **Section vertical rhythm** | 20–32px between sections | `space-y-5` / `space-y-6` / `mb-6 md:mb-8` |
| **Gap between inline items** | 8–12px | `gap-2` / `gap-3` |
| **Gap in stat grids** | 12px | `gap-3` |

### Border radius

| Class | px | Use |
|---|---|---|
| `rounded-lg` | 8 | Small controls, dropdown items |
| `rounded-xl` | 12 | **Default for buttons, inputs, list rows, chips** |
| `rounded-2xl` | 16 | **Cards, panels, modals** |
| `rounded-full` | — | Avatars, dots, toggles, icon buttons |

> The shadcn `--radius` is `0.5rem` (8px) and drives `ui/*` primitives, but the
> brand UI standard is **`rounded-xl` for controls** and **`rounded-2xl` for
> cards**. Match the surrounding code.

### Shadows

| Class | Use |
|---|---|
| `shadow-sm` | Default card resting shadow |
| `shadow-md` | Hover lift on cards |
| `shadow-lg shadow-primary-light/30` | Brand elements (logo, primary buttons) — orange glow |
| `shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]` | Sticky header |
| `shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]` | Dropdowns/popovers |

---

## 4. Component Style Rules

### Buttons

| Variant | Recipe |
|---|---|
| **Primary** | `bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-50` |
| **Secondary** | `bg-neutral hover:bg-neutral-dark text-black-light font-semibold rounded-xl px-5 py-2.5 transition-all` |
| **Ghost / text** | `text-secondary-dark hover:text-black-light hover:bg-neutral rounded-lg px-3 py-2 transition-colors` |
| **Danger** | `bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl px-5 py-2.5 shadow-sm shadow-red-200 disabled:opacity-50` |
| **Outline / dashed (add)** | `border-2 border-dashed border-neutral-dark text-secondary-dark hover:text-primary-dark hover:border-primary-light/40 rounded-xl` |

Disabled = `disabled:opacity-50 disabled:cursor-not-allowed`. Always include a
spinner (`Loader2 animate-spin`) for async buttons.

### Cards

```
bg-white rounded-2xl border border-neutral-dark shadow-sm
  ├─ header:  px-6 py-5 border-b border-neutral-dark   (title: text-base font-bold font-montserrat)
  └─ body:    px-6 py-5 space-y-4
```
Hover-interactive cards add `hover:shadow-md hover:border-primary-light/30 transition-all`.

### Inputs

```
w-full px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black
outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all
```
- **Focus:** orange border + soft orange ring (`focus:ring-primary-light/20`).
- **Error:** `border-red-500/60` + helper text `text-red-500 text-xs mt-1`.
- **Label:** `text-[11px] font-bold text-secondary-dark/60 uppercase tracking-wider`.

### Badges / status pills

`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border` +
the status colors from §1. Examples:
- LIVE → `bg-emerald-50 text-emerald-700 border-emerald-200` + green dot
- Warming → `bg-amber-50 text-amber-700 border-amber-200` + `Flame`
- Issue → `bg-red-50 text-red-600 border-red-200` + red dot

### Modals / popups

- **Overlay:** `fixed inset-0 z-50 bg-black/70` (+ `backdrop-blur-sm` for premium).
- **Container:** `rounded-2xl` card, centered, `max-w-md` typical.
- **Animation:** Framer Motion for big modals (welcome) — fade + `y` + `scale`;
  dropdowns use `tailwindcss-animate`: `animate-in fade-in zoom-in-95 duration-200`
  with `origin-top-right`.
- Always provide an **✕ close** and close on **outside click + Escape**.

### Toasts (react-toastify, `theme="light"`, top-right, 3s)

| Type | Call |
|---|---|
| Success | `toast.success('Saved.')` |
| Error | `toast.error(err.message)` |
| Info | `toast.info('…')` |

Use toasts for transient feedback. **Never** use `alert()` / `confirm()`.

---

## 5. Mobile-First Rules

The app is **mobile-first**: base styles target small screens, `md:` adds
desktop. Concrete rules — these are requirements, not suggestions:

- **All pages must work at 375px width (iPhone SE).** Test there.
- **Touch targets ≥ 44×44px.** Pad small icon buttons (`p-2` minimum).
- **No hover-only interactions.** Anything reachable by hover on desktop must be
  reachable by **tap** on mobile (dropdowns toggle on click, not hover).
- **Sidebar → slide-out drawer** on mobile (`fixed`, `-translate-x-full` → `translate-x-0`), static at `md:`.
- **Tables → card lists** on mobile. Don't ship a wide `<table>` to phones;
  render stacked cards instead.
- **Font sizes:** body **min 14px** on mobile; **never below 12px** for anything.
- **Horizontal padding:** **min 16px** on mobile (`px-4`).
- **No horizontal scrolling, ever.** Use `min-w-0` + `truncate` on flex children;
  the app shell already sets `overflow-x-hidden`.

---

## 6. Responsive Breakpoints

Tailwind defaults; the app standardizes on **`md` (768px)** as the mobile↔desktop line.

| Band | Width | Tailwind | What changes |
|---|---|---|---|
| **Mobile** | `< 768px` | base (no prefix) | Drawer sidebar; single-column stacks; `p-4`; tables → cards; tab navs become grids/scrolls; secondary text/labels may hide |
| **Tablet** | `768–1024px` | `md:` | Static sidebar appears; 2-column grids; full padding `md:p-8`; header shows greeting + stats |
| **Desktop** | `> 1024px` | `lg:` | 3–4 column grids; charts at full width; max content `1400px` |

Default to **one column on mobile**, scale up with `md:grid-cols-2` / `lg:grid-cols-3/4`.

---

## 7. Dark Mode

**Not supported yet.**

Scaffolding exists (`darkMode: ["class"]` in Tailwind, `.dark` CSS variables in
`index.css`), but there is **no theme toggle**, and the brand UI hardcodes light
surfaces (`bg-white`, `text-black`, `border-neutral-dark`) throughout. Do **not**
assume dark mode works. Build for light mode only until dark mode is a deliberate
project.

---

## 8. Accessibility

- **Contrast:** target **WCAG AA** — 4.5:1 for normal text, 3:1 for large text.
  `secondary-dark` (`#6B7280`) on white passes for body; don't drop opacity below
  ~`/60` for anything users must read.
- **Focus ring:** orange ring — `focus:ring-2 focus:ring-primary-light/20`
  (inputs) or `focus:ring-2 focus:ring-offset-2 focus:ring-primary-light`
  (toggles/buttons). **Never** remove focus styles without a replacement.
- **Hit targets & semantics:** real `<button>`/`<a>`, `aria-label` on
  icon-only controls, `role="switch"` + `aria-checked` on toggles.
- **Screen readers:** label every interactive icon; use `sr-only` for
  visually-hidden labels; don't convey status by color alone — pair dots with a
  text label (we already do: "🟢 LIVE").
- **Alt text:** every meaningful `<img>` gets descriptive `alt`; decorative
  images get `alt=""`.

---

## 9. Animation & Transitions

| Use | Recipe |
|---|---|
| **Default UI transition** | `transition-all duration-200` (colors/shadow/opacity on hover/active) |
| **Colors only** | `transition-colors duration-200` |
| **Sidebar / drawers** | `transition-transform duration-300 ease-in-out` |
| **Dropdowns/popovers** | `tailwindcss-animate`: `animate-in fade-in zoom-in-95 duration-200` |
| **Big modals** | Framer Motion: opacity + `y: 28→0` + `scale: 0.94→1`, `duration ~0.3`, ease `[0.16,1,0.3,1]` |
| **Loading shimmer** | `animate-slide-progress` (defined in config) |
| **Spinners** | `Loader2` + `animate-spin` |

**When to animate:** state changes the user caused (open/close, hover, save),
and entrances of new content. **When not to:** never animate on every render,
never block input behind animation, keep durations **150–300ms** (modals up to
~350ms). Respect `prefers-reduced-motion` where feasible.

> ⚠️ `animate-fade-in` is used in several pages but **is not defined** in
> `tailwind.config.js` or `index.css` (so it currently does nothing). Either
> define a `fade-in` keyframe/animation or switch those to `animate-in fade-in`
> from `tailwindcss-animate`.

**Loading states are mandatory** (see §10): spinner for buttons, skeleton/loader
for data panels, `Loader2` centered for page loads. Never show a blank screen
while fetching.

---

## 10. DO NOT List

Hard rules. Claude Code (and any dev) must **never**:

- ❌ **Never use colors outside the design system** (§1).
- ❌ **Never use fonts outside Montserrat and Roboto** — and never use Inter.
- ❌ **Never hardcode hex values** in components — use Tailwind tokens
  (`primary-light`, `neutral-dark`, …). (Existing one-off `bg-[#...]` on the
  dark auth pages is legacy; don't add more.)
- ❌ **Never make text smaller than 12px** (`text-xs`). Decorative `[10px]`/`[11px]`
  uppercase labels are the only exception.
- ❌ **Never skip mobile testing** — verify at 375px before calling it done.
- ❌ **Never use horizontal scroll** — fix with `min-w-0` + `truncate`.
- ❌ **Never rely on hover for critical actions** — must work on tap.
- ❌ **Never use generic gray** (`gray-200`, `slate-…`) — use `neutral` /
  `neutral-dark` / `secondary-dark`.
- ❌ **Never use `alert()` / `confirm()` / `prompt()`** — use toasts and in-UI
  modals.
- ❌ **Never skip loading states** — every async action shows a spinner/skeleton.

---

*Companion docs (in the Backend repo): [VISION.md](../../Backend/VISION.md) ·
[ARCHITECTURE.md](../../Backend/ARCHITECTURE.md) ·
[ONBOARDING.md](../../Backend/ONBOARDING.md). Source of truth for tokens:
`tailwind.config.js` + `src/index.css`.*

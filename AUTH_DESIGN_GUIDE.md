# ApplyDir — Auth Design Guide

Spec for `/login` and `/register` only. Lives in `Frontend/Job_Automation/`
next to `DESIGN_GUIDE.md`. Where the two disagree, this file wins for these two
routes; everything else in `DESIGN_GUIDE.md` still applies (no hardcoded hex,
375px, 44px touch targets, loading states, no `alert()`).

The visual reference is the landing page (`components/landing/`): near-black
ground, one orange accent, Bricolage Grotesque, the void. The auth pages
continue that story.

- Landing: your CV is pulled out of the void.
- Signup: **the introduction gets written.**
- Login: **the reply comes back.**

---

## 0. Hard rules

1. **No numbers, stats, company names or testimonials** anywhere on these
   pages. Delete `METRICS`, `LOGS`, the "10,000+" pill, the Microsoft / Nvidia /
   Google job cards and "AI Match: 95%". Do not replace them with other figures.
2. **Human language only.** Never: "command center", "pipeline", "scraped",
   "warmup", "AI scored", "engine".
3. **No hardcoded hex** in auth files. Use the tokens in section 1.
4. **Font:** `font-sans` only (Bricolage Grotesque). Never write
   `font-montserrat` or `font-roboto` in auth files.
5. **Orange is `primary-light` / `primary-dark`**, never bare `primary` and
   never shadcn's `bg-primary`.
6. **Do not touch:** the backend, `services/apiAuth.js` endpoints,
   `context/AuthContext.jsx`, `UsernamePickerModal.jsx`, `InstallButton.jsx`
   internals, anything in `components/landing/`, the shadcn variables in
   `index.css`.
7. Auth behaviour stays exactly as it is today: same endpoints, same token
   handling, same redirects, same Google flow.

---

## 1. Tokens

### Existing (use as is)

| Class | Value | Use |
|---|---|---|
| `bg-ink` | `#101010` | Page ground, text on orange |
| `bg-ink-soft` | `#1C1A19` | Cards, Google button |
| `primary-light` | `#FF5B2E` | Primary button, links, thread line, active dots |
| `primary-dark` | `#B82E07` | Not needed on these pages |
| `emerald-500` | `#10B981` | "Delivered", "Approved and sent", "Follow-ups stopped" dots |

### Add to `tailwind.config.js` (additive only, change nothing else)

| Token | Value | Use |
|---|---|---|
| `ink.stage` | `#161413` | Story panel ground, input ground |
| `ink.raised` | `#2A2725` | Avatar circle |
| `ink.mute` | `#3A3633` | Unlit timeline dot |
| `ink.void` | `#0B0A0A` | Centre disc of the void |
| `primary.tint` | `#FF9A7A` | Error text, small orange text on dark |

### White on ink (Tailwind alpha, no new tokens)

| Role | Class |
|---|---|
| Primary text | `text-white` |
| Body / secondary | `text-white/70` |
| Labels above fields | `text-white/80` |
| Eyebrows, meta, footer | `text-white/60` (never lower for readable text) |
| Placeholder | `placeholder:text-white/40` |
| Field and button borders | `border-white/15`, hover `border-white/30` |
| Card borders, dividers | `border-white/10`, `bg-white/10` |

### Type

| Element | Classes |
|---|---|
| Page h1 (desktop) | `text-[52px] font-bold leading-[1.02] tracking-[-0.032em]` |
| Page h1 (phone) | `text-[38px] font-bold leading-[1.04] tracking-[-0.03em]` |
| Lead under h1 | `text-[17px] leading-normal text-white/70` (phone `text-base`) |
| Story caption (desktop) | `text-[42px] font-bold leading-[1.06] tracking-[-0.03em]` |
| Story caption (phone) | `text-[21px] font-bold leading-[1.15] tracking-[-0.02em]` |
| Eyebrow | `text-xs uppercase tracking-[0.14em] text-white/60` |
| Field label | `text-sm font-medium text-white/80` |
| Input text | `text-base` (16px, stops iOS zoom) |
| Button label | `text-base font-semibold` |
| Helper / error | `text-[13.5px]` |

### Shape

| Thing | Value |
|---|---|
| Inputs | `h-[54px] rounded-[14px] px-4` |
| Primary button | `h-14 rounded-full` (phone `h-[58px]`) |
| Google button | `h-[52px] rounded-full` |
| Story cards | `rounded-[18px]` |
| Story panel | `rounded-[28px]`, inset 20px from the window edge |

---

## 2. Layout

**Desktop (`lg` and up):** two columns, 5/12 form and 7/12 story, full
viewport height, `bg-ink`.

- Form column: padding `44px 72px 36px 96px` from `xl`; between `lg` and `xl`
  the sides are 48px (the full padding squeezes the form to ~260px at 1024).
  Logo top left. Form block vertically centred, `max-w-[408px]`.
  "Privacy · Terms" bottom left.
- Story column: padding 20px (0 on the left). Inside it one panel:
  `bg-ink-stage border border-white/[0.07] rounded-[28px] overflow-hidden`,
  content padding `52px 64px 44px`.

**Below `lg`:** one column, content `max-w-[440px] mx-auto`, top-aligned
(not vertically centred).

- Page: `min-h-[100dvh]`, never `h-screen`, and no `overflow-hidden` on the
  page column, so the page scrolls whenever content is taller than the screen.
- Padding: `px-6`, top `max(20px, env(safe-area-inset-top))`, bottom
  `max(20px, env(safe-area-inset-bottom))`. With `viewport-fit=cover` (set in
  `index.html`) this keeps the logo clear of the iPhone status bar when the
  app is installed.
- Logo row 32px tall. Controls that need a 44px tap target but sit in a tight
  row (logo, footer links, inline text links) keep the hit area with negative
  margins (`-my-1.5` / `-my-3`), so it does not add to the layout.
- Fields 52px tall (`lg` 54px), 12px apart (`lg` 20px). Primary button 54px
  (`lg` 56px). Google slot 44px (`lg` 52px); Google draws its button 40px.
- "Privacy · Terms" sits 14px under the page content; on tall screens the
  footer drops to the bottom.
- No horizontal scroll at 360px.
- Login: logo, compact story card, h1, form. Spacing in section 4.
- Signup: intro slides first on a first visit (section 6), then the form.
  Same field, button and gap sizes as login; content starts 18px under the
  logo row. The slides use the same `dvh` and safe-area padding; on screens
  under 740px tall their scene panel is 296px instead of 360px so Continue
  stays on screen.

**Fit targets (measured in headless Chrome):** at 360x680 and taller, `/login`
shows logo through "Privacy · Terms" with no scrolling. `/register` steps 1
and 2 and the intro slides fit at 360x680, 375x667, 390x844 and 414x896.
Shorter screens scroll; nothing is clipped.

---

## 3. Components (`src/components/auth/`)

| File | What it is |
|---|---|
| `AuthShell.jsx` | The two-column layout. Props: `story`, `children`, `headerRight`. |
| `AuthField.jsx` | Label + shadcn `Input` restyled + error slot. |
| `PasswordField.jsx` | `AuthField` with the show/hide eye (44px button, `aria-label`). |
| `PillButton.jsx` | The primary button. Prop `status`: `idle` \| `busy` \| `done`. |
| `AuthGoogleButton.jsx` | Wraps the existing `GoogleSignInSlot` / `GoogleLogin`. |
| `AuthVoid.jsx` | The void backdrop for the story panel. |
| `StoryStage.jsx` | Eyebrow, caption stack, scene slot, progress segments. |
| `useStoryTimeline.js` | Runs a list of `{ at, phase }` steps, loops, cleans up. |
| `LoginStory.jsx`, `SignupStory.jsx` | The two scenes. |
| `SignupIntroSlides.jsx` | Phone-only intro slides. |
| `storyContent.js` | Every string and sample value the stories show. |
| `authMotion.js` | Shared easings, durations, variants. |

Use shadcn for `Input`, `Label` (already in `components/ui/`) and add
`Checkbox`. Do **not** use the shadcn `Button` for the primary button: its
defaults pull the near-black shadcn primary.

### PillButton

`relative h-14 w-full rounded-full bg-primary-light text-ink text-base font-semibold`.
Label centred. A 40px circle sits inside the right edge (`right-2 top-2`,
`bg-ink`, white icon):

- `idle`: arrow. On hover the circle slides 4px right.
- `busy`: 16px spinner. Button ignores clicks.
- `done`: check, pops in.

Text on orange is **`text-ink`, not white**. White on `#FF5B2E` is about 3:1
and fails AA at this size; ink is about 6:1.

### AuthField

Label above the field (no floating labels).
`bg-ink-stage border border-white/15 text-white rounded-[14px] h-[54px]`.
Hover `border-white/30`. Focus `border-primary-light ring-4 ring-primary-light/20`,
no default outline. Error text below in `text-primary-tint`, `role="alert"`.

### AuthGoogleButton

Google renders this button itself; only these props can change:
`theme="filled_black" shape="pill" size="large" text="continue_with"` and
`width` set to the form width (max 400). Keep the existing 6 second fallback
and the existing credential handling. Do not draw a custom Google logo.

### AuthVoid

Bottom-right of the story panel, mostly cropped: a 640px circle offset
`right: -200px; bottom: -220px`.

- Glow: radial gradient, `primary-light` at 42% in the centre to 0% at 66%.
- Three rings at inset 40 / 120 / 200px, `border-white/[0.07]`.
- About 15 small outlined rectangles (18 to 26px wide, 3:4, `border-white/25`,
  each rotated differently) placed on the rings. These are the CVs.
- Centre disc 116px, `bg-ink-void`.
- The rings and rectangles rotate together, 140s per turn, linear.
- `aria-hidden`. Plain DOM, no canvas.

Do **not** reuse `hero/VoidCanvas.jsx`: it measures the hero's `h1` and imports
`vortexMetrics`, so it is tied to the landing hero.

---

## 4. Login

### Form (top to bottom)

1. h1 **Welcome back.**
2. Lead: **Your introductions are where you left them.** (desktop only)
3. **Username** field, placeholder "Your username"
4. **Password** field, placeholder "Your password", with "Forgot password?"
   link on the label row, right aligned
5. PillButton **Sign in** (`done` label: **Signed in**)
6. Divider "or"
7. Google button
8. **New here? Create an account** (links to `/register`)

`InstallButton` stays, top right of the form column (`headerRight`).

### Phone spacing (below `lg`)

| Element | Value |
|---|---|
| Logo row | 32px |
| Compact story card | 14px below the logo row, about 124px tall; hidden under 680px tall |
| h1 | 32px, `leading-[1.05]`, 18px top margin; no lead line |
| h1 to fields | 16px |
| Fields | 52px tall, 12px apart |
| Sign in button | 54px, 16px top margin |
| "or" divider | 14px above and below |
| Google | 44px slot |
| "New here? Create an account" | 14px above |
| "Privacy · Terms" | 14px under the link |

Desktop keeps the section 1 sizes (h1 52px, fields 54px, button 56px) and its
wider gaps.

The field stays **Username**: the backend only accepts a username.

### Behaviour

- Empty submit: shake the fields block, show "Enter your username and password."
- Server error (wrong credentials, lockout): shake, show the server's message
  in the same error style.
- In flight: `busy`. On success: `done`, then the existing redirect. Do not add
  a delay longer than 400ms.

### Story: "the reply comes back"

Eyebrow: **After you approve**

| Phase | Caption | Scene |
|---|---|---|
| 1 to 2 | Your introduction lands in their inbox. | Card A appears; then "Delivered" fades in |
| 3 to 4 | No answer yet? We follow up for you. | Timeline card appears; Day 3 lights, then Day 7 |
| 5 | They reply. The follow-ups stop. | Card B appears; Day 14 is struck through, "Cancelled" |

- **Card A** (border `primary-light/45`): avatar, "Hiring manager", "Inbox",
  divider, orange dot "New introduction from you", green dot "Delivered".
- **Timeline card:** four columns: Sent / Introduction, Day 3 / Follow-up,
  Day 7 / Follow-up, Day 14 / Follow-up. A 2px track joins the dots; the orange
  fill grows to 1/3, then 2/3, and stops there.
- **Card B:** eyebrow "Your inbox", orange dot "Reply from the hiring manager",
  three grey bars (92%, 78%, 44% wide), divider, green dot "Follow-ups stopped".
  The bars stay bars until a real anonymised reply is supplied. Never invent
  reply text.
- A 2px orange thread runs down the left of the three cards, with a 12px dot
  beside each card. Each segment draws when the next card appears.
- Three progress segments at the bottom; the active one is 30px and orange,
  the others 8px and `bg-white/20`.

**Phone:** one compact card above the h1, height set by its content (about
124px): `p-4`, the caption at 17px bold with a two-line reserve (so a shorter
caption never makes the card jump), then the four-dot timeline (labels only)
12px under it. No reply row on phone. The card is hidden when the viewport is
under 680px tall, so the form fits without it.

---

## 5. Signup

Two steps, one payload. The request is unchanged:
`{ full_name, email, username, password }` to the existing register endpoint.
`confirmPassword` is removed (the eye replaces it). Keep today's password
rules otherwise. `agreed` stays a required client-side check.

### Step 1

1. Eyebrow **Step 1 of 2**
2. h1 **Get introduced.**
3. Lead: **Create your account. Nothing is sent until you approve it.**
4. **Email address** field, placeholder "you@example.com"
5. Domain chips (see below)
6. Checkbox: **I agree to the Terms and Privacy Policy** (both linked)
7. PillButton **Continue**
8. Meta, centred: **Free during early access · No card**
9. Divider "or"
10. Google button (still blocked until the box is ticked, as today)
11. **Already have an account? Sign in**

- **Chips:** `@gmail.com`, `@outlook.com`, `@yahoo.com`. Shown only while the
  email has text and no "@". Tapping one appends it. 36px tall on desktop,
  44px on phone.
- Invalid email: shake the field, "Enter a valid email address."
- Box not ticked (Continue or Google): shake the checkbox row, "Tick the box
  to continue."

### Step 2

1. Eyebrow **Step 2 of 2**
2. h1 **Almost there.**
3. "Signing up as **{email}**" and a **Change** text button (back to step 1,
   email kept)
4. **Full name** (placeholder "As it appears on your CV")
5. **Username** (placeholder "Pick a username")
6. **Password** (placeholder "Create a password") with the eye
7. PillButton **Create account**

- Any field empty: shake the block, "Fill in all three to continue."
- Server errors: show each under its own field. If the error is about the
  email, go back to step 1 and show it there.
- Success: orange 68px circle with a check pops in, h1 **You're in.**, lead
  **Taking you to setup.**, then the existing post-signup flow.

### Story: "the introduction gets written"

Eyebrow: **How an introduction happens**

| Phase | Caption | Scene |
|---|---|---|
| 1 | We find a role that fits you. | Role card |
| 2 | Then the person who hires for it. | Person card |
| 3 | We write your introduction. | Introduction card; body types out |
| 4 | You approve. It sends from your inbox. | "Approve" pill pulses |
| 5 | (same caption) | Pill becomes green dot "Approved and sent" |

- **Role card:** eyebrow "Role", "Product Marketing Manager", orange check
  "Fits your experience".
- **Person card:** avatar, "Amara N.", "Head of Marketing", outlined chip
  "Hires for this role" (`border-primary-light/50 text-primary-tint`).
- **Introduction card:** "To Amara N." left, "From your own inbox" right;
  subject "Your Product Marketing Manager role"; body (typed):
  "Hi Amara, I saw you're hiring a Product Marketing Manager. I led the launch
  work this role describes, and I'd like to show you how I'd approach it.";
  footer left "Drafted from your CV. Nothing invented."; footer right the
  Approve pill, then the sent status.
- Same thread, dots and progress segments as the login story (four segments).

All of this sample content lives in `storyContent.js` with a comment:
illustrative only, no numbers, no company names, no real people. No em dashes
in the sample email.

---

## 6. Phone intro slides (signup only)

Shown before the form the first time. Remember it with
`localStorage['applydir_auth_intro_seen'] = '1'` (wrap in try/catch); returning
visitors go straight to the form. "Skip" top right also sets it.

Each slide: a 360px scene panel (`bg-ink-stage rounded-[28px]`, small void
glow bottom right), a centred title (30px bold), one line of body, three
progress dots, and the PillButton **Continue** pinned to the bottom. Swipe
left/right also moves between slides.

| # | Scene | Title | Body |
|---|---|---|---|
| 1 | Role card highlighted between two dimmed blank cards | We find roles that fit you. | Not every opening. The ones your experience matches. |
| 2 | Role chip, thread drawing down, person card | Then the person who hires. | A named hiring manager, not a careers inbox. |
| 3 | Introduction card typing, then Approve, then sent | Your introduction, your words. | Drafted from your CV. You approve every message before it sends. |

---

## 7. Motion

Framer Motion only (already used on these pages). No GSAP here. Put shared
values in `authMotion.js`.

- Ease out: `[0.2, 0.7, 0.2, 1]`. Ease in-out: `[0.4, 0, 0.2, 1]`.

### Form

| Moment | Motion |
|---|---|
| Page load | Each block rises 12px and fades in, 0.5s, 0.06s stagger |
| Field focus | Border to orange plus 4px orange ring, 0.2s |
| Chips | Row height 0 to 46px (phone 52px) and fade, 0.25s |
| Button hover | Arrow circle x +4px, 0.25s |
| Button press | Scale 0.985 |
| Busy | Arrow swaps to spinner, 0.7s per turn |
| Done | Check pops: scale 0.6 to 1.08 to 1, 0.4s |
| Error | x `[0, -7, 6, -4, 3, 0]`, 0.42s, on the block at fault only |
| Step 1 to 2 | `AnimatePresence mode="wait"`: out fades, in rises, 0.5s |

### Story

| Element | Motion |
|---|---|
| Card in | Opacity 0 to 1, y 14 to 0, 0.55s ease out |
| Thread segment | `scaleY` 0 to 1 from the top, 0.8s ease in-out |
| Caption change | Crossfade with 14px rise, 0.5s |
| Typing | 2 characters every 36ms; orange 2px caret blinks at 1s |
| Approve pill | Pops in, then a ring pulses out every 1.2s |
| Timeline fill | `scaleX` from the left, 0.9s ease in-out |
| Void | 140s per rotation, linear |

### Timelines (ms from loop start)

- **Signup:** 0 clear · 700 role · 2500 person · 4500 introduction card,
  typing starts · typing end +600 Approve · +2600 sent · +7200 restart.
- **Login:** 0 clear · 700 card A · 1700 Delivered · 3400 timeline, Day 3 ·
  5000 Day 7 · 6800 reply, Day 14 cancelled · 12600 restart.

### Rules

- First paint shows the **finished** frame. The loop starts 2200ms later.
- **Reduced motion:** wrap each page in `<MotionConfig reducedMotion="user">`.
  With reduce on, show the finished frame, no loop, no typing, no void
  rotation.
- Pause the loop while the tab is hidden. Clear every timer on unmount.
- The 150 to 300ms limit in `DESIGN_GUIDE.md` applies to the form. The story is
  narration and may run longer.

---

## 8. Accessibility

- Real `<button>`, `<a>`, `<input>` with `<label>`. Icon-only buttons get
  `aria-label`.
- Every control at least 44px tall on phone.
- Visible focus on everything: `focus-visible:ring-2 ring-primary-light
  ring-offset-2 ring-offset-ink`.
- Errors use `role="alert"` and never rely on colour alone (there is always
  text).
- The void, thread, dots and progress segments are `aria-hidden`. Story
  captions and card text are real text.
- Tab order follows the visual order. Enter submits from the last field.

---

## 9. Build order

One step per Claude Code run. Each ends with the page working.

**Step 1: tokens, shell, login form.** Add the five tokens. Create
`AuthShell`, `AuthField`, `PasswordField`, `PillButton`, `AuthGoogleButton`,
`AuthVoid`, `authMotion.js`. Rebuild `LoginPage.jsx` on them (section 4 form).
The story panel shows `AuthVoid` only. Remove the login page's inline panel
components and hardcoded stats.
*Done when:* login by password and by Google both still work, `InstallButton`
and `UsernamePickerModal` still work, no hex left in `LoginPage.jsx`, clean at
375px.

**Step 2: login story.** Create `StoryStage`, `useStoryTimeline`,
`storyContent.js`, `LoginStory`. Desktop scene plus the compact phone card.
*Done when:* the loop plays, restarts, stops under reduced motion, and no
timers survive unmount.

**Step 3: signup form.** Rebuild `RegisterPage.jsx` as two steps on
`AuthShell` (section 5). Add the shadcn `Checkbox`. Story panel shows
`AuthVoid` only.
*Done when:* a new account can be created by email and by Google, server
errors land under the right field, the request body is the four fields.

**Step 4: signup story and phone intro slides.** `SignupStory`,
`SignupIntroSlides`.
*Done when:* desktop loop plays; on a phone the slides show once, Skip works,
swipe works.

**Step 5: cleanup and checks.** Delete what is now unused from both pages
(`CountUp`, `FloatingInput`, `BrainNode`, `RotatingRing`, `TravelingDot`,
`PipelineSVG`, `JobCard`, `AIEngine`, `OutputCards`, `ActivityLog`,
`MetricCard`, `VisualizationPanel`, `METRICS`, `LOGS`). Confirm no hex, no
`font-montserrat` / `font-roboto`, no banned words in any auth file. Keyboard
pass, 375px pass, reduced-motion pass, production build.
*Done when:* the build passes and the report lists every file touched.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MapPin, ExternalLink, ArrowRight, Briefcase, DollarSign, TrendingUp,
} from 'lucide-react';
import { ApplyDirLoader } from './ui/ApplyDirLoader';
import { getJob } from '../services/apiJobs';
import { getProfile } from '../services/apiProfile';
import GenerateCvButton from './GenerateCvButton';

// ── Opportunity detail drawer ─────────────────────────────────────────────
// Slides in from the right on desktop (rounded-2xl, max-w-lg), full-screen on
// mobile with a top close bar. Closes on X, outside click, or Escape. The card
// in the grid behind stays untouched — this is a read-mostly detail view with
// the same two actions (Skip / Reach Out) repeated at the bottom.
//
// The body renders one of three ways, in this order of preference:
//   1. `structured_jd` present → sectioned layout (skills / responsibilities /
//      requirements / summary + a Job Details panel). The backend extracts this
//      once on first open and caches it, so this is the normal path.
//   2. `structured_jd` null but `description` present → the raw body, parsed
//      into real paragraphs and lists. Not one flattened block of text.
//   3. Neither → a link out to the live listing.

// Match-strength badge — mirrors the Opportunities card so the signal reads the
// same in both places. No numbers ever reach the user.
const matchBadge = (score) => {
  if (score == null) return { label: 'New match',    cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  if (score >= 80)   return { label: 'Strong match', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (score >= 60)   return { label: 'Good match',   cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
  return { label: 'Fair match', cls: 'bg-gray-100 text-gray-500 border-gray-200' };
};

// ── Plain-description fallback (path 2 only) ──────────────────────────────
// Kept deliberately: three feeds (Remotive, RemoteOK, Himalayas) store the
// description as RAW HTML, so without this their bodies would render literal
// `<div class="h3">` markup on screen. It is no longer the primary render path —
// it only pre-cleans the text that parseBlocks() then splits into real elements.
// Pure string ops, so there's no XSS surface (we never inject HTML).
const _NAMED_ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
  '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–', '&hellip;': '…', '&bull;': '•',
  '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”', '&copy;': '©',
  '&reg;': '®', '&trade;': '™', '&deg;': '°', '&euro;': '€', '&pound;': '£',
};

function htmlToText(html) {
  if (!html) return '';
  let s = String(html);
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n');               // <br> → newline
  s = s.replace(/<\s*li[^>]*>/gi, '\n• ');                 // <li> → bullet
  s = s.replace(/<\/\s*li\s*>/gi, '\n');                   // one bullet per line
  // Block-level closers end a PARAGRAPH. A single \n here would let parseBlocks
  // glue a heading onto the text after it ("About us We deliver elite…").
  s = s.replace(/<\/\s*(p|div|ul|ol|h[1-6]|tr|section|blockquote)\s*>/gi, '\n\n');
  s = s.replace(/<[^>]+>/g, '');                           // strip remaining tags
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  s = s.replace(/&[a-z]+;/gi, (m) => _NAMED_ENTITIES[m.toLowerCase()] ?? ' ');
  s = s.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

const BULLET_LINE = /^\s*[-•*+·]\s+/;

// Split cleaned text into renderable blocks: { type: 'p' | 'ul' }.
// Runs of bullet lines become one list; blank lines end a paragraph. Any literal
// ** stays as plain text — this path does no markdown rendering by design.
function parseBlocks(text) {
  if (!text) return [];
  const blocks = [];
  let para = [];
  let list = [];

  const flushPara = () => {
    if (para.length) { blocks.push({ type: 'p', text: para.join(' ') }); para = []; }
  };
  const flushList = () => {
    if (list.length) { blocks.push({ type: 'ul', items: list }); list = []; }
  };

  for (const rawLine of String(text).replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line) { flushPara(); flushList(); continue; }
    if (BULLET_LINE.test(line)) {
      flushPara();
      list.push(line.replace(BULLET_LINE, '').trim());
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks.filter((b) => (b.type === 'p' ? b.text : b.items.length));
}

// Skill comparison key — "Node.js", "NodeJS" and "node js" all collapse to
// "nodejs" so the profile match isn't defeated by punctuation. + and # survive
// so C++ and C# stay distinct.
const skillKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9+#]/g, '');

// ── Desktop-only layout switch ────────────────────────────────────────────
// The desktop redesign (sticky stat strip + tabs) is a different information
// architecture, not a restyle, so it is chosen in JS rather than by toggling two
// duplicate DOM trees with `hidden lg:block` — that would ship every section
// twice and read twice to a screen reader. Mobile and the md band keep the
// stacked layout exactly as it was.
const DESKTOP_QUERY = '(min-width: 1024px)';

function useIsDesktop() {
  // Initialised synchronously from matchMedia so the correct layout is in the
  // first paint — no flash of the wrong one.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia(DESKTOP_QUERY).matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

// ── Phone layout switch ───────────────────────────────────────────────────
// 639px, not the 768px used elsewhere, because this is the width at which the
// PANEL changes shape: `w-full sm:max-w-lg`. Below it the drawer is full-bleed
// and shares the screen with the app header; at and above it the drawer is a
// right-hand panel with the header beside it, and none of the offsetting below
// applies.
const PHONE_QUERY = '(max-width: 639px)';

function useIsPhone() {
  const [isPhone, setIsPhone] = useState(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia(PHONE_QUERY).matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(PHONE_QUERY);
    const onChange = (e) => setIsPhone(e.matches);
    setIsPhone(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isPhone;
}

// How far down the phone layout starts: the live height of the app header.
//
// MEASURED, not a constant. The header's height is the sum of its padding, its
// title's line box and its border, and it changes with the breakpoint (`py-3
// md:py-4`, `text-lg md:text-2xl`) — so any number written here would be a
// guess that silently drifts the first time Header.jsx is touched. Reading the
// element keeps the two in sync without this component reaching into the
// header's implementation. 0 when there is no header, which restores the
// original full-height behaviour.
function useAppHeaderHeight(active) {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (!active || typeof document === 'undefined') { setHeight(0); return undefined; }
    const el = document.querySelector('header');
    if (!el) { setHeight(0); return undefined; }
    const measure = () => setHeight(Math.round(el.getBoundingClientRect().height));
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [active]);
  return height;
}

// ── Small building blocks ─────────────────────────────────────────────────
const Section = ({ title, children }) => (
  <section className="rounded-2xl border border-neutral-dark bg-white p-4 md:p-5">
    <h3 className="font-montserrat text-base font-bold text-black-light mb-3">{title}</h3>
    {children}
  </section>
);

const BulletList = ({ items }) => (
  <ul className="space-y-2">
    {items.map((item, i) => (
      <li key={`${i}-${item.slice(0, 24)}`} className="flex gap-2.5">
        <span
          className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary-light/60"
          aria-hidden="true"
        />
        <span className="min-w-0 break-words text-sm leading-relaxed text-black-light">{item}</span>
      </li>
    ))}
  </ul>
);

// One row of the Job Details panel. Renders nothing when the field is null —
// we never show "Not specified".
const DetailRow = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-secondary-dark/70" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs text-secondary-dark">{label}</p>
        <p className="break-words text-sm font-medium text-black-light">{value}</p>
      </div>
    </div>
  );
};

// Desktop stat strip — the four Job Details facts as one horizontal row that
// never scrolls away. Nulls are dropped (never "Not specified"), and the whole
// strip disappears if all four are null.
const STAT_FIELDS = [
  { key: 'salary',          icon: DollarSign, label: 'Salary' },
  { key: 'location',        icon: MapPin,     label: 'Location' },
  { key: 'employment_type', icon: Briefcase,  label: 'Type' },
  { key: 'level',           icon: TrendingUp, label: 'Level' },
];

// The extractor copies salary/location VERBATIM from the posting (Rule 0), and
// postings routinely write them as prose rather than as values:
//   location: "This is a fully remote position. You can be based anywhere in
//              the UK, Amsterdam or …"
//   salary:   "3,493 to 4,657 Euro p/m + 2000 EUR annual learning budget +
//              Virtual Stock Options"
// Dumped straight into a four-across strip, one of those swallows the row and
// squeezes its neighbours to nothing. The strip is a glance-level summary, so
// show the LEADING fact and keep the untouched original in the tooltip.
//
// Structural trimming only — first sentence, then the part before a trailing
// "+ benefit" tail. Nothing is reworded or inferred.
function condenseStat(raw) {
  if (!raw) return '';
  let s = String(raw).replace(/\s+/g, ' ').trim();
  const firstSentence = s.match(/^(.+?[.!?])(?:\s|$)/);
  // Guard the length so an abbreviation ("approx. 50k") isn't cut to nothing.
  if (firstSentence && firstSentence[1].length >= 12) s = firstSentence[1];
  s = s.split(/\s+\+\s+/)[0];          // "…p/m + learning budget + equity"
  s = s.split(/\s+[·|—]\s+/)[0];       // "…  ·  Remote"
  return s.replace(/[\s.,;:]+$/, '').trim() || String(raw).trim();
}

const StatStrip = ({ jd }) => {
  const items = STAT_FIELDS.filter((f) => jd[f.key]);
  if (!items.length) return null;
  return (
    <div className="flex items-center gap-3 py-3">
      {items.map(({ key, icon: Icon, label }, i) => (
        <React.Fragment key={key}>
          {i > 0 && <span className="h-8 w-px shrink-0 bg-neutral-dark" aria-hidden="true" />}
          {/* grow (basis auto), NOT flex-1 (basis 0): items keep their natural
              width and share the slack, so a short salary is never truncated to
              make room for a long address — but a genuinely oversized value
              still shrinks, longest-first, instead of pushing the row over. */}
          <div className="flex min-w-0 grow items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-secondary-dark/70" aria-hidden="true" />
            <div className="min-w-0">
              {/* The label truncates too. Without this it overflowed its own
                  min-w-0 box and printed on top of the next item's label
                  ("Locati|Level") once a long value squeezed the row. */}
              <p className="truncate text-xs leading-tight text-secondary-dark">{label}</p>
              <p className="truncate text-sm font-medium leading-tight text-black-light" title={jd[key]}>
                {condenseStat(jd[key])}
              </p>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

// Segmented tabs. Styling is lifted from JobsPage's `tabButton` so the two read
// as the same control (gradient pill when active, neutral fill when not).
const TabBar = ({ tabs, activeTab, onSelect }) => (
  // overflow-x-auto is a safety net for a future 4th tab / longer label; with
  // three short labels it never triggers. (`no-scrollbar`, used in Settings.jsx,
  // is not actually defined anywhere in the project — so it is not used here.)
  <div className="flex gap-2 overflow-x-auto pb-3" role="tablist" aria-label="Job description sections">
    {tabs.map((tab) => {
      const active = activeTab === tab.key;
      return (
        <button
          key={tab.key}
          id={`jd-tab-${tab.key}`}
          role="tab"
          type="button"
          aria-selected={active}
          aria-controls={`jd-panel-${tab.key}`}
          onClick={() => onSelect(tab.key)}
          // Inactive pills carry a border here (Settings.jsx's variant) rather
          // than JobsPage's bare `bg-neutral` fill: JobsPage sits on the neutral
          // app background, but this drawer is white, where an unbordered
          // neutral pill is all but invisible.
          className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold font-montserrat transition-all ${
            active
              ? 'bg-gradient-to-r from-primary-light to-primary-dark text-white shadow-sm'
              : 'bg-neutral border border-neutral-dark text-secondary-dark hover:text-black-light hover:border-primary-light/40'
          }`}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);

// Skeleton body. Shown while the detail request is in flight — which on a job's
// FIRST open includes the backend's one-off structured_jd extraction, so this
// can sit for a second or two. Loading states are mandatory (DESIGN_GUIDE §9/§10):
// never a blank panel, and never a bare spinner for a content panel.
const JdSkeleton = () => (
  <div className="flex-1 overflow-y-auto px-5 py-5" role="status">
    <span className="sr-only">Loading the role…</span>
    <div className="animate-pulse space-y-5" aria-hidden="true">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 rounded-xl bg-neutral-dark" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-5 w-3/4 rounded bg-neutral-dark" />
          <div className="h-3.5 w-1/2 rounded bg-neutral-dark/70" />
        </div>
      </div>
      <div className="h-6 w-28 rounded-md bg-neutral-dark" />
      <div className="space-y-3 rounded-2xl border border-neutral-dark p-4 md:p-5">
        <div className="h-4 w-32 rounded bg-neutral-dark" />
        <div className="flex flex-wrap gap-2">
          {[64, 48, 80, 56].map((w, i) => (
            <div key={i} className="h-6 rounded-full bg-neutral-dark/70" style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-neutral-dark p-4 md:p-5">
        <div className="h-4 w-40 rounded bg-neutral-dark" />
        <div className="h-3 w-full rounded bg-neutral-dark/70" />
        <div className="h-3 w-11/12 rounded bg-neutral-dark/70" />
        <div className="h-3 w-4/6 rounded bg-neutral-dark/70" />
      </div>
    </div>
  </div>
);

const JobDetailDrawer = ({ jobId, isOpen, onClose, onSkip, onWriteIntro, showActions = true, actionPending = false }) => {
  // Escape closes, and the page behind does not scroll while the drawer is up.
  //
  // The missing scroll lock is why the close bar appeared to scroll away on
  // mobile: with the page still scrollable underneath, a swipe that the drawer
  // did not consume scrolled the document instead, and a scrolling document is
  // what makes a mobile browser collapse its URL bar — which shifts every
  // position:fixed element, this panel included. Same lock as RoleRequestModal
  // and TailoredCVPreview; this was the only overlay without one.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  const { data: job, isLoading } = useQuery({
    queryKey: ['job-detail', jobId],
    queryFn: () => getJob(jobId),
    enabled: isOpen && !!jobId,
    staleTime: 30000,
  });

  // Same key + staleTime as JobsPage, so this shares the cache rather than
  // firing a second profile request when the drawer opens.
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
  });

  const match = matchBadge(job?.fit_score);
  const jd = job?.structured_jd || null;

  const mySkillKeys = useMemo(() => {
    const list = profile?.skills_extracted?.skills;
    return new Set((Array.isArray(list) ? list : []).map(skillKey).filter(Boolean));
  }, [profile]);

  const jdSkills = useMemo(() => {
    const list = Array.isArray(jd?.skills) ? jd.skills : [];
    return list
      .filter((s) => typeof s === 'string' && s.trim())
      .map((s) => ({ name: s.trim(), matched: mySkillKeys.has(skillKey(s)) }));
  }, [jd, mySkillKeys]);

  const matchedCount = jdSkills.filter((s) => s.matched).length;

  // Only parsed when there's no structured_jd to show.
  const fallbackBlocks = useMemo(
    () => (jd ? [] : parseBlocks(htmlToText(job?.description))),
    [jd, job?.description],
  );

  const responsibilities = Array.isArray(jd?.responsibilities) ? jd.responsibilities : [];
  const requirements = Array.isArray(jd?.requirements) ? jd.requirements : [];
  const hasJobDetails = !!(jd && (jd.salary || jd.location || jd.employment_type || jd.level));
  // Drives the "Apply manually" vs dead-end link choice below.
  const hasBody = !!jd || fallbackBlocks.length > 0;

  // ── Desktop tabs ────────────────────────────────────────────────────────
  const isDesktop = useIsDesktop();
  const useTabs = isDesktop && !!jd;

  // On a phone the drawer starts BELOW the app header rather than covering it,
  // so the greeting, bell and avatar stay reachable while a role is open. On
  // anything wider this is 0 and the panel keeps its full-height inset-y-0.
  const isPhone = useIsPhone();
  const topOffset = useAppHeaderHeight(isOpen && isPhone);

  // A tab only exists when it has something to show.
  const tabs = useMemo(() => {
    if (!jd) return [];
    const t = [];
    if (jdSkills.length > 0 || jd.summary) t.push({ key: 'overview', label: 'Overview' });
    if (responsibilities.length > 0) t.push({ key: 'responsibilities', label: 'Responsibilities' });
    if (requirements.length > 0) t.push({ key: 'requirements', label: 'Requirements' });
    return t;
  }, [jd, jdSkills.length, responsibilities.length, requirements.length]);

  const [activeTab, setActiveTab] = useState('overview');
  // Opens on Overview, and never leaves the user on a tab that no longer exists
  // (different job, or a job whose sections differ).
  useEffect(() => {
    if (!tabs.length) return;
    if (!tabs.some((t) => t.key === activeTab)) setActiveTab(tabs[0].key);
  }, [tabs, activeTab]);
  useEffect(() => { setActiveTab('overview'); }, [jobId]);

  const bodyRef = useRef(null);
  const stickyRef = useRef(null);
  const panelRef = useRef(null);
  // Switching tabs returns to the top of the tab's content — the panel sitting
  // flush under the stuck bar.
  //
  // Measured from the PANEL, not the sticky bar: once a sticky element is stuck,
  // its offsetTop reports the scrolled position rather than its position in
  // flow, which silently turned this whole reset into a no-op. The panel is a
  // static element, so rect deltas give its true offset either way (and are
  // immune to which ancestor happens to be the offsetParent).
  //
  // Clamped with min() so it only ever scrolls UP: switching tabs while already
  // at the top must not jerk the header out of view.
  useEffect(() => {
    const body = bodyRef.current;
    const sticky = stickyRef.current;
    const panel = panelRef.current;
    if (!body || !sticky || !panel) return;
    const delta = panel.getBoundingClientRect().top - body.getBoundingClientRect().top;
    const target = body.scrollTop + delta - sticky.offsetHeight;
    body.scrollTop = Math.max(0, Math.min(body.scrollTop, target));
  }, [activeTab]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay — outside click closes */}
          <motion.div
            // Starts below the app header on a phone too, so the header is not
            // dimmed — it stays exactly as it looks with no drawer open.
            style={{ top: topOffset }}
            className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel — full-screen on mobile, right-side drawer on desktop.

              z-[60] over a z-[55] scrim, matching the mobile sidebar exactly.
              Dashboard.jsx states the rule these layers must keep — "header <
              backdrop < drawer" — and records what happens when something ties
              with the header at z-50: paint order falls to DOM order and
              compositing, and the header, promoted to its own layer by
              `backdrop-blur-xl`, drew on top. This drawer was sitting at z-50
              on both its scrim and its panel, i.e. exactly that tie. An
              aria-modal dialog should cover the app chrome outright, not
              negotiate with it. */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Opportunity details"
            style={{ top: topOffset }}
            className="fixed inset-y-0 right-0 z-[60] flex w-full flex-col bg-white shadow-2xl sm:max-w-lg lg:max-w-2xl sm:rounded-l-2xl font-roboto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            {/* Top close bar.

                The X is the ONLY way out on mobile, which is why it is sized
                and weighted more strongly than the same control in the other
                modals. Desktop has three exits — this button, Escape, and
                tapping the backdrop — but the panel is `w-full` below `sm`, so
                on a phone it covers the backdrop completely and there is
                nothing beside it to tap. A 36px, half-opacity glyph was the
                whole escape route, and people did not find it.

                Sized to the 44×44 minimum in DESIGN_GUIDE §5 (h-11/w-11);
                colours and hover are the house close-button treatment from
                RoleRequestModal / ApplyDirectModal. */}
            <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-neutral-dark bg-white/95 backdrop-blur-xl shrink-0">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-secondary-dark hover:text-black-light hover:bg-neutral transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-[11px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/60">
                Opportunity details
              </span>
            </div>

            {isLoading ? (
              <JdSkeleton />
            ) : !job ? (
              <div className="flex-1 flex items-center justify-center px-6 text-center">
                <p className="text-sm text-secondary-dark">We couldn&rsquo;t load this role. Please close and try again.</p>
              </div>
            ) : (
              <>
                {/* Scrollable body */}
                {/* min-h-0 is load-bearing, not tidying. A flex item defaults to
                    min-height:auto, so without it this div refuses to shrink
                    below its content: `flex-1 overflow-y-auto` never starts
                    scrolling, the panel grows taller than the viewport instead,
                    and the close bar above gets pushed out of sight. That is the
                    bug — the bar was never scrolling, the panel was stretching. */}
                <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 space-y-5">
                  {/* Identity */}
                  <div className="flex items-start gap-3">
                    <span className="w-12 h-12 shrink-0 rounded-xl bg-neutral text-secondary-dark border border-neutral-dark flex items-center justify-center font-montserrat font-bold text-lg">
                      {(job.company_name || '?').trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-montserrat text-xl font-bold text-black-light leading-snug">
                        {job.title}
                      </h2>
                      <p className="text-sm text-secondary-dark mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-black-light">{job.company_name}</span>
                        {job.location && (
                          <>
                            <span className="text-secondary-dark/40">·</span>
                            <span className="inline-flex items-center gap-1 min-w-0">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{job.location}</span>
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Match + salary — unchanged */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${match.cls}`}>
                      {match.label}
                    </span>
                    {job.salary_info && (
                      <span className="text-sm font-semibold text-emerald-600">{job.salary_info}</span>
                    )}
                  </div>

                  {/* ── Path 1a: desktop — sticky stat strip + tabs ──────── */}
                  {useTabs ? (
                    <>
                      {/* Strip and tab bar stick as ONE block, so the tab bar
                          needs no hard-coded offset under the strip. -mx-5 px-5
                          bleeds the background to the panel edges. */}
                      {/* -top-5, not top-0: a sticky element's rectangle is the
                          scrollport INSET BY the scroll container's padding, and
                          the body has py-5 — so top-0 parks the bar 20px down and
                          scrolled content shows through the gap above it. The
                          matching pt-5 keeps the bar's contents visually put, and
                          -mt-5 cancels the parent's space-y-5 so flow is unchanged. */}
                      <div
                        ref={stickyRef}
                        className="sticky -top-5 z-20 -mx-5 -mt-5 border-b border-neutral-dark bg-white px-5 pt-5"
                      >
                        {hasJobDetails && <StatStrip jd={jd} />}
                        {tabs.length > 1 && (
                          <TabBar tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} />
                        )}
                      </div>

                      {tabs.map((tab) => (
                        activeTab === tab.key && (
                          <div
                            key={tab.key}
                            ref={panelRef}
                            id={`jd-panel-${tab.key}`}
                            role="tabpanel"
                            aria-labelledby={`jd-tab-${tab.key}`}
                            tabIndex={-1}
                            className="space-y-5"
                          >
                            {tab.key === 'overview' && (
                              <>
                                {jdSkills.length > 0 && (
                                  <Section title="Skills Match">
                                    {mySkillKeys.size > 0 && matchedCount > 0 && (
                                      <p className="-mt-1 mb-3 text-xs text-secondary-dark">
                                        {matchedCount} of {jdSkills.length} match your profile
                                      </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                      {jdSkills.map(({ name, matched }) => (
                                        <span
                                          key={name}
                                          title={matched ? 'On your profile' : undefined}
                                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                                            matched
                                              ? 'bg-primary-light/10 text-primary-dark border-primary-light/30 font-semibold'
                                              : 'bg-neutral text-secondary-dark border-neutral-dark'
                                          }`}
                                        >
                                          {name}
                                        </span>
                                      ))}
                                    </div>
                                  </Section>
                                )}
                                {jd.summary && (
                                  <Section title="About the Role">
                                    <p className="break-words text-sm leading-relaxed text-black-light">{jd.summary}</p>
                                  </Section>
                                )}
                              </>
                            )}
                            {tab.key === 'responsibilities' && (
                              <Section title="Core Responsibilities">
                                <BulletList items={responsibilities} />
                              </Section>
                            )}
                            {tab.key === 'requirements' && (
                              <Section title="Requirements">
                                <BulletList items={requirements} />
                              </Section>
                            )}
                          </div>
                        )
                      ))}
                    </>
                  ) : jd ? (
                    /* ── Path 1b: mobile / md — stacked sections, unchanged ── */
                    <div className="space-y-5">
                      {jdSkills.length > 0 && (
                        <Section title="Skills Match">
                          {mySkillKeys.size > 0 && matchedCount > 0 && (
                            <p className="-mt-1 mb-3 text-xs text-secondary-dark">
                              {matchedCount} of {jdSkills.length} match your profile
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {jdSkills.map(({ name, matched }) => (
                              <span
                                key={name}
                                title={matched ? 'On your profile' : undefined}
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                                  matched
                                    ? 'bg-primary-light/10 text-primary-dark border-primary-light/30 font-semibold'
                                    : 'bg-neutral text-secondary-dark border-neutral-dark'
                                }`}
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </Section>
                      )}

                      {responsibilities.length > 0 && (
                        <Section title="Core Responsibilities">
                          <BulletList items={responsibilities} />
                        </Section>
                      )}

                      {requirements.length > 0 && (
                        <Section title="Requirements">
                          <BulletList items={requirements} />
                        </Section>
                      )}

                      {jd.summary && (
                        <Section title="About the Role">
                          <p className="break-words text-sm leading-relaxed text-black-light">{jd.summary}</p>
                        </Section>
                      )}

                      {hasJobDetails && (
                        <Section title="Job Details">
                          <div className="space-y-3.5">
                            <DetailRow icon={DollarSign} label="Salary" value={jd.salary} />
                            <DetailRow icon={MapPin} label="Location" value={jd.location} />
                            <DetailRow icon={Briefcase} label="Employment type" value={jd.employment_type} />
                            <DetailRow icon={TrendingUp} label="Level" value={jd.level} />
                          </div>
                        </Section>
                      )}
                    </div>
                  ) : fallbackBlocks.length > 0 ? (
                    /* ── Path 2: raw description, as real paragraphs + lists ── */
                    <Section title="About the role">
                      <div className="space-y-3">
                        {fallbackBlocks.map((block, i) =>
                          block.type === 'ul' ? (
                            <BulletList key={i} items={block.items} />
                          ) : (
                            <p key={i} className="break-words text-sm leading-relaxed text-black-light">
                              {block.text}
                            </p>
                          ),
                        )}
                      </div>
                    </Section>
                  ) : job.apply_url ? (
                    /* ── Path 3: nothing to show — send them to the listing ── */
                    <a
                      href={job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-dark hover:text-primary-light transition-colors"
                    >
                      View full listing <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : null}

                  {/* Apply manually — present whenever there's a link AND we showed
                      a body above (avoids duplicating the link). */}
                  {job.apply_url && hasBody && (
                    <a
                      href={job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-dark hover:text-primary-light transition-colors"
                    >
                      Apply manually <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Tailored CV — this is the natural place to offer it: the user
                      is reading the role in depth. */}
                  <div className="pt-2 border-t border-neutral-dark">
                    <p className="text-[11px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/60 mb-2">
                      Tailored CV
                    </p>
                    <GenerateCvButton job={job} hasCv={job.has_cv} />
                  </div>
                </div>

                {/* Sticky footer actions */}
                {showActions && (
                  <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-t border-neutral-dark bg-white">
                    <button
                      onClick={onSkip}
                      disabled={actionPending}
                      className="inline-flex items-center justify-center gap-2 text-secondary-dark hover:bg-neutral font-semibold rounded-xl px-5 py-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Skip
                    </button>
                    <button
                      onClick={onWriteIntro}
                      disabled={actionPending}
                      className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {actionPending
                        ? <><ApplyDirLoader.Button variant="light" /> Reaching out…</>
                        : <>Reach Out <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default JobDetailDrawer;

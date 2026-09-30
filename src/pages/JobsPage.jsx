import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router';
import {
    MapPin, ArrowRight, ArrowLeft, CheckCircle2, Search, Loader2, UserX,
    ExternalLink, Clock, FileText, ChevronDown, RefreshCw, SearchX, Sparkles, Info,
} from 'lucide-react';
// `motion` is used only as `<motion.div>` (member-expression JSX), which this
// eslint config's jsx-uses-vars doesn't count — silence the false positive.
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { useNavigate } from 'react-router-dom';
import { ApplyDirLoader } from '../components/ui/ApplyDirLoader';
import { getOpportunityJobs, updateJobStatus, trackJob, getScrapeStatus, searchNow, retryDraft } from '../services/apiJobs';
import HeadhuntingState from '../components/HeadhuntingState';
import RoleRequestModal from '../components/RoleRequestModal';
import { getAnalytics } from '../services/apiAnalytics';
import { getProfile } from '../services/apiProfile';
import { settingsLink } from '../constants/settingsSections';
import { useIsMobile } from '../hooks/useIsMobile';
import ProfileActivationDrawer from '../components/ProfileActivationDrawer';
import ActivationFlow from '../components/onboarding/ActivationFlow';
import FirstTimePersonalizationModal from '../components/onboarding/FirstTimePersonalizationModal';
import JobDetailDrawer from '../components/JobDetailDrawer';
import ApplyDirectModal from '../components/ApplyDirectModal';
import BroadenSearchNudge from '../components/BroadenSearchNudge';
import { postedAge } from '../utils/jobAge';
import {
    canRetryDraft, cardState, draftFailureText, isBelowBar, isRetryingDraft,
    LONG_WAIT_LABEL, SLOW_LABEL, WORKING_LABEL, workingStage,
} from '../utils/cardState';
import { firstNameOf, introReadyText } from '../utils/introCopy';

// ── Opportunities — the Discover Feed ─────────────────────────────────────
// Curated roles the headhunter found, organised by lifecycle so the review flow
// is never blocked:
//   • In progress (Section A): cards actively finding a contact + drafting.
//     Capped at 3 working per user by the backend; extras queue silently.
//   • For your review (Section B): the main queue — new, unacted jobs, 9/page.
//   • Apply directly (Section C): no-contact jobs, collapsed at the bottom.
// Filter tabs let the user focus (e.g. "Contact found" = the highest-value cards).

const ITEMS_PER_PAGE = 9;
const MAX_WORKING = 3;            // mirrors backend MAX_CONCURRENT_AUTODRAFT
const COMPLETE_HOLD_MS = 3000;    // "Found Sarah Chen ✓" dwell before the card fades
// Two thresholds, and NEITHER of them means failure. Measured on 54 real drafts
// (re-drafts excluded): p50 42s, with a genuine tail at 455s / 544s / 645s /
// 1992s. The old single 90s ceiling sat inside normal work and announced
// "couldn't find a hiring manager" over drafts that were fine.
const SLOW_AFTER_MS = 90000;       // past usual → say so, and poll less often
const RESOLVE_TIMEOUT_MS = 600000; // 10 min → stop watching, still not a failure
const POLL_FAST_MS = 4000;         // while any card is inside SLOW_AFTER_MS
const POLL_SLOW_MS = 15000;        // once every watched card is past it

// Is this card's backend work still plausibly in flight? The Opportunities poll
// runs only while at least one job answers yes, so this predicate is what decides
// whether an open tab costs anything.
//
// Three tests, and the last two are the point:
//   1. the server still calls it working/queued, or a draft retry is running;
//   2. the local 90s ceiling has not already force-resolved it — the same
//      `timedOut` set effState layers on top, so the poll now stops at exactly
//      the moment the card leaves the tray instead of running on behind it;
//   3. its start stamp is still inside that ceiling.
//
// Test 3 is the fix. cardState() calls ANY approved row with no draft 'working'
// (see cardState.js) with no upper bound, so a single row stuck in that state
// pinned a 4s refetch of all 200 jobs on for as long as the tab stayed open. The
// backend sweeper (sweep_stuck_autodrafts) does recover such a row within ~10
// minutes, which is why this rarely ran forever in practice — but nothing in the
// browser depended on that cron, and nothing should.
//
// `timedOutIds` and `startedAtMap` are passed in rather than closed over:
// react-query evaluates refetchInterval synchronously inside useQuery, before
// anything declared further down the component is initialised — the temporal
// dead zone DashboardPage.jsx documents. Both are refs, so they are safe to read.
// How long this card has been in flight, by the best stamp available. Shared by
// the poll predicate and the label effect so the two can never disagree.
const elapsedFor = (job, startedAtMap, now) => {
    const stamped = Date.parse(isRetryingDraft(job) ? job.draft_failed_at : job.approved_at);
    const startedAt = Number.isNaN(stamped) ? startedAtMap.get(job.id) : stamped;
    return startedAt == null ? 0 : now - startedAt;
};

const isResolving = (job, timedOutIds, startedAtMap, now) => {
    if (timedOutIds.has(job.id)) return false;
    const retrying = isRetryingDraft(job);
    if (!retrying && !['working', 'queued'].includes(cardState(job))) return false;
    // A retry restarts the clock at draft_failed_at; anything else runs from
    // approved_at. Falling back to the client stamp keeps this in lockstep with
    // the ceiling effect, which stamps every spinning card it sees — including
    // one inherited from a reload, where the server timestamps may be absent.
    const stamped = Date.parse(retrying ? job.draft_failed_at : job.approved_at);
    const startedAt = Number.isNaN(stamped) ? startedAtMap.get(job.id) : stamped;
    // No stamp anywhere means we are seeing this card for the first time; the
    // ceiling effect records it on this same render, so the next evaluation is
    // bounded. Polling one more cycle is correct, and it cannot repeat.
    if (startedAt == null) return true;
    return now - startedAt < RESOLVE_TIMEOUT_MS;
};

const GRID_STAGGER = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const CARD_ITEM = {
    hidden: { opacity: 0, y: 20 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

const matchStrength = (score) => {
    if (score == null) return { label: 'New match',    badge: 'px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 border-gray-200',        accent: 'bg-neutral-200' };
    if (score >= 80)   return { label: 'Strong match', badge: 'px-3 py-1.5 text-sm font-bold bg-emerald-100 text-emerald-700 border-emerald-200', accent: 'bg-emerald-400/30' };
    if (score >= 60)   return { label: 'Good match',   badge: 'px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-600 border-emerald-100', accent: 'bg-emerald-300/30' };
    return { label: 'Fair match', badge: 'px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 border-gray-200', accent: 'bg-neutral-200' };
};

// Pipeline position for the card's progress bar. Derived purely from the visual
// state cardState already computes — no new data, no backend change. `no_contact`
// is deliberately absent: an apply-direct card has no pipeline left to show.
const STAGE = {
    new:     { label: 'New',         pct: 25 },
    drafted: { label: 'Intro ready', pct: 50 },
    sent:    { label: 'Sent',        pct: 100 },
};

// `company_website` is stored as either a bare domain ('medal.tv') or a full
// URL, depending on which resolver filled it. Normalise to the bare host.
const logoDomain = (site) => {
    const raw = (site || '').trim();
    if (!raw) return '';
    return raw
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split(/[/?#]/)[0]
        .toLowerCase();
};

// Company logo, tried in three stages, ending at the letter avatar.
//
//   0. The logo the ATS published (`company_logo_url`) — the real brand mark.
//   1. The domain's favicon — a square icon.
//   2. The letter avatar.
//
// Stage 1 exists because roughly 4 in 10 ATS logos are wide wordmarks (SAP
// Fioneer ships 550x120, InnovationTeam 346x87) and a 4.6:1 image inside a 44px
// square renders as an unreadable sliver. When onLoad reports an aspect ratio
// that wide we switch to the favicon, which is square by definition, so the grid
// stays visually even. Square-ish logos (the majority) are shown as-is.
//
// The previous version pointed at logo.clearbit.com, which no longer resolves —
// its DNS record was withdrawn — so every card fell through to a letter. The
// favicon host used here was checked to be serving before being relied on.
//
// Module-level, not nested in JobsPage, so it never remounts mid-animation.
// `radius`/`pad` default to the original values so trayCard renders identically;
// fullCard overrides them for its small inline variant.
const CompanyLogo = ({ job, size = 'w-11 h-11', text = 'text-base', radius = 'rounded-xl', pad = 'p-0.5' }) => {
    const [stage, setStage] = useState(0);
    const domain = logoDomain(job.company_website);
    const atsLogo = (job.company_logo_url || '').trim();
    const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';

    let src = '';
    if (stage === 0 && atsLogo) src = atsLogo;
    else if (stage <= 1 && favicon) src = favicon;

    if (src) {
        return (
            <img
                src={src}
                alt=""
                loading="lazy"
                onError={() => setStage((s) => s + 1)}
                onLoad={(e) => {
                    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                    if (stage === 0 && favicon && w && h && w / h > 2.2) setStage(1);
                }}
                className={`${size} shrink-0 ${radius} border border-neutral-dark bg-white object-contain ${pad}`}
            />
        );
    }
    return (
        <span className={`${size} shrink-0 ${radius} bg-neutral text-secondary-dark border border-neutral-dark flex items-center justify-center font-montserrat font-bold ${text}`}>
            {(job.company_name || '?').trim().charAt(0).toUpperCase()}
        </span>
    );
};

// `job.source` is a lowercase slug from the adapter. Presentation only — the
// fallback just title-cases anything not listed, so a new adapter still reads OK.
const SOURCE_LABELS = {
    greenhouse: 'Greenhouse', ashby: 'Ashby', lever: 'Lever', workday: 'Workday',
    workable: 'Workable', smartrecruiters: 'SmartRecruiters', bamboohr: 'BambooHR',
    linkedin: 'LinkedIn', indeed: 'Indeed', wellfound: 'Wellfound',
    weworkremotely: 'We Work Remotely', remoteok: 'RemoteOK', remotive: 'Remotive',
    himalayas: 'Himalayas', yc: 'Y Combinator',
};
const sourceLabel = (s) =>
    SOURCE_LABELS[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const NEGATIVE_RE = /(does ?not|does ?n['’]?t|\bweak\b|\bfails?\b|not match|not align|\black(s|ing)?\b|\bmissing\b|mismatch|\bgaps?\b|\bunfortunately\b|\bpoor(ly)?\b|unrelated|irrelevant)/i;
const positiveReason = (text) =>
    (!text || NEGATIVE_RE.test(text))
        ? 'Your experience aligns well with this role.'
        : text;

const JobsPage = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    const [isActivationDrawerOpen, setIsActivationDrawerOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pendingJobId, setPendingJobId] = useState(null);
    const [showPersonalization, setShowPersonalization] = useState(false);
    const [drawerJobId, setDrawerJobId] = useState(null);
    const [applyModal, setApplyModal] = useState(null);
    // Ids the user just acted on, most-recent first — orders the in-progress tray.
    const [actedOrder, setActedOrder] = useState([]);
    // Which filter tab is active.
    const [activeTab, setActiveTab] = useState('all');
    // Collapsed Apply-Direct section (Section C) in the All view.
    const [applyExpanded, setApplyExpanded] = useState(false);
    // Cards mid-"completion moment": snapshot {id, name, title, company} shown in
    // the tray with a success flourish for COMPLETE_HOLD_MS, then faded out.
    const [completing, setCompleting] = useState([]);
    const handledRef = useRef(new Set());   // dedupe completion / no-contact toasts
    // Cards we have stopped watching after RESOLVE_TIMEOUT_MS. They stay in the
    // tray as work in progress — the server is still the only thing allowed to
    // say a job has no contact.
    const [timedOut, setTimedOut] = useState(() => new Set());
    const timedOutRef  = useRef(new Set());   // sync mirror of `timedOut`
    // Cards past SLOW_AFTER_MS: same state, calmer label, slower poll.
    const [slow, setSlow] = useState(() => new Set());
    const slowRef = useRef(new Set());
    const startedAtRef = useRef(new Map());   // jobId -> ms when its spinner began

    const [searchParams, setSearchParams] = useSearchParams();
    const isActivateRequested = searchParams.get('activate') === '1';

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['profile'],
        queryFn: getProfile,
        staleTime: 5 * 60 * 1000,
    });
    const isActivated = !!profile?.cv_raw_text;
    // Onboarding is DONE only with a CV *and* saved role preferences — the same
    // two-part test Home uses (DashboardPage.jsx), deliberately not the CV alone.
    // cv_raw_text is written at step 1 of Calibration, so gating on it by itself
    // would strand anyone who bailed mid-flow on a page they cannot use.
    // Derived up here, above every query and closure that reads it, for the
    // temporal-dead-zone reason DashboardPage documents.
    const roleTypes = profile?.job_preferences?.role_types;
    const hasPreferences = Array.isArray(roleTypes) && roleTypes.length > 0;
    const onboardingDone = isActivated && hasPreferences;

    const { data: analytics } = useQuery({
        queryKey: ['analytics', 30],
        queryFn: () => getAnalytics(30),
        staleTime: 5 * 60 * 1000,
    });

    // Is the background scrape running right now? Poll it so we can show the
    // "AI headhunter searching" screen after onboarding instead of a blank page.
    const { data: scrapeStatus } = useQuery({
        queryKey: ['scrape-status'],
        queryFn: getScrapeStatus,
        refetchInterval: (query) => (query.state.data?.is_active ? 3000 : false),
        staleTime: 0,
    });
    const isSearching = scrapeStatus?.is_active === true;

    const { data: pageData, isLoading: loading } = useQuery({
        queryKey: ['jobs-page', 'opportunities'],
        queryFn:  () => getOpportunityJobs(),
        // Focus refetch, but only while something could actually have landed.
        // This was `false`, and it is the other half of the Quantiphi bug: the
        // draft existed at 41s, the backgrounded tab never fetched it, and
        // coming back showed the stale pre-draft card.
        refetchOnWindowFocus: (query) => {
            if (isSearching) return true;
            const now = Date.now();
            return (query.state.data?.jobs || []).some(
                (j) => isResolving(j, timedOutRef.current, startedAtRef.current, now),
            );
        },
        staleTime: 30000,
        // Poll while a scrape is active (results stream in), or while a card's
        // background work could still land. Idle otherwise — and "idle" has to
        // mean zero requests, so the second test is bounded by RESOLVE_TIMEOUT_MS
        // rather than by cardState alone. See isResolving.
        //
        // Two speeds: 4s while any watched card is inside the usual duration,
        // 15s once they are all past it. A slow job is still watched — it is
        // watched more cheaply.
        refetchInterval: (query) => {
            if (isSearching) return POLL_FAST_MS;
            const now = Date.now();
            const watched = (query.state.data?.jobs || []).filter(
                (j) => isResolving(j, timedOutRef.current, startedAtRef.current, now),
            );
            if (!watched.length) return false;
            const anyFresh = watched.some(
                (j) => elapsedFor(j, startedAtRef.current, now) < SLOW_AFTER_MS,
            );
            return anyFresh ? POLL_FAST_MS : POLL_SLOW_MS;
        },
    });

    // Stable identity per fetch — the 90s-ceiling effect depends on `jobs`, and a
    // fresh array each render would tear its interval down before it could tick.
    const jobs = useMemo(() => pageData?.jobs ?? [], [pageData]);

    // Server state, full stop. There used to be a local override here that
    // turned any card past the 90s ceiling into 'no_contact' — which put a job
    // with a contact and a draft into the Apply Direct pile on a timer. Elapsed
    // time is not a result; only the server decides this.
    const effState = (job) => cardState(job);

    // ── Buckets ───────────────────────────────────────────────────────────────
    const completingIds = new Set(completing.map((c) => c.id));
    const orderByActed = (a, b) => {
        const ia = actedOrder.indexOf(a.id), ib = actedOrder.indexOf(b.id);
        return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
    };
    const workingJobs = jobs.filter((j) => effState(j) === 'working').sort(orderByActed);
    const queuedJobs  = jobs.filter((j) => effState(j) === 'queued').sort(orderByActed);
    const newJobs     = jobs.filter((j) => effState(j) === 'new');
    // Contact-found cards still mid-completion animation live in the tray, not the grid.
    // A found contact whose intro was never drafted is still a contact found.
    const contactJobs = jobs.filter((j) => ['drafted', 'sent', 'contact_no_draft'].includes(effState(j)) && !completingIds.has(j.id));
    const applyJobs   = jobs.filter((j) => effState(j) === 'no_contact');

    // Hard cap: nothing new starts while MAX_WORKING are already in flight. The
    // optimistic cache update in onMutate lands before the next poll, so rapid
    // clicking can't slip a 4th through a polling gap.
    const atCapacity = workingJobs.length + queuedJobs.length >= MAX_WORKING;

    const reviewCount   = newJobs.length;
    const contactReady  = contactJobs.length;
    const pickedCount    = newJobs.length + contactJobs.length + applyJobs.length;
    // ALL-TIME, and deliberately a different scope from the three counts above:
    // it includes the release-valve buffer (scored + shortlisted, not surfaced
    // yet), roles the scorer rejected, ones this user skipped, and ones that have
    // since expired — none of which are on this page. The copy below therefore
    // states both scopes ("so far" vs "on your board now") instead of implying
    // one funnel, which is what made the summary read as self-contradictory.
    //
    // Reads `curation.reviewed` (jobs the scorer actually judged), NOT the
    // funnel's Scraped stage: that stage is every Job row ever, so it also
    // counted rows ingested but never scored — which nothing reviewed.
    const reviewedTotal = analytics?.curation?.reviewed ?? null;

    // Matches found for this user that are NOT on screen yet, straight from the
    // server (jobs.services.held_opportunity_count). A third scope again: not
    // all-time like `reviewedTotal`, not on-screen like `pickedCount` — these
    // exist, are shortlisted, and are queued behind the release valve. Shown so
    // an empty review queue never reads as "we found nothing for you".
    const heldCount = pageData?.held_count ?? 0;

    const trayCount = workingJobs.length + queuedJobs.length + completing.length;

    // ── Empty-state model ─────────────────────────────────────────────────────
    // Five mutually exclusive states, resolved top-down — see the matching block
    // in DashboardPage.jsx (kept in sync by hand; the two pages render different
    // containers, so only this derivation is duplicated).
    //
    // hasEverHadResults exists because first_run_yield describes the FIRST run
    // and never updates: someone whose first run found 0 and whose second found
    // 30 reads first_run_yield: 0 forever.
    //
    // has_ever_surfaced is the authoritative answer (a job with surfaced_at set =
    // we put it on screen). The two fallbacks behind it only matter if the field
    // is missing — an older backend, or a cached payload from before it shipped —
    // and each is individually wrong on its own: Approved misses cards the user
    // skipped, first_run_yield misses everything after run one.
    const everApproved = analytics?.funnel?.find((s) => s.stage === 'Approved')?.count ?? 0;
    const hasEverHadResults =
        scrapeStatus?.has_ever_surfaced === true
        || everApproved > 0
        || (scrapeStatus?.first_run_yield ?? 0) > 0;
    const firstRunDone = scrapeStatus?.first_run_done === true;

    // `stale` is true on the ONE response that detects a dead run and clears its
    // lock; every later poll reports false. Latch it so the user can actually
    // read the message, and drop the latch as soon as a new run starts.
    const [sawInterrupted, setSawInterrupted] = useState(false);
    useEffect(() => {
        if (scrapeStatus?.is_active === true) setSawInterrupted(false);
        else if (scrapeStatus?.stale === true) setSawInterrupted(true);
    }, [scrapeStatus?.is_active, scrapeStatus?.stale]);

    const hasAnyCard = pickedCount > 0 || trayCount > 0;
    const emptyState =
        hasAnyCard          ? null
        : isSearching       ? 'SEARCHING'
        : sawInterrupted    ? 'INTERRUPTED'
        : !firstRunDone     ? 'NEVER_RUN'
        : hasEverHadResults ? 'CAUGHT_UP'
        :                     'FIRST_RUN_EMPTY';

    const [showRoleRequest, setShowRoleRequest] = useState(false);
    const [searchingNow, setSearchingNow] = useState(false);

    const runSearchNow = async () => {
        if (searchingNow) return;
        setSearchingNow(true);
        try {
            const res = await searchNow();
            if (res?.unavailable) {
                toast.info('Search is busy right now — try again shortly.');
            }
            // Either a run just started or one was already going: both mean the
            // UI should flip to SEARCHING, so refresh both drivers of that call.
            queryClient.invalidateQueries({ queryKey: ['scrape-status'] });
            queryClient.invalidateQueries({ queryKey: ['jobCount', 'scraped'] });
        } catch {
            toast.error("We couldn't start a search just now. Please try again.");
        } finally {
            setSearchingNow(false);
        }
    };

    // ── Pagination over the review queue (New / All tabs) ─────────────────────
    const totalPages = Math.max(1, Math.ceil(newJobs.length / ITEMS_PER_PAGE));
    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);
    useEffect(() => { setCurrentPage(1); }, [activeTab]);
    const pageNewJobs = newJobs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // ── How long it has been taking ───────────────────────────────────────────
    // Every card we see spinning gets a start stamp — on click, and also on first
    // sight of one that was already spinning, so a spinner inherited from a
    // reload is stamped too.
    //
    // This effect used to end a card's life: past 90s it fired "couldn't find a
    // hiring manager", dropped the card into Apply Direct, marked it handled so
    // the real success toast could never fire, and killed its polling. All four
    // were wrong — a slow draft is not a missing contact, and the server is the
    // only thing that knows whether anyone was found.
    //
    // Now it only changes what the card SAYS, and how often we ask:
    //   past SLOW_AFTER_MS      → "taking longer than usual", poll every 15s
    //   past RESOLVE_TIMEOUT_MS → "check Introductions", stop polling
    // No toast at either line, and nothing is marked handled — when the draft
    // lands, "Your introduction to <name> is ready to review." still fires.
    useEffect(() => {
        const active = jobs.filter((j) => ['working', 'queued'].includes(cardState(j)));
        const now = Date.now();
        active.forEach((j) => {
            if (!startedAtRef.current.has(j.id)) startedAtRef.current.set(j.id, now);
        });
        if (!active.length) return undefined;

        const tick = () => {
            const t = Date.now();
            let changedSlow = false;
            let changedTimedOut = false;
            active.forEach((j) => {
                const elapsed = elapsedFor(j, startedAtRef.current, t);
                if (elapsed >= SLOW_AFTER_MS && !slowRef.current.has(j.id)) {
                    slowRef.current.add(j.id);
                    changedSlow = true;
                }
                if (elapsed >= RESOLVE_TIMEOUT_MS && !timedOutRef.current.has(j.id)) {
                    timedOutRef.current.add(j.id);
                    changedTimedOut = true;
                }
            });
            if (changedSlow) setSlow(new Set(slowRef.current));
            if (changedTimedOut) setTimedOut(new Set(timedOutRef.current));
        };
        tick();                                 // catch anything already past a line
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [jobs]);

    // ── Completion / no-contact reconciliation ────────────────────────────────
    // As acted-on jobs resolve: contact found → brief success flourish in the tray,
    // then fade + toast (it now lives on Introductions); no contact → toast, and it
    // drops into the Apply Direct section.
    useEffect(() => {
        if (actedOrder.length === 0) return;
        const byId = Object.fromEntries(jobs.map((j) => [j.id, j]));
        actedOrder.forEach((id) => {
            const j = byId[id];
            if (!j) return;
            const s = cardState(j);
            if ((s === 'drafted' || s === 'sent') && !handledRef.current.has(id)) {
                handledRef.current.add(id);
                const name = j.contact_name || 'the hiring manager';
                setCompleting((prev) => prev.some((c) => c.id === id)
                    ? prev
                    : [...prev, { id, name, title: j.contact_title || '', company: j.company_name }]);
                setTimeout(() => {
                    setCompleting((prev) => prev.filter((c) => c.id !== id));
                    setActedOrder((prev) => prev.filter((x) => x !== id));
                    toast.success(introReadyText(firstNameOf(j.contact_name)));
                }, COMPLETE_HOLD_MS);
            } else if (s === 'contact_no_draft' && !isRetryingDraft(j) && !handledRef.current.has(id)) {
                handledRef.current.add(id);
                setActedOrder((prev) => prev.filter((x) => x !== id));
                // A draft that saved flagged is NOT this branch — it has a draft,
                // so it resolves as 'drafted' above and the review banner handles
                // it. This is a real generation failure, and it reads as an error.
                if (isBelowBar(j)) {
                    // Declining a low-fit role is the product working. Never an
                    // error toast, and it names the reason in the user's terms.
                    toast.info(`We didn't reach out to ${j.company_name} — this one scored `
                        + 'below your bar.');
                } else if (j.draft_failure_reason === 'generation_failed') {
                    toast.error(`We couldn't write your introduction to `
                        + `${firstNameOf(j.contact_name) || 'the hiring manager'} `
                        + `at ${j.company_name}. You can try again from the card.`);
                } else {
                    toast.info(`Found ${j.contact_name || 'a contact'} at ${j.company_name}, but ${draftFailureText(j)}.`);
                }
            } else if (s === 'no_contact' && !handledRef.current.has(id)) {
                handledRef.current.add(id);
                setActedOrder((prev) => prev.filter((x) => x !== id));
                toast.info(`Couldn't find a hiring manager at ${j.company_name} — you can apply directly.`);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageData]);

    // ── Mutation: approve / reject / expire ───────────────────────────────────
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, newStatus, outreachNote }) => updateJobStatus(id, newStatus, outreachNote),
        onMutate: async ({ id, newStatus }) => {
            await queryClient.cancelQueries({ queryKey: ['jobs-page', 'opportunities'] });
            const prev = queryClient.getQueryData(['jobs-page', 'opportunities']);
            queryClient.setQueryData(['jobs-page', 'opportunities'], (old) => {
                if (!old?.jobs) return old;
                let list = old.jobs;
                if (newStatus === 'approved') {
                    list = list.map((j) => j.id === id ? { ...j, status: 'approved', has_draft: false, is_queued: false } : j);
                } else if (newStatus === 'rejected' || newStatus === 'expired') {
                    list = list.filter((j) => j.id !== id);
                }
                return { ...old, jobs: list };
            });
            return { prev };
        },
        onSuccess: (data, { id, newStatus, silent }) => {
            if (newStatus === 'approved') {
                // No toast for starting or queueing — those aren't results. Only
                // "intro ready" / "no hiring manager" talk to the user.
                if (data?.queued) {
                    // Reflect the queued state so the tray shows "Queued", not a spinner.
                    queryClient.setQueryData(['jobs-page', 'opportunities'], (old) => old?.jobs
                        ? { ...old, jobs: old.jobs.map((j) => j.id === id ? { ...j, is_queued: true } : j) }
                        : old);
                }
            } else if (newStatus === 'rejected' && !silent) {
                toast.success('Skipped. Your headhunter will keep looking.');
            }
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
        },
        onError: (err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(['jobs-page', 'opportunities'], ctx.prev);
            toast.error(err.message || 'Something went wrong. Please try again.');
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['jobs-page'] }),
    });

    const handleUpdateStatus = (id, newStatus, silent = false, outreachNote = '') =>
        updateStatusMutation.mutate({ id, newStatus, silent, outreachNote });

    // ── Mutation: try a failed intro draft again ──────────────────────────────
    // The server accepts (202) and drafts in the background; the card flips to
    // "Retrying…" at once from the returned payload and resolves on a later poll.
    // Cooldowns and caps come back as readable errors and are shown as-is.
    const retryDraftMutation = useMutation({
        mutationFn: (id) => retryDraft(id),
        onSuccess: (data, id) => {
            queryClient.setQueryData(['jobs-page', 'opportunities'], (old) => old?.jobs
                ? { ...old, jobs: old.jobs.map((j) => (j.id === id ? { ...j, ...data } : j)) }
                : old);
            // Re-arm the outcome toast: "Introduction ready…" or "…couldn't draft".
            handledRef.current.delete(id);
            // Restart the resolve clock, the same way approveJob does. The server
            // stamps draft_failed_at when it accepts the retry, so isResolving is
            // bounded either way; this covers the window before that payload has
            // been merged, and keeps the two entry points symmetric.
            startedAtRef.current.set(id, Date.now());
            timedOutRef.current.delete(id);
            setActedOrder((prev) => [id, ...prev.filter((x) => x !== id)]);
        },
        onError: (err) => toast.error(err.message || "Couldn't retry just now. Please try again."),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['jobs-page'] }),
    });

    // Reach Out → approve; contact search + draft happen in the background.
    // outreachNote is the user's note about THIS company from the personalization
    // modal; it rides along on the approval so it is stored before the auto-draft
    // thread starts and can reach the generator's `highlight` argument.
    const approveJob = (jobId, outreachNote = '') => {
        setDrawerJobId(null);
        setActedOrder((prev) => [jobId, ...prev.filter((x) => x !== jobId)]);
        handledRef.current.delete(jobId);
        timedOutRef.current.delete(jobId);
        startedAtRef.current.set(jobId, Date.now());   // ceiling runs from the click
        handleUpdateStatus(jobId, 'approved', false, outreachNote);
    };
    const handleReachOut = (jobId) => {
        setDrawerJobId(null);
        // At capacity this is the only feedback the user gets — explain, don't
        // silently do nothing. toastId dedupes repeat clicks instead of stacking.
        if (atCapacity) {
            toast.info(
                `Your headhunter works on ${MAX_WORKING} at a time — this one starts as soon as a slot frees.`,
                { toastId: 'reachout-capacity' },
            );
            return;
        }
        if (profile && !profile.tone_preference) {
            setPendingJobId(jobId);
            setShowPersonalization(true);
            return;
        }
        approveJob(jobId);
    };
    const handlePersonalizationComplete = () => {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        setShowPersonalization(false);
        // No note from this modal — it is shown once per user, so a per-company
        // answer here would only ever reach one company. approveJob still takes
        // the argument; a future per-job surface will supply it.
        if (pendingJobId != null) approveJob(pendingJobId);
        setPendingJobId(null);
    };
    const handlePersonalizationCancel = () => {
        setShowPersonalization(false);
        setPendingJobId(null);
    };

    // Apply Direct (Section C) — open the listing, record it on Progress as an
    // "Applied — Manual" card, and remove it from Opportunities (→ 'expired').
    const applyDirect = async (job) => {
        if (job.apply_url) window.open(job.apply_url, '_blank', 'noopener,noreferrer');
        try { await trackJob(job.id, 'applied'); } catch { /* non-blocking */ }
        handleUpdateStatus(job.id, 'expired', true);
        toast.success("Good luck! We're tracking this on your Progress page.");
    };
    // Generate CV — open the tailored-CV modal for this role.
    const generateCV = (job) => setApplyModal({ job, track: true });
    // Skip from an Apply-Direct card — dismiss quietly (no toast, per spec).
    const skipApply = (job) => handleUpdateStatus(job.id, 'rejected', true);

    // Skip from the drawer.
    const handleDrawerSkip = () => {
        if (drawerJobId != null) handleUpdateStatus(drawerJobId, 'rejected');
        setDrawerJobId(null);
    };

    useEffect(() => {
        if (isActivateRequested && !isActivated) setIsActivationDrawerOpen(true);
    }, [isActivateRequested, isActivated]);

    // Deep-link from the Introductions page (?job=<id>): open that job's detail
    // drawer. The drawer fetches the job by id on its own, so it resolves even
    // when the job isn't in the current Opportunities list (already contacted /
    // expired). We strip the param after opening so a later click re-triggers.
    useEffect(() => {
        const jobParam = searchParams.get('job');
        if (!jobParam) return;
        const id = Number(jobParam);
        if (!Number.isNaN(id)) setDrawerJobId(id);
        const next = new URLSearchParams(searchParams);
        next.delete('job');
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    // ── Activation gate ───────────────────────────────────────────────────────
    // Everything past this point assumes a calibrated user: the cards, the five
    // empty states, the "Start searching" button, the detail drawer. Someone who
    // hasn't finished onboarding gets the Calibration flow instead — the same
    // component, in the same place, that Home renders (DashboardPage.jsx) —
    // rather than an Opportunities page whose only affordance is a button the
    // backend now refuses with 400 cv_required.
    //
    // This MUST sit below every hook in this component. React counts hooks per
    // render, so returning above them would change that count the moment the
    // profile lands and blow up the reconciler.
    //
    // The loading branch is not cosmetic: `profile` is undefined on the first
    // render, and without it an already-calibrated user would see Calibration
    // flash on every single visit before their profile resolved.
    if (profileLoading) {
        return (
            <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto">
                <ApplyDirLoader.Inline message="Loading your opportunities..." />
            </div>
        );
    }
    if (!onboardingDone) {
        return <ActivationFlow profile={profile} />;
    }

    // ── Renderers ─────────────────────────────────────────────────────────────

    // Compact tray card for the "In progress" section (working / queued / done).
    // Plain render fn (not a nested component) so it never remounts mid-animation.
    const trayCard = (job, { variant, done, key }) => (
        <motion.div
            key={key}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14, transition: { duration: 0.4, ease: 'easeInOut' } }}
            className={`relative overflow-hidden bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-3 ${
                done ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-l-4 border-l-primary-light border-neutral-dark'}`}
        >
            {done ? (
                <span className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-montserrat font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <CheckCircle2 className="w-5 h-5" />
                </span>
            ) : (
                <CompanyLogo job={job} size="w-10 h-10" text="" />
            )}
            <div className="min-w-0 flex-1">
                <h3 className="font-montserrat text-sm font-bold text-black-light leading-snug line-clamp-1">{job.title}</h3>
                <p className="text-xs text-secondary-dark truncate">{job.company_name}</p>
                {done ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Found {done.name}{done.title ? `, ${done.title}` : ''} — see your intro</span>
                    </p>
                ) : variant === 'queued' ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-secondary-dark">
                        <Clock className="w-3.5 h-3.5 shrink-0" /> Queued — starting shortly
                    </p>
                ) : (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-primary-dark">
                        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                        {/* Four labels, one state. Never a bare spinner, and
                            never a failure: finding the person, writing the
                            intro, taking a while, taking a long while. */}
                        <span className="truncate">
                            {timedOut.has(job.id) ? LONG_WAIT_LABEL
                                : slow.has(job.id) ? SLOW_LABEL
                                    : WORKING_LABEL[workingStage(job)]}
                        </span>
                    </p>
                )}
            </div>
        </motion.div>
    );

    // Full review/apply card used in the grid. Plain render fn (see trayCard).
    const fullCard = (job) => {
        const match = matchStrength(job.fit_score);
        const reason = positiveReason(job.fit_reasoning);
        const state = cardState(job);
        const age = postedAge(job);
        const pendingThisJob = updateStatusMutation.isPending && updateStatusMutation.variables?.id === job.id;
        const retrying = isRetryingDraft(job)
            || (retryDraftMutation.isPending && retryDraftMutation.variables === job.id);
        const approvePending = pendingThisJob && updateStatusMutation.variables?.newStatus === 'approved';
        const rejectPending  = pendingThisJob && ['rejected', 'expired'].includes(updateStatusMutation.variables?.newStatus);

        return (
            <motion.div
                key={job.id}
                layout
                variants={CARD_ITEM}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                whileHover={{ y: -6, transition: { duration: 0.3, ease: 'easeOut' } }}
                onClick={() => state === 'new' && setDrawerJobId(job.id)}
                className={`group relative overflow-hidden bg-white rounded-2xl border border-neutral-dark shadow-sm p-5 flex flex-col h-full transition-all duration-300 ease-out hover:shadow-xl hover:shadow-primary-light/10 hover:border-primary-light/30 ${state === 'new' ? 'cursor-pointer hover:-translate-y-1.5' : ''} ${['drafted', 'sent'].includes(state) ? 'border-l-4 border-l-emerald-400' : ''}`}
            >
                <span className={`absolute inset-x-0 top-0 h-1 ${match.accent}`} />

                {/* Identity row: logo + company are the anchor, age right-aligned.
                    title= keeps the Posted/Found verb the short chip drops. */}
                <div className="flex items-center gap-2">
                    <CompanyLogo job={job} size="w-6 h-6" text="text-[10px]" radius="rounded-md" pad="" />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-secondary-dark">
                        {job.company_name}
                    </span>
                    {age.chip && (
                        // Verb is now VISIBLE, not tooltip-only: "Posted 50d" is a fact
                        // about the employer, "Found 50d" a fact about us, and a tooltip
                        // never fires on touch. Amber past STALE_AFTER_DAYS so an old
                        // opening is hard to skim past.
                        <span
                            title={age.label}
                            className={`shrink-0 inline-flex items-center gap-1 text-[11px] ${
                                age.isStale ? 'font-medium text-amber-600' : 'text-secondary-dark/70'}`}
                        >
                            <Clock className="w-3 h-3 shrink-0" /> {age.chip}
                        </span>
                    )}
                </div>

                <h2 className="mt-1.5 font-montserrat text-base font-bold text-black-light leading-snug line-clamp-2">
                    {job.title}
                </h2>

                {job.location && (
                    <p className="mt-1 flex items-center gap-1 min-w-0 text-xs text-secondary-dark">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{job.location}</span>
                    </p>
                )}

                {/* Salary is ~14% populated — absent renders nothing, no reserved row. */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-md border ${match.badge}`}>
                        {match.label}
                    </span>
                    {job.salary_info && (
                        <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-600 border-emerald-100">
                            {job.salary_info}
                        </span>
                    )}
                </div>

                {state === 'new' && age.isFresh && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        Reply odds are highest in the first 48 hours.
                    </p>
                )}

                <p className="mt-2.5 text-xs text-secondary-dark leading-relaxed line-clamp-2">
                    {reason}
                </p>

                {(state === 'drafted' || state === 'sent' || state === 'contact_no_draft') ? (
                    // The "Intro drafted"/"Intro sent" pill used to live here; the stage
                    // bar below now carries that, so this line is just WHO was found.
                    <div className="mt-2.5 space-y-1.5">
                        {job.contact_name ? (
                            <p className="flex items-center gap-1.5 text-xs text-secondary-dark truncate">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="truncate">
                                    <span className="font-semibold text-black-light">{job.contact_name}</span>
                                    {job.contact_title ? <span>, {job.contact_title}</span> : null}
                                </span>
                            </p>
                        ) : (
                            // 'drafted' requires has_real_contact so this should not happen,
                            // but without it the branch would render an empty gap.
                            <p className="flex items-center gap-1.5 text-xs text-secondary-dark">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>Hiring manager found</span>
                            </p>
                        )}
                        {state === 'contact_no_draft' && (retrying ? (
                            <p className="flex items-center gap-1.5 text-xs text-primary-dark">
                                <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                                <span className="truncate">Retrying the intro…</span>
                            </p>
                        ) : isBelowBar(job) ? (
                            // Not a failure: we found the person and chose not to
                            // write. Neutral colour, no "no intro yet" framing.
                            <p className="flex items-center gap-1.5 text-xs text-secondary-dark">
                                <Info className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">We didn&rsquo;t reach out — this one scored below your bar</span>
                            </p>
                        ) : (
                            <p className="flex items-center gap-1.5 text-xs text-amber-600">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">No intro yet: {draftFailureText(job)}</span>
                            </p>
                        ))}
                    </div>
                ) : state === 'no_contact' ? (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-secondary-dark min-h-[1.25rem]">
                        <UserX className="w-3.5 h-3.5 text-secondary-dark shrink-0" />
                        <span>No hiring manager found for this role</span>
                    </div>
                ) : (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-secondary-dark min-h-[1.25rem]">
                        <Search className="w-3.5 h-3.5 text-secondary-dark/50 shrink-0" />
                        <span>We&rsquo;ll find the contact and draft your intro</span>
                    </div>
                )}

                {/* Bottom block — mt-auto keeps the footer + actions aligned across the grid. */}
                <div className="mt-auto pt-4">
                    {/* Stage progress. Omitted for no_contact — see STAGE. */}
                    {STAGE[state] && (
                        <div className="pb-3">
                            <div className="mb-1.5 flex items-center justify-between text-[11px]">
                                <span className="text-secondary-dark/60">Stage</span>
                                <span className="font-medium text-secondary-dark">{STAGE[state].label}</span>
                            </div>
                            <div className="h-1 w-full overflow-hidden rounded-full bg-neutral">
                                <div
                                    className="h-full rounded-full bg-primary-light transition-all duration-500"
                                    style={{ width: `${STAGE[state].pct}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div onClick={(e) => e.stopPropagation()}>
                    {state === 'new' ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleUpdateStatus(job.id, 'rejected')}
                                disabled={pendingThisJob}
                                className="shrink-0 inline-flex items-center justify-center gap-2 text-secondary-dark hover:bg-neutral font-semibold rounded-xl px-3 py-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {rejectPending ? <ApplyDirLoader.Button variant="dark" /> : null}
                                Skip
                            </button>
                            {atCapacity && !approvePending ? (
                                // Deliberately NOT `disabled` — it must stay clickable so
                                // the click can explain why nothing happened.
                                <button
                                    onClick={() => handleReachOut(job.id)}
                                    className="flex-1 inline-flex items-center justify-center gap-2 bg-neutral hover:bg-neutral-dark text-secondary-dark font-semibold font-montserrat rounded-xl px-4 py-2.5 transition-colors"
                                >
                                    <Clock className="w-4 h-4 shrink-0" /> Reach Out
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleReachOut(job.id)}
                                    disabled={pendingThisJob}
                                    className="flex-1 group/btn inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-4 py-2.5 shadow-sm hover:opacity-90 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary-dark/40 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {approvePending
                                        ? <><ApplyDirLoader.Button variant="light" /> Reaching out…</>
                                        : <>Reach Out <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" /></>}
                                </button>
                            )}
                        </div>
                    ) : (state === 'drafted' || state === 'sent') ? (
                        <button
                            onClick={() => navigate('/dashboard/introductions')}
                            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all"
                        >
                            View on Intros <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (state === 'no_contact' || state === 'contact_no_draft') ? (
                        <div className="grid grid-cols-2 gap-2">
                            {(canRetryDraft(job) || retrying) && (
                                <button
                                    onClick={() => retryDraftMutation.mutate(job.id)}
                                    disabled={retrying}
                                    className="col-span-2 inline-flex items-center justify-center gap-2 bg-neutral hover:bg-neutral-dark text-black-light font-semibold font-montserrat rounded-xl px-4 py-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {retrying
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Retrying…</>
                                        : <><RefreshCw className="w-4 h-4" /> Try again</>}
                                </button>
                            )}
                            <button
                                onClick={() => applyDirect(job)}
                                className="col-span-2 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-4 py-2.5 shadow-sm hover:opacity-90 transition-all"
                            >
                                Apply Direct <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => generateCV(job)}
                                className="inline-flex items-center justify-center gap-1.5 bg-neutral hover:bg-neutral-dark text-black-light font-semibold rounded-xl px-3 py-2.5 transition-colors text-sm"
                            >
                                <FileText className="w-4 h-4" /> Generate CV
                            </button>
                            <button
                                onClick={() => skipApply(job)}
                                disabled={rejectPending}
                                className="inline-flex items-center justify-center gap-1.5 text-secondary-dark hover:bg-neutral font-semibold rounded-xl px-3 py-2.5 transition-colors text-sm disabled:opacity-60"
                            >
                                {rejectPending ? <ApplyDirLoader.Button variant="dark" /> : null} Skip
                            </button>
                        </div>
                    ) : null}
                    </div>

                    {/* Hairline footer — reference material, deliberately AFTER the CTA so it
                        doesn't interrupt the path from reasoning to action. The border-t now
                        separates it from the buttons above. stopPropagation keeps the link
                        from also opening the detail drawer. */}
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-neutral-dark/60 pt-3 text-[11px]">
                        {job.apply_url ? (
                            <a
                                href={job.apply_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 min-w-0 text-secondary-dark/70 hover:text-primary-dark transition-colors"
                            >
                                <span className="truncate">View job posting</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                        ) : <span />}
                        {job.source && (
                            <span className="shrink-0 max-w-[45%] truncate text-secondary-dark/50">
                                via {sourceLabel(job.source)}
                            </span>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    const grid = (items) => (
        <motion.div
            variants={GRID_STAGGER}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
            <AnimatePresence mode="popLayout">
                {items.map((job) => fullCard(job))}
            </AnimatePresence>
        </motion.div>
    );

    const tabButton = (id, label, count, highlight = false) => {
        const active = activeTab === id;
        return (
            <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold font-montserrat transition-all ${
                    active
                        ? 'bg-gradient-to-r from-primary-light to-primary-dark text-white shadow-sm'
                        : `bg-neutral hover:bg-neutral-dark ${highlight ? 'text-emerald-700' : 'text-secondary-dark'}`}`}
            >
                {label}
                <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-bold ${
                    active ? 'bg-white/25 text-white' : 'bg-white text-secondary-dark border border-neutral-dark'}`}>
                    {count}
                </span>
            </button>
        );
    };

    // ── Empty state ───────────────────────────────────────────────────────────
    // One container, four sets of words. Only CAUGHT_UP keeps the original
    // "all caught up / check back tomorrow" copy — for everyone else that line
    // described success they had never actually had.
    const EMPTY_COPY = {
        INTERRUPTED: {
            Icon: RefreshCw,
            title: 'That search stopped early.',
            sub: 'This happens occasionally. Starting again usually fixes it.',
        },
        FIRST_RUN_EMPTY: {
            Icon: SearchX,
            title: 'No matches yet.',
            sub: 'We searched but nothing cleared the bar this time. Widening your roles or locations usually helps.',
        },
        NEVER_RUN: {
            Icon: Sparkles,
            title: "Your headhunter hasn't run yet.",
            sub: 'Start your first search and your matches will appear right here.',
        },
        CAUGHT_UP: {
            Icon: CheckCircle2,
            title: 'All caught up!',
            sub: 'Your headhunter will find more opportunities overnight. Check back tomorrow.',
        },
    };

    const emptyStateCard = (key) => {
        const { Icon, title, sub } = EMPTY_COPY[key];
        const primaryBtn = 'inline-flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
        const secondaryBtn = 'inline-flex items-center gap-2 bg-neutral hover:bg-neutral-dark text-black-light font-semibold rounded-xl px-5 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
        return (
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="min-h-[40vh] flex flex-col items-center justify-center text-center py-10"
            >
                <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-primary-light/20 animate-ping" />
                    <span className="absolute inset-2 rounded-full bg-primary-light/10 animate-ping [animation-delay:600ms]" />
                    <span className="relative w-16 h-16 rounded-full bg-primary-light/10 border border-primary-light/30 flex items-center justify-center">
                        <Icon className="w-7 h-7 text-primary-light" />
                    </span>
                </div>
                <h2 className="text-lg md:text-xl font-bold font-montserrat text-black-light">{title}</h2>
                <p className="mt-2 text-sm text-secondary-dark max-w-sm leading-relaxed">{sub}</p>

                {key !== 'CAUGHT_UP' && (
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        {key === 'FIRST_RUN_EMPTY' && (
                            <button onClick={() => navigate(settingsLink('jobs', isMobile))} className={primaryBtn}>
                                Adjust what you&rsquo;re looking for
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={runSearchNow}
                            disabled={searchingNow}
                            className={key === 'FIRST_RUN_EMPTY' ? secondaryBtn : primaryBtn}
                        >
                            {searchingNow && <Loader2 className="w-4 h-4 animate-spin" />}
                            {key === 'NEVER_RUN' ? 'Start searching' : 'Search again'}
                        </button>
                    </div>
                )}

                {/* FIRST_RUN_EMPTY only — the one state where a search really did
                    complete and come back with nothing, so "we missed something"
                    is a true statement. On NEVER_RUN it claimed a search had
                    missed the user before any had run; on INTERRUPTED the run
                    died rather than finished, and the honest next step there is
                    Search again. Kept in sync with DashboardPage. */}
                {key === 'FIRST_RUN_EMPTY' && (
                    <button
                        onClick={() => setShowRoleRequest(true)}
                        className="mt-4 text-xs font-semibold text-secondary-dark hover:text-primary-dark underline underline-offset-2 transition-colors"
                    >
                        Can&rsquo;t find what you&rsquo;re looking for?
                    </button>
                )}
            </motion.div>
        );
    };

    const nothingAtAll = !loading && pickedCount === 0 && trayCount === 0;

    // What the active tab renders below the tray.
    const renderTabBody = () => {
        if (activeTab === 'contact') {
            return contactJobs.length ? grid(contactJobs)
                : <p className="text-sm text-secondary-dark py-8 text-center">No introductions ready yet — reach out to a role to get started.</p>;
        }
        if (activeTab === 'apply') {
            return applyJobs.length ? grid(applyJobs)
                : <p className="text-sm text-secondary-dark py-8 text-center">No apply-direct roles right now.</p>;
        }
        // 'all' and 'new' both lead with the New review queue (paginated).
        return (
            <>
                {newJobs.length > 0 ? grid(pageNewJobs) : (
                    activeTab === 'new'
                        ? (
                            // "All caught up" is only true when there is genuinely
                            // nothing left. With matches still held back it was a
                            // false negative — the user read it as "we found
                            // nothing for you" and pressed Search again.
                            heldCount > 0
                                ? <p className="text-sm text-secondary-dark py-8 text-center">
                                    Nothing new to review right now — <span className="font-bold">{heldCount}</span>{' '}
                                    {heldCount === 1 ? 'more match is' : 'more matches are'} waiting to be shown.
                                  </p>
                                : <p className="text-sm text-secondary-dark py-8 text-center">Nothing new to review — you&rsquo;re all caught up.</p>
                        )
                        : null
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 sm:gap-4 pt-6">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="inline-flex items-center gap-1.5 text-secondary-dark hover:text-black-light hover:bg-neutral font-semibold rounded-xl px-4 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                            <ArrowLeft className="w-4 h-4" /> Previous
                        </button>
                        <span className="text-sm font-medium text-secondary-dark whitespace-nowrap">Page {currentPage} of {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="inline-flex items-center gap-1.5 text-secondary-dark hover:text-black-light hover:bg-neutral font-semibold rounded-xl px-4 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                            Next <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Section B2 — Contact found. Same unpaginated grid the
                    "Contact found" tab renders, included here so the All tab
                    shows every card its count promises (pickedCount sums
                    new + contact + apply). Pagination above is bound to
                    newJobs only and is unaffected. */}
                {activeTab === 'all' && contactJobs.length > 0 && (
                    <section className="mt-8 space-y-3">
                        <h2 className="text-[11px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/70">
                            Contact found
                        </h2>
                        {grid(contactJobs)}
                    </section>
                )}

                {/* Section C — Apply directly, collapsed at the bottom (All view only). */}
                {activeTab === 'all' && applyJobs.length > 0 && (
                    <div className="mt-8 border-t border-neutral-dark pt-6">
                        <button
                            onClick={() => setApplyExpanded((v) => !v)}
                            className="w-full flex items-center justify-between gap-3 text-left rounded-xl bg-neutral hover:bg-neutral-dark transition-colors px-4 py-3"
                        >
                            <span className="flex items-center gap-2 min-w-0">
                                <UserX className="w-4 h-4 text-secondary-dark shrink-0" />
                                <span className="text-sm font-semibold text-black-light">
                                    Apply directly ({applyJobs.length})
                                </span>
                                <span className="text-xs text-secondary-dark truncate hidden sm:inline">
                                    — no hiring manager found for these roles
                                </span>
                            </span>
                            <ChevronDown className={`w-4 h-4 text-secondary-dark shrink-0 transition-transform ${applyExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence initial={false}>
                            {applyExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-6">{grid(applyJobs)}</div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="relative isolate p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-6 animate-fade-in font-roboto">
            <div aria-hidden="true" className="pointer-events-none absolute -top-28 right-0 -z-10 h-72 w-72 rounded-full bg-primary-light/10 blur-3xl" />

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-montserrat text-black-light">Opportunities</h1>
                    <p className="text-sm text-secondary-dark mt-1">
                        {reviewCount > 0
                            ? 'Reviewed by your headhunter — your call on who to reach.'
                            : 'Roles your headhunter found for you.'}
                    </p>
                </div>
                {reviewCount > 0 && (
                    <motion.span
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold ring-1 ring-inset ring-emerald-600/20 whitespace-nowrap"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        {reviewCount} waiting for your review
                    </motion.span>
                )}
            </div>

            <BroadenSearchNudge />

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="relative overflow-hidden bg-white rounded-2xl border border-neutral-dark shadow-sm p-6 animate-pulse">
                            <span className="absolute inset-x-0 top-0 h-1 bg-neutral-dark" />
                            <div className="flex items-start gap-3">
                                <div className="w-11 h-11 rounded-xl bg-neutral-dark shrink-0" />
                                <div className="flex-1 space-y-2 pt-1">
                                    <div className="h-4 w-3/4 rounded bg-neutral-dark" />
                                    <div className="h-3 w-1/2 rounded bg-neutral-dark" />
                                </div>
                            </div>
                            <div className="h-5 w-24 rounded-full bg-neutral-dark mt-4" />
                            <div className="h-16 rounded-lg bg-neutral-dark/70 mt-4" />
                            <div className="flex justify-between mt-6">
                                <div className="h-10 w-16 rounded-xl bg-neutral-dark" />
                                <div className="h-10 w-28 rounded-xl bg-neutral-dark" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : nothingAtAll ? (
                // Exactly one of five states — never the old "all caught up" for
                // a user who has not actually caught up with anything.
                emptyState === 'SEARCHING'
                    ? <HeadhuntingState phase={scrapeStatus?.phase} />
                    : emptyStateCard(emptyState || 'CAUGHT_UP')
            ) : (
                <>
                    {/* ── Summary bar — curated-from-a-larger-pool framing ────────── */}
                    {pickedCount > 0 && (
                        <div className="rounded-2xl border border-neutral-dark bg-white shadow-sm px-4 py-3 md:px-5 md:py-4">
                            {/* Each number names its own scope. They are NOT one
                                funnel: "reviewed" is every role scored for this
                                user since day one, while the other two describe
                                only what is on this page right now. */}
                            <p className="text-sm text-black-light leading-relaxed">
                                Your headhunter{' '}
                                {reviewedTotal && reviewedTotal > pickedCount
                                    ? <>has reviewed <span className="font-bold">{reviewedTotal}</span> roles for you so far · </>
                                    : <>picked </>}
                                <span className="font-bold text-primary-dark">{pickedCount}</span>{' '}
                                {reviewedTotal && reviewedTotal > pickedCount
                                    ? <>{pickedCount === 1 ? 'is' : 'are'} on your board now</>
                                    : <>for you</>}
                                {contactReady > 0 && (
                                    <> · <span className="font-bold text-emerald-600">{contactReady}</span> of them {contactReady === 1 ? 'has' : 'have'} a hiring manager ready</>
                                )}
                                {heldCount > 0 && (
                                    <> · <span className="font-bold">{heldCount}</span> more waiting</>
                                )}
                            </p>
                        </div>
                    )}

                    {/* ── Section A — In progress (working + queued + completing) ──── */}
                    {trayCount > 0 && (
                        <section className="space-y-3">
                            <div className="flex items-center gap-2">
                                <h2 className="text-[11px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/70">
                                    In progress
                                </h2>
                                {workingJobs.length >= MAX_WORKING && (
                                    <span className="text-[11px] text-secondary-dark">· working on {MAX_WORKING} at a time</span>
                                )}
                            </div>
                            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <AnimatePresence mode="popLayout">
                                    {completing.map((c) => {
                                        const job = jobs.find((j) => j.id === c.id) || { id: c.id, title: c.title, company_name: c.company };
                                        return trayCard(job, { done: c, key: `done-${c.id}` });
                                    })}
                                    {workingJobs.map((job) => trayCard(job, { variant: 'working', key: job.id }))}
                                    {queuedJobs.map((job) => trayCard(job, { variant: 'queued', key: job.id }))}
                                </AnimatePresence>
                            </motion.div>
                        </section>
                    )}

                    {/* ── Filter tabs ─────────────────────────────────────────────── */}
                    {pickedCount > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {tabButton('all', 'All', pickedCount)}
                            {tabButton('contact', 'Contact found', contactReady, true)}
                            {tabButton('new', 'New', reviewCount)}
                            {tabButton('apply', 'Apply direct', applyJobs.length)}
                        </div>
                    )}

                    {/* ── Tab body ────────────────────────────────────────────────── */}
                    {renderTabBody()}
                </>
            )}

            <ProfileActivationDrawer isOpen={isActivationDrawerOpen} onClose={() => setIsActivationDrawerOpen(false)} />

            {showPersonalization && (
                <FirstTimePersonalizationModal
                    profile={profile}
                    onClose={handlePersonalizationCancel}
                    onComplete={handlePersonalizationComplete}
                />
            )}

            {showRoleRequest && <RoleRequestModal onClose={() => setShowRoleRequest(false)} />}

            <JobDetailDrawer
                jobId={drawerJobId}
                isOpen={drawerJobId != null}
                onClose={() => setDrawerJobId(null)}
                onSkip={handleDrawerSkip}
                onWriteIntro={() => drawerJobId != null && handleReachOut(drawerJobId)}
                showActions={drawerJobId != null}
                actionPending={updateStatusMutation.isPending && updateStatusMutation.variables?.id === drawerJobId}
            />

            {applyModal && (
                <ApplyDirectModal
                    job={applyModal.job}
                    onClose={() => setApplyModal(null)}
                    onApplied={() => { trackJob(applyModal.job.id, 'applied').catch(() => {}); }}
                />
            )}
        </div>
    );
};

export default JobsPage;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router';
import {
    MapPin, ArrowRight, ArrowLeft, CheckCircle2, Search, Loader2, UserX,
    ExternalLink, Clock, FileText, ChevronDown,
} from 'lucide-react';
// `motion` is used only as `<motion.div>` (member-expression JSX), which this
// eslint config's jsx-uses-vars doesn't count — silence the false positive.
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { useNavigate } from 'react-router-dom';
import { ApplyDirLoader } from '../components/ui/ApplyDirLoader';
import { getOpportunityJobs, updateJobStatus, trackJob, getScrapeStatus } from '../services/apiJobs';
import HeadhuntingState from '../components/HeadhuntingState';
import { getAnalytics } from '../services/apiAnalytics';
import { getProfile } from '../services/apiProfile';
import ProfileActivationDrawer from '../components/ProfileActivationDrawer';
import FirstTimePersonalizationModal from '../components/onboarding/FirstTimePersonalizationModal';
import JobDetailDrawer from '../components/JobDetailDrawer';
import ApplyDirectModal from '../components/ApplyDirectModal';
import BroadenSearchNudge from '../components/BroadenSearchNudge';

// ── Opportunities — the Discover Feed ─────────────────────────────────────
// Curated roles the headhunter found. Cards resolve IN PLACE: acting on one
// never moves it to another section, so the grid never rearranges under the
// user's cursor.
//   • Review queue: new + in-flight (working/queued) cards, 9/page.
//   • Apply directly: no-contact jobs, collapsed at the bottom.
// Filter tabs let the user focus (e.g. "Contact found" = the highest-value cards).
//
// Three invariants this page guarantees:
//   1. A spinner NEVER runs past RESOLVE_TIMEOUT_MS. On expiry the card is
//      force-resolved to Apply Direct locally, whatever the backend is doing.
//   2. At most MAX_WORKING cards are in flight; the rest show a calm "Queued".
//   3. At most ONE toast is visible, and only for RESULTS — never for starts.

const ITEMS_PER_PAGE = 9;
const MAX_WORKING = 3;              // mirrors backend MAX_CONCURRENT_AUTODRAFT
const RESOLVE_TIMEOUT_MS = 90000;   // hard ceiling on any "finding…" spinner
const POLL_MS = 4000;               // status poll cadence while work is in flight
const TOAST_BATCH_MS = 5000;        // results inside this window merge into one toast

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

// `company_website` arrives in two shapes depending on which resolver filled it
// — a bare domain ('medal.tv') from resolve_company_website, or a full URL from
// the GPT company-resolution path. Normalise to the bare host for the logo CDN.
const logoDomain = (site) => {
    const raw = (site || '').trim();
    if (!raw) return '';
    return raw
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split(/[/?#]/)[0]
        .toLowerCase();
};

// Company logo with the letter-avatar as fallback. Falls back when there's no
// resolved domain (common on job-board sources) or the logo 404s. Module-level,
// not nested in JobsPage, so it never remounts mid-animation.
const CompanyLogo = ({ job, size = 'w-11 h-11', text = 'text-base' }) => {
    const [failed, setFailed] = useState(false);
    const domain = logoDomain(job.company_website);

    if (domain && !failed) {
        return (
            <img
                src={`https://logo.clearbit.com/${domain}`}
                alt=""
                loading="lazy"
                onError={() => setFailed(true)}
                className={`${size} shrink-0 rounded-xl border border-neutral-dark bg-white object-contain`}
            />
        );
    }
    return (
        <span className={`${size} shrink-0 rounded-xl bg-neutral text-secondary-dark border border-neutral-dark flex items-center justify-center font-montserrat font-bold ${text}`}>
            {(job.company_name || '?').trim().charAt(0).toUpperCase()}
        </span>
    );
};

// Card age line. posted_at is the employer's own posting date but is absent on
// ~56% of rows (LinkedIn/Workday/Indeed never supply it), so we fall back to
// created_at — when WE found it — under a different verb rather than passing a
// scrape date off as a posting date. posted_at is a DATE, so it has no hours.
// isFresh drives the urgency nudge and is deliberately NEVER true on the
// created_at fallback: a month-old job scraped today is not a fresh posting.
const postedAge = (job) => {
    const short = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    if (job.posted_at) {
        const d = new Date(`${job.posted_at}T00:00:00`);
        const days = Math.floor((Date.now() - d.getTime()) / 86400000);
        if (days <= 0) return { label: 'Posted today', isFresh: true };
        if (days === 1) return { label: 'Posted yesterday', isFresh: true };
        if (days < 7) return { label: `Posted ${days} days ago`, isFresh: false };
        const weeks = Math.floor(days / 7);
        if (weeks < 5) return { label: `Posted ${weeks} week${weeks === 1 ? '' : 's'} ago`, isFresh: false };
        return { label: `Posted ${short(d)}`, isFresh: false };
    }

    if (!job.created_at) return { label: '', isFresh: false };
    const d = new Date(job.created_at);
    const hours = Math.floor(Math.max(0, Date.now() - d.getTime()) / 3600000);
    if (hours < 1) return { label: 'Found just now', isFresh: false };
    if (hours < 24) return { label: `Found ${hours} hour${hours === 1 ? '' : 's'} ago`, isFresh: false };
    const days = Math.floor(hours / 24);
    if (days < 7) return { label: `Found ${days} day${days === 1 ? '' : 's'} ago`, isFresh: false };
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return { label: `Found ${weeks} week${weeks === 1 ? '' : 's'} ago`, isFresh: false };
    return { label: `Found ${short(d)}`, isFresh: false };
};

const NEGATIVE_RE = /(does ?not|does ?n['’]?t|\bweak\b|\bfails?\b|not match|not align|\black(s|ing)?\b|\bmissing\b|mismatch|\bgaps?\b|\bunfortunately\b|\bpoor(ly)?\b|unrelated|irrelevant)/i;
const positiveReason = (text) =>
    (!text || NEGATIVE_RE.test(text))
        ? 'Your experience aligns well with this role.'
        : text;

// Visual lifecycle state, derived from server status + contact/draft/queue flags:
//   new        → scraped, undecided → Skip / Write Intro
//   working    → approved, drafting in the background (spinner)
//   queued     → approved but 3 already in flight → waiting its turn
//   drafted    → real contact + draft ready → lives on Introductions
//   no_contact → manual_apply → Apply Direct
//   sent       → contacted/outreach_automated
const cardState = (job) => {
    if (job.status === 'contacted' || job.status === 'outreach_automated') return 'sent';
    if (job.has_draft && job.has_real_contact) return 'drafted';
    if (job.status === 'manual_apply' || (job.has_draft && !job.has_real_contact)) return 'no_contact';
    if (job.status === 'approved' && job.is_queued) return 'queued';
    if (job.status === 'approved' && !job.has_draft) return 'working';
    return 'new';
};

const JobsPage = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [isActivationDrawerOpen, setIsActivationDrawerOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pendingJobId, setPendingJobId] = useState(null);
    const [showPersonalization, setShowPersonalization] = useState(false);
    const [drawerJobId, setDrawerJobId] = useState(null);
    const [applyModal, setApplyModal] = useState(null);
    // Which filter tab is active.
    const [activeTab, setActiveTab] = useState('all');
    // Collapsed Apply-Direct section in the All view.
    const [applyExpanded, setApplyExpanded] = useState(false);
    // Jobs whose spinner blew the 90s ceiling — presented as Apply Direct.
    const [timedOut, setTimedOut] = useState(() => new Set());
    // Jobs that resolved to "no contact" while the user was watching. They keep
    // their slot in the review grid and grow an Apply Direct button in place,
    // rather than vanishing into the collapsed section at the foot of the page.
    const [resolvedInPlace, setResolvedInPlace] = useState(() => new Set());

    const handledRef   = useRef(new Set());   // ids we've already reported a result for
    const timedOutRef  = useRef(new Set());   // sync mirror of `timedOut`
    const inPlaceRef   = useRef(new Set());   // sync mirror of `resolvedInPlace`
    const startedAtRef = useRef(new Map());   // jobId -> ms when its spinner began

    // ── Toast discipline ──────────────────────────────────────────────────────
    // One toast on screen at a time, results only. Messages queue behind the
    // visible one and are pumped by its onClose; results arriving inside a
    // TOAST_BATCH_MS window collapse into a single summary line.
    const toastQueueRef = useRef([]);
    const toastBusyRef  = useRef(false);
    const resultBufRef  = useRef([]);
    const batchTimerRef = useRef(null);

    const pumpToasts = useCallback(() => {
        if (toastBusyRef.current) return;
        const next = toastQueueRef.current.shift();
        if (!next) return;
        toastBusyRef.current = true;
        const show = next.kind === 'success' ? toast.success
            : next.kind === 'error' ? toast.error
            : toast.info;
        show(next.text, {
            onClose: () => { toastBusyRef.current = false; pumpToasts(); },
        });
    }, []);

    const enqueueToast = useCallback((kind, text) => {
        toastQueueRef.current.push({ kind, text });
        pumpToasts();
    }, [pumpToasts]);

    const flushResults = useCallback(() => {
        batchTimerRef.current = null;
        const batch = resultBufRef.current;
        resultBufRef.current = [];
        if (!batch.length) return;

        const ready = batch.filter((r) => r.kind === 'ready');
        const none  = batch.filter((r) => r.kind === 'none');

        if (ready.length >= 3) {
            enqueueToast('success', `${ready.length} introductions ready — view on Introductions.`);
        } else {
            ready.forEach((r) => enqueueToast('success',
                `Introduction ready for ${r.name} — view on Introductions.`));
        }
        if (none.length >= 3) {
            enqueueToast('info', `Couldn't find a hiring manager for ${none.length} roles — you can apply directly.`);
        } else {
            none.forEach((r) => enqueueToast('info',
                `Couldn't find a hiring manager at ${r.company} — you can apply directly.`));
        }
    }, [enqueueToast]);

    // Window opens on the FIRST result and is not extended by later ones, so a
    // steady trickle can never postpone the toast indefinitely.
    const reportResult = useCallback((result) => {
        resultBufRef.current.push(result);
        if (!batchTimerRef.current) {
            batchTimerRef.current = setTimeout(flushResults, TOAST_BATCH_MS);
        }
    }, [flushResults]);

    useEffect(() => () => {
        if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
    }, []);

    const [searchParams] = useSearchParams();
    const isActivateRequested = searchParams.get('activate') === '1';

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: getProfile,
        staleTime: 5 * 60 * 1000,
    });
    const isActivated = !!profile?.cv_raw_text;

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
        refetchOnWindowFocus: false,
        staleTime: 30000,
        // Poll while a scrape is active (results stream in), or while anything is
        // still resolving (finding contact / drafting) or queued. Idle otherwise.
        refetchInterval: (query) =>
            (isSearching || (query.state.data?.jobs || []).some((j) => ['working', 'queued'].includes(cardState(j)))) ? POLL_MS : false,
    });

    // Stable identity per fetch — the 90s-ceiling effect depends on `jobs`, and a
    // fresh array each render would tear its interval down before it could tick.
    const jobs = useMemo(() => pageData?.jobs ?? [], [pageData]);

    // Server state, with the local 90s force-resolve layered on top. The override
    // only ever applies while the server still says working/queued — if the
    // backend later produces a real result, that result wins.
    const effState = (job) => {
        const s = cardState(job);
        if ((s === 'working' || s === 'queued') && timedOut.has(job.id)) return 'no_contact';
        return s;
    };

    // ── Buckets ───────────────────────────────────────────────────────────────
    // In-flight cards stay in the review queue at their existing index — that is
    // what keeps the grid from rearranging when the user clicks Reach Out.
    const workingJobs = jobs.filter((j) => effState(j) === 'working');
    const queuedJobs  = jobs.filter((j) => effState(j) === 'queued');
    const newJobs     = jobs.filter((j) => effState(j) === 'new');
    const contactJobs = jobs.filter((j) => ['drafted', 'sent'].includes(effState(j)));
    const applyJobs   = jobs.filter((j) => effState(j) === 'no_contact');
    // A card the user watched resolve to "no contact" holds its slot here.
    const reviewJobs  = jobs.filter((j) => {
        const s = effState(j);
        return ['new', 'working', 'queued'].includes(s)
            || (s === 'no_contact' && resolvedInPlace.has(j.id));
    });
    // …and is therefore excluded from the collapsed section, so it isn't shown twice.
    const applySectionJobs = applyJobs.filter((j) => !resolvedInPlace.has(j.id));

    const reviewCount    = newJobs.length;
    const inProgressCount = workingJobs.length + queuedJobs.length;
    const contactReady   = contactJobs.length;
    const pickedCount    = reviewJobs.length + contactJobs.length + applySectionJobs.length;
    const reviewedTotal  = analytics?.funnel?.find((s) => s.stage === 'Scraped')?.count ?? null;

    // ── Pagination over the review queue (New / All tabs) ─────────────────────
    const totalPages = Math.max(1, Math.ceil(reviewJobs.length / ITEMS_PER_PAGE));
    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);
    useEffect(() => { setCurrentPage(1); }, [activeTab]);
    const pageNewJobs = reviewJobs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // ── Spinner ceiling ───────────────────────────────────────────────────────
    // Every card we see in working/queued gets a start stamp — on click, and also
    // on page load for cards that were already in flight (a spinner inherited from
    // a previous session must still be bounded). Once the stamp is older than
    // RESOLVE_TIMEOUT_MS the card is force-resolved to Apply Direct locally and
    // reported once, no matter what the backend is doing.
    useEffect(() => {
        const active = jobs.filter((j) => ['working', 'queued'].includes(cardState(j)));
        const now = Date.now();
        active.forEach((j) => {
            if (!startedAtRef.current.has(j.id)) startedAtRef.current.set(j.id, now);
        });
        if (!active.length) return undefined;

        const tick = () => {
            const t = Date.now();
            const expired = active.filter((j) => {
                const t0 = startedAtRef.current.get(j.id);
                return t0 && t - t0 >= RESOLVE_TIMEOUT_MS && !timedOutRef.current.has(j.id);
            });
            if (!expired.length) return;
            expired.forEach((j) => {
                timedOutRef.current.add(j.id);
                inPlaceRef.current.add(j.id);   // keep its slot; don't drop to the bottom
                handledRef.current.add(j.id);   // never double-report if the server lands later
                startedAtRef.current.delete(j.id);
                reportResult({ kind: 'none', company: j.company_name });
            });
            setTimedOut(new Set(timedOutRef.current));
            setResolvedInPlace(new Set(inPlaceRef.current));
        };
        tick();                                   // catch anything already past the line
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [jobs, reportResult]);

    // ── Result reporting ──────────────────────────────────────────────────────
    // Only jobs we actually saw spinning produce a toast, and only once each.
    useEffect(() => {
        jobs.forEach((j) => {
            if (!startedAtRef.current.has(j.id) || handledRef.current.has(j.id)) return;
            const s = cardState(j);
            if (s === 'drafted' || s === 'sent') {
                handledRef.current.add(j.id);
                startedAtRef.current.delete(j.id);
                reportResult({ kind: 'ready', name: j.contact_name || 'the hiring manager' });
            } else if (s === 'no_contact') {
                handledRef.current.add(j.id);
                startedAtRef.current.delete(j.id);
                inPlaceRef.current.add(j.id);
                setResolvedInPlace(new Set(inPlaceRef.current));
                reportResult({ kind: 'none', company: j.company_name });
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageData]);

    // ── Mutation: approve / reject / expire ───────────────────────────────────
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, newStatus }) => updateJobStatus(id, newStatus),
        onMutate: async ({ id, newStatus }) => {
            await queryClient.cancelQueries({ queryKey: ['jobs-page', 'opportunities'] });
            const prev = queryClient.getQueryData(['jobs-page', 'opportunities']);
            queryClient.setQueryData(['jobs-page', 'opportunities'], (old) => {
                if (!old?.jobs) return old;
                let list = old.jobs;
                if (newStatus === 'approved') {
                    // Decide queued-vs-working locally so the card shows the right
                    // calm state on the very first frame; the server confirms below.
                    const active = list.filter((j) => cardState(j) === 'working').length;
                    const willQueue = active >= MAX_WORKING;
                    list = list.map((j) => j.id === id
                        ? { ...j, status: 'approved', has_draft: false, is_queued: willQueue }
                        : j);
                } else if (newStatus === 'rejected' || newStatus === 'expired') {
                    list = list.filter((j) => j.id !== id);
                }
                return { ...old, jobs: list };
            });
            return { prev };
        },
        onSuccess: (data, { id, newStatus }) => {
            // No toast on start and none on queue — starting work is not a result.
            if (newStatus === 'approved') {
                queryClient.setQueryData(['jobs-page', 'opportunities'], (old) => old?.jobs
                    ? { ...old, jobs: old.jobs.map((j) => j.id === id ? { ...j, is_queued: !!data?.queued } : j) }
                    : old);
            }
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
        },
        onError: (err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(['jobs-page', 'opportunities'], ctx.prev);
            enqueueToast('error', err.message || 'Something went wrong. Please try again.');
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['jobs-page'] }),
    });

    const handleUpdateStatus = (id, newStatus, silent = false) =>
        updateStatusMutation.mutate({ id, newStatus, silent });

    // Reach Out → approve; contact search + draft happen in the background. The
    // card does NOT move — it resolves in place. Stamp the start time here so the
    // 90s ceiling is measured from the click, not from the next poll.
    const approveJob = (jobId) => {
        setDrawerJobId(null);
        handledRef.current.delete(jobId);
        timedOutRef.current.delete(jobId);
        startedAtRef.current.set(jobId, Date.now());
        handleUpdateStatus(jobId, 'approved');
    };
    const handleReachOut = (jobId) => {
        setDrawerJobId(null);
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
        enqueueToast('success', "Good luck! We're tracking this on your Progress page.");
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

    // ── Renderers ─────────────────────────────────────────────────────────────

    // The one card used everywhere in the grid. Plain render fn (not a nested
    // component) so it never remounts mid-animation.
    const fullCard = (job) => {
        const match = matchStrength(job.fit_score);
        const reason = positiveReason(job.fit_reasoning);
        const state = effState(job);
        const inFlight = state === 'working' || state === 'queued';
        const age = postedAge(job);
        const pendingThisJob = updateStatusMutation.isPending && updateStatusMutation.variables?.id === job.id;
        const approvePending = pendingThisJob && updateStatusMutation.variables?.newStatus === 'approved';
        const rejectPending  = pendingThisJob && ['rejected', 'expired'].includes(updateStatusMutation.variables?.newStatus);

        return (
            <motion.div
                key={job.id}
                layout
                variants={CARD_ITEM}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                whileHover={state === 'new' ? { y: -6, transition: { duration: 0.3, ease: 'easeOut' } } : undefined}
                onClick={() => state === 'new' && setDrawerJobId(job.id)}
                className={`group relative overflow-hidden bg-white rounded-2xl border border-neutral-dark shadow-sm p-6 flex flex-col h-full transition-all duration-300 ease-out hover:shadow-xl hover:shadow-primary-light/10 hover:border-primary-light/30 ${state === 'new' ? 'cursor-pointer hover:-translate-y-1.5' : ''} ${['drafted', 'sent'].includes(state) ? 'border-l-4 border-l-emerald-400' : ''} ${inFlight ? 'border-l-4 border-l-primary-light' : ''}`}
            >
                <span className={`absolute inset-x-0 top-0 h-1 ${match.accent}`} />

                <div className="flex items-start gap-3">
                    <CompanyLogo job={job} />
                    <div className="min-w-0 flex-1">
                        <h2 className="font-montserrat text-lg font-bold text-black-light leading-snug line-clamp-2">
                            {job.title}
                        </h2>
                        <p className="text-sm text-secondary-dark mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-black-light truncate max-w-full">{job.company_name}</span>
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
                        {job.salary_info && (
                            <p className="text-sm font-semibold text-emerald-600 mt-1">{job.salary_info}</p>
                        )}
                        {age.label && (
                            <p className="text-xs text-secondary-dark/80 mt-1">{age.label}</p>
                        )}
                    </div>
                </div>

                <span className={`mt-3 self-start inline-flex items-center rounded-md border ${match.badge}`}>
                    {match.label}
                </span>

                {state === 'new' && age.isFresh && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        Reply odds are highest in the first 48 hours.
                    </p>
                )}

                <p className="mt-3 text-sm italic text-secondary-dark leading-relaxed border-l-2 border-neutral-dark bg-neutral/50 rounded-r-lg pl-3 py-2 transition-colors duration-300 group-hover:bg-primary-light/5">
                    {reason}
                </p>

                {(state === 'drafted' || state === 'sent') ? (
                    <div className="mt-3 space-y-1.5">
                        {job.contact_name && (
                            <p className="flex items-center gap-1.5 text-xs text-secondary-dark truncate">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="truncate">
                                    <span className="font-semibold text-black-light">{job.contact_name}</span>
                                    {job.contact_title ? <span>, {job.contact_title}</span> : null}
                                </span>
                            </p>
                        )}
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-0.5 text-[11px] font-semibold">
                            {state === 'sent' ? 'Intro sent' : 'Intro drafted'}
                        </span>
                    </div>
                ) : state === 'no_contact' ? (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-secondary-dark min-h-[1.25rem]">
                        <UserX className="w-3.5 h-3.5 text-secondary-dark shrink-0" />
                        <span>No hiring manager found for this role</span>
                    </div>
                ) : state === 'working' ? (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-primary-dark min-h-[1.25rem]">
                        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                        <span className="truncate">Finding hiring manager…</span>
                    </div>
                ) : state === 'queued' ? (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-secondary-dark min-h-[1.25rem]">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Queued</span>
                    </div>
                ) : (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-secondary-dark min-h-[1.25rem]">
                        <Search className="w-3.5 h-3.5 text-secondary-dark/50 shrink-0" />
                        <span>We&rsquo;ll find the contact and draft your intro</span>
                    </div>
                )}

                {/* Actions */}
                <div className="mt-auto pt-5" onClick={(e) => e.stopPropagation()}>
                    {state === 'new' ? (
                        <div className="flex items-center justify-between gap-3">
                            <button
                                onClick={() => handleUpdateStatus(job.id, 'rejected')}
                                disabled={pendingThisJob}
                                className="inline-flex items-center justify-center gap-2 text-secondary-dark hover:bg-neutral font-semibold rounded-xl px-5 py-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {rejectPending ? <ApplyDirLoader.Button variant="dark" /> : null}
                                Skip
                            </button>
                            <button
                                onClick={() => handleReachOut(job.id)}
                                disabled={pendingThisJob}
                                className="group/btn inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary-dark/40 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {approvePending
                                    ? <><ApplyDirLoader.Button variant="light" /> Reaching out…</>
                                    : <>Reach Out <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" /></>}
                            </button>
                        </div>
                    ) : inFlight ? (
                        // Processing happens in place: a calm status bar where the
                        // buttons were, so the card's height and position never change.
                        <div className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 bg-neutral text-secondary-dark font-semibold font-montserrat text-sm cursor-default select-none">
                            {state === 'working'
                                ? <><Loader2 className="w-4 h-4 shrink-0 animate-spin text-primary-light" /> Finding hiring manager…</>
                                : <><Clock className="w-4 h-4 shrink-0" /> Queued</>}
                        </div>
                    ) : (state === 'drafted' || state === 'sent') ? (
                        <button
                            onClick={() => navigate('/dashboard/introductions')}
                            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all"
                        >
                            View on Intros <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : state === 'no_contact' ? (
                        <div className="grid grid-cols-2 gap-2">
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
    const allCaughtUp = (
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
                    <CheckCircle2 className="w-7 h-7 text-primary-light" />
                </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold font-montserrat text-black-light">All caught up!</h2>
            <p className="mt-2 text-sm text-secondary-dark max-w-sm leading-relaxed">
                Your headhunter will find more opportunities overnight. Check back tomorrow.
            </p>
        </motion.div>
    );

    const nothingAtAll = !loading && pickedCount === 0;

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
        // 'all' and 'new' both lead with the review queue (paginated). In-flight
        // cards stay in this list at their own index — that is the no-jump rule.
        return (
            <>
                {reviewJobs.length > 0 ? grid(pageNewJobs) : (
                    activeTab === 'new'
                        ? <p className="text-sm text-secondary-dark py-8 text-center">Nothing new to review — you&rsquo;re all caught up.</p>
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

                {/* Section C — Apply directly, collapsed at the bottom (All view only). */}
                {activeTab === 'all' && applySectionJobs.length > 0 && (
                    <div className="mt-8 border-t border-neutral-dark pt-6">
                        <button
                            onClick={() => setApplyExpanded((v) => !v)}
                            className="w-full flex items-center justify-between gap-3 text-left rounded-xl bg-neutral hover:bg-neutral-dark transition-colors px-4 py-3"
                        >
                            <span className="flex items-center gap-2 min-w-0">
                                <UserX className="w-4 h-4 text-secondary-dark shrink-0" />
                                <span className="text-sm font-semibold text-black-light">
                                    Apply directly ({applySectionJobs.length})
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
                                    <div className="pt-6">{grid(applySectionJobs)}</div>
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
                // A scrape is running (e.g. just after onboarding) → show the
                // "AI headhunter searching" screen instead of "all caught up".
                isSearching ? <HeadhuntingState /> : allCaughtUp
            ) : (
                <>
                    {/* ── Summary bar — curated-from-a-larger-pool framing ────────── */}
                    {pickedCount > 0 && (
                        <div className="rounded-2xl border border-neutral-dark bg-white shadow-sm px-4 py-3 md:px-5 md:py-4">
                            <p className="text-sm text-black-light leading-relaxed">
                                Your headhunter{' '}
                                {reviewedTotal && reviewedTotal > pickedCount
                                    ? <>reviewed <span className="font-bold">{reviewedTotal}</span> roles and picked{' '}</>
                                    : <>picked{' '}</>}
                                <span className="font-bold text-primary-dark">{pickedCount}</span> for you
                                {contactReady > 0 && (
                                    <> · <span className="font-bold text-emerald-600">{contactReady}</span> {contactReady === 1 ? 'has' : 'have'} a hiring manager ready</>
                                )}
                                {inProgressCount > 0 && (
                                    <> · <span className="font-bold text-black-light">{inProgressCount}</span> in progress</>
                                )}
                            </p>
                        </div>
                    )}

                    {/* ── Filter tabs ─────────────────────────────────────────────── */}
                    {pickedCount > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {tabButton('all', 'All', pickedCount)}
                            {tabButton('contact', 'Contact found', contactReady, true)}
                            {tabButton('new', 'New', reviewJobs.length)}
                            {tabButton('apply', 'Apply direct', applyJobs.length)}
                        </div>
                    )}

                    {/* ── Tab body ────────────────────────────────────────────────── */}
                    {renderTabBody()}
                </>
            )}

            <ProfileActivationDrawer isOpen={isActivationDrawerOpen} onClose={() => setIsActivationDrawerOpen(false)} />

            {showPersonalization && (
                <FirstTimePersonalizationModal onClose={handlePersonalizationCancel} onComplete={handlePersonalizationComplete} />
            )}

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

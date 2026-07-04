import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router';
import { MapPin, ArrowRight, ArrowLeft, CheckCircle2, Search, Loader2, UserX, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ApplyDirLoader } from '../components/ui/ApplyDirLoader';
import { getOpportunityJobs, updateJobStatus, trackJob } from '../services/apiJobs';
import { getProfile } from '../services/apiProfile';
import ProfileActivationDrawer from '../components/ProfileActivationDrawer';
import FirstTimePersonalizationModal from '../components/onboarding/FirstTimePersonalizationModal';
import JobDetailDrawer from '../components/JobDetailDrawer';
import ApplyDirectModal from '../components/ApplyDirectModal';
import BroadenSearchNudge from '../components/BroadenSearchNudge';

// ── Opportunities — the Discover Feed ─────────────────────────────────────
// A responsive grid of opportunity cards for the roles the headhunter found.
// Every card answers "is this a fit, and what do I do?" in human language —
// no scores, sources, or pipeline jargon. Two actions per card: Skip (reject)
// and Reach Out (approve), both wired to the existing status-update endpoint.
// Sourcing is handled entirely by automated background workers — there is no
// manual scrape from the UI.

const ITEMS_PER_PAGE = 9;

// Staggered entrance — the grid orchestrates a cascade, each card fades + rises.
const GRID_STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const CARD_ITEM = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

// Translate the numeric fit_score into a calm, number-free match signal with a
// clear hierarchy: strong matches read first (bigger, bolder), fair matches sit
// quietly in gray. `accent` is the thin top bar; `badge` is the pill.
const matchStrength = (score) => {
  if (score == null) return { label: 'New match',    badge: 'px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 border-gray-200',        accent: 'bg-neutral-200' };
  if (score >= 80)   return { label: 'Strong match', badge: 'px-3 py-1.5 text-sm font-bold bg-emerald-100 text-emerald-700 border-emerald-200', accent: 'bg-emerald-400/30' };
  if (score >= 60)   return { label: 'Good match',   badge: 'px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-600 border-emerald-100', accent: 'bg-emerald-300/30' };
  return { label: 'Fair match', badge: 'px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 border-gray-200', accent: 'bg-neutral-200' };
};

// The reasoning is shown to the user, so keep it positive. If the model slips
// into negative framing — ANY of these signals — replace the whole sentence
// with a neutral positive line. This mirrors the server-side sanitizer; it's a
// belt-and-suspenders safety net for legacy rows scored before that landed.
const NEGATIVE_RE = /(does ?not|does ?n['’]?t|\bweak\b|\bfails?\b|not match|not align|\black(s|ing)?\b|\bmissing\b|mismatch|\bgaps?\b|\bunfortunately\b|\bpoor(ly)?\b|unrelated|irrelevant)/i;
const positiveReason = (text) =>
  (!text || NEGATIVE_RE.test(text))
    ? 'Your experience aligns well with this role.'
    : text;

// A card progresses through visual states on the SAME page instead of
// disappearing. Derived from server status + contact/draft flags:
//   new        → scraped, undecided → Skip / Reach Out
//   working    → approved, draft still being written → "finding…" (muted)
//   drafted    → real contact + draft ready → "Contact: …" / View on Intros
//   no_contact → manual_apply (or a legacy placeholder draft) → Apply Direct
//   sent       → contacted/outreach_automated → "Intro sent ✓" (muted)
const cardState = (job) => {
  if (job.status === 'contacted' || job.status === 'outreach_automated') return 'sent';
  if (job.has_draft && job.has_real_contact) return 'drafted';
  if (job.status === 'manual_apply' || (job.has_draft && !job.has_real_contact)) return 'no_contact';
  if (job.status === 'approved' && !job.has_draft) return 'working';
  return 'new';
};

const JobsPage = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [isActivationDrawerOpen, setIsActivationDrawerOpen] = useState(false);
    // Per-job "Track this application" choice for the no-contact / Apply Direct
    // state (default on). Keyed by job id.
    const [trackChoice, setTrackChoice] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [pendingJobId, setPendingJobId] = useState(null);
    const [showPersonalization, setShowPersonalization] = useState(false);
    // The job whose detail drawer is open (null = closed).
    const [drawerJobId, setDrawerJobId] = useState(null);
    // Apply-Direct modal context: { job, track } | null.
    const [applyModal, setApplyModal] = useState(null);
    // Ids the user just reached out to, most-recent first — orders the in-progress
    // bucket so a freshly-picked job sits on top. Per-job (not one shared flag), so
    // concurrent reach-outs never clobber each other's loading state.
    const [actedOrder, setActedOrder] = useState([]);

    const [searchParams] = useSearchParams();
    const isActivateRequested = searchParams.get('activate') === '1';

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: getProfile,
        staleTime: 5 * 60 * 1000,
    });
    const isActivated = !!profile?.cv_raw_text;

    // The feed surfaces roles across the whole review-and-progress span so a
    // card never disappears when it advances (scraped → approved → contacted).
    // Visual state is derived per card from status + contact/draft flags.
    const { data: pageData, isLoading: loading } = useQuery({
        queryKey: ['jobs-page', 'opportunities'],
        queryFn:  () => getOpportunityJobs(60),
        refetchOnWindowFocus: false,
        staleTime: 30000,
        // Poll ONLY while a card is still resolving (finding contact / drafting) so
        // it flips to "View on Intros" or "Apply Direct" on its own. Idle otherwise.
        refetchInterval: (query) =>
            (query.state.data?.jobs || []).some((j) => cardState(j) === 'working') ? 4000 : false,
    });

    const jobs = pageData?.jobs ?? [];

    // Opportunities shows ONLY jobs the user hasn't acted on yet ('new'). The
    // moment they tap Reach Out, the job advances past 'new' (→ approved) and
    // leaves this page — the system finds the contact + drafts the intro in the
    // background, which then surfaces on Introductions. Acted/working/drafted/
    // sent/no-contact jobs are filtered out here so this page stays a clean
    // "to review" queue (and the detail modal can only ever open on a 'new' job).
    // In-progress bucket — jobs the user just acted on, pinned to the TOP and kept
    // visible so they can watch it resolve. 'working' = finding contact + drafting
    // (spinner); 'no_contact' = failed → Apply Direct. Ordered working-first, then
    // by most-recent reach-out. Once a job finds its contact ('drafted'/'sent') it
    // leaves this queue and lives on Introductions (option A).
    const inProgressJobs = jobs
        .filter((j) => { const s = cardState(j); return s === 'working' || s === 'no_contact'; })
        .sort((a, b) => {
            const rank = (j) => (cardState(j) === 'working' ? 0 : 1);
            if (rank(a) !== rank(b)) return rank(a) - rank(b);
            const ia = actedOrder.indexOf(a.id), ib = actedOrder.indexOf(b.id);
            return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
        });

    const newJobs = jobs.filter((j) => cardState(j) === 'new');
    const reviewCount = newJobs.length;

    // ── Pagination (over the not-yet-acted review queue only) ─────────────────
    const totalPages = Math.max(1, Math.ceil(newJobs.length / ITEMS_PER_PAGE));
    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);
    const pageNewJobs = newJobs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    // In-progress cards always render (unpaginated) above the review queue.
    const pageJobs = [...inProgressJobs, ...pageNewJobs];

    // As reached-out jobs resolve: contact found → toast + it moves to Introductions
    // (drops off here); no contact → it stays as an Apply Direct card. Either way,
    // prune resolved ids from actedOrder.
    useEffect(() => {
        if (actedOrder.length === 0) return;
        const byId = Object.fromEntries(jobs.map((j) => [j.id, j]));
        const stillWorking = [];
        const foundContact = [];
        actedOrder.forEach((id) => {
            const j = byId[id];
            if (!j) return;
            const s = cardState(j);
            if (s === 'working') stillWorking.push(id);
            else if (s === 'drafted' || s === 'sent') foundContact.push(j);
        });
        foundContact.forEach((j) => toast.success(`Found the hiring manager for ${j.company_name} — see Introductions.`));
        if (stillWorking.length !== actedOrder.length) setActedOrder(stillWorking);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageData]);

    // ── Mutation: approve (Reach Out) / reject (Skip) ─────────────────────────
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, newStatus }) => updateJobStatus(id, newStatus),
        // Optimistic + per-job: flip the clicked job in the cache immediately so it
        // moves to the in-progress bucket at the top (approve → 'working' spinner)
        // or vanishes (reject). Because state lives per-job in the cache, clicking a
        // second job never disturbs the first that's already resolving.
        onMutate: async ({ id, newStatus }) => {
            await queryClient.cancelQueries({ queryKey: ['jobs-page', 'opportunities'] });
            const prev = queryClient.getQueryData(['jobs-page', 'opportunities']);
            queryClient.setQueryData(['jobs-page', 'opportunities'], (old) => {
                if (!old?.jobs) return old;
                let list = old.jobs;
                if (newStatus === 'approved') {
                    list = list.map((j) => j.id === id ? { ...j, status: 'approved', has_draft: false } : j);
                } else if (newStatus === 'rejected') {
                    list = list.filter((j) => j.id !== id);
                }
                return { ...old, jobs: list };
            });
            return { prev };
        },
        onSuccess: (_, { newStatus }) => {
            if (newStatus === 'approved') {
                toast.success('Finding the hiring manager — drafting your intro…');
            } else {
                toast.success('Skipped. Your headhunter will keep looking.');
            }
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
        },
        onError: (err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(['jobs-page', 'opportunities'], ctx.prev);
            toast.error(err.message || 'Something went wrong. Please try again.');
        },
        // Reconcile with the server after either outcome (keeps optimistic + truth in sync).
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['jobs-page'] }),
    });

    const handleUpdateStatus = (id, newStatus) => updateStatusMutation.mutate({ id, newStatus });

    // Reach Out → approve. The card then leaves the feed (it's no longer 'new'),
    // and the system finds the contact + drafts the intro in the background —
    // the user does NOT wait on this page for the result.
    const approveJob = (jobId) => {
        setDrawerJobId(null); // close the drawer if the action came from there
        setActedOrder((prev) => [jobId, ...prev.filter((x) => x !== jobId)]); // pin to top of in-progress
        handleUpdateStatus(jobId, 'approved');
    };

    // First-ever Reach Out gates on the personalization popup so the AI draft
    // uses the user's tone + secret weapon. Every reach-out after that is instant.
    // Always close the detail drawer first so the action isn't hidden behind it
    // (this is what makes the drawer's Write Intro behave like the card's).
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

    // Apply Direct (no contact found) — opens the tailored-CV modal first. The
    // modal opens the listing; we just record the application if tracking is on.
    const openApplyModal = (job, track) => setApplyModal({ job, track });

    const trackApplication = async (job) => {
        if (!applyModal?.track) return;
        try {
            await trackJob(job.id, 'applied');
            toast.success('Tracking this application in your Progress board.');
        } catch (err) {
            toast.error(err?.message || 'Could not track this application.');
        }
    };

    // Skip from the drawer — reject + close.
    const handleDrawerSkip = () => {
        if (drawerJobId != null) handleUpdateStatus(drawerJobId, 'rejected');
        setDrawerJobId(null);
    };
    const handlePersonalizationCancel = () => {
        setShowPersonalization(false);
        setPendingJobId(null);
    };

    // Open the CV-upload drawer when arriving via ?activate=1 (and not yet activated).
    useEffect(() => {
        if (isActivateRequested && !isActivated) setIsActivationDrawerOpen(true);
    }, [isActivateRequested, isActivated]);

    // Shown when there's nothing left to review (everything skipped or acted on).
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
            <h2 className="text-lg md:text-xl font-bold font-montserrat text-black-light">
                All caught up!
            </h2>
            <p className="mt-2 text-sm text-secondary-dark max-w-sm leading-relaxed">
                Your headhunter will find more opportunities overnight. Check back tomorrow.
            </p>
        </motion.div>
    );

    return (
        <div className="relative isolate p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-6 animate-fade-in font-roboto">

            {/* Ambient depth — a faint warm glow behind the feed */}
            <div aria-hidden="true" className="pointer-events-none absolute -top-28 right-0 -z-10 h-72 w-72 rounded-full bg-primary-light/10 blur-3xl" />

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-montserrat text-black-light">
                        Opportunities
                    </h1>
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

            {/* Thin scrape yield → CV-informed "broaden your search" nudge */}
            <BroadenSearchNudge />

            {/* ── The feed ────────────────────────────────────────────────── */}
            {loading ? (
                /* Skeleton grid — mirrors the card layout so there's no shift */
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
                            <div className="h-3 w-2/3 rounded bg-neutral-dark mt-4" />
                            <div className="flex justify-between mt-6">
                                <div className="h-10 w-16 rounded-xl bg-neutral-dark" />
                                <div className="h-10 w-28 rounded-xl bg-neutral-dark" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : pageJobs.length === 0 ? (
                allCaughtUp
            ) : (
                <>
                    <motion.div
                        key={currentPage}
                        variants={GRID_STAGGER}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        <AnimatePresence mode="popLayout">
                            {pageJobs.map(job => {
                                const match = matchStrength(job.fit_score);
                                const reason = positiveReason(job.fit_reasoning);
                                const state = cardState(job);
                                const pendingThisJob = updateStatusMutation.isPending && updateStatusMutation.variables?.id === job.id;
                                const approvePending = pendingThisJob && updateStatusMutation.variables?.newStatus === 'approved';
                                const rejectPending  = pendingThisJob && updateStatusMutation.variables?.newStatus === 'rejected';

                                return (
                                    <motion.div
                                        key={job.id}
                                        layout
                                        variants={CARD_ITEM}
                                        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                                        whileHover={{ y: -6, transition: { duration: 0.3, ease: 'easeOut' } }}
                                        onClick={() => setDrawerJobId(job.id)}
                                        className={`group relative overflow-hidden bg-white rounded-2xl border border-neutral-dark shadow-sm p-6 flex flex-col h-full cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary-light/10 hover:border-primary-light/30 ${state !== 'new' ? 'border-l-4 border-l-primary-light' : ''}`}
                                    >
                                        {/* Match-strength top accent — sheer, glanceable hierarchy */}
                                        <span className={`absolute inset-x-0 top-0 h-1 ${match.accent}`} />

                                        {/* Header — neutral company monogram anchors the card's identity */}
                                        <div className="flex items-start gap-3">
                                            <span className="w-11 h-11 shrink-0 rounded-xl bg-neutral text-secondary-dark border border-neutral-dark flex items-center justify-center font-montserrat font-bold text-base">
                                                {(job.company_name || '?').trim().charAt(0).toUpperCase()}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setDrawerJobId(job.id)}
                                                    className="text-left w-full"
                                                >
                                                    <h2 className="font-montserrat text-lg font-bold text-black-light leading-snug line-clamp-2 hover:text-primary-dark transition-colors">
                                                        {job.title}
                                                    </h2>
                                                </button>
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
                                            </div>
                                        </div>

                                        {/* Match strength — no numbers, hierarchy via size/weight */}
                                        <span className={`mt-3 self-start inline-flex items-center rounded-md border ${match.badge}`}>
                                            {match.label}
                                        </span>

                                        {/* AI explanation — positive framing, "lightning" tint on card hover */}
                                        <p className="mt-3 text-sm italic text-secondary-dark leading-relaxed border-l-2 border-neutral-dark bg-neutral/50 rounded-r-lg pl-3 py-2 transition-colors duration-300 group-hover:bg-primary-light/5">
                                            {reason}
                                        </p>

                                        {/* Contact / status line — reflects how far the card has progressed */}
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
                                        ) : (
                                            <div className="mt-3 flex items-center gap-1.5 text-xs text-secondary-dark min-h-[1.25rem]">
                                                {state === 'working' ? (
                                                    <>
                                                        <Loader2 className="w-3.5 h-3.5 text-primary-light shrink-0 animate-spin" />
                                                        <span>Finding the hiring manager and writing your intro…</span>
                                                    </>
                                                ) : state === 'no_contact' ? (
                                                    <>
                                                        <UserX className="w-3.5 h-3.5 text-secondary-dark shrink-0" />
                                                        <span>No hiring manager found</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Search className="w-3.5 h-3.5 text-secondary-dark/50 shrink-0" />
                                                        <span>We&rsquo;ll find the contact and draft your intro</span>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* No-contact: optional tracking before applying directly */}
                                        {state === 'no_contact' && (
                                            <label className="mt-3 flex items-center gap-2 text-xs text-secondary-dark cursor-pointer select-none" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={trackChoice[job.id] !== false}
                                                    onChange={(e) => setTrackChoice((prev) => ({ ...prev, [job.id]: e.target.checked }))}
                                                    className="w-4 h-4 rounded border-neutral-dark accent-primary-light"
                                                />
                                                Track this application
                                            </label>
                                        )}

                                        {/* Actions — pushed to the bottom so cards in a row match height.
                                            stopPropagation so button clicks don't also open the drawer. */}
                                        <div className="mt-auto pt-5 flex items-center justify-between gap-3" onClick={(e) => e.stopPropagation()}>
                                            {state === 'new' ? (
                                                <>
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
                                                </>
                                            ) : (state === 'drafted' || state === 'sent') ? (
                                                <button
                                                    onClick={() => navigate('/dashboard/introductions')}
                                                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all"
                                                >
                                                    View on Intros <ArrowRight className="w-4 h-4" />
                                                </button>
                                            ) : state === 'no_contact' ? (
                                                <button
                                                    onClick={() => openApplyModal(job, trackChoice[job.id] !== false)}
                                                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all"
                                                >
                                                    Apply Direct <ExternalLink className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                /* working */
                                                <span className="w-full inline-flex items-center justify-center gap-2 text-secondary-dark font-semibold rounded-xl px-5 py-2.5 bg-neutral border border-neutral-dark">
                                                    <Loader2 className="w-4 h-4 animate-spin" /> Preparing…
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </motion.div>

                    {/* ── Pagination ──────────────────────────────────────────── */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 sm:gap-4 pt-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="inline-flex items-center gap-1.5 text-secondary-dark hover:text-black-light hover:bg-neutral font-semibold rounded-xl px-4 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            >
                                <ArrowLeft className="w-4 h-4" /> Previous
                            </button>
                            <span className="text-sm font-medium text-secondary-dark whitespace-nowrap">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="inline-flex items-center gap-1.5 text-secondary-dark hover:text-black-light hover:bg-neutral font-semibold rounded-xl px-4 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            >
                                Next <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* AI Activation Drawer — CV upload to unlock match scoring (via ?activate=1) */}
            <ProfileActivationDrawer
                isOpen={isActivationDrawerOpen}
                onClose={() => setIsActivationDrawerOpen(false)}
            />

            {/* First-time personalization — gates the first-ever Reach Out */}
            {showPersonalization && (
                <FirstTimePersonalizationModal
                    onClose={handlePersonalizationCancel}
                    onComplete={handlePersonalizationComplete}
                />
            )}

            {/* Opportunity detail drawer — opens on card tap. The feed only ever
                shows un-acted ('new') jobs, so the drawer always opens on a job
                that still has Skip / Reach Out as its valid actions. */}
            <JobDetailDrawer
                jobId={drawerJobId}
                isOpen={drawerJobId != null}
                onClose={() => setDrawerJobId(null)}
                onSkip={handleDrawerSkip}
                onWriteIntro={() => drawerJobId != null && handleReachOut(drawerJobId)}
                showActions={drawerJobId != null}
                actionPending={updateStatusMutation.isPending && updateStatusMutation.variables?.id === drawerJobId}
            />

            {/* Apply Direct → offer a tailored CV before sending them to the listing */}
            {applyModal && (
                <ApplyDirectModal
                    job={applyModal.job}
                    onClose={() => setApplyModal(null)}
                    onApplied={() => trackApplication(applyModal.job)}
                />
            )}
        </div>
    );
};

export default JobsPage;

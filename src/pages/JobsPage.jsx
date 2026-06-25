import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router';
import { MapPin, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ApplyDirLoader } from '../components/ui/ApplyDirLoader';
import { getJobsPage, updateJobStatus } from '../services/apiJobs';
import { getProfile } from '../services/apiProfile';
import ProfileActivationDrawer from '../components/ProfileActivationDrawer';
import FirstTimePersonalizationModal from '../components/onboarding/FirstTimePersonalizationModal';

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
// into negative framing, fall back to a neutral positive line.
const NEGATIVE_RE = /\b(weak|fail|fails|failed|does ?n.?t align|not align|mismatch|not a match|no match|lack|lacks|lacking|limited|poor|poorly|gaps?|missing|unrelated|irrelevant)\b/i;
const positiveReason = (text) =>
  (!text || NEGATIVE_RE.test(text))
    ? 'Your background has relevant overlap with this role.'
    : text;

const JobsPage = () => {
    const queryClient = useQueryClient();

    const [isActivationDrawerOpen, setIsActivationDrawerOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pendingJobId, setPendingJobId] = useState(null);
    const [showPersonalization, setShowPersonalization] = useState(false);

    const [searchParams] = useSearchParams();
    const isActivateRequested = searchParams.get('activate') === '1';

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: getProfile,
        staleTime: 5 * 60 * 1000,
    });
    const isActivated = !!profile?.cv_raw_text;

    // The feed only surfaces fresh, undecided roles (status === 'scraped').
    const { data: pageData, isLoading: loading } = useQuery({
        queryKey: ['jobs-page', 'Scraped'],
        queryFn:  () => getJobsPage(1, 'Scraped', 50),
        refetchOnWindowFocus: false,
        staleTime: 30000,
    });

    const jobs = pageData?.jobs ?? [];

    // ── Client-side pagination ────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(jobs.length / ITEMS_PER_PAGE));
    // When jobs are removed (skip/reach out), the list shrinks. Pull the next
    // jobs onto the current page automatically, and clamp if the current page
    // no longer exists.
    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);
    const pageJobs = jobs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // ── Mutation: approve (Reach Out) / reject (Skip) ─────────────────────────
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, newStatus }) => updateJobStatus(id, newStatus),
        onSuccess: (_, { newStatus }) => {
            if (newStatus === 'approved') {
                toast.success('Writing your intro — find it under Introductions in a moment.');
            } else {
                toast.success('Skipped. Your headhunter will keep looking.');
            }
            queryClient.invalidateQueries({ queryKey: ['jobs-page'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
        },
        onError: (err) => toast.error(err.message || 'Something went wrong. Please try again.'),
    });

    const handleUpdateStatus = (id, newStatus) => updateStatusMutation.mutate({ id, newStatus });

    // First-ever Reach Out gates on the personalization popup so the AI draft
    // uses the user's tone + secret weapon. Every reach-out after that is instant.
    const handleReachOut = (jobId) => {
        if (profile && !profile.tone_preference) {
            setPendingJobId(jobId);
            setShowPersonalization(true);
            return;
        }
        handleUpdateStatus(jobId, 'approved');
    };
    const handlePersonalizationComplete = () => {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        setShowPersonalization(false);
        if (pendingJobId != null) handleUpdateStatus(pendingJobId, 'approved');
        setPendingJobId(null);
    };
    const handlePersonalizationCancel = () => {
        setShowPersonalization(false);
        setPendingJobId(null);
    };

    // Open the CV-upload drawer when arriving via ?activate=1 (and not yet activated).
    useEffect(() => {
        if (isActivateRequested && !isActivated) setIsActivationDrawerOpen(true);
    }, [isActivateRequested, isActivated]);

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
                        {jobs.length > 0
                            ? 'Reviewed by your headhunter — your call on who to reach.'
                            : 'Roles your headhunter found for you.'}
                    </p>
                </div>
                {jobs.length > 0 && (
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
                        {jobs.length} waiting for your review
                    </motion.span>
                )}
            </div>

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
            ) : jobs.length === 0 ? (
                /* Empty / working state — calm, with a sense of background motion */
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="min-h-[50vh] flex flex-col items-center justify-center text-center"
                >
                    <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                        <span className="absolute inset-0 rounded-full bg-primary-light/20 animate-ping" />
                        <span className="absolute inset-2 rounded-full bg-primary-light/10 animate-ping [animation-delay:600ms]" />
                        <span className="relative w-16 h-16 rounded-full bg-primary-light/10 border border-primary-light/30 flex items-center justify-center">
                            <Sparkles className="w-7 h-7 text-primary-light" />
                        </span>
                    </div>
                    <h2 className="text-lg md:text-xl font-bold font-montserrat text-black-light">
                        Your pipeline is clear
                    </h2>
                    <p className="mt-2 text-sm text-secondary-dark max-w-sm leading-relaxed">
                        Your headhunter is out sourcing fresh roles right now. New
                        matches will land here automatically — no need to refresh.
                    </p>
                </motion.div>
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
                                        className="group relative overflow-hidden bg-white rounded-2xl border border-neutral-dark shadow-sm p-6 flex flex-col h-full transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary-light/10 hover:border-primary-light/30"
                                    >
                                        {/* Match-strength top accent — sheer, glanceable hierarchy */}
                                        <span className={`absolute inset-x-0 top-0 h-1 ${match.accent}`} />

                                        {/* Header — neutral company monogram anchors the card's identity */}
                                        <div className="flex items-start gap-3">
                                            <span className="w-11 h-11 shrink-0 rounded-xl bg-neutral text-secondary-dark border border-neutral-dark flex items-center justify-center font-montserrat font-bold text-base">
                                                {(job.company_name || '?').trim().charAt(0).toUpperCase()}
                                            </span>
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

                                        {/* Contact line — pre-reach-out it's a prompt, not active work */}
                                        <div className="mt-3 flex items-center gap-1.5 text-xs text-secondary-dark">
                                            {job.contact_name ? (
                                                <>
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                    <span className="truncate">Contact found: <span className="font-semibold text-black-light">{job.contact_name}</span></span>
                                                </>
                                            ) : (
                                                <>
                                                    <Search className="w-3.5 h-3.5 text-secondary-dark/50 shrink-0" />
                                                    <span>We&rsquo;ll find the contact and draft your intro</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Actions — pushed to the bottom so cards in a row match height */}
                                        <div className="mt-auto pt-5 flex items-center justify-between gap-3">
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
                                                    ? <><ApplyDirLoader.Button variant="light" /> Writing…</>
                                                    : <>Write Intro <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" /></>}
                                            </button>
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
        </div>
    );
};

export default JobsPage;

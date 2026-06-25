import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router';
import { MapPin, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ApplyDirLoader } from '../components/ui/ApplyDirLoader';
import { getJobsPage, updateJobStatus } from '../services/apiJobs';
import { getProfile } from '../services/apiProfile';
import ProfileActivationDrawer from '../components/ProfileActivationDrawer';

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

// Translate the numeric fit_score into a calm, number-free match badge with a
// subtle inset ring so it pops off the card.
const matchStrength = (score) => {
  if (score == null) return { dot: '⚪', label: 'New match',    badge: 'bg-neutral text-secondary-dark ring-1 ring-inset ring-secondary-dark/15' };
  if (score >= 80)   return { dot: '🟢', label: 'Strong match', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20' };
  if (score >= 60)   return { dot: '🔵', label: 'Good match',   badge: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20' };
  return { dot: '⚪', label: 'Fair match', badge: 'bg-neutral text-secondary-dark ring-1 ring-inset ring-secondary-dark/15' };
};

const JobsPage = () => {
    const queryClient = useQueryClient();

    const [isActivationDrawerOpen, setIsActivationDrawerOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

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
                toast.success('Reaching out — find this role under Introductions.');
            } else {
                toast.success('Skipped. Your headhunter will keep looking.');
            }
            queryClient.invalidateQueries({ queryKey: ['jobs-page'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
        },
        onError: (err) => toast.error(err.message || 'Something went wrong. Please try again.'),
    });

    const handleUpdateStatus = (id, newStatus) => updateStatusMutation.mutate({ id, newStatus });

    // Open the CV-upload drawer when arriving via ?activate=1 (and not yet activated).
    useEffect(() => {
        if (isActivateRequested && !isActivated) setIsActivationDrawerOpen(true);
    }, [isActivateRequested, isActivated]);

    return (
        <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-6 animate-fade-in font-roboto">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold font-montserrat text-black-light">
                    Opportunities
                </h1>
                <p className="text-sm text-secondary-dark mt-1">
                    Roles your headhunter found for you.
                </p>
            </div>

            {/* ── The feed ────────────────────────────────────────────────── */}
            {loading ? (
                <div className="py-20">
                    <ApplyDirLoader.Inline message="Gathering your opportunities..." />
                </div>
            ) : jobs.length === 0 ? (
                /* Empty / working state */
                <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
                    <div className="relative w-16 h-16 mb-6">
                        <span className="absolute inset-0 rounded-full bg-primary-light/20 animate-ping" />
                        <span className="relative w-16 h-16 rounded-full bg-primary-light/10 border border-primary-light/30 flex items-center justify-center">
                            <Sparkles className="w-7 h-7 text-primary-light" />
                        </span>
                    </div>
                    <h2 className="text-lg md:text-xl font-bold font-montserrat text-black-light">
                        Your pipeline is clear
                    </h2>
                    <p className="mt-2 text-sm text-secondary-dark max-w-sm leading-relaxed">
                        Your headhunter is sourcing new roles. Check back later — we'll
                        line up fresh matches for you.
                    </p>
                </div>
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
                                const reason = job.fit_reasoning
                                    || 'Your background aligns with the core requirements for this role.';
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
                                        className="group bg-white rounded-2xl border border-neutral-dark shadow-sm p-6 flex flex-col h-full transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary-light/10 hover:border-primary-light/30"
                                    >
                                        {/* Header */}
                                        <h2 className="font-montserrat text-lg font-bold text-black-light leading-snug">
                                            {job.title}
                                        </h2>
                                        <p className="text-sm text-secondary-dark mt-1 flex items-center gap-1.5 flex-wrap">
                                            <span className="font-medium text-black-light">{job.company_name}</span>
                                            {job.location && (
                                                <>
                                                    <span className="text-secondary-dark/40">·</span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                        {job.location}
                                                    </span>
                                                </>
                                            )}
                                        </p>

                                        {/* Match strength — no numbers, ring'd badge */}
                                        <span className={`mt-3 self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${match.badge}`}>
                                            <span aria-hidden="true">{match.dot}</span> {match.label}
                                        </span>

                                        {/* AI explanation — "lightning" tint on card hover */}
                                        <p className="mt-3 text-sm italic text-secondary-dark leading-relaxed border-l-2 border-neutral-dark bg-neutral/50 rounded-r-lg pl-3 py-2 transition-colors duration-300 group-hover:bg-primary-light/5">
                                            {reason}
                                        </p>

                                        {/* Contact line */}
                                        <p className="mt-3 text-xs text-secondary-dark">
                                            {job.contact_name
                                                ? <>Contact found: <span className="font-semibold text-black-light">{job.contact_name}</span></>
                                                : 'Hiring manager discovery pending.'}
                                        </p>

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
                                                onClick={() => handleUpdateStatus(job.id, 'approved')}
                                                disabled={pendingThisJob}
                                                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary-dark/40 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {approvePending
                                                    ? <><ApplyDirLoader.Button variant="light" /> Reaching out…</>
                                                    : <>Reach Out <ArrowRight className="w-4 h-4" /></>}
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
        </div>
    );
};

export default JobsPage;

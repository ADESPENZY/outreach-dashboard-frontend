import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Plus, X, MapPin, Sparkles, ChevronDown, Link2, CheckCircle,
  Lock, UserSearch, ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ApplyDirLoader } from '../components/ui/ApplyDirLoader';
import {
  getJobsPage, updateJobStatus,
  scrapeLinkedinJobs, scrapeRemoteJobs, scrapeApifyJobs, autoScrapeAts,
  scrapeYcJobs, scrapeWellfoundJobs, getScrapeStatus,
} from '../services/apiJobs';
import { getAutoScoutSettings } from '../services/apiSettings';
import { getProfile } from '../services/apiProfile';
import ProfileActivationDrawer from '../components/ProfileActivationDrawer';

// ── Opportunities — the Discover Feed ─────────────────────────────────────
// A curated stack of opportunity cards for the roles the headhunter found.
// Every card answers "is this a fit, and what do I do?" in human language —
// no scores, sources, or pipeline jargon. Two actions per card: Skip (reject)
// and Reach Out (approve), both wired to the existing status-update endpoint.

// Translate the numeric fit_score into a calm, number-free match label.
const matchStrength = (score) => {
  if (score == null) return { dot: '⚪', label: 'New match',    tone: 'text-secondary-dark' };
  if (score >= 80)   return { dot: '🟢', label: 'Strong match', tone: 'text-emerald-600' };
  if (score >= 60)   return { dot: '🔵', label: 'Good match',   tone: 'text-blue-600' };
  return { dot: '⚪', label: 'Fair match', tone: 'text-secondary-dark' };
};

const JobsPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // ── State ───────────────────────────────────────────────────────────────
    const [isScrapeActive, setIsScrapeActive]       = useState(() => localStorage.getItem('applydir_is_scraping') === 'true');
    const [isScrapeModalOpen, setIsScrapeModalOpen] = useState(false);
    const [isScrapeSourceOpen, setIsScrapeSourceOpen] = useState(false);
    const [scrapePhase, setScrapePhase]             = useState('scraping'); // 'scraping' | 'scoring'
    const [scrapeForm, setScrapeForm] = useState({
        source: 'linkedin', keywords: '', locations: ['remote'],
        time_range: '24h', count: 10, search_url: '', atsTitle: '', atsLocation: '',
        startupLocation: '',
    });
    const [newJobsCount, setNewJobsCount]           = useState(0);
    const [showNewJobsBanner, setShowNewJobsBanner] = useState(false);
    const [showAutoScoutBanner, setShowAutoScoutBanner] = useState(false);
    const [showCvNudge, setShowCvNudge]             = useState(false);
    const [isActivationDrawerOpen, setIsActivationDrawerOpen] = useState(false);

    const [searchParams] = useSearchParams();
    const isActivateRequested = searchParams.get('activate') === '1';

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: autoScoutSettings } = useQuery({
        queryKey: ['auto-scout-settings'],
        queryFn: getAutoScoutSettings,
        staleTime: 5 * 60 * 1000,
    });

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

    const jobs       = pageData?.jobs        ?? [];
    const totalCount = pageData?.total_count ?? 0;

    // ── Live ref to totalCount for the scrape-poll callbacks ──────────────────
    const totalCountRef = useRef(totalCount);
    useEffect(() => { totalCountRef.current = totalCount; }, [totalCount]);

    // While a scrape runs, refresh the feed every 8s so new roles stream in.
    useEffect(() => {
        if (!isScrapeActive) return;
        const id = setInterval(() => {
            queryClient.invalidateQueries({ queryKey: ['jobs-page'] });
        }, 8000);
        return () => clearInterval(id);
    }, [isScrapeActive, queryClient]);

    // Poll the backend lock; only declare "done" once the thread releases it.
    useEffect(() => {
        if (!isScrapeActive) return;

        const countAtStart = parseInt(localStorage.getItem('applydir_scraping_job_count') || '0', 10);
        let done = false;

        const _clearScrapeState = () => {
            localStorage.removeItem('applydir_is_scraping');
            localStorage.removeItem('applydir_scraping_started_at');
            localStorage.removeItem('applydir_scraping_job_count');
            setIsScrapeActive(false);
            setScrapePhase('scraping');
        };

        const poll = async () => {
            if (done) return;
            try {
                const { is_active, phase } = await getScrapeStatus();
                if (phase) setScrapePhase(phase);
                if (!is_active) {
                    done = true;
                    queryClient.invalidateQueries({ queryKey: ['jobs-page'] });
                    setTimeout(() => {
                        const delta = totalCountRef.current - countAtStart;
                        if (delta > 0) {
                            setNewJobsCount(delta);
                            setShowNewJobsBanner(true);
                        } else {
                            toast.info(
                                'No new roles this time — try different keywords or check back later.',
                                { autoClose: 6000 },
                            );
                        }
                        _clearScrapeState();
                    }, 2000);
                }
            } catch {
                // Status endpoint unreachable — keep polling silently.
            }
        };

        const intervalId = setInterval(poll, 3000);
        const timeoutId = setTimeout(() => {
            if (!done) { done = true; _clearScrapeState(); }
        }, 5 * 60 * 1000);

        return () => {
            done = true;
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, [isScrapeActive, queryClient]);

    // ── Mutations ─────────────────────────────────────────────────────────────
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

    const scrapeMutation = useMutation({
        mutationFn: async (form) => {
            if (form.source === 'linkedin') return scrapeLinkedinJobs(form);
            if (form.source === 'remote')   return scrapeRemoteJobs(form.keywords);
            if (form.source === 'ats')      return autoScrapeAts({ title: form.atsTitle, location: form.atsLocation });
            if (form.source === 'yc')       return scrapeYcJobs({ keywords: form.keywords, location: form.startupLocation });
            if (form.source === 'wellfound') return scrapeWellfoundJobs({ keywords: form.keywords, location: form.startupLocation });
            return scrapeApifyJobs(form);
        },
        onMutate: () => {
            setScrapePhase('scraping');
            setIsScrapeActive(true);
            localStorage.setItem('applydir_is_scraping', 'true');
            localStorage.setItem('applydir_scraping_started_at', Date.now().toString());
            localStorage.setItem('applydir_scraping_job_count', String(pageData?.total_count ?? 0));
        },
        onSuccess: () => {
            setIsScrapeModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['jobs-page'] });
            // CV upload unlocks AI scoring; nudge it first, else nudge Auto-Scout.
            if (!isActivated) {
                const cvSnooze = Number(localStorage.getItem('applydirCvNudgeSnoozeUntil') || 0);
                if (Date.now() > cvSnooze) setShowCvNudge(true);
            } else {
                const snoozeUntil = Number(localStorage.getItem('applydirAutoScoutSnoozeUntil') || 0);
                if (autoScoutSettings?.is_active === false && Date.now() > snoozeUntil) {
                    setShowAutoScoutBanner(true);
                }
            }
        },
        onSettled: () => setIsScrapeModalOpen(false),
        onError: (err) => {
            setIsScrapeActive(false);
            localStorage.removeItem('applydir_is_scraping');
            localStorage.removeItem('applydir_scraping_started_at');
            localStorage.removeItem('applydir_scraping_job_count');
            toast.error(err.message || 'Could not start the search. Please try again.');
        },
    });

    const handleUpdateStatus = (id, newStatus) => updateStatusMutation.mutate({ id, newStatus });

    const toggleLocation = (loc) => {
        setScrapeForm(prev => {
            const has = prev.locations.includes(loc);
            return { ...prev, locations: has ? prev.locations.filter(l => l !== loc) : [...prev.locations, loc] };
        });
    };

    const handleScrape = (e) => {
        e.preventDefault();
        if (scrapeForm.source === 'linkedin' && scrapeForm.locations.length === 0) {
            toast.error('Select at least one location'); return;
        }
        if (scrapeForm.source === 'remote' && !scrapeForm.keywords.trim()) {
            toast.error('Keywords are required'); return;
        }
        if (scrapeForm.source === 'ats') {
            if (!scrapeForm.atsTitle.trim())    { toast.error('Job title is required'); return; }
            if (!scrapeForm.atsLocation.trim()) { toast.error('Location is required'); return; }
        }
        if ((scrapeForm.source === 'yc' || scrapeForm.source === 'wellfound') && !scrapeForm.keywords.trim()) {
            toast.error('Keywords are required'); return;
        }
        scrapeMutation.mutate(scrapeForm);
    };

    const isScrapingInProgress = scrapeMutation.isPending || isScrapeActive;

    // Open the CV-upload drawer when arriving via ?activate=1 (and not yet activated).
    useEffect(() => {
        if (isActivateRequested && !isActivated) setIsActivationDrawerOpen(true);
    }, [isActivateRequested, isActivated]);

    return (
        <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-6 animate-fade-in font-roboto">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-montserrat text-black-light">
                        Opportunities
                    </h1>
                    <p className="text-sm text-secondary-dark mt-1">
                        Roles your headhunter found for you.
                    </p>
                </div>
                <button
                    onClick={() => !isScrapingInProgress && setIsScrapeModalOpen(true)}
                    disabled={isScrapingInProgress}
                    className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                >
                    {isScrapingInProgress
                        ? <><ApplyDirLoader.Button variant="light" /> Sourcing…</>
                        : <><Plus className="w-4 h-4" /> Find roles</>}
                </button>
            </div>

            {/* ── Sourcing-in-progress banner ─────────────────────────────── */}
            <AnimatePresence>
                {isScrapingInProgress && (
                    <motion.div
                        key="scout-banner"
                        initial={{ opacity: 0, y: -14, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0,  scale: 1    }}
                        exit={{    opacity: 0, y: -14, scale: 0.97 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="max-w-2xl mx-auto bg-white border border-neutral-dark rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm"
                    >
                        <div className="w-10 h-10 rounded-xl bg-primary-light/10 border border-primary-light/20 flex items-center justify-center shrink-0">
                            {scrapePhase === 'scoring'
                                ? <Sparkles className="w-5 h-5 text-primary-light" />
                                : <ApplyDirLoader.Button variant="dark" />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold font-montserrat text-black-light leading-snug">
                                {scrapePhase === 'scoring'
                                    ? 'Sizing up your matches…'
                                    : 'Your headhunter is searching…'}
                            </p>
                            <p className="text-xs text-secondary-dark mt-0.5">
                                This usually takes 30–60 seconds. New roles appear here automatically.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── The card stack ──────────────────────────────────────────── */}
            <div className="max-w-2xl mx-auto space-y-5">
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
                    <AnimatePresence mode="popLayout" initial={false}>
                        {jobs.map(job => {
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
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0  }}
                                    exit={{    opacity: 0, scale: 0.96 }}
                                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                    className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6"
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

                                    {/* Match strength — no numbers */}
                                    <p className={`mt-3 text-sm font-semibold ${match.tone}`}>
                                        <span aria-hidden="true">{match.dot}</span> {match.label}
                                    </p>

                                    {/* AI explanation */}
                                    <p className="mt-3 text-sm italic text-secondary-dark leading-relaxed border-l-2 border-neutral-dark bg-neutral/50 rounded-r-lg pl-3 py-2">
                                        {reason}
                                    </p>

                                    {/* Contact line */}
                                    <p className="mt-3 text-xs text-secondary-dark">
                                        {job.contact_name
                                            ? <>Contact found: <span className="font-semibold text-black-light">{job.contact_name}</span></>
                                            : 'Hiring manager discovery pending.'}
                                    </p>

                                    {/* Actions */}
                                    <div className="mt-5 flex items-center justify-between gap-3">
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
                                            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
                )}
            </div>

            {/* ── New roles arrival pill ──────────────────────────────────── */}
            <AnimatePresence>
                {showNewJobsBanner && (
                    <motion.div
                        key="new-jobs-pill"
                        initial={{ opacity: 0, y: 48, scale: 0.86 }}
                        animate={{ opacity: 1, y: 0,  scale: 1    }}
                        exit={{    opacity: 0, y: 32, scale: 0.92  }}
                        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2"
                    >
                        <button
                            onClick={() => {
                                queryClient.invalidateQueries({ queryKey: ['jobs-page'] });
                                setShowNewJobsBanner(false);
                            }}
                            className="flex items-center gap-2.5 pl-3.5 pr-5 py-2.5 bg-gradient-to-r from-primary-light to-primary-dark rounded-full text-white text-sm font-semibold font-montserrat shadow-lg shadow-primary-light/30 whitespace-nowrap"
                        >
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-70" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                            </span>
                            {newJobsCount} new {newJobsCount !== 1 ? 'roles' : 'role'} found — view now
                        </button>
                        <button
                            onClick={() => setShowNewJobsBanner(false)}
                            aria-label="Dismiss"
                            className="w-7 h-7 rounded-full bg-white border border-neutral-dark flex items-center justify-center shrink-0 text-secondary-dark hover:text-black-light transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Find-roles Modal (manual sourcing) ──────────────────────── */}
            {isScrapeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-neutral-dark relative overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-dark">
                            <h2 className="text-lg font-bold font-montserrat text-black flex items-center gap-2">
                                <Plus className="w-4 h-4 text-primary-light" /> Find roles
                            </h2>
                            <button onClick={() => setIsScrapeModalOpen(false)} className="p-1.5 text-secondary-dark hover:bg-neutral-dark rounded-lg transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleScrape} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-2">Source</label>
                                {(() => {
                                    const SOURCES = [
                                        { key: 'linkedin',  label: 'LinkedIn',      icon: null,     premium: false, desc: 'Searches LinkedIn. Filter by location, time range, and count.' },
                                        { key: 'remote',    label: 'Remote Boards',  icon: null,     premium: false, desc: 'Searches Remotive, RemoteOK, Himalayas & WeWorkRemotely simultaneously.' },
                                        { key: 'custom',    label: 'Custom URL',    icon: null,     premium: false, desc: 'Paste any LinkedIn jobs search URL directly.' },
                                        { key: 'ats',       label: 'Auto-Finder',   icon: Link2,    premium: false, desc: 'Auto-discovers company career pages. Up to 10 roles per run.' },
                                        { key: 'yc',        label: 'Y Combinator',  icon: Sparkles, premium: true,  desc: 'Searches Work at a Startup. Up to 25 roles, with tailored CVs.' },
                                        { key: 'wellfound', label: 'Wellfound',      icon: Sparkles, premium: true,  desc: 'Searches Wellfound for startup roles. Up to 25 roles, with tailored CVs.' },
                                    ];
                                    const active = SOURCES.find(s => s.key === scrapeForm.source) || SOURCES[0];
                                    return (
                                        <div className="relative">
                                            {isScrapeSourceOpen && (
                                                <div className="fixed inset-0 z-10" onClick={() => setIsScrapeSourceOpen(false)} />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setIsScrapeSourceOpen(p => !p)}
                                                className="w-full flex items-center justify-between gap-3 px-3.5 py-3 bg-white border border-neutral-dark rounded-xl hover:border-primary-light/50 transition-all"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active.premium ? 'bg-amber-50' : 'bg-neutral'}`}>
                                                        {active.icon
                                                            ? <active.icon className={`w-3.5 h-3.5 ${active.premium ? 'text-amber-500' : 'text-secondary-dark'}`} />
                                                            : <span className="w-2 h-2 rounded-full bg-primary-light/60" />}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-xs font-bold text-black leading-none">{active.label}</p>
                                                        <p className="text-[10px] text-secondary-dark/60 mt-0.5 leading-none">{active.desc.split('.')[0]}</p>
                                                    </div>
                                                </div>
                                                <ChevronDown className={`w-4 h-4 text-secondary-dark transition-transform duration-200 ${isScrapeSourceOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isScrapeSourceOpen && (
                                                <div className="absolute top-full left-0 right-0 z-20 mt-1.5 bg-white border border-neutral-dark rounded-xl shadow-xl overflow-hidden">
                                                    {SOURCES.map((s, i) => (
                                                        <button
                                                            key={s.key}
                                                            type="button"
                                                            onClick={() => { setScrapeForm(p => ({ ...p, source: s.key })); setIsScrapeSourceOpen(false); }}
                                                            className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                                                                i < SOURCES.length - 1 ? 'border-b border-neutral-dark/60' : ''
                                                            } ${scrapeForm.source === s.key ? 'bg-primary-light/5' : 'hover:bg-neutral'}`}
                                                        >
                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                                                scrapeForm.source === s.key ? 'bg-primary-light/15' : s.premium ? 'bg-amber-50' : 'bg-neutral-dark'
                                                            }`}>
                                                                {s.icon
                                                                    ? <s.icon className={`w-3.5 h-3.5 ${scrapeForm.source === s.key ? 'text-primary-light' : s.premium ? 'text-amber-500' : 'text-secondary-dark'}`} />
                                                                    : <span className={`w-2 h-2 rounded-full ${scrapeForm.source === s.key ? 'bg-primary-light' : 'bg-secondary-dark/30'}`} />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className={`text-xs font-bold ${scrapeForm.source === s.key ? 'text-primary-dark' : 'text-black'}`}>{s.label}</span>
                                                                    {s.premium && (
                                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Premium</span>
                                                                    )}
                                                                    {scrapeForm.source === s.key && <CheckCircle className="w-3 h-3 text-primary-light ml-auto shrink-0" />}
                                                                </div>
                                                                <p className="text-[11px] text-secondary-dark/55 mt-0.5 leading-relaxed">{s.desc}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {scrapeForm.source === 'linkedin' && (<>
                                <div>
                                    <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">Keywords</label>
                                    <input
                                        type="text"
                                        value={scrapeForm.keywords}
                                        onChange={e => setScrapeForm(p => ({ ...p, keywords: e.target.value }))}
                                        placeholder="e.g. Django developer, Backend engineer"
                                        className="w-full p-2.5 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-2">
                                        Locations <span className="text-primary-light normal-case font-normal">({scrapeForm.locations.length} selected)</span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { key: 'remote', flag: '🌍', label: 'Worldwide Remote' },
                                            { key: 'us',     flag: '🇺🇸', label: 'United States' },
                                            { key: 'uk',     flag: '🇬🇧', label: 'United Kingdom' },
                                            { key: 'de',     flag: '🇩🇪', label: 'Germany' },
                                            { key: 'nl',     flag: '🇳🇱', label: 'Netherlands' },
                                            { key: 'ca',     flag: '🇨🇦', label: 'Canada' },
                                            { key: 'au',     flag: '🇦🇺', label: 'Australia' },
                                        ].map(loc => {
                                            const active = scrapeForm.locations.includes(loc.key);
                                            return (
                                                <button
                                                    key={loc.key}
                                                    type="button"
                                                    onClick={() => toggleLocation(loc.key)}
                                                    className={`rounded-xl px-3 py-2.5 text-left border transition-all flex items-center gap-2 ${active ? 'bg-primary-light/10 border-primary-light/40 text-primary-dark' : 'border-neutral-dark hover:bg-neutral text-secondary-dark'}`}
                                                >
                                                    <span className="text-base">{loc.flag}</span>
                                                    <span className="text-[11px] font-semibold leading-tight">{loc.label}</span>
                                                    {active && <CheckCircle className="w-3 h-3 text-primary-light ml-auto shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-2">Time Range</label>
                                    <div className="flex gap-2">
                                        {[
                                            { key: '24h', label: 'Last 24h' },
                                            { key: '3d',  label: 'Last 3 days' },
                                            { key: '7d',  label: 'Last 7 days' },
                                        ].map(t => (
                                            <button
                                                key={t.key}
                                                type="button"
                                                onClick={() => setScrapeForm(p => ({ ...p, time_range: t.key }))}
                                                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${scrapeForm.time_range === t.key ? 'bg-black text-white border-black' : 'border-neutral-dark text-secondary-dark hover:bg-neutral'}`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">
                                        Roles per location <span className="text-primary-light font-normal normal-case">(up to {scrapeForm.count * scrapeForm.locations.length} total)</span>
                                    </label>
                                    <input
                                        type="number" min="5" max="100"
                                        value={scrapeForm.count}
                                        onChange={e => setScrapeForm(p => ({ ...p, count: e.target.value }))}
                                        className="w-full p-2.5 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light outline-none"
                                    />
                                </div>
                            </>)}

                            {scrapeForm.source === 'remote' && (
                                <div>
                                    <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">Keywords</label>
                                    <input
                                        type="text" required
                                        value={scrapeForm.keywords}
                                        onChange={e => setScrapeForm(p => ({ ...p, keywords: e.target.value }))}
                                        placeholder="e.g. Django developer"
                                        className="w-full p-2.5 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light outline-none"
                                    />
                                    <p className="text-xs text-secondary-dark/60 mt-1.5">Searches Remotive, RemoteOK, Himalayas, and WeWorkRemotely. Roles from the last 7 days.</p>
                                </div>
                            )}

                            {scrapeForm.source === 'ats' && (<>
                                <div>
                                    <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">Job Title</label>
                                    <input
                                        type="text"
                                        value={scrapeForm.atsTitle}
                                        onChange={e => setScrapeForm(p => ({ ...p, atsTitle: e.target.value }))}
                                        placeholder="e.g. Product Manager"
                                        className="w-full p-2.5 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">Location</label>
                                    <input
                                        type="text"
                                        value={scrapeForm.atsLocation}
                                        onChange={e => setScrapeForm(p => ({ ...p, atsLocation: e.target.value }))}
                                        placeholder="e.g. Remote or New York"
                                        className="w-full p-2.5 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light outline-none"
                                    />
                                    <p className="text-xs text-secondary-dark/60 mt-1.5">Auto-discovers company career pages. Up to 10 roles per run.</p>
                                </div>
                            </>)}

                            {(scrapeForm.source === 'yc' || scrapeForm.source === 'wellfound') && (<>
                                <div>
                                    <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">Keywords</label>
                                    <input
                                        type="text" required
                                        value={scrapeForm.keywords}
                                        onChange={e => setScrapeForm(p => ({ ...p, keywords: e.target.value }))}
                                        placeholder="e.g. Full Stack Engineer, Product Manager"
                                        className="w-full p-2.5 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">Location <span className="text-secondary-dark/60 font-normal normal-case">(optional)</span></label>
                                    <input
                                        type="text"
                                        value={scrapeForm.startupLocation}
                                        onChange={e => setScrapeForm(p => ({ ...p, startupLocation: e.target.value }))}
                                        placeholder="e.g. Remote, San Francisco, New York"
                                        className="w-full p-2.5 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light outline-none"
                                    />
                                </div>
                            </>)}

                            {scrapeForm.source === 'custom' && (<>
                                <div>
                                    <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">LinkedIn Search URL</label>
                                    <input
                                        type="url" required
                                        value={scrapeForm.search_url}
                                        onChange={e => setScrapeForm(p => ({ ...p, search_url: e.target.value }))}
                                        placeholder="https://linkedin.com/jobs/search/?..."
                                        className="w-full p-2.5 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">Count</label>
                                    <input
                                        type="number" min="5" max="100"
                                        value={scrapeForm.count}
                                        onChange={e => setScrapeForm(p => ({ ...p, count: e.target.value }))}
                                        className="w-full p-2.5 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light outline-none"
                                    />
                                </div>
                            </>)}

                            <div className="pt-1">
                                <button
                                    type="submit"
                                    disabled={scrapeMutation.isPending}
                                    className="w-full bg-gradient-to-r from-primary-light to-primary-dark text-white p-3 rounded-xl font-semibold shadow-md shadow-orange-100 hover:opacity-90 transition-all disabled:opacity-70 flex justify-center items-center gap-2"
                                >
                                    {scrapeMutation.isPending
                                        ? <><ApplyDirLoader.Button variant="light" /> Starting…</>
                                        : 'Start searching'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AI Activation Drawer — CV upload to unlock match scoring */}
            <ProfileActivationDrawer
                isOpen={isActivationDrawerOpen}
                onClose={() => setIsActivationDrawerOpen(false)}
            />

            {/* CV-First Nudge — shown after sourcing when the user has no CV yet */}
            <AnimatePresence>
                {showCvNudge && (
                    <motion.div
                        initial={{ x: '110%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '110%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                        className="fixed right-0 bottom-8 z-50 w-80 bg-white rounded-l-2xl shadow-2xl border border-neutral-dark border-r-0 overflow-hidden"
                    >
                        <div className="h-1 bg-gradient-to-r from-primary-light to-primary-dark" />
                        <div className="p-5 space-y-3 relative">
                            <button
                                onClick={() => {
                                    localStorage.setItem('applydirCvNudgeSnoozeUntil', String(Date.now() + 2 * 24 * 60 * 60 * 1000));
                                    setShowCvNudge(false);
                                }}
                                className="absolute top-0 right-0 text-secondary-dark hover:text-black transition-colors"
                                aria-label="Dismiss"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-primary-light/10 flex items-center justify-center shrink-0">
                                    <Lock className="w-4 h-4 text-primary-light" />
                                </div>
                                <p className="text-sm font-bold text-black font-montserrat leading-tight pr-6">
                                    Unlock match scoring 🔓
                                </p>
                            </div>
                            <p className="text-xs text-secondary-dark leading-relaxed">
                                Upload your CV once so we can rank these roles by how well they fit you.
                            </p>
                            <button
                                onClick={() => {
                                    localStorage.setItem('applydirCvNudgeSnoozeUntil', String(Date.now() + 2 * 24 * 60 * 60 * 1000));
                                    setShowCvNudge(false);
                                    setIsActivationDrawerOpen(true);
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white text-sm font-semibold py-2.5 rounded-xl shadow-md shadow-orange-200 hover:opacity-90 transition-opacity active:scale-95"
                            >
                                Upload CV
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Auto-Scout Contextual Nudge */}
            <AnimatePresence>
                {showAutoScoutBanner && (
                    <motion.div
                        initial={{ x: '110%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '110%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                        className="fixed right-0 bottom-8 z-50 w-80 bg-white rounded-l-2xl shadow-2xl border border-neutral-dark border-r-0 overflow-hidden"
                    >
                        <div className="h-1 bg-gradient-to-r from-primary-light to-primary-dark" />
                        <div className="p-5 space-y-3 relative">
                            <button
                                onClick={() => {
                                    localStorage.setItem('applydirAutoScoutSnoozeUntil', String(Date.now() + 3 * 24 * 60 * 60 * 1000));
                                    setShowAutoScoutBanner(false);
                                }}
                                className="absolute top-0 right-0 text-secondary-dark hover:text-black transition-colors"
                                aria-label="Dismiss"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-primary-light/10 flex items-center justify-center shrink-0">
                                    <UserSearch className="w-4 h-4 text-primary-light" />
                                </div>
                                <p className="text-sm font-bold text-black font-montserrat leading-tight pr-6">
                                    Want this on autopilot? 🚀
                                </p>
                            </div>
                            <p className="text-xs text-secondary-dark leading-relaxed">
                                Let your headhunter source and rank fresh roles for you every night while you rest.
                            </p>
                            <button
                                onClick={() => {
                                    localStorage.setItem('applydirAutoScoutSnoozeUntil', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
                                    setShowAutoScoutBanner(false);
                                    navigate('/dashboard/settings');
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white text-sm font-semibold py-2.5 rounded-xl shadow-md shadow-orange-200 hover:opacity-90 transition-opacity active:scale-95"
                            >
                                Turn on Auto-Scout
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default JobsPage;

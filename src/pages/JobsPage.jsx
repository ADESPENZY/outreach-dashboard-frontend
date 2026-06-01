import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useNavigate, useSearchParams } from 'react-router';
import {
  CheckCircle, XCircle, Search, Plus, MapPin, Building, Briefcase,
  ExternalLink, Calendar, Loader2, Download, FileText, X, Kanban, UserSearch, Link2,
  Lock, Sparkles, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getJobsPage, updateJobStatus, trackJob,
  scrapeLinkedinJobs, scrapeRemoteJobs, scrapeApifyJobs, autoScrapeAts,
  scrapeYcJobs, scrapeWellfoundJobs, getScrapeStatus,
} from '../services/apiJobs';
import { getAutoScoutSettings } from '../services/apiSettings';
import { getProfile } from '../services/apiProfile';
import { generateJobCV, getJobCVJson, findContactManual } from '../services/apiOutreach';
import TailoredCVPreview from '../components/TailoredCVPreview';
import ProfileActivationDrawer from '../components/ProfileActivationDrawer';

const JobsPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // ── All state — hoisted above every hook so no const is read before initialisation (TDZ-safe) ──
    const [isScrapeActive, setIsScrapeActive]       = useState(() => localStorage.getItem('applydir_is_scraping') === 'true');
    const [filterTab, setFilterTab]                 = useState('All');
    const [currentPage, setCurrentPage]             = useState(1);
    const itemsPerPage                              = 10;
    const [searchQuery, setSearchQuery]             = useState('');
    const [isScrapeModalOpen, setIsScrapeModalOpen] = useState(false);
    const [scrapeForm, setScrapeForm] = useState({
        source: 'linkedin', keywords: '', locations: ['remote'],
        time_range: '24h', count: 25, search_url: '', atsTitle: '', atsLocation: '',
        startupLocation: '',
    });
    const [cvModal, setCvModal]                   = useState(null);
    const [loadingCvPreview, setLoadingCvPreview] = useState(null);
    const [selectedJob, setSelectedJob]           = useState(null);
    const [showModalTour, setShowModalTour]       = useState(false);
    const [showAutoScoutBanner, setShowAutoScoutBanner] = useState(false);
    const [isActivationDrawerOpen, setIsActivationDrawerOpen] = useState(false);
    const [newJobsCount, setNewJobsCount] = useState(0);
    const [showNewJobsBanner, setShowNewJobsBanner] = useState(false);
    const [isScrapeSourceOpen, setIsScrapeSourceOpen] = useState(false);

    // ── Router ────────────────────────────────────────────────────────────────
    const [searchParams] = useSearchParams();
    const isTourActive   = searchParams.get('tour') === '1';

    // ── React Query — auto-scout settings (for banner logic) ─────────────────
    const { data: autoScoutSettings } = useQuery({
        queryKey: ['auto-scout-settings'],
        queryFn: getAutoScoutSettings,
        staleTime: 5 * 60 * 1000,
    });

    // ── React Query — user profile (drives the AI activation gate) ───────────
    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: getProfile,
        staleTime: 5 * 60 * 1000,
    });

    // User has AI capabilities unlocked once they have saved CV text.
    const isActivated = !!profile?.cv_raw_text;

    // ── React Query — single-page fetch ──────────────────────────────────────
    // queryKey includes filterTab + currentPage so any change triggers exactly
    // one clean network request and nothing more.
    const { data: pageData, isLoading: loading, isFetching } = useQuery({
        queryKey: ['jobs-page', filterTab, currentPage],
        queryFn:  () => getJobsPage(currentPage, filterTab, itemsPerPage),
        refetchInterval: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 30000,
    });

    const jobs       = pageData?.jobs        ?? [];
    const totalCount = pageData?.total_count ?? 0;
    const totalPages = pageData?.total_pages ?? 1;

    // Reset to page 1 whenever the filter tab changes so users always land
    // on the first page of a new filter set.
    useEffect(() => { setCurrentPage(1); }, [filterTab]);

    // While a scrape is running, poll the job list every 8 seconds so jobs
    // appear incrementally on the page as the background thread saves them.
    useEffect(() => {
        if (!isScrapeActive) return;
        const id = setInterval(() => {
            queryClient.invalidateQueries({ queryKey: ['jobs-page'] });
        }, 8000);
        return () => clearInterval(id);
    }, [isScrapeActive, queryClient]);

    // Keep a live ref to totalCount so async lock-poll callbacks always read
    // the latest value without stale-closure issues.
    const totalCountRef = useRef(totalCount);
    useEffect(() => { totalCountRef.current = totalCount; }, [totalCount]);

    // Poll the backend lock status every 3 s while a scrape is active.
    // Only declare the scrape finished — and show the final job count —
    // once the background thread actually releases the lock, not the moment
    // the first few jobs appear (which caused the premature partial-count bug).
    useEffect(() => {
        if (!isScrapeActive) return;

        const countAtStart = parseInt(localStorage.getItem('applydir_scraping_job_count') || '0', 10);
        let done = false;

        const _clearScrapeState = () => {
            localStorage.removeItem('applydir_is_scraping');
            localStorage.removeItem('applydir_scraping_started_at');
            localStorage.removeItem('applydir_scraping_job_count');
            setIsScrapeActive(false);
        };

        const poll = async () => {
            if (done) return;
            try {
                const { is_active } = await getScrapeStatus();
                if (!is_active) {
                    done = true;
                    // One final refresh so we capture any jobs saved between
                    // the last 8-second poll and the moment the lock dropped.
                    queryClient.invalidateQueries({ queryKey: ['jobs-page'] });
                    // Wait briefly for React Query to resolve the refetch,
                    // then read the latest count from the ref.
                    setTimeout(() => {
                        const delta = totalCountRef.current - countAtStart;
                        if (delta > 0) {
                            setNewJobsCount(delta);
                            setShowNewJobsBanner(true);
                        } else {
                            toast.info(
                                'No new jobs found — they may already be in your list or try different keywords.',
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

        // 5-minute hard timeout mirrors the backend lock TTL.
        const timeoutId = setTimeout(() => {
            if (!done) { done = true; _clearScrapeState(); }
        }, 5 * 60 * 1000);

        return () => {
            done = true;
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, [isScrapeActive, queryClient]);

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, newStatus }) => updateJobStatus(id, newStatus),
        onSuccess: (_, { newStatus }) => {
            toast.success(`Job marked as ${newStatus}`);
            queryClient.invalidateQueries({ queryKey: ['jobs-page'] });
        },
        onError: () => toast.error('Failed to update status. Please try again.'),
    });

    const generateCvMutation = useMutation({
        mutationFn: async (job) => {
            const cvData = await generateJobCV(job.id);
            return { job, cvData };
        },
        onSuccess: ({ job, cvData }) => {
            setCvModal({ jobId: job.id, cvData, title: `${job.company_name} — ${job.title}` });
            toast.success('Tailored CV ready!');
            queryClient.invalidateQueries({ queryKey: ['jobs-page'] });
        },
        onError: () => toast.error('CV generation failed. Please try again.'),
    });

    const trackJobMutation = useMutation({
        mutationFn: (jobId) => trackJob(jobId),
        onSuccess: (data) => {
            if (data.already_tracked) {
                toast.info('Already in your tracker — taking you there');
            } else {
                toast.success('Added to Job Tracker!');
            }
            queryClient.invalidateQueries({ queryKey: ['jobs-page'] });
            navigate('/dashboard/job-tracker');
        },
        onError: () => toast.error('Could not add to tracker. Please try again in a moment.'),
    });

    const findContactMutation = useMutation({
        mutationFn: (jobId) => findContactManual(jobId),
        onSuccess: (data, jobId) => {
            if (data.status === 'found') {
                toast.success(`Contact found: ${data.contact?.email}`);
                queryClient.invalidateQueries({ queryKey: ['jobs-page'] });
            } else if (data.status === 'job_board') {
                toast.info('This is a job board listing — apply directly on their site.');
            } else {
                toast.warn('No contact found for this company via our discovery engine.');
            }
        },
        onError: (err) => toast.error(err.message || 'Contact search failed.'),
    });

    const scrapeMutation = useMutation({
        mutationFn: async (form) => {
            if (form.source === 'linkedin') {
                return scrapeLinkedinJobs(form);
            } else if (form.source === 'remote') {
                return scrapeRemoteJobs(form.keywords);
            } else if (form.source === 'ats') {
                return autoScrapeAts({ title: form.atsTitle, location: form.atsLocation });
            } else if (form.source === 'yc') {
                return scrapeYcJobs({ keywords: form.keywords, location: form.startupLocation });
            } else if (form.source === 'wellfound') {
                return scrapeWellfoundJobs({ keywords: form.keywords, location: form.startupLocation });
            } else {
                return scrapeApifyJobs(form);
            }
        },
        onMutate: () => {
            setIsScrapeActive(true);
            setCurrentPage(1);
            localStorage.setItem('applydir_is_scraping', 'true');
            localStorage.setItem('applydir_scraping_started_at', Date.now().toString());
            const countNow = String(pageData?.total_count ?? 0);
            localStorage.setItem('applydir_scraping_job_count', countNow);
            toast.info('Scrape initiated. This may take a few moments.');
        },
        onSuccess: (data) => {
            setIsScrapeModalOpen(false);
            // Single clean fetch the moment the server acknowledges the scrape request.
            // This hydrates the page immediately and gives the scrape-lock lifecycle
            // effect its first updated totalCount to compare against countAtStart.
            queryClient.invalidateQueries({ queryKey: ['jobs-page'] });

            if (data?.status === 'processing') {
                // 202: background thread owns the work. isScrapeActive stays true so the
                // banner remains visible. The scrape-lock lifecycle effect (keyed on
                // totalCount) will clear the banner once new jobs arrive in the database.
                toast.success('Scrape successful! Jobs are being added to your dashboard.', { autoClose: 5000 });
            } else {
                // Synchronous response path (legacy / should not occur after 202 refactor).
                setIsScrapeActive(false);
                localStorage.removeItem('applydir_is_scraping');
                localStorage.removeItem('applydir_scraping_started_at');
                localStorage.removeItem('applydir_scraping_job_count');
                const count = typeof data.new_jobs === 'object'
                    ? Object.values(data.new_jobs).reduce((a, b) => a + b, 0)
                    : data.new_jobs;
                if (count > 0) {
                    toast.success(`${count} new jobs scraped! AI is now evaluating your matches...`, { autoClose: 4000 });
                } else {
                    toast.info('No new jobs found — they may already be in your list or try different keywords.', { autoClose: 6000 });
                }
            }

            if (autoScoutSettings?.is_active === false && localStorage.getItem('applydirAutoScoutPrompted') !== 'true') {
                setShowAutoScoutBanner(true);
            }
        },
        // onSettled is the finally-equivalent: always runs after success or error.
        // Guarantees the modal closes even if onSuccess throws, so the button
        // can never get stuck regardless of the API outcome.
        onSettled: () => {
            setIsScrapeModalOpen(false);
        },
        onError: (err) => {
            setIsScrapeActive(false);
            localStorage.removeItem('applydir_is_scraping');
            localStorage.removeItem('applydir_scraping_started_at');
            localStorage.removeItem('applydir_scraping_job_count');
            toast.error('Failed to start scrape. Please try again.');
        },
    });


    const handleUpdateStatus = (id, newStatus) => updateStatusMutation.mutate({ id, newStatus });
    const handleGenerateCv = (job) => generateCvMutation.mutate(job);
    const handleTrackJob = (jobId) => trackJobMutation.mutate(jobId);

    const handleViewCv = async (job) => {
        setLoadingCvPreview(job.id);
        try {
            const cvData = await getJobCVJson(job.id);
            setCvModal({ jobId: job.id, cvData, title: `${job.company_name} — ${job.title}` });
        } catch {
            toast.error('Could not load CV preview. Please try again.');
        } finally {
            setLoadingCvPreview(null);
        }
    };

    const handleCloseCvModal = () => setCvModal(null);

    const toggleLocation = (loc) => {
        setScrapeForm(prev => {
            const has = prev.locations.includes(loc);
            return { ...prev, locations: has ? prev.locations.filter(l => l !== loc) : [...prev.locations, loc] };
        });
    };

    const handleScrape = (e) => {
        e.preventDefault();
        if (scrapeForm.source === 'linkedin' && scrapeForm.locations.length === 0) {
            toast.error('Select at least one location');
            return;
        }
        if (scrapeForm.source === 'remote' && !scrapeForm.keywords.trim()) {
            toast.error('Keywords are required');
            return;
        }
        if (scrapeForm.source === 'ats') {
            if (!scrapeForm.atsTitle.trim()) {
                toast.error('Job title is required');
                return;
            }
            if (!scrapeForm.atsLocation.trim()) {
                toast.error('Location is required');
                return;
            }
        }
        if ((scrapeForm.source === 'yc' || scrapeForm.source === 'wellfound') && !scrapeForm.keywords.trim()) {
            toast.error('Keywords are required');
            return;
        }
        scrapeMutation.mutate(scrapeForm);
    };

    // ── Derived data ──────────────────────────────────────────────────────────
    // Status is now filtered server-side via the queryKey; only search is client-side.
    const filteredJobs = searchQuery
        ? jobs.filter(job => {
            const q = searchQuery.toLowerCase();
            return job.company_name?.toLowerCase().includes(q) || job.title?.toLowerCase().includes(q);
        })
        : jobs;

    const getScoreBadgeColor = (score) => {
        if (score == null) return 'bg-neutral-dark text-secondary-dark border-neutral-dark';
        if (score >= 80) return 'bg-green-100 text-green-700 border-green-200';
        if (score >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-red-100 text-red-700 border-red-200';
    };

    const getStatusDotColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved':  return 'bg-emerald-500';
            case 'rejected':  return 'bg-red-400';
            case 'outreach_automated': return 'bg-teal-500';
            default:          return 'bg-gray-300';
        }
    };

    // When on the Approved tab, totalCount IS the approved count (server-filtered).
    // On other tabs, fall back to counting the visible page slice.
    const approvedCount = filterTab === 'Approved'
        ? totalCount
        : jobs.filter(j => j.status === 'approved').length;

    const isScrapingInProgress = scrapeMutation.isPending || isScrapeActive;
    // Show the loading banner only before any jobs have arrived for this user.
    const showScrapingBanner = isScrapingInProgress && totalCount === 0 && jobs.length === 0;


    // Auto-open modal and activate tour step 1 on mount when tour param is present
    useEffect(() => {
        if (isTourActive) {
            setIsScrapeModalOpen(true);
            setShowModalTour(true);
        }
    }, [isTourActive]);

    const completeTour = () => {
        localStorage.setItem('applydirTourDone', 'true');
        setShowModalTour(false);
        navigate('/dashboard/jobs', { replace: true });
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto space-y-6 animate-fade-in font-roboto">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-black to-secondary-dark font-montserrat">
                        Job Opportunities
                    </h1>
                    <p className="text-sm text-secondary-dark mt-1">Manage, filter, and score scraped job listings</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                        onClick={() => !showScrapingBanner && setIsScrapeModalOpen(true)}
                        disabled={showScrapingBanner}
                        className="flex items-center gap-2 bg-gradient-to-r hover:bg-gradient-to-br from-primary-light to-primary-dark text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-orange-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                        {showScrapingBanner
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Scraping...</>
                            : <><Plus className="w-4 h-4" /> Scrape New Jobs</>
                        }
                    </button>
                </div>
            </div>

            {approvedCount > 0 && (
                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 px-5 py-3.5 rounded-2xl">
                    <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                    <div>
                        <p className="text-sm font-semibold text-emerald-800">{approvedCount} approved jobs ready</p>
                        <p className="text-xs text-emerald-600 mt-0.5">Go to <button onClick={() => navigate('/dashboard/outreach')} className="underline font-semibold">Outreach</button> to find contacts and generate emails.</p>
                    </div>
                </div>
            )}

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-dark flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex overflow-x-auto space-x-2 w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
                    {['All', 'Scraped', 'Approved', 'Rejected', 'Outreach Automated'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilterTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                filterTab === tab
                                ? 'bg-primary-light/10 text-primary-dark shadow-sm border border-primary-light/20'
                                : 'text-secondary-dark hover:bg-neutral border border-transparent hover:border-neutral-dark'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-dark/60 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search company or role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/50 focus:border-primary-light transition-all outline-none text-secondary-dark"
                    />
                </div>
            </div>

            {/* ── New jobs arrival pill — fixed center-bottom, Render-style ───────
                 Rendered outside the page flow via fixed positioning so it floats
                 above all content without shifting the layout.                    ── */}
            <AnimatePresence>
                {showNewJobsBanner && (
                    <motion.div
                        key="new-jobs-pill"
                        initial={{ opacity: 0, y: 48, scale: 0.86 }}
                        animate={{ opacity: 1, y: 0,  scale: 1    }}
                        exit={{    opacity: 0, y: 32, scale: 0.92  }}
                        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 pointer-events-auto"
                    >
                        {/* Main pill */}
                        <motion.button
                            onClick={() => {
                                setFilterTab('All');
                                setCurrentPage(1);
                                setShowNewJobsBanner(false);
                            }}
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.96 }}
                            animate={{
                                boxShadow: [
                                    '0 0 0px rgba(52,211,153,0)',
                                    '0 0 22px rgba(52,211,153,0.40)',
                                    '0 0 0px rgba(52,211,153,0)',
                                ],
                            }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                            className="flex items-center gap-2.5 pl-3.5 pr-5 py-2.5
                                       bg-[#08111f]
                                       border-2 border-dashed border-emerald-400/65
                                       rounded-full
                                       text-emerald-300 text-sm font-semibold font-montserrat
                                       whitespace-nowrap cursor-pointer select-none
                                       hover:border-emerald-300/90 hover:text-white
                                       transition-colors duration-150"
                        >
                            {/* Pulsing live dot */}
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                            </span>
                            <Sparkles className="w-3.5 h-3.5 shrink-0 opacity-80" />
                            <span>
                                {newJobsCount} new job{newJobsCount !== 1 ? 's' : ''} &mdash; view scraped jobs
                            </span>
                        </motion.button>

                        {/* Separate dismiss pill */}
                        <button
                            onClick={() => setShowNewJobsBanner(false)}
                            aria-label="Dismiss"
                            className="w-7 h-7 rounded-full bg-[#08111f] border border-white/10
                                       flex items-center justify-center shrink-0
                                       text-white/25 hover:text-white/65 hover:border-white/25
                                       transition-all duration-150"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Auto-Scout live status banner ──────────────────────────────────── */}
            <AnimatePresence>
                {showScrapingBanner && (
                    <motion.div
                        key="scout-banner"
                        initial={{ opacity: 0, y: -14, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0,  scale: 1    }}
                        exit={{    opacity: 0, y: -14, scale: 0.97 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="relative overflow-hidden bg-gradient-to-r from-[#0F172A] to-[#1a2744] border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-xl"
                    >
                        {/* Sweeping background glow */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-primary-light/10 via-primary-light/5 to-transparent pointer-events-none"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                        />

                        {/* Spinner icon */}
                        <div className="relative z-10 w-9 h-9 rounded-xl bg-primary-light/15 border border-primary-light/30 flex items-center justify-center shrink-0">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                            >
                                <Loader2 className="w-4 h-4 text-primary-light" />
                            </motion.div>
                        </div>

                        {/* Copy */}
                        <div className="relative z-10 min-w-0 flex-1">
                            <p className="text-white font-bold text-sm font-montserrat leading-snug">
                                Auto-Scout is hunting for roles...
                            </p>
                            <p className="text-white/50 text-xs mt-0.5 font-roboto">
                                AI evaluation will follow shortly — new matches will stream in below
                            </p>
                        </div>

                        {/* Pulsing dots */}
                        <div className="relative z-10 flex items-center gap-1.5 shrink-0">
                            {[0, 0.18, 0.36].map((delay, i) => (
                                <motion.span
                                    key={i}
                                    className="block w-1.5 h-1.5 rounded-full bg-primary-light"
                                    animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.15, 0.8] }}
                                    transition={{ duration: 1.2, repeat: Infinity, delay, ease: 'easeInOut' }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Card List ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                {loading ? (
                    [0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="w-full bg-white border border-neutral-dark rounded-xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 animate-pulse">
                            {/* Left: icon + title/company bars */}
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className="h-10 w-10 rounded-xl bg-gray-200 shrink-0" />
                                <div className="flex-1 min-w-0 space-y-2 pt-0.5">
                                    <div className="h-5 w-48 rounded bg-gray-200" />
                                    <div className="h-3 w-32 rounded bg-gray-200" />
                                </div>
                            </div>
                            {/* Middle: badge pills */}
                            <div className="flex md:flex-col items-center md:items-start gap-2 shrink-0">
                                <div className="w-16 h-6 rounded-md bg-gray-200" />
                                <div className="w-16 h-6 rounded-md bg-gray-200" />
                            </div>
                            {/* Right: button shape */}
                            <div className="hidden md:block w-24 h-8 rounded-lg bg-gray-200 shrink-0" />
                        </div>
                    ))
                ) : filteredJobs.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-xl border border-neutral-dark">
                        <Briefcase className="w-12 h-12 mx-auto text-secondary-dark/40 mb-3" />
                        <p className="text-base font-medium text-secondary-dark">No jobs found</p>
                        <p className="text-sm mt-1 text-secondary-dark">Try adjusting your filters or scrape new ones.</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout" initial={false}>
                    {filteredJobs.map(job => (
                        <motion.div
                            key={job.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0  }}
                            exit={{    opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full bg-white border border-neutral-dark rounded-xl p-4 md:p-5 hover:shadow-lg hover:border-primary-light/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6"
                        >
                            {/* Left: Icon + Title + Company */}
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className="h-10 w-10 min-w-[2.5rem] rounded-xl bg-gradient-to-tr from-accent-teal/10 to-accent-teal/20 flex items-center justify-center border border-accent-teal/30 mt-0.5 shadow-sm shrink-0">
                                    <Building className="w-4 h-4 text-accent-teal" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <button
                                        onClick={() => setSelectedJob(job)}
                                        className="text-left font-bold text-black hover:text-primary-light transition-colors truncate w-full text-base md:text-lg block"
                                    >
                                        {job.title}
                                    </button>
                                    <p className="truncate w-full text-sm text-secondary-dark font-medium mt-0.5">{job.company_name}</p>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        {job.location && (
                                            <span className="flex items-center gap-1 text-xs text-secondary-dark/70">
                                                <MapPin className="w-3 h-3 shrink-0" />
                                                <span className="truncate max-w-[180px]">{job.location}</span>
                                            </span>
                                        )}
                                        <span className="text-[10px] uppercase bg-neutral-dark px-1.5 py-0.5 rounded text-secondary-dark font-medium">{job.source}</span>
                                        {job.posted_at && (
                                            <span className="flex items-center gap-1 text-xs text-secondary-dark/60">
                                                <Calendar className="w-3 h-3 shrink-0" />
                                                {new Date(job.posted_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Middle: AI Match badge + status dot */}
                            <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-2 shrink-0">
                                {isActivated ? (
                                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold font-montserrat border flex items-center gap-1.5 shadow-sm ${getScoreBadgeColor(job.fit_score)}`}>
                                        <span>AI Match:</span>
                                        <span>{job.fit_score != null ? job.fit_score : '—'}</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsActivationDrawerOpen(true)}
                                        className="px-2.5 py-1 rounded-lg text-xs font-bold font-montserrat border flex items-center gap-1.5 shadow-sm bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 transition-colors"
                                    >
                                        <Lock className="w-3 h-3 shrink-0" />
                                        <span>AI Score Locked</span>
                                    </button>
                                )}
                                <span className="flex items-center gap-1.5 text-xs text-secondary-dark">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${getStatusDotColor(job.status)}`} />
                                    {job.status ? job.status.charAt(0).toUpperCase() + job.status.slice(1) : 'Scraped'}
                                    {job.has_contact && ' • Contact Found'}
                                </span>
                                {job.salary_info && (
                                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                        {job.salary_info}
                                    </span>
                                )}
                            </div>

                            {/* Right: Decluttered actions */}
                            <div className="flex items-center gap-2 shrink-0 flex-wrap md:flex-nowrap">
                                {/* Not yet decided: approve + reject only */}
                                {job.status !== 'approved' && job.status !== 'rejected' && (() => {
                                    const pendingThisJob = updateStatusMutation.isPending && updateStatusMutation.variables?.id === job.id;
                                    const approvePending = pendingThisJob && updateStatusMutation.variables?.newStatus === 'approved';
                                    const rejectPending  = pendingThisJob && updateStatusMutation.variables?.newStatus === 'rejected';
                                    return (<>
                                        <button
                                            onClick={() => handleUpdateStatus(job.id, 'approved')}
                                            disabled={pendingThisJob}
                                            className="w-9 h-9 rounded-full flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-500 hover:text-white transition-all shadow-sm border border-green-100 hover:border-green-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                            title="Approve"
                                        >
                                            {approvePending
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <CheckCircle className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(job.id, 'rejected')}
                                            disabled={pendingThisJob}
                                            className="w-9 h-9 rounded-full flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100 hover:border-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                            title="Reject"
                                        >
                                            {rejectPending
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <XCircle className="w-4 h-4" />}
                                        </button>
                                    </>);
                                })()}

                                {/* Approved: primary CV action — gated on AI activation */}
                                {job.status === 'approved' && (
                                    isActivated ? (
                                        job.has_cv ? (
                                            <button
                                                onClick={() => handleViewCv(job)}
                                                disabled={loadingCvPreview === job.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 text-xs font-semibold rounded-lg hover:bg-violet-100 transition-all disabled:opacity-60"
                                            >
                                                {loadingCvPreview === job.id
                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                    : <FileText className="w-3 h-3" />}
                                                View CV
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleGenerateCv(job)}
                                                disabled={generateCvMutation.isPending && generateCvMutation.variables?.id === job.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-light to-primary-dark text-white text-xs font-semibold rounded-lg shadow-sm hover:opacity-90 transition-all disabled:opacity-60"
                                            >
                                                {generateCvMutation.isPending && generateCvMutation.variables?.id === job.id
                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                    : <Download className="w-3 h-3" />}
                                                {generateCvMutation.isPending && generateCvMutation.variables?.id === job.id ? 'Generating...' : 'Gen CV'}
                                            </button>
                                        )
                                    ) : (
                                        <button
                                            onClick={() => setIsActivationDrawerOpen(true)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-light to-primary-dark text-white text-xs font-semibold rounded-lg shadow-sm shadow-orange-200 hover:opacity-90 transition-all active:scale-95"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            Unlock AI Score &amp; CV
                                        </button>
                                    )
                                )}

                                {/* Desktop: More Details link */}
                                <button
                                    onClick={() => setSelectedJob(job)}
                                    className="hidden md:flex items-center text-xs font-semibold text-secondary-dark hover:text-primary-light transition-colors whitespace-nowrap"
                                >
                                    More Details &rarr;
                                </button>

                                {/* Mobile: tap job title or More Details */}
                                <button
                                    onClick={() => setSelectedJob(job)}
                                    className="md:hidden flex items-center text-xs font-semibold text-secondary-dark hover:text-primary-light transition-colors"
                                >
                                    Details &rarr;
                                </button>
                            </div>
                        </motion.div>
                    ))}
                    </AnimatePresence>
                )}
            </div>

            {/* ── Pagination controls ──────────────────────────────────────────── */}
            {!loading && totalCount > 0 && (
                <div className="flex items-center justify-between pt-2 pb-1">
                    {/* Summary */}
                    <p className="text-xs text-secondary-dark/60 font-roboto select-none">
                        {totalCount} job{totalCount !== 1 ? 's' : ''} &nbsp;·&nbsp; page {currentPage} of {totalPages}
                    </p>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage <= 1 || isFetching}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-dark text-secondary-dark hover:bg-neutral hover:border-secondary-dark/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                        >
                            ← Prev
                        </button>

                        {/* Page number pills */}
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(n => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
                                .reduce((acc, n, idx, arr) => {
                                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push('...');
                                    acc.push(n);
                                    return acc;
                                }, [])
                                .map((item, idx) =>
                                    item === '...'
                                        ? <span key={`gap-${idx}`} className="px-1 text-xs text-secondary-dark/40 select-none">…</span>
                                        : <button
                                            key={item}
                                            onClick={() => setCurrentPage(item)}
                                            disabled={isFetching}
                                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed ${
                                                item === currentPage
                                                    ? 'bg-gradient-to-r from-primary-light to-primary-dark text-white shadow-sm shadow-orange-200'
                                                    : 'text-secondary-dark hover:bg-neutral border border-neutral-dark'
                                            }`}
                                        >
                                            {item}
                                        </button>
                                )
                            }
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages || isFetching}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-dark text-secondary-dark hover:bg-neutral hover:border-secondary-dark/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                        >
                            Next →
                        </button>
                    </div>

                    {/* Fetching indicator */}
                    {isFetching && !loading && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-light shrink-0" />
                    )}
                </div>
            )}

            {/* Scrape Modal */}
            {isScrapeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-neutral-dark relative slide-in-bottom overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-dark">
                            <h2 className="text-lg font-bold font-montserrat text-black flex items-center gap-2">
                                <Plus className="w-4 h-4 text-primary-light" /> Scrape New Jobs
                            </h2>
                            <button onClick={() => setIsScrapeModalOpen(false)} className="p-1.5 text-secondary-dark hover:bg-neutral-dark rounded-lg transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleScrape} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-2">Source</label>

                                {/* Step 2 Tour Tooltip — inline above source tabs */}
                                <AnimatePresence>
                                    {showModalTour && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            transition={{ duration: 0.2, ease: 'easeOut' }}
                                            className="relative bg-gray-900 text-white rounded-xl p-4 mb-3 border border-white/10"
                                        >
                                            {/* Downward caret pointing at tabs below */}
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-l-transparent border-r-transparent border-t-gray-900" />
                                            <p className="text-[11px] font-bold text-primary-light uppercase tracking-wider mb-1.5">
                                                Step 2 of 2 · Tour
                                            </p>
                                            <p className="text-sm leading-relaxed text-white/85 mb-3">
                                                Choose your source stream, enter your target title, and let the AI score matching roles live! You're ready to hunt.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={completeTour}
                                                className="w-full py-2 bg-gradient-to-r from-primary-light to-primary-dark text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                                            >
                                                Got it! — Start Hunting
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {(() => {
                                    const SOURCES = [
                                        { key: 'linkedin',  label: 'LinkedIn',      icon: null,     premium: false, desc: 'Searches LinkedIn via Apify. Filter by location, time range, and count.' },
                                        { key: 'remote',    label: 'Remote Boards',  icon: null,     premium: false, desc: 'Searches Remotive, RemoteOK, Himalayas & WeWorkRemotely simultaneously.' },
                                        { key: 'custom',    label: 'Custom URL',    icon: null,     premium: false, desc: 'Paste any LinkedIn jobs search URL directly.' },
                                        { key: 'ats',       label: 'Auto-Finder',   icon: Link2,    premium: false, desc: 'Auto-discovers Greenhouse & Lever pages via Google. Up to 10 jobs scored by AI.' },
                                        { key: 'yc',        label: 'Y Combinator',  icon: Sparkles, premium: true,  desc: 'Scrapes Work at a Startup (workatastartup.com). Up to 25 jobs — AI scores & tailors your CV.' },
                                        { key: 'wellfound', label: 'Wellfound',      icon: Sparkles, premium: true,  desc: 'Scrapes Wellfound (AngelList Talent). Up to 25 startup jobs — AI scores & tailors your CV.' },
                                    ];
                                    const active = SOURCES.find(s => s.key === scrapeForm.source) || SOURCES[0];
                                    return (
                                        <div className="relative">
                                            {/* Backdrop — closes dropdown when clicking outside */}
                                            {isScrapeSourceOpen && (
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setIsScrapeSourceOpen(false)}
                                                />
                                            )}

                                            {/* Trigger button */}
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
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className="text-[10px] text-secondary-dark/50 hidden sm:block">6 sources</span>
                                                    <ChevronDown className={`w-4 h-4 text-secondary-dark transition-transform duration-200 ${isScrapeSourceOpen ? 'rotate-180' : ''}`} />
                                                </div>
                                            </button>

                                            {/* Dropdown list */}
                                            {isScrapeSourceOpen && (
                                                <div className="absolute top-full left-0 right-0 z-20 mt-1.5 bg-white border border-neutral-dark rounded-xl shadow-xl overflow-hidden">
                                                    {SOURCES.map((s, i) => (
                                                        <button
                                                            key={s.key}
                                                            type="button"
                                                            onClick={() => {
                                                                setScrapeForm(p => ({ ...p, source: s.key }));
                                                                setIsScrapeSourceOpen(false);
                                                            }}
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
                                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                                                            Premium
                                                                        </span>
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
                                        Jobs per location <span className="text-primary-light font-normal normal-case">({scrapeForm.count} × {scrapeForm.locations.length} location{scrapeForm.locations.length !== 1 ? 's' : ''} = up to {scrapeForm.count * scrapeForm.locations.length} total)</span>
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
                                    <p className="text-xs text-secondary-dark/60 mt-1.5">Searches Remotive, RemoteOK, Himalayas, and WeWorkRemotely simultaneously. Jobs from last 7 days.</p>
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
                                    <p className="text-xs text-secondary-dark/60 mt-1.5">
                                        Searches Greenhouse &amp; Lever automatically via Google. Up to 10 jobs found, scraped, and scored by AI. Daily limit: 50 jobs.
                                    </p>
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
                                    <p className="text-xs text-secondary-dark/60 mt-1.5">
                                        {scrapeForm.source === 'yc'
                                            ? 'Searches Y Combinator\'s Work at a Startup. Up to 25 jobs scored and CV-tailored by AI.'
                                            : 'Searches Wellfound (AngelList Talent) for startup roles. Up to 25 jobs scored and CV-tailored by AI.'}
                                    </p>
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
                                    <p className="text-xs text-secondary-dark/60 mt-1.5">Paste any LinkedIn jobs search URL directly.</p>
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
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting scrape...</>
                                        : 'Start Scrape'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Unified Details Modal (bottom-sheet mobile / centered popup desktop) ── */}
            {selectedJob && (
                <div
                    className="fixed inset-0 z-[70] bg-black/50 md:flex md:justify-center"
                    onClick={() => setSelectedJob(null)}
                >
                    <div
                        className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl p-6 shadow-2xl md:relative md:bottom-auto md:inset-x-auto md:rounded-2xl md:max-w-md md:w-full md:mx-auto md:mt-20 md:h-fit"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Sheet handle (mobile only) */}
                        <div className="w-10 h-1 rounded-full bg-neutral-dark mx-auto mb-5 md:hidden" />

                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-5">
                            <div className="flex items-start gap-3 min-w-0">
                                <div className="h-10 w-10 min-w-[2.5rem] rounded-xl bg-gradient-to-tr from-accent-teal/10 to-accent-teal/20 flex items-center justify-center border border-accent-teal/30 shadow-sm shrink-0">
                                    <Building className="w-4 h-4 text-accent-teal" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-black font-montserrat leading-tight truncate">{selectedJob.title}</p>
                                    <p className="text-sm text-secondary-dark mt-0.5 truncate">{selectedJob.company_name}</p>
                                    {selectedJob.location && (
                                        <p className="flex items-center gap-1 text-xs text-secondary-dark/70 mt-0.5">
                                            <MapPin className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{selectedJob.location}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setSelectedJob(null)} className="p-1.5 text-secondary-dark hover:bg-neutral-dark rounded-lg transition-colors shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Action rows */}
                        <div className="divide-y divide-neutral border border-neutral-dark rounded-2xl overflow-hidden">

                            {/* Approve */}
                            <button
                                onClick={() => { handleUpdateStatus(selectedJob.id, 'approved'); setSelectedJob(null); }}
                                disabled={updateStatusMutation.isPending && updateStatusMutation.variables?.id === selectedJob.id}
                                className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-green-700 hover:bg-green-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {updateStatusMutation.isPending && updateStatusMutation.variables?.id === selectedJob.id && updateStatusMutation.variables?.newStatus === 'approved'
                                    ? <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                                    : <CheckCircle className="w-5 h-5 shrink-0" />}
                                Approve Job
                            </button>

                            {/* Reject */}
                            <button
                                onClick={() => { handleUpdateStatus(selectedJob.id, 'rejected'); setSelectedJob(null); }}
                                disabled={updateStatusMutation.isPending && updateStatusMutation.variables?.id === selectedJob.id}
                                className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {updateStatusMutation.isPending && updateStatusMutation.variables?.id === selectedJob.id && updateStatusMutation.variables?.newStatus === 'rejected'
                                    ? <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                                    : <XCircle className="w-5 h-5 shrink-0" />}
                                Reject Job
                            </button>

                            {/* Generate CV / Preview CV — approved only, gated on AI activation */}
                            {selectedJob.status === 'approved' && (
                                isActivated ? (<>
                                    <button
                                        onClick={() => { handleGenerateCv(selectedJob); setSelectedJob(null); }}
                                        disabled={generateCvMutation.isPending && generateCvMutation.variables?.id === selectedJob.id}
                                        className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-primary-dark hover:bg-primary-light/5 transition-colors disabled:opacity-60"
                                    >
                                        {generateCvMutation.isPending && generateCvMutation.variables?.id === selectedJob.id
                                            ? <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                                            : <Download className="w-5 h-5 shrink-0" />}
                                        Generate Tailored CV
                                    </button>
                                    {selectedJob.has_cv && (
                                        <button
                                            onClick={() => { handleViewCv(selectedJob); setSelectedJob(null); }}
                                            disabled={loadingCvPreview === selectedJob.id}
                                            className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-violet-700 hover:bg-violet-50 transition-colors disabled:opacity-60"
                                        >
                                            {loadingCvPreview === selectedJob.id
                                                ? <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                                                : <FileText className="w-5 h-5 shrink-0" />}
                                            Preview CV
                                        </button>
                                    )}
                                </>) : (
                                    <button
                                        onClick={() => { setSelectedJob(null); setIsActivationDrawerOpen(true); }}
                                        className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-primary-dark hover:bg-primary-light/5 transition-colors"
                                    >
                                        <Sparkles className="w-5 h-5 shrink-0 text-primary-light" />
                                        Unlock AI Score &amp; Tailored CV
                                    </button>
                                )
                            )}

                            {/* Find Contact — approved + no contact */}
                            {selectedJob.status === 'approved' && !selectedJob.has_contact && (
                                <button
                                    onClick={() => { findContactMutation.mutate(selectedJob.id); setSelectedJob(null); }}
                                    disabled={findContactMutation.isPending && findContactMutation.variables === selectedJob.id}
                                    className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-sky-700 hover:bg-sky-50 transition-colors disabled:opacity-60"
                                >
                                    {findContactMutation.isPending && findContactMutation.variables === selectedJob.id
                                        ? <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                                        : <UserSearch className="w-5 h-5 shrink-0" />}
                                    Find Contact
                                </button>
                            )}

                            {/* Track — approved + not yet tracked */}
                            {selectedJob.status === 'approved' && !selectedJob.is_tracked && (
                                <button
                                    onClick={() => { handleTrackJob(selectedJob.id); setSelectedJob(null); }}
                                    disabled={trackJobMutation.isPending && trackJobMutation.variables === selectedJob.id}
                                    className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-secondary-dark hover:bg-neutral transition-colors disabled:opacity-60"
                                >
                                    {trackJobMutation.isPending && trackJobMutation.variables === selectedJob.id
                                        ? <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                                        : <Kanban className="w-5 h-5 shrink-0" />}
                                    Add to Tracker
                                </button>
                            )}

                            {/* View tracked — already tracked */}
                            {selectedJob.is_tracked && (
                                <button
                                    onClick={() => { navigate('/dashboard/job-tracker'); setSelectedJob(null); }}
                                    className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                                >
                                    <CheckCircle className="w-5 h-5 shrink-0" />
                                    View in Tracker
                                </button>
                            )}

                            {/* View job post */}
                            {selectedJob.apply_url && (
                                <a
                                    href={selectedJob.apply_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setSelectedJob(null)}
                                    className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-secondary-dark hover:bg-neutral transition-colors"
                                >
                                    <ExternalLink className="w-5 h-5 shrink-0" />
                                    View Job Post
                                </a>
                            )}
                        </div>

                        {/* Cancel */}
                        <button
                            onClick={() => setSelectedJob(null)}
                            className="w-full mt-3 py-3 text-sm font-semibold text-secondary-dark bg-neutral rounded-2xl border border-neutral-dark"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* CV Preview Modal */}
            {cvModal && (
                <TailoredCVPreview
                    jobId={cvModal.jobId}
                    data={cvModal.cvData}
                    onClose={handleCloseCvModal}
                />
            )}

            {/* AI Activation Drawer — slides in from right when user taps a locked element */}
            <ProfileActivationDrawer
                isOpen={isActivationDrawerOpen}
                onClose={() => setIsActivationDrawerOpen(false)}
            />

            {/* Auto-Scout Contextual Banner */}
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
                        <div className="p-5 space-y-3">
                            <button
                                onClick={() => {
                                    localStorage.setItem('applydirAutoScoutPrompted', 'true');
                                    setShowAutoScoutBanner(false);
                                }}
                                className="absolute top-3 right-3 text-secondary-dark hover:text-black transition-colors"
                                aria-label="Dismiss"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-primary-light/10 flex items-center justify-center shrink-0">
                                    <UserSearch className="w-4 h-4 text-primary-light" />
                                </div>
                                <p className="text-sm font-bold text-black font-montserrat leading-tight pr-6">
                                    Want this done automatically? 🚀
                                </p>
                            </div>
                            <p className="text-xs text-secondary-dark leading-relaxed">
                                Activate Auto-Scout to let our system hunt, grade, and tailor resumes for up to <span className="font-semibold text-black">25 jobs every night</span> while you rest.
                            </p>
                            <button
                                onClick={() => {
                                    localStorage.setItem('applydirAutoScoutPrompted', 'true');
                                    setShowAutoScoutBanner(false);
                                    navigate('/dashboard/auto-scout');
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white text-sm font-semibold py-2.5 rounded-xl shadow-md shadow-orange-200 hover:opacity-90 transition-opacity active:scale-95"
                            >
                                Configure Auto-Scout
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default JobsPage;

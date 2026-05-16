import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router';
import {
  CheckCircle, XCircle, Search, Play, Plus, MapPin, Building, Briefcase,
  ExternalLink, Calendar, Loader2, Download, FileText, X, Kanban, UserSearch, Link2
} from 'lucide-react';
import {
  getScrapedJobs, scoreAllJobs, updateJobStatus, trackJob,
  scrapeLinkedinJobs, scrapeRemoteJobs, scrapeApifyJobs, autoScrapeAts,
} from '../services/apiJobs';
import { generateJobCV, getJobCV, findContactManual } from '../services/apiOutreach';

const JobsPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // ── React Query ───────────────────────────────────────────────────────────
    const { data: jobs = [], isLoading: loading } = useQuery({
        queryKey: ['jobs'],
        queryFn: getScrapedJobs,
    });

    const scoreAllMutation = useMutation({
        mutationFn: scoreAllJobs,
        onSuccess: (data) => {
            if (data.approved > 0) {
                toast.success(`AI Scoring Complete! ${data.approved} approved, ${data.rejected} rejected.`, { autoClose: 6000 });
            } else {
                toast.info(`Scoring complete — ${data.rejected} jobs rejected. Try scraping with different keywords.`, { autoClose: 6000 });
            }
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        },
        onError: () => toast.error('Scoring failed. Please try again.'),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, newStatus }) => updateJobStatus(id, newStatus),
        onSuccess: (_, { id, newStatus }) => {
            toast.success(`Job marked as ${newStatus}`);
            queryClient.setQueryData(['jobs'], old => old.map(job => job.id === id ? { ...job, status: newStatus } : job));
        },
        onError: () => toast.error('Failed to update status. Please try again.'),
    });

    const generateCvMutation = useMutation({
        mutationFn: async (jobId) => {
            const blob = await generateJobCV(jobId);
            return { jobId, blob };
        },
        onSuccess: ({ jobId, blob }) => {
            const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `tailored_cv_${jobId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Tailored CV downloaded!');
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        },
        onError: () => toast.error('CV generation failed. Please try again.'),
    });

    const trackJobMutation = useMutation({
        mutationFn: (jobId) => trackJob(jobId),
        onSuccess: (data, jobId) => {
            if (data.already_tracked) {
                toast.info('Already in your tracker — taking you there');
            } else {
                toast.success('Added to Job Tracker!');
            }
            queryClient.setQueryData(['jobs'], old => old.map(j => j.id === jobId ? { ...j, is_tracked: true } : j));
            navigate('/dashboard/job-tracker');
        },
        onError: () => toast.error('Could not add to tracker. Please try again in a moment.'),
    });

    const findContactMutation = useMutation({
        mutationFn: (jobId) => findContactManual(jobId),
        onSuccess: (data, jobId) => {
            if (data.status === 'found') {
                toast.success(`Contact found: ${data.contact?.email}`);
                queryClient.invalidateQueries({ queryKey: ['jobs'] });
            } else if (data.status === 'job_board') {
                toast.info('This is a job board listing — apply directly on their site.');
            } else {
                toast.warn('No contact found for this company on Hunter.io.');
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
            } else {
                return scrapeApifyJobs(form);
            }
        },
        onSuccess: (data) => {
            const count = typeof data.new_jobs === 'object'
                ? Object.values(data.new_jobs).reduce((a, b) => a + b, 0)
                : data.new_jobs;
            if (count > 0) {
                toast.success(`${count} new jobs scraped! AI is now evaluating your matches...`, { autoClose: 4000 });
                scoreAllMutation.mutate();
            } else {
                toast.info('No new jobs found — they may already be in your list or try different keywords.', { autoClose: 6000 });
            }
            setIsScrapeModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        },
        onError: (err) => toast.error(err.message || 'Scraping failed. Please try again.'),
    });

    // ── UI state ──────────────────────────────────────────────────────────────
    const [filterTab, setFilterTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [isScrapeModalOpen, setIsScrapeModalOpen] = useState(false);
    const [scrapeForm, setScrapeForm] = useState({
        source: 'linkedin', keywords: '', locations: ['remote'],
        time_range: '24h', count: 25, search_url: '', atsTitle: '', atsLocation: '',
    });
    const [cvModal, setCvModal] = useState(null);
    const [loadingCvPreview, setLoadingCvPreview] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const handleScoreAll = () => scoreAllMutation.mutate();
    const handleUpdateStatus = (id, newStatus) => updateStatusMutation.mutate({ id, newStatus });
    const handleGenerateCv = (jobId) => generateCvMutation.mutate(jobId);
    const handleTrackJob = (jobId) => trackJobMutation.mutate(jobId);

    const handleViewCv = async (job) => {
        setLoadingCvPreview(job.id);
        try {
            const blob = await getJobCV(job.id);
            const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            setCvModal({ jobId: job.id, blobUrl, title: `${job.company_name} — ${job.title}` });
        } catch {
            toast.error('Could not load CV preview. Please try again.');
        } finally {
            setLoadingCvPreview(null);
        }
    };

    const handleCloseCvModal = () => {
        if (cvModal?.blobUrl) window.URL.revokeObjectURL(cvModal.blobUrl);
        setCvModal(null);
    };

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
        scrapeMutation.mutate(scrapeForm);
    };

    // ── Derived data ──────────────────────────────────────────────────────────
    const filteredJobs = jobs.filter(job => {
        if (filterTab !== 'All' && job.status?.toLowerCase() !== filterTab.toLowerCase().replace(/ /g, '_')) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const companyMatch = job.company_name?.toLowerCase().includes(query);
            const roleMatch = job.title?.toLowerCase().includes(query);
            if (!companyMatch && !roleMatch) return false;
        }
        return true;
    });

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

    const unscoredCount = jobs.filter(j => j.fit_score == null).length;
    const approvedCount = jobs.filter(j => j.status === 'approved').length;
    const estScoreMin   = Math.max(1, Math.ceil(unscoredCount * 4 / 60));

    const totalPages  = Math.ceil(filteredJobs.length / itemsPerPage);
    const startIndex  = (currentPage - 1) * itemsPerPage;
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, filterTab]);

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
                        onClick={handleScoreAll}
                        disabled={scoreAllMutation.isPending || unscoredCount === 0}
                        className="flex flex-col items-center gap-0.5 bg-gradient-to-r hover:bg-gradient-to-br from-black to-black-light text-white px-5 py-2 rounded-xl font-medium shadow-md shadow-black/10 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 min-w-[130px]"
                    >
                        <span className="flex items-center gap-2 text-sm">
                            {scoreAllMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            {scoreAllMutation.isPending ? 'Scoring...' : `Score All${unscoredCount > 0 ? ` (${unscoredCount})` : ''}`}
                        </span>
                        {unscoredCount > 0 && !scoreAllMutation.isPending && (
                            <span className="text-[10px] text-white/60 font-normal">~{estScoreMin} min</span>
                        )}
                        {scoreAllMutation.isPending && (
                            <span className="text-[10px] text-white/60 font-normal">please wait...</span>
                        )}
                    </button>
                    <button
                        onClick={() => setIsScrapeModalOpen(true)}
                        className="flex items-center gap-2 bg-gradient-to-r hover:bg-gradient-to-br from-primary-light to-primary-dark text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-orange-200 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Scrape New Jobs
                    </button>
                </div>
            </div>

            {/* Step nudge banners */}
            {scoreAllMutation.isPending && (
                <div className="flex items-start gap-3 bg-black text-white px-5 py-3.5 rounded-2xl shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin mt-0.5 shrink-0 text-primary-light" />
                    <div>
                        <p className="text-sm font-semibold">Scoring {unscoredCount} jobs with AI...</p>
                        <p className="text-xs text-white/60 mt-0.5">This usually takes {estScoreMin}–{estScoreMin + 1} minutes. You can leave this page and come back.</p>
                    </div>
                </div>
            )}
            {!scoreAllMutation.isPending && unscoredCount > 0 && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 px-5 py-3.5 rounded-2xl">
                    <Play className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                    <div>
                        <p className="text-sm font-semibold text-amber-800">{unscoredCount} jobs waiting to be scored</p>
                        <p className="text-xs text-amber-600 mt-0.5">Press "Score All" to let AI approve the best matches. Takes ~{estScoreMin} minute{estScoreMin > 1 ? 's' : ''}.</p>
                    </div>
                </div>
            )}
            {!scoreAllMutation.isPending && unscoredCount === 0 && approvedCount > 0 && (
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
                    paginatedJobs.map(job => (
                        <div
                            key={job.id}
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
                                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold font-montserrat border flex items-center gap-1.5 shadow-sm ${getScoreBadgeColor(job.fit_score)}`}>
                                    <span>AI Match:</span>
                                    <span>{job.fit_score != null ? job.fit_score : '—'}</span>
                                </div>
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
                                {job.status !== 'approved' && job.status !== 'rejected' && (<>
                                    <button
                                        onClick={() => handleUpdateStatus(job.id, 'approved')}
                                        className="w-9 h-9 rounded-full flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-500 hover:text-white transition-all shadow-sm border border-green-100 hover:border-green-500"
                                        title="Approve"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(job.id, 'rejected')}
                                        className="w-9 h-9 rounded-full flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100 hover:border-red-500"
                                        title="Reject"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                </>)}

                                {/* Approved: primary CV action */}
                                {job.status === 'approved' && (
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
                                            onClick={() => handleGenerateCv(job.id)}
                                            disabled={generateCvMutation.isPending && generateCvMutation.variables === job.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-light to-primary-dark text-white text-xs font-semibold rounded-lg shadow-sm hover:opacity-90 transition-all disabled:opacity-60"
                                        >
                                            {generateCvMutation.isPending && generateCvMutation.variables === job.id
                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                : <Download className="w-3 h-3" />}
                                            {generateCvMutation.isPending && generateCvMutation.variables === job.id ? 'Generating...' : 'Gen CV'}
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
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {!loading && filteredJobs.length > 0 && (
                <div className="bg-white border border-neutral-dark rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <span className="text-sm text-secondary-dark">
                        Showing <span className="font-medium text-black">{startIndex + 1}</span> to{' '}
                        <span className="font-medium text-black">
                            {Math.min(startIndex + itemsPerPage, filteredJobs.length)}
                        </span>{' '}
                        of <span className="font-medium text-black">{filteredJobs.length}</span> results
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-neutral-dark rounded-lg text-sm bg-white text-secondary-dark hover:bg-neutral disabled:opacity-50 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-secondary-dark font-medium px-2">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border border-neutral-dark rounded-lg text-sm bg-white text-secondary-dark hover:bg-neutral disabled:opacity-50 transition-colors"
                        >
                            Next
                        </button>
                    </div>
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
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { key: 'linkedin', label: 'LinkedIn',      sub: 'via Apify',              icon: null },
                                        { key: 'remote',   label: 'Remote Boards', sub: 'Remotive · WWR · more',  icon: null },
                                        { key: 'custom',   label: 'Custom URL',    sub: 'paste any LI URL',       icon: null },
                                        { key: 'ats',      label: 'Auto-Finder',   sub: 'Greenhouse · Lever',     icon: Link2 },
                                    ].map(s => (
                                        <button
                                            key={s.key}
                                            type="button"
                                            onClick={() => setScrapeForm(p => ({ ...p, source: s.key }))}
                                            className={`rounded-xl p-3 text-left border transition-all ${scrapeForm.source === s.key ? 'bg-primary-light/10 border-primary-light/40 text-primary-dark' : 'border-neutral-dark hover:bg-neutral text-secondary-dark'}`}
                                        >
                                            <p className="text-xs font-bold flex items-center gap-1.5">
                                                {s.icon && <s.icon className="w-3 h-3 shrink-0" />}
                                                {s.label}
                                            </p>
                                            <p className="text-[10px] mt-0.5 opacity-70">{s.sub}</p>
                                        </button>
                                    ))}
                                </div>
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
                                    {scrapeMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Scraping...</> : 'Start Scrape'}
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
                                className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-green-700 hover:bg-green-50 transition-colors"
                            >
                                <CheckCircle className="w-5 h-5 shrink-0" />
                                Approve Job
                            </button>

                            {/* Reject */}
                            <button
                                onClick={() => { handleUpdateStatus(selectedJob.id, 'rejected'); setSelectedJob(null); }}
                                className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <XCircle className="w-5 h-5 shrink-0" />
                                Reject Job
                            </button>

                            {/* Generate CV — approved only */}
                            {selectedJob.status === 'approved' && (
                                <button
                                    onClick={() => { handleGenerateCv(selectedJob.id); setSelectedJob(null); }}
                                    disabled={generateCvMutation.isPending && generateCvMutation.variables === selectedJob.id}
                                    className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-primary-dark hover:bg-primary-light/5 transition-colors disabled:opacity-60"
                                >
                                    {generateCvMutation.isPending && generateCvMutation.variables === selectedJob.id
                                        ? <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                                        : <Download className="w-5 h-5 shrink-0" />}
                                    Generate Tailored CV
                                </button>
                            )}

                            {/* View CV — only if already generated */}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-neutral-dark w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-dark shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-primary-light/20 to-primary-light/10 flex items-center justify-center border border-primary-light/30">
                                    <FileText className="w-4 h-4 text-primary-light" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-black font-montserrat">Tailored CV</p>
                                    <p className="text-xs text-secondary-dark truncate max-w-sm">{cvModal.title}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={cvModal.blobUrl}
                                    download={`CV_${cvModal.title?.replace(/\s/g, '_')}.pdf`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-light to-primary-dark text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-all"
                                >
                                    <Download className="w-3 h-3" /> Download
                                </a>
                                <button
                                    onClick={handleCloseCvModal}
                                    className="p-1.5 text-secondary-dark hover:bg-neutral-dark rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <iframe
                            src={cvModal.blobUrl}
                            className="flex-1 w-full border-0"
                            title="CV Preview"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobsPage;

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router';
import {
  CheckCircle, XCircle, Search, Play, Plus, MapPin, Building, Briefcase,
  ExternalLink, Calendar, Loader2, Download, FileText, X, Kanban, UserSearch, Link2, MoreHorizontal
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
                toast.success(`Done! ${data.approved} approved, ${data.rejected} rejected. Go to Outreach to generate emails.`, { autoClose: 6000 });
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
                toast.success(`${count} new jobs scraped! Now press "Score All" to find your best matches.`, { autoClose: 7000 });
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
    const [mobileActionJob, setMobileActionJob] = useState(null);
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

    // Derived rendering logic
    const filteredJobs = jobs.filter(job => {
        if (filterTab !== 'All' && job.status?.toLowerCase() !== filterTab.toLowerCase()) return false;

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

    const getStatusBadgeColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'rejected': return 'bg-red-50 text-red-600 border-red-200';
            case 'contacted': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'scraped': return 'bg-neutral-dark text-secondary-dark border-neutral-dark';
            default: return 'bg-neutral-dark text-secondary-dark border-neutral-dark';
        }
    };

    // Derived counts for UX nudges
    const unscoredCount  = jobs.filter(j => j.fit_score == null).length;
    const approvedCount  = jobs.filter(j => j.status === 'approved').length;
    const estScoreMin    = Math.max(1, Math.ceil(unscoredCount * 4 / 60)); // ~4s per job

    // Calculate pagination
    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage);

    // Reset pagination when search or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterTab]);

    return (
        <div className="p-1 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in font-roboto">
            {/* Header section */}
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

            {/* ── Step nudge banners ─────────────────────────────────────────── */}
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
                    {['All', 'Scraped', 'Approved', 'Rejected', 'Contacted'].map(tab => (
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

            {/* Jobs Table */}
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-neutral-dark overflow-hidden">
                <div className="w-full">
                    <table className="w-full md:min-w-[800px] text-left border-collapse block md:table">
                        <thead className="hidden md:table-header-group">
                            <tr className="bg-neutral/50 border-b border-neutral-dark pb-3 text-xs uppercase tracking-wider text-secondary-dark font-semibold font-montserrat">
                                <th className="p-4 pl-6 font-medium">Company & Role</th>
                                <th className="p-4 font-medium hidden lg:table-cell">Location & Info</th>
                                <th className="p-4 font-medium">Score & Status</th>
                                <th className="p-4 pr-6 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="block md:table-row-group divide-y divide-neutral">
                            {loading ? (
                                <tr className="block md:table-row">
                                    <td colSpan="4" className="block md:table-cell p-8 text-center text-secondary-dark w-full">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-light" />
                                        <p className="mt-3 text-sm font-medium animate-pulse">Loading opportunities...</p>
                                    </td>
                                </tr>
                            ) : filteredJobs.length === 0 ? (
                                <tr className="block md:table-row">
                                    <td colSpan="4" className="block md:table-cell p-12 text-center text-secondary-dark bg-neutral/30 w-full">
                                        <Briefcase className="w-12 h-12 mx-auto text-secondary-dark/40 mb-3" />
                                        <p className="text-base font-medium text-secondary-dark">No jobs found</p>
                                        <p className="text-sm mt-1">Try adjusting your filters or scrape new ones.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedJobs.map(job => (
                                    <tr key={job.id} className="group block md:table-row py-4 md:py-0 border-b border-neutral-dark md:border-b-0 hover:bg-neutral/50 transition-colors">
                                        <td className="block md:table-cell p-0 px-4 pt-4 md:p-4 md:pl-6 align-top mb-3 md:mb-0">
                                            <div className="flex items-start gap-4">
                                                <div className="h-10 w-10 min-w-10 rounded-xl bg-gradient-to-tr from-accent-teal/10 to-accent-teal/20 flex items-center justify-center border border-accent-teal/30 mt-1 shadow-sm">
                                                    <Building className="w-4 h-4 text-accent-teal" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-black group-hover:text-primary-dark transition-colors truncate max-w-[250px] sm:max-w-xs md:max-w-full">{job.title}</h3>
                                                    <div className="flex items-center text-sm text-secondary-dark mt-1.5 gap-2">
                                                        <span className="font-medium text-secondary-dark">{job.company_name}</span>
                                                        <span className="w-1 h-1 rounded-full bg-secondary-dark/40 hidden md:block"></span>
                                                        <span className="text-xs uppercase bg-neutral-dark px-1.5 py-0.5 rounded text-secondary-dark font-medium hidden md:block">{job.source}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="hidden md:table-cell p-4 align-top">
                                            <div className="space-y-2 text-sm text-secondary-dark">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-secondary-dark/60 shrink-0" />
                                                    <span className="truncate max-w-[250px] sm:max-w-xs md:max-w-full">{job.location || 'Remote / Unspecified'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3.5 h-3.5 text-secondary-dark/60 shrink-0" />
                                                    <span>{job.posted_at ? new Date(job.posted_at).toLocaleDateString() : 'Recent'}</span>
                                                </div>
                                                {job.salary_info && (
                                                    <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md inline-flex items-center border border-emerald-100 mt-1">
                                                        {job.salary_info}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td className="block md:table-cell p-0 px-4 md:p-4 align-top mb-3 md:mb-0">
                                            <div className="flex flex-wrap items-center md:flex-col md:items-start gap-3 md:gap-2">
                                                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold font-montserrat border flex items-center gap-1.5 shadow-sm ${getScoreBadgeColor(job.fit_score)}`}>
                                                    <span>API Fit:</span>
                                                    <span className="text-sm">{job.fit_score != null ? job.fit_score : '-'}</span>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border shadow-sm ${getStatusBadgeColor(job.status)}`}>
                                                    {job.status || 'scraped'}
                                                </span>
                                                {/* Contact status dot */}
                                                {job.has_contact ? (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                                        Contact found
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-secondary-dark/60">
                                                        <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                                                        No contact
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="block md:table-cell p-0 px-4 pb-4 md:p-4 md:pr-6 align-top">
                                            {/* ── Desktop actions (hidden on mobile) ── */}
                                            <div className="hidden md:flex items-center justify-end gap-2 flex-wrap">
                                                {job.has_cv && (
                                                    <button
                                                        onClick={() => handleViewCv(job)}
                                                        disabled={loadingCvPreview === job.id}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 text-xs font-semibold rounded-lg hover:bg-violet-100 transition-all disabled:opacity-60"
                                                        title="Preview generated CV"
                                                    >
                                                        {loadingCvPreview === job.id
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <FileText className="w-3 h-3" />}
                                                        View CV
                                                    </button>
                                                )}
                                                {job.is_tracked ? (
                                                    <button
                                                        onClick={() => navigate('/dashboard/job-tracker')}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-all"
                                                        title="In tracker — click to view"
                                                    >
                                                        <CheckCircle className="w-3 h-3" />
                                                        Tracked
                                                    </button>
                                                ) : job.status === 'approved' && (
                                                    <button
                                                        onClick={() => handleTrackJob(job.id)}
                                                        disabled={trackJobMutation.isPending && trackJobMutation.variables === job.id}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral text-secondary-dark border border-neutral-dark text-xs font-semibold rounded-lg hover:bg-neutral-dark transition-all disabled:opacity-60"
                                                        title="Add to Job Tracker kanban"
                                                    >
                                                        {trackJobMutation.isPending && trackJobMutation.variables === job.id
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <Kanban className="w-3 h-3" />}
                                                        Track
                                                    </button>
                                                )}
                                                {job.status === 'approved' && (
                                                    <button
                                                        onClick={() => handleGenerateCv(job.id)}
                                                        disabled={generateCvMutation.isPending && generateCvMutation.variables === job.id}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-light to-primary-dark text-white text-xs font-semibold rounded-lg shadow-sm hover:opacity-90 transition-all disabled:opacity-60"
                                                        title="Generate tailored CV for this job"
                                                    >
                                                        {generateCvMutation.isPending && generateCvMutation.variables === job.id
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <Download className="w-3 h-3" />}
                                                        {generateCvMutation.isPending && generateCvMutation.variables === job.id ? 'Generating...' : 'Gen CV'}
                                                    </button>
                                                )}
                                                {job.status === 'approved' && !job.has_contact && (
                                                    <button
                                                        onClick={() => findContactMutation.mutate(job.id)}
                                                        disabled={findContactMutation.isPending && findContactMutation.variables === job.id}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold rounded-lg hover:bg-sky-100 transition-all disabled:opacity-60"
                                                        title="Search Hunter.io for a contact at this company"
                                                    >
                                                        {findContactMutation.isPending && findContactMutation.variables === job.id
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <UserSearch className="w-3 h-3" />}
                                                        Find Contact
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleUpdateStatus(job.id, 'approved')}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-500 hover:text-white transition-all shadow-sm border border-green-100 hover:border-green-500"
                                                    title="Approve"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(job.id, 'rejected')}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100 hover:border-red-500"
                                                    title="Reject"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                                {job.apply_url && (
                                                    <a
                                                        href={job.apply_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral text-secondary-dark hover:bg-black hover:text-white transition-all shadow-sm border border-neutral-dark hover:border-black"
                                                        title="View Job Post"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                            {/* ── Mobile trigger (hidden on desktop) ── */}
                                            <button
                                                onClick={() => setMobileActionJob(job)}
                                                className="md:hidden w-full flex items-center justify-center gap-2 py-2.5 bg-neutral text-secondary-dark border border-neutral-dark rounded-xl font-semibold shadow-sm text-sm"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                                Manage Job
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && filteredJobs.length > 0 && (
                    <div className="border-t border-neutral-dark bg-neutral p-4 flex flex-col md:flex-row items-center justify-between gap-4">
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
            </div>

            {/* Scrape Modal */}
            {isScrapeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-neutral-dark relative slide-in-bottom overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-dark">
                            <h2 className="text-lg font-bold font-montserrat text-black flex items-center gap-2">
                                <Plus className="w-4 h-4 text-primary-light" /> Scrape New Jobs
                            </h2>
                            <button onClick={() => setIsScrapeModalOpen(false)} className="p-1.5 text-secondary-dark hover:bg-neutral-dark rounded-lg transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleScrape} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

                            {/* Source picker */}
                            <div>
                                <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-2">Source</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { key: 'linkedin', label: 'LinkedIn', sub: 'via Apify', icon: null },
                                        { key: 'remote',   label: 'Remote Boards', sub: 'Remotive · WWR · more', icon: null },
                                        { key: 'custom',   label: 'Custom URL', sub: 'paste any LI URL', icon: null },
                                        { key: 'ats',      label: 'Auto-Finder', sub: 'Greenhouse · Lever', icon: Link2 },
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

                            {/* LinkedIn fields */}
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

                            {/* Remote boards fields */}
                            {scrapeForm.source === 'remote' && (
                                <div>
                                    <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">Keywords</label>
                                    <input
                                        type="text"
                                        required
                                        value={scrapeForm.keywords}
                                        onChange={e => setScrapeForm(p => ({ ...p, keywords: e.target.value }))}
                                        placeholder="e.g. Django developer"
                                        className="w-full p-2.5 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light outline-none"
                                    />
                                    <p className="text-xs text-secondary-dark/60 mt-1.5">Searches Remotive, RemoteOK, Himalayas, and WeWorkRemotely simultaneously. Jobs from last 7 days.</p>
                                </div>
                            )}

                            {/* Direct ATS Auto-Finder fields */}
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

                            {/* Custom URL fields */}
                            {scrapeForm.source === 'custom' && (<>
                                <div>
                                    <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">LinkedIn Search URL</label>
                                    <input
                                        type="url"
                                        required
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

            {/* ── Mobile Action Sheet ───────────────────────────────────────── */}
            {mobileActionJob && (
                <div className="fixed inset-0 z-[70] bg-black/50" onClick={() => setMobileActionJob(null)}>
                    <div
                        className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl p-6 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Sheet handle */}
                        <div className="w-10 h-1 rounded-full bg-neutral-dark mx-auto mb-5" />

                        {/* Job identity */}
                        <div className="flex items-start gap-3 mb-5">
                            <div className="h-10 w-10 min-w-10 rounded-xl bg-gradient-to-tr from-accent-teal/10 to-accent-teal/20 flex items-center justify-center border border-accent-teal/30 shadow-sm">
                                <Building className="w-4 h-4 text-accent-teal" />
                            </div>
                            <div>
                                <p className="font-bold text-black font-montserrat leading-tight">{mobileActionJob.title}</p>
                                <p className="text-sm text-secondary-dark mt-0.5">{mobileActionJob.company_name}</p>
                            </div>
                        </div>

                        {/* Action rows */}
                        <div className="divide-y divide-neutral border border-neutral-dark rounded-2xl overflow-hidden">

                            {/* Approve */}
                            <button
                                onClick={() => { handleUpdateStatus(mobileActionJob.id, 'approved'); setMobileActionJob(null); }}
                                className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-green-700 hover:bg-green-50 transition-colors"
                            >
                                <CheckCircle className="w-5 h-5 shrink-0" />
                                Approve Job
                            </button>

                            {/* Reject */}
                            <button
                                onClick={() => { handleUpdateStatus(mobileActionJob.id, 'rejected'); setMobileActionJob(null); }}
                                className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <XCircle className="w-5 h-5 shrink-0" />
                                Reject Job
                            </button>

                            {/* Generate CV — approved only */}
                            {mobileActionJob.status === 'approved' && (
                                <button
                                    onClick={() => { handleGenerateCv(mobileActionJob.id); setMobileActionJob(null); }}
                                    disabled={generateCvMutation.isPending && generateCvMutation.variables === mobileActionJob.id}
                                    className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-primary-dark hover:bg-primary-light/5 transition-colors disabled:opacity-60"
                                >
                                    {generateCvMutation.isPending && generateCvMutation.variables === mobileActionJob.id
                                        ? <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                                        : <Download className="w-5 h-5 shrink-0" />}
                                    Generate Tailored CV
                                </button>
                            )}

                            {/* View CV — only if already generated */}
                            {mobileActionJob.has_cv && (
                                <button
                                    onClick={() => { handleViewCv(mobileActionJob); setMobileActionJob(null); }}
                                    disabled={loadingCvPreview === mobileActionJob.id}
                                    className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-violet-700 hover:bg-violet-50 transition-colors disabled:opacity-60"
                                >
                                    {loadingCvPreview === mobileActionJob.id
                                        ? <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                                        : <FileText className="w-5 h-5 shrink-0" />}
                                    Preview CV
                                </button>
                            )}

                            {/* Find Contact — approved + no contact */}
                            {mobileActionJob.status === 'approved' && !mobileActionJob.has_contact && (
                                <button
                                    onClick={() => { findContactMutation.mutate(mobileActionJob.id); setMobileActionJob(null); }}
                                    disabled={findContactMutation.isPending && findContactMutation.variables === mobileActionJob.id}
                                    className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-sky-700 hover:bg-sky-50 transition-colors disabled:opacity-60"
                                >
                                    {findContactMutation.isPending && findContactMutation.variables === mobileActionJob.id
                                        ? <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                                        : <UserSearch className="w-5 h-5 shrink-0" />}
                                    Find Contact
                                </button>
                            )}

                            {/* Track — approved + not yet tracked */}
                            {mobileActionJob.status === 'approved' && !mobileActionJob.is_tracked && (
                                <button
                                    onClick={() => { handleTrackJob(mobileActionJob.id); setMobileActionJob(null); }}
                                    disabled={trackJobMutation.isPending && trackJobMutation.variables === mobileActionJob.id}
                                    className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-secondary-dark hover:bg-neutral transition-colors disabled:opacity-60"
                                >
                                    {trackJobMutation.isPending && trackJobMutation.variables === mobileActionJob.id
                                        ? <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                                        : <Kanban className="w-5 h-5 shrink-0" />}
                                    Add to Tracker
                                </button>
                            )}

                            {/* View tracked — already tracked */}
                            {mobileActionJob.is_tracked && (
                                <button
                                    onClick={() => { navigate('/dashboard/job-tracker'); setMobileActionJob(null); }}
                                    className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                                >
                                    <CheckCircle className="w-5 h-5 shrink-0" />
                                    View in Tracker
                                </button>
                            )}

                            {/* View post */}
                            {mobileActionJob.apply_url && (
                                <a
                                    href={mobileActionJob.apply_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setMobileActionJob(null)}
                                    className="w-full flex items-center gap-3 p-3.5 text-left font-medium text-secondary-dark hover:bg-neutral transition-colors"
                                >
                                    <ExternalLink className="w-5 h-5 shrink-0" />
                                    View Job Post
                                </a>
                            )}
                        </div>

                        {/* Cancel */}
                        <button
                            onClick={() => setMobileActionJob(null)}
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
                        {/* Modal header */}
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
                        {/* PDF iframe */}
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

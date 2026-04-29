import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router';
import {
  CheckCircle, XCircle, Eye, Search, Play, Plus, MapPin, Building, Briefcase,
  ExternalLink, Calendar, Loader2, Download, FileText, X, Kanban
} from 'lucide-react';
import api from '../api';

const JobsPage = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterTab, setFilterTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const [isScrapeModalOpen, setIsScrapeModalOpen] = useState(false);
    const [scrapeForm, setScrapeForm] = useState({
        keywords: '',
        location: 'us',
        count: 50,
        source: 'adzuna',
        search_url: '' // for apify
    });
    const [scoring, setScoring] = useState(false);
    const [scraping, setScraping] = useState(false);
    const [generatingCvFor, setGeneratingCvFor] = useState(null);
    const [cvModal, setCvModal] = useState(null);
    const [loadingCvPreview, setLoadingCvPreview] = useState(null);
    const [trackingId, setTrackingId] = useState(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/jobs/');
            setJobs(res.data);
        } catch {
            toast.error('Failed to load jobs. Please refresh.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleScoreAll = async () => {
        setScoring(true);
        try {
            const res = await api.post('/api/jobs/score/all/');
            const data = res.data;
            toast.success(`${data.approved} approved, ${data.rejected} rejected`);
            fetchJobs();
        } catch {
            toast.error('Scoring failed. Please try again.');
            console.error(error);
        } finally {
            setScoring(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await api.patch(`/api/jobs/${id}/status/`, { status: newStatus });
            toast.success(`Job marked as ${newStatus}`);
            // Update local state
            setJobs(jobs.map(job => job.id === id ? { ...job, status: newStatus } : job));
        } catch {
            toast.error('Failed to update status. Please try again.');
        }
    };

    const handleGenerateCv = async (jobId) => {
        setGeneratingCvFor(jobId);
        try {
            const res = await api.post(`/api/outreach/jobs/${jobId}/generate-cv/`, {}, { responseType: 'blob' });
            const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href  = url;
            link.setAttribute('download', `tailored_cv_${jobId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Tailored CV downloaded!');
            fetchJobs(); // refresh so has_cv badge appears
        } catch {
            toast.error('CV generation failed. Please try again.');
        } finally {
            setGeneratingCvFor(null);
        }
    };

    const handleTrackJob = async (jobId) => {
        setTrackingId(jobId);
        try {
            const res = await api.post(`/api/jobs/${jobId}/track/`);
            if (res.data.already_tracked) {
                toast.info('Already in your tracker — taking you there');
            } else {
                toast.success('Added to Job Tracker!');
            }
            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, is_tracked: true } : j));
            navigate('/dashboard/job-tracker');
        } catch {
            toast.error('Could not add to tracker. Please try again in a moment.');
        } finally {
            setTrackingId(null);
        }
    };

    const handleViewCv = async (job) => {
        setLoadingCvPreview(job.id);
        try {
            const res = await api.get(`/api/outreach/jobs/${job.id}/cv/`, { responseType: 'blob' });
            const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
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

    const handleScrape = async (e) => {
        e.preventDefault();
        setScraping(true);
        try {
            let res;
            if (scrapeForm.source === 'adzuna') {
                res = await api.post('/api/jobs/scrape/adzuna/', {
                    keywords: scrapeForm.keywords,
                    location: scrapeForm.location,
                    count: parseInt(scrapeForm.count)
                });
            } else {
                res = await api.post('/api/jobs/scrape/apify/', {
                    search_url: scrapeForm.search_url,
                    count: parseInt(scrapeForm.count)
                });
            }
            toast.success(`Scraped ${res.data.new_jobs} new jobs`);
            setIsScrapeModalOpen(false);
            fetchJobs();
        } catch {
            toast.error('Scraping failed. Please try again.');
            console.error(error);
        } finally {
            setScraping(false);
        }
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

    // Calculate pagination
    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage);

    // Reset pagination when search or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterTab]);

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in font-roboto">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-black to-secondary-dark font-montserrat">
                        Job Opportunities
                    </h1>
                    <p className="text-sm text-secondary-dark mt-1">Manage, filter, and score scraped job listings</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleScoreAll}
                        disabled={scoring}
                        className="flex items-center gap-2 bg-gradient-to-r hover:bg-gradient-to-br from-black to-black-light text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-black/10 transition-all active:scale-95 disabled:opacity-75 disabled:active:scale-100"
                    >
                        {scoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Score All
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
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral/50 border-b border-neutral-dark pb-3 text-xs uppercase tracking-wider text-secondary-dark font-semibold font-montserrat hidden md:table-row">
                                <th className="p-4 pl-6 font-medium">Company & Role</th>
                                <th className="p-4 font-medium hidden lg:table-cell">Location & Info</th>
                                <th className="p-4 font-medium">Score & Status</th>
                                <th className="p-4 pr-6 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-secondary-dark">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-light" />
                                        <p className="mt-3 text-sm font-medium animate-pulse">Loading opportunities...</p>
                                    </td>
                                </tr>
                            ) : filteredJobs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-12 text-center text-secondary-dark bg-neutral/30">
                                        <Briefcase className="w-12 h-12 mx-auto text-secondary-dark/40 mb-3" />
                                        <p className="text-base font-medium text-secondary-dark">No jobs found</p>
                                        <p className="text-sm mt-1">Try adjusting your filters or scrape new ones.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedJobs.map(job => (
                                    <tr key={job.id} className="group hover:bg-neutral/50 transition-colors flex flex-col md:table-row py-3 md:py-0 border-b border-neutral-dark md:border-b-0">
                                        <td className="p-4 pl-6 align-top">
                                            <div className="flex items-start gap-4">
                                                <div className="h-10 w-10 min-w-10 rounded-xl bg-gradient-to-tr from-accent-teal/10 to-accent-teal/20 flex items-center justify-center border border-accent-teal/30 mt-1 shadow-sm">
                                                    <Building className="w-4 h-4 text-accent-teal" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-black group-hover:text-primary-dark transition-colors line-clamp-1">{job.title}</h3>
                                                    <div className="flex items-center text-sm text-secondary-dark mt-1.5 gap-2">
                                                        <span className="font-medium text-secondary-dark">{job.company_name}</span>
                                                        <span className="w-1 h-1 rounded-full bg-secondary-dark/40 hidden md:block"></span>
                                                        <span className="text-xs uppercase bg-neutral-dark px-1.5 py-0.5 rounded text-secondary-dark font-medium hidden md:block">{job.source}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="p-4 align-top hidden md:table-cell lg:table-cell">
                                            <div className="space-y-2 text-sm text-secondary-dark">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-secondary-dark/60 shrink-0" />
                                                    <span className="truncate max-w-[200px]">{job.location || 'Remote / Unspecified'}</span>
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

                                        <td className="p-4 md:align-top">
                                            <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-2 pl-14 md:pl-0">
                                                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold font-montserrat border flex items-center gap-1.5 shadow-sm ${getScoreBadgeColor(job.fit_score)}`}>
                                                    <span>API Fit:</span>
                                                    <span className="text-sm">{job.fit_score != null ? job.fit_score : '-'}</span>
                                                </div>
                                                <span className={`px-2.5 mx-0 md:-ml-0.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border shadow-sm ${getStatusBadgeColor(job.status)}`}>
                                                    {job.status || 'scraped'}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="p-4 pr-6 align-top">
                                            <div className="flex items-center justify-end gap-2 pl-14 md:pl-0 pt-2 md:pt-0 flex-wrap">
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
                                                        disabled={trackingId === job.id}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral text-secondary-dark border border-neutral-dark text-xs font-semibold rounded-lg hover:bg-neutral-dark transition-all disabled:opacity-60"
                                                        title="Add to Job Tracker kanban"
                                                    >
                                                        {trackingId === job.id
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <Kanban className="w-3 h-3" />}
                                                        Track
                                                    </button>
                                                )}
                                                {job.status === 'approved' && (
                                                    <button
                                                        onClick={() => handleGenerateCv(job.id)}
                                                        disabled={generatingCvFor === job.id}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-light to-primary-dark text-white text-xs font-semibold rounded-lg shadow-sm hover:opacity-90 transition-all disabled:opacity-60"
                                                        title="Generate tailored CV for this job"
                                                    >
                                                        {generatingCvFor === job.id
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <Download className="w-3 h-3" />}
                                                        {generatingCvFor === job.id ? 'Generating...' : 'Gen CV'}
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
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-neutral-dark relative slide-in-bottom">
                        <button
                            onClick={() => setIsScrapeModalOpen(false)}
                            className="absolute top-4 right-4 text-secondary-dark/60 hover:bg-neutral-dark rounded-full p-1"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-bold font-montserrat text-black mb-5 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary-light" />
                            Scrape New Jobs
                        </h2>

                        <form onSubmit={handleScrape} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">Source</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className={`cursor-pointer border rounded-xl p-3 flex items-center gap-2 transition-all ${scrapeForm.source === 'adzuna' ? 'bg-primary-light/10 border-primary-light/20 text-primary-dark' : 'bg-white border-neutral-dark hover:bg-neutral'}`}>
                                        <input
                                            type="radio"
                                            name="source"
                                            value="adzuna"
                                            checked={scrapeForm.source === 'adzuna'}
                                            onChange={(e) => setScrapeForm({...scrapeForm, source: e.target.value})}
                                            className="hidden"
                                        />
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${scrapeForm.source === 'adzuna' ? 'border-primary-light' : 'border-secondary-dark/30'}`}>
                                            {scrapeForm.source === 'adzuna' && <div className="w-2 h-2 rounded-full bg-primary-light"></div>}
                                        </div>
                                        <span className="font-medium text-sm">Adzuna</span>
                                    </label>
                                    <label className={`cursor-pointer border rounded-xl p-3 flex items-center gap-2 transition-all ${scrapeForm.source === 'apify' ? 'bg-primary-light/10 border-primary-light/20 text-primary-dark' : 'bg-white border-neutral-dark hover:bg-neutral'}`}>
                                        <input
                                            type="radio"
                                            name="source"
                                            value="apify"
                                            checked={scrapeForm.source === 'apify'}
                                            onChange={(e) => setScrapeForm({...scrapeForm, source: e.target.value})}
                                            className="hidden"
                                        />
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${scrapeForm.source === 'apify' ? 'border-primary-light' : 'border-secondary-dark/30'}`}>
                                            {scrapeForm.source === 'apify' && <div className="w-2 h-2 rounded-full bg-primary-light"></div>}
                                        </div>
                                        <span className="font-medium text-sm">Apify (LI)</span>
                                    </label>
                                </div>
                            </div>

                            {scrapeForm.source === 'adzuna' ? (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">Keywords</label>
                                        <input
                                            type="text"
                                            required
                                            value={scrapeForm.keywords}
                                            onChange={(e) => setScrapeForm({...scrapeForm, keywords: e.target.value})}
                                            placeholder="e.g. Django Developer"
                                            className="w-full p-2.5 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">Location</label>
                                        <input
                                            type="text"
                                            value={scrapeForm.location}
                                            onChange={(e) => setScrapeForm({...scrapeForm, location: e.target.value})}
                                            placeholder="us, gbr, etc"
                                            className="w-full p-2.5 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light outline-none"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">LinkedIn Search URL</label>
                                    <input
                                        type="url"
                                        required
                                        value={scrapeForm.search_url}
                                        onChange={(e) => setScrapeForm({...scrapeForm, search_url: e.target.value})}
                                        placeholder="https://linkedin.com/jobs/..."
                                        className="w-full p-2.5 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light outline-none"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">Counts</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="200"
                                    value={scrapeForm.count}
                                    onChange={(e) => setScrapeForm({...scrapeForm, count: e.target.value})}
                                    className="w-full p-2.5 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light outline-none"
                                />
                            </div>

                            <div className="pt-3">
                                <button
                                    type="submit"
                                    disabled={scraping}
                                    className="w-full bg-gradient-to-r from-black to-black-light text-white p-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex justify-center items-center gap-2"
                                >
                                    {scraping ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Scraping Items...</>
                                    ) : (
                                        "Start Deep Scrape"
                                    )}
                                </button>
                            </div>
                        </form>
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

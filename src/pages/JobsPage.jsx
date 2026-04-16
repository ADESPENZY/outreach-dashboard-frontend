import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  CheckCircle, XCircle, Eye, Search, Play, Plus, MapPin, Building, Briefcase, 
  ExternalLink, Calendar, Loader2
} from 'lucide-react';
import api from '../api';

const JobsPage = () => {
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

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/jobs/');
            setJobs(res.data);
        } catch (error) {
            toast.error("Failed to fetch jobs");
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
        } catch (error) {
            toast.error("Failed to score jobs");
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
        } catch (error) {
            toast.error(`Failed to update status`);
        }
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
        } catch (error) {
            toast.error("Scraping failed");
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
        if (score == null) return 'bg-gray-100 text-gray-600 border-gray-200';
        if (score >= 80) return 'bg-green-100 text-green-700 border-green-200';
        if (score >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-red-100 text-red-700 border-red-200';
    };

    const getStatusBadgeColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'rejected': return 'bg-red-50 text-red-600 border-red-200';
            case 'contacted': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'scraped': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in font-roboto">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 font-montserrat">
                        Job Opportunities
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage, filter, and score scraped job listings</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleScoreAll}
                        disabled={scoring}
                        className="flex items-center gap-2 bg-gradient-to-r hover:bg-gradient-to-br from-indigo-500 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-indigo-200 transition-all active:scale-95 disabled:opacity-75 disabled:active:scale-100"
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
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex overflow-x-auto space-x-2 w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
                    {['All', 'Scraped', 'Approved', 'Rejected', 'Contacted'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilterTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                filterTab === tab 
                                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' 
                                : 'text-gray-600 hover:bg-gray-50 border border-transparent hover:border-gray-100'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Search company or role..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-light/50 focus:border-primary-light transition-all outline-none text-gray-700"
                    />
                </div>
            </div>

            {/* Jobs Table */}
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 pb-3 text-xs uppercase tracking-wider text-gray-500 font-semibold font-montserrat hidden md:table-row">
                                <th className="p-4 pl-6 font-medium">Company & Role</th>
                                <th className="p-4 font-medium hidden lg:table-cell">Location & Info</th>
                                <th className="p-4 font-medium">Score & Status</th>
                                <th className="p-4 pr-6 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-gray-400">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-light" />
                                        <p className="mt-3 text-sm font-medium animate-pulse">Loading opportunities...</p>
                                    </td>
                                </tr>
                            ) : filteredJobs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-12 text-center text-gray-400 bg-gray-50/30">
                                        <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                        <p className="text-base font-medium text-gray-500">No jobs found</p>
                                        <p className="text-sm mt-1">Try adjusting your filters or scrape new ones.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredJobs.map(job => (
                                    <tr key={job.id} className="group hover:bg-gray-50/50 transition-colors flex flex-col md:table-row py-3 md:py-0 border-b border-gray-100 md:border-b-0">
                                        <td className="p-4 pl-6 align-top">
                                            <div className="flex items-start gap-4">
                                                <div className="h-10 w-10 min-w-10 rounded-xl bg-gradient-to-tr from-indigo-50 to-indigo-100 flex items-center justify-center border border-indigo-200/50 mt-1 shadow-sm">
                                                    <Building className="w-4 h-4 text-indigo-500" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 group-hover:text-primary-dark transition-colors line-clamp-1">{job.title}</h3>
                                                    <div className="flex items-center text-sm text-gray-500 mt-1.5 gap-2">
                                                        <span className="font-medium text-gray-700">{job.company_name}</span>
                                                        <span className="w-1 h-1 rounded-full bg-gray-300 hidden md:block"></span>
                                                        <span className="text-xs uppercase bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium hidden md:block">{job.source}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td className="p-4 align-top hidden md:table-cell lg:table-cell">
                                            <div className="space-y-2 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    <span className="truncate max-w-[200px]">{job.location || 'Remote / Unspecified'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
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
                                            <div className="flex items-center justify-end gap-2 pl-14 md:pl-0 pt-2 md:pt-0">
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
                                                        className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 text-gray-500 hover:bg-gray-800 hover:text-white transition-all shadow-sm border border-gray-200 hover:border-gray-800 ml-2"
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
            </div>

            {/* Scrape Modal */}
            {isScrapeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100 relative slide-in-bottom">
                        <button 
                            onClick={() => setIsScrapeModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:bg-gray-100 rounded-full p-1"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                        
                        <h2 className="text-xl font-bold font-montserrat text-gray-900 mb-5 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary-light" />
                            Scrape New Jobs
                        </h2>
                        
                        <form onSubmit={handleScrape} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Source</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className={`cursor-pointer border rounded-xl p-3 flex items-center gap-2 transition-all ${scrapeForm.source === 'adzuna' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                        <input 
                                            type="radio" 
                                            name="source" 
                                            value="adzuna" 
                                            checked={scrapeForm.source === 'adzuna'} 
                                            onChange={(e) => setScrapeForm({...scrapeForm, source: e.target.value})}
                                            className="hidden"
                                        />
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${scrapeForm.source === 'adzuna' ? 'border-indigo-600' : 'border-gray-300'}`}>
                                            {scrapeForm.source === 'adzuna' && <div className="w-2 h-2 rounded-full bg-indigo-600"></div>}
                                        </div>
                                        <span className="font-medium text-sm">Adzuna</span>
                                    </label>
                                    <label className={`cursor-pointer border rounded-xl p-3 flex items-center gap-2 transition-all ${scrapeForm.source === 'apify' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                        <input 
                                            type="radio" 
                                            name="source" 
                                            value="apify" 
                                            checked={scrapeForm.source === 'apify'} 
                                            onChange={(e) => setScrapeForm({...scrapeForm, source: e.target.value})}
                                            className="hidden"
                                        />
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${scrapeForm.source === 'apify' ? 'border-indigo-600' : 'border-gray-300'}`}>
                                            {scrapeForm.source === 'apify' && <div className="w-2 h-2 rounded-full bg-indigo-600"></div>}
                                        </div>
                                        <span className="font-medium text-sm">Apify (LI)</span>
                                    </label>
                                </div>
                            </div>
                            
                            {scrapeForm.source === 'adzuna' ? (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Keywords</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={scrapeForm.keywords}
                                            onChange={(e) => setScrapeForm({...scrapeForm, keywords: e.target.value})}
                                            placeholder="e.g. Django Developer"
                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Location</label>
                                        <input 
                                            type="text" 
                                            value={scrapeForm.location}
                                            onChange={(e) => setScrapeForm({...scrapeForm, location: e.target.value})}
                                            placeholder="us, gbr, etc"
                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">LinkedIn Search URL</label>
                                    <input 
                                        type="url" 
                                        required
                                        value={scrapeForm.search_url}
                                        onChange={(e) => setScrapeForm({...scrapeForm, search_url: e.target.value})}
                                        placeholder="https://linkedin.com/jobs/..."
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Counts</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    max="200"
                                    value={scrapeForm.count}
                                    onChange={(e) => setScrapeForm({...scrapeForm, count: e.target.value})}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                />
                            </div>

                            <div className="pt-3">
                                <button 
                                    type="submit"
                                    disabled={scraping}
                                    className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white p-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex justify-center items-center gap-2"
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
        </div>
    );
};

export default JobsPage;

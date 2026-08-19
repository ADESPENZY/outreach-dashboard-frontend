import { useState, useEffect, useRef } from'react';
import { useQuery, useMutation, useQueryClient } from'@tanstack/react-query';
import { toast } from'react-toastify';
import {
 Grid, List, Search, Filter, Send, MapPin, Calendar, X,
 DollarSign, Link, MailOpen, FileText, Plus, ChevronDown,
 MoreHorizontal, Trash2, Edit,
} from'lucide-react';
import * as echarts from'echarts';
import {
 getJobs, getJobStats, createJob, patchJobStatus, deleteJob, updateJob,
} from'@/services/apiJobTracker';
import { getGmailAccounts } from'@/services/apiGmail';
import SmallSpinner from'./SmallSpinner';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STATUS_COLUMNS = ['applied','contacted','replied','interview','offer','closed'];

const STATUS_STYLES = {
 applied: { badge:'bg-amber-100 text-amber-800', col:'border-t-amber-400' },
 contacted: { badge:'bg-blue-100 text-blue-800', col:'border-t-blue-400' },
 replied: { badge:'bg-teal-100 text-teal-800', col:'border-t-teal-400' },
 interview: { badge:'bg-purple-100 text-purple-800', col:'border-t-purple-400' },
 offer: { badge:'bg-green-100 text-green-800', col:'border-t-green-400' },
 closed: { badge:'bg-gray-200 text-gray-700', col:'border-t-gray-400' },
};

const EMPTY_FORM = {
 title:'', company:'', location:'', job_type:'remote',
 status:'contacted', sub_status:'', applied_date:'',
 applied_from:'', salary_min:'', salary_max:'',
 job_url:'', description:'', notes:'', tags: [],
};

// ---------------------------------------------------------------------------
// JobTracker
// ---------------------------------------------------------------------------
const JobTracker = () => {
 const queryClient = useQueryClient();

 // UI state
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState('');
 const [jobModalOpen, setJobModalOpen] = useState(false);
 const [editingJob, setEditingJob] = useState(null); // job object when editing
 const [detailJob, setDetailJob] = useState(null); // job shown in side panel
 const [formData, setFormData] = useState(EMPTY_FORM);
 const [tagInput, setTagInput] = useState('');
 const [draggedId, setDraggedId] = useState(null);

 // Chart refs
 const statusChartRef = useRef(null);
 const trendChartRef = useRef(null);

 // ---------------------------------------------------------------------------
 // Data fetching
 // ---------------------------------------------------------------------------
 const { data: jobs = [], isLoading } = useQuery({
 queryKey: ['jobs', search, statusFilter],
 queryFn: () => getJobs({ search, status: statusFilter }),
 });

 const { data: stats = { applied: 0, contacted: 0, replied: 0, interview: 0, offer: 0, closed: 0 } } = useQuery({
 queryKey: ['jobStats'],
 queryFn: getJobStats,
 });

 const { data: gmailData } = useQuery({
 queryKey: ['gmailAccounts'],
 queryFn: getGmailAccounts,
 });
 const gmailAccounts = gmailData?.results ?? [];

 // ---------------------------------------------------------------------------
 // Mutations
 // ---------------------------------------------------------------------------
 const createMutation = useMutation({
 mutationFn: createJob,
 onSuccess: () => {
 toast.success('Job added!');
 queryClient.invalidateQueries({ queryKey: ['jobs'] });
 queryClient.invalidateQueries({ queryKey: ['jobStats'] });
 closeModal();
 },
 onError: (err) => toast.error(err?.response?.data?.error ||'Failed to add job'),
 });

 const updateMutation = useMutation({
 mutationFn: ({ id, data }) => updateJob(id, data),
 onSuccess: () => {
 toast.success('Job updated!');
 queryClient.invalidateQueries({ queryKey: ['jobs'] });
 closeModal();
 },
 onError: (err) => toast.error(err?.response?.data?.error ||'Failed to update job'),
 });

 const statusMutation = useMutation({
 mutationFn: ({ id, status, subStatus }) => patchJobStatus(id, status, subStatus),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['jobs'] });
 queryClient.invalidateQueries({ queryKey: ['jobStats'] });
 },
 onError: (err) => toast.error(err.message ||'Failed to move job'),
 });

 const deleteMutation = useMutation({
 mutationFn: deleteJob,
 onSuccess: () => {
 toast.success('Job deleted');
 queryClient.invalidateQueries({ queryKey: ['jobs'] });
 queryClient.invalidateQueries({ queryKey: ['jobStats'] });
 setDetailJob(null);
 },
 onError: (err) => toast.error(err.message ||'Failed to delete job'),
 });

 // ---------------------------------------------------------------------------
 // Charts
 // ---------------------------------------------------------------------------
 useEffect(() => {
 if (!statusChartRef.current || !trendChartRef.current) return;

 const statusChart = echarts.init(statusChartRef.current);
 statusChart.setOption({
 animation: false,
 tooltip: { trigger:'item' },
 series: [{
 type:'pie', radius: ['55%','80%'], label: { show: false },
 emphasis: { label: { show: false } }, labelLine: { show: false },
 data: [
 { value: stats.applied, name:'Applied', itemStyle: { color:'#fbbf24' } },
 { value: stats.contacted, name:'Contacted', itemStyle: { color:'#60a5fa' } },
 { value: stats.replied, name:'Replied', itemStyle: { color:'#2dd4bf' } },
 { value: stats.interview, name:'Interview', itemStyle: { color:'#a78bfa' } },
 { value: stats.offer, name:'Offer', itemStyle: { color:'#34d399' } },
 { value: stats.closed, name:'Closed', itemStyle: { color:'#9ca3af' } },
 ],
 }],
 });

 const trendChart = echarts.init(trendChartRef.current);
 trendChart.setOption({
 animation: false,
 tooltip: { trigger:'axis' },
 grid: { left: 0, right: 0, top: 10, bottom: 20, containLabel: true },
 xAxis: { type:'category', data: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
 axisLine: { lineStyle: { color:'#e5e7eb' } } },
 yAxis: { type:'value', splitLine: { lineStyle: { color:'#f3f4f6' } } },
 series: [{ type:'bar', data: [2, 5, 3, 7, 4, 1, 2],
 itemStyle: { color:'#60a5fa', borderRadius: [4, 4, 0, 0] } }],
 });

 const onResize = () => { statusChart.resize(); trendChart.resize(); };
 window.addEventListener('resize', onResize);
 return () => {
 statusChart.dispose(); trendChart.dispose();
 window.removeEventListener('resize', onResize);
 };
 }, [stats]);

 // ---------------------------------------------------------------------------
 // Form helpers
 // ---------------------------------------------------------------------------
 function openCreateModal() {
 setEditingJob(null);
 setFormData(EMPTY_FORM);
 setTagInput('');
 setJobModalOpen(true);
 }

 function openEditModal(job) {
 setEditingJob(job);
 setFormData({
 title: job.title, company: job.company, location: job.location,
 job_type: job.job_type, status: job.status, sub_status: job.sub_status,
 applied_date: job.applied_date ||'', applied_from: job.applied_from ||'',
 salary_min: job.salary_min ||'', salary_max: job.salary_max ||'',
 job_url: job.job_url, description: job.description, notes: job.notes,
 tags: job.tags || [],
 });
 setTagInput('');
 setJobModalOpen(true);
 }

 function closeModal() {
 setJobModalOpen(false);
 setEditingJob(null);
 setFormData(EMPTY_FORM);
 }

 function handleField(e) {
 const { name, value } = e.target;
 setFormData(prev => ({ ...prev, [name]: value }));
 }

 function addTag() {
 const t = tagInput.trim();
 if (t && !formData.tags.includes(t)) {
 setFormData(prev => ({ ...prev, tags: [...prev.tags, t] }));
 }
 setTagInput('');
 }

 function removeTag(tag) {
 setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
 }

 function handleSubmit(e) {
 e.preventDefault();
 const payload = {
 ...formData,
 salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
 salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
 applied_from: formData.applied_from ? parseInt(formData.applied_from) : null,
 };
 if (editingJob) {
 updateMutation.mutate({ id: editingJob.id, data: payload });
 } else {
 createMutation.mutate(payload);
 }
 }

 // Close detail panel on Escape key
 useEffect(() => {
 const onKey = (e) => { if (e.key ==='Escape') { setDetailJob(null); setJobModalOpen(false); } };
 window.addEventListener('keydown', onKey);
 return () => window.removeEventListener('keydown', onKey);
 }, []);

 // ---------------------------------------------------------------------------
 // Kanban drag-and-drop
 // ---------------------------------------------------------------------------
 function onDragStart(jobId) { setDraggedId(jobId); }
 function onDragOver(e) { e.preventDefault(); }
 function onDrop(e, newStatus) {
 e.preventDefault();
 if (!draggedId) return;
 const job = jobs.find(j => j.id === draggedId);
 if (job && job.status !== newStatus) {
 statusMutation.mutate({ id: draggedId, status: newStatus, subStatus:'' });
 }
 setDraggedId(null);
 }

 // ---------------------------------------------------------------------------
 // Render helpers
 // ---------------------------------------------------------------------------
 const jobsByStatus = (s) => jobs.filter(j => j.status === s);

 const isPending = createMutation.isPending || updateMutation.isPending;

 // ---------------------------------------------------------------------------
 // Render
 // ---------------------------------------------------------------------------
 return (
 <main className="flex-1 overflow-y-auto p-6 bg-neutral">

 {/* ---- Top controls ---- */}
 <section className="mb-6 flex flex-wrap items-center justify-between gap-4">
 <div className="relative max-w-xs flex-grow">
 <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
 <input
 className="w-full pl-10 pr-4 py-2 bg-white rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary-light/40"
 placeholder="Search jobs..."
 value={search}
 onChange={e => setSearch(e.target.value)}
 />
 </div>
 <div className="flex items-center gap-2">
 <select
 className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none"
 value={statusFilter}
 onChange={e => setStatusFilter(e.target.value)}
 >
 <option value="">All statuses</option>
 {STATUS_COLUMNS.map(s => (
 <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
 ))}
 </select>
 <button
 onClick={openCreateModal}
 className="px-3 py-2 text-sm font-medium rounded-lg bg-primary-light text-white flex items-center gap-1.5 hover:bg-primary-light/90"
 >
 <Plus className="w-4 h-4" /> Add Job
 </button>
 </div>
 </section>

 {/* ---- Stats row ---- */}
 <section className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
 {STATUS_COLUMNS.map(s => (
 <div key={s} className={`bg-white rounded-lg shadow-sm border-t-4 ${STATUS_STYLES[s].col} p-4`}>
 <p className="text-xs text-gray-500 uppercase tracking-wide">{s}</p>
 <p className="text-2xl font-bold text-gray-800 mt-1">{stats[s]}</p>
 </div>
 ))}
 </section>

 {/* ---- Kanban board ---- */}
 {isLoading ? (
 <div className="flex justify-center py-20"><SmallSpinner /></div>
 ) : (
 <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
 {STATUS_COLUMNS.map(col => (
 <div
 key={col}
 onDragOver={onDragOver}
 onDrop={e => onDrop(e, col)}
 className="bg-gray-100 rounded-xl p-3 min-h-[300px]"
 >
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-semibold text-gray-700 capitalize">{col}</h3>
 <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[col].badge}`}>
 {jobsByStatus(col).length}
 </span>
 </div>

 <div className="space-y-2">
 {jobsByStatus(col).map(job => (
 <div
 key={job.id}
 draggable
 onDragStart={() => onDragStart(job.id)}
 onClick={() => setDetailJob(job)}
 className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
 >
 <div className="flex items-start justify-between mb-1">
 <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[col].badge}`}>
 {job.sub_status || col.charAt(0).toUpperCase() + col.slice(1)}
 </span>
 <button
 onClick={e => { e.stopPropagation(); deleteMutation.mutate(job.id); }}
 className="text-gray-300 hover:text-red-500 transition-colors"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 <h4 className="text-sm font-medium text-gray-900 mt-1">{job.title}</h4>
 <p className="text-xs text-gray-500">{job.company}</p>
 <div className="flex items-center gap-3 mt-2">
 {job.location && (
 <span className="flex items-center text-xs text-gray-400">
 <MapPin className="w-3 h-3 mr-0.5" />{job.location}
 </span>
 )}
 {job.applied_date && (
 <span className="flex items-center text-xs text-gray-400">
 <Calendar className="w-3 h-3 mr-0.5" />{job.applied_date}
 </span>
 )}
 </div>
 {job.tags?.length > 0 && (
 <div className="flex flex-wrap gap-1 mt-2">
 {job.tags.map(tag => (
 <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
 {tag}
 </span>
 ))}
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 ))}
 </section>
 )}

 {/* ---- Charts ---- */}
 <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
 <h3 className="text-sm font-medium text-gray-700 mb-4">Application Status Breakdown</h3>
 <div className="flex items-center">
 <div ref={statusChartRef} className="w-40 h-40 flex-shrink-0" />
 <div className="ml-6 space-y-2">
 {STATUS_COLUMNS.map(s => (
 <div key={s} className="flex items-center gap-2">
 <span className={`w-2.5 h-2.5 rounded-full ${STATUS_STYLES[s].badge.split('')[0]}`} />
 <span className="text-sm text-gray-600 capitalize">{s}</span>
 <span className="text-sm font-semibold text-gray-800 ml-auto">{stats[s]}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
 <h3 className="text-sm font-medium text-gray-700 mb-4">Weekly Applications</h3>
 <div ref={trendChartRef} className="w-full h-40" />
 </div>
 </section>

 {/* ================================================================
 Job Detail Side Panel
 ================================================================ */}
 {detailJob && (
 <>
 {/* Backdrop — click anywhere outside to close */}
 <div
 className="fixed inset-0 bg-black/30 z-20"
 onClick={() => setDetailJob(null)}
 />

 {/* Side panel */}
 <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-30 flex flex-col">
 <div className="p-4 border-b border-gray-200 flex items-center justify-between">
 <h3 className="text-lg font-medium text-gray-800">Job Details</h3>
 <div className="flex items-center gap-2">
 <button
 onClick={() => openEditModal(detailJob)}
 className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-800 transition-colors"
 title="Edit"
 >
 <Edit className="w-4 h-4" />
 </button>
 <button
 onClick={() => setDetailJob(null)}
 className="p-1.5 bg-gray-100 hover:bg-red-100 hover:text-red-600 rounded-full text-gray-500 transition-colors"
 title="Close (Esc)"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 </div>
 <div className="flex-1 overflow-y-auto p-4 space-y-5">
 <div>
 <h4 className="text-lg font-semibold text-gray-900">{detailJob.title}</h4>
 <p className="text-sm text-gray-500">{detailJob.company}</p>
 <div className="flex flex-wrap gap-2 mt-3">
 <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[detailJob.status]?.badge}`}>
 {detailJob.sub_status || detailJob.status}
 </span>
 {detailJob.tags?.map(t => (
 <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{t}</span>
 ))}
 </div>
 </div>

 <div className="space-y-2.5 text-sm">
 {detailJob.location && (
 <div className="flex items-center gap-2 text-gray-600">
 <MapPin className="w-4 h-4 text-gray-400" />{detailJob.location}
 </div>
 )}
 {(detailJob.salary_min || detailJob.salary_max) && (
 <div className="flex items-center gap-2 text-gray-600">
 <DollarSign className="w-4 h-4 text-gray-400" />
 {detailJob.salary_min &&`$${detailJob.salary_min.toLocaleString()}`}
 {detailJob.salary_min && detailJob.salary_max &&' –'}
 {detailJob.salary_max &&`$${detailJob.salary_max.toLocaleString()}`}
 </div>
 )}
 {detailJob.applied_date && (
 <div className="flex items-center gap-2 text-gray-600">
 <Calendar className="w-4 h-4 text-gray-400" />Applied on {detailJob.applied_date}
 </div>
 )}
 {detailJob.applied_from_email && (
 <div className="flex items-center gap-2 text-gray-600">
 <Send className="w-4 h-4 text-gray-400" />{detailJob.applied_from_email}
 </div>
 )}
 {detailJob.job_url && (
 <div className="flex items-center gap-2">
 <Link className="w-4 h-4 text-gray-400" />
 <a href={detailJob.job_url} target="_blank" rel="noreferrer"
 className="text-primary-light hover:underline truncate">{detailJob.job_url}</a>
 </div>
 )}
 </div>

 {detailJob.description && (
 <div>
 <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</h5>
 <p className="text-sm text-gray-600 whitespace-pre-wrap">{detailJob.description}</p>
 </div>
 )}

 {detailJob.notes && (
 <div>
 <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</h5>
 <p className="text-sm text-gray-600 whitespace-pre-wrap">{detailJob.notes}</p>
 </div>
 )}

 <button
 onClick={() => deleteMutation.mutate(detailJob.id)}
 disabled={deleteMutation.isPending}
 className="w-full py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 flex items-center justify-center gap-2"
 >
 <Trash2 className="w-4 h-4" /> Delete Job
 </button>

 <button
 onClick={() => setDetailJob(null)}
 className="w-full py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2 transition-colors"
 >
 <X className="w-4 h-4" /> Close
 </button>
 </div>
 </div>
 </>
 )}

 {/* ================================================================
 Add / Edit Job Modal
 ================================================================ */}
 {jobModalOpen && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-30">
 <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
 <div className="p-4 border-b border-gray-200 flex items-center justify-between">
 <h3 className="text-lg font-semibold text-gray-800">
 {editingJob ?'Edit Job' :'Add New Job'}
 </h3>
 <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-full">
 <X className="w-5 h-5 text-gray-500" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

 {/* Title */}
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
 <input name="title" value={formData.title} onChange={handleField} required
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-light/40 focus:outline-none"
 placeholder="e.g. Senior Frontend Developer" />
 </div>

 {/* Company */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
 <input name="company" value={formData.company} onChange={handleField} required
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-light/40 focus:outline-none"
 placeholder="e.g. Google" />
 </div>

 {/* Location */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
 <input name="location" value={formData.location} onChange={handleField}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-light/40 focus:outline-none"
 placeholder="e.g. Remote" />
 </div>

 {/* Job type */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
 <select name="job_type" value={formData.job_type} onChange={handleField}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
 <option value="remote">Remote</option>
 <option value="hybrid">Hybrid</option>
 <option value="onsite">On-site</option>
 </select>
 </div>

 {/* Status */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
 <select name="status" value={formData.status} onChange={handleField}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
 {STATUS_COLUMNS.map(s => (
 <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
 ))}
 </select>
 </div>

 {/* Applied date */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Application Date</label>
 <input type="date" name="applied_date" value={formData.applied_date} onChange={handleField}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
 </div>

 {/* Applied from (Gmail account) */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Applied From</label>
 <select name="applied_from" value={formData.applied_from} onChange={handleField}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
 <option value="">— none —</option>
 {gmailAccounts.map(acc => (
 <option key={acc.id} value={acc.id}>{acc.email}</option>
 ))}
 </select>
 </div>

 {/* Job URL */}
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-1">Job URL</label>
 <input type="url" name="job_url" value={formData.job_url} onChange={handleField}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
 placeholder="https://..." />
 </div>

 {/* Salary */}
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-1">Salary Range</label>
 <div className="flex items-center gap-2">
 <input type="number" name="salary_min" value={formData.salary_min} onChange={handleField}
 className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
 placeholder="Min" />
 <span className="text-gray-400">to</span>
 <input type="number" name="salary_max" value={formData.salary_max} onChange={handleField}
 className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
 placeholder="Max" />
 </div>
 </div>

 {/* Description */}
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
 <textarea name="description" value={formData.description} onChange={handleField} rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
 placeholder="Paste the job description..." />
 </div>

 {/* Notes */}
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
 <textarea name="notes" value={formData.notes} onChange={handleField} rows={2}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
 placeholder="Add any notes..." />
 </div>

 {/* Tags */}
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
 <div className="flex gap-2 mb-2">
 <input value={tagInput} onChange={e => setTagInput(e.target.value)}
 onKeyDown={e => { if (e.key ==='Enter') { e.preventDefault(); addTag(); } }}
 className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
 placeholder="Type and press Enter" />
 <button type="button" onClick={addTag}
 className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
 Add
 </button>
 </div>
 <div className="flex flex-wrap gap-2">
 {formData.tags.map(tag => (
 <span key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full">
 {tag}
 <button type="button" onClick={() => removeTag(tag)}>
 <X className="w-3 h-3" />
 </button>
 </span>
 ))}
 </div>
 </div>
 </div>

 <div className="flex justify-end gap-2 mt-6">
 <button type="button" onClick={closeModal}
 className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">
 Cancel
 </button>
 <button type="submit" disabled={isPending}
 className="px-4 py-2 text-sm bg-primary-light text-white rounded-lg hover:bg-primary-light/90 disabled:opacity-60 flex items-center gap-2">
 {isPending && <SmallSpinner />}
 {editingJob ?'Save Changes' :'Add Job'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </main>
 );
};

export default JobTracker;

import React, { useState } from'react';
import { useQuery } from'@tanstack/react-query';
import { Link } from'react-router';
import {
 ArrowUp, ArrowDown, Send, Mail, MailOpen, MessageSquare,
 AlertCircle, FileText, Users, Briefcase, RefreshCw
} from'lucide-react';
import ReactECharts from'echarts-for-react';
import { ApplyDirLoader } from'./ui/ApplyDirLoader';
import { getAnalytics } from'../services/apiAnalytics';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, trend, icon: Icon, color }) {
 const isUp = trend > 0;
 return (
 <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark p-6">
 <div className="flex items-center justify-between mb-3">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
 <Icon className="w-5 h-5" />
 </div>
 {trend != null && (
 <span className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ?'text-emerald-600' :'text-red-500'}`}>
 {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
 {Math.abs(trend)}%
 </span>
 )}
 </div>
 <p className="text-2xl font-bold text-black">{value}</p>
 <p className="text-xs text-secondary-dark mt-0.5">{label}</p>
 {sub && <p className="text-[10px] text-secondary-dark/60 mt-1">{sub}</p>}
 </div>
 );
}

function StatusBadge({ status }) {
 const map = {
 sent:'bg-blue-50 text-blue-700',
 opened:'bg-purple-50 text-purple-700',
 replied:'bg-emerald-50 text-emerald-700',
 bounced:'bg-red-50 text-red-500',
 draft:'bg-neutral-dark text-secondary-dark',
 approved:'bg-amber-50 text-amber-700',
 };
 return (
 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${map[status] ||'bg-neutral-dark text-secondary-dark'}`}>
 {status}
 </span>
 );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const Analytics = () => {
 const [days, setDays] = useState(30);

 const { data, isLoading: loading, refetch: fetchAnalytics } = useQuery({
 queryKey: ['analytics', days],
 queryFn: () => getAnalytics(days),
 });

 if (loading) {
 return (
 <main className="w-full max-w-[1600px] mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[60vh]">
 <ApplyDirLoader.Inline message="Loading analytics..." />
 </main>
 );
 }

 if (!data) {
 return (
 <main className="w-full max-w-[1600px] mx-auto p-4 md:p-8 text-center text-secondary-dark/60">
 <AlertCircle className="w-8 h-8 mx-auto mb-2" />
 Failed to load analytics.
 </main>
 );
 }

 const { summary, pipeline, daily_activity, status_breakdown, recent_emails } = data;
 const funnel = data.funnel || [];
 const inboxPerf = data.inbox_performance || [];
 const strategyPerf = data.strategy_performance || [];
 const anyStrategySends = strategyPerf.some(s => s.sent > 0 || s.drafts > 0);
 const bestReplyRate = Math.max(...strategyPerf.map(s => (s.sent >= 5 ? s.reply_rate : 0)), 0);

 // ── Charts ──────────────────────────────────────────────────────────────────

 const dates = daily_activity.map(d => d.date);
 const sentArr = daily_activity.map(d => d.sent);
 const openArr = daily_activity.map(d => d.opened);
 const repArr = daily_activity.map(d => d.replied);

 const activityChart = {
 animation: false,
 tooltip: { trigger:'axis', backgroundColor:'#fff', borderColor:'#F3F4F6', borderWidth: 1, textStyle: { color:'#1A1A1A' } },
 legend: { data: ['Sent','Opened','Replied'], bottom: 0 },
 grid: { left:'3%', right:'4%', bottom:'12%', top:'4%', containLabel: true },
 xAxis: { type:'category', boundaryGap: false, data: dates, axisLabel: { color:'#6B7280', fontSize: 11 } },
 yAxis: { type:'value', minInterval: 1, axisLabel: { color:'#6B7280' } },
 series: [
 { name:'Sent', type:'line', smooth: true, showSymbol: false, data: sentArr, lineStyle: { width: 3, color:'rgba(87,181,231,1)' }, areaStyle: { color: { type:'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color:'rgba(87,181,231,0.2)' }, { offset: 1, color:'rgba(87,181,231,0.01)' }] } } },
 { name:'Opened', type:'line', smooth: true, showSymbol: false, data: openArr, lineStyle: { width: 3, color:'rgba(141,211,199,1)' }, areaStyle: { color: { type:'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color:'rgba(141,211,199,0.2)' }, { offset: 1, color:'rgba(141,211,199,0.01)' }] } } },
 { name:'Replied', type:'line', smooth: true, showSymbol: false, data: repArr, lineStyle: { width: 3, color:'rgba(251,191,114,1)' }, areaStyle: { color: { type:'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color:'rgba(251,191,114,0.2)' }, { offset: 1, color:'rgba(251,191,114,0.01)' }] } } },
 ],
 };

 const STATUS_COLORS = {
 sent:'rgba(87,181,231,1)',
 opened:'rgba(141,211,199,1)',
 replied:'rgba(80,200,120,1)',
 bounced:'rgba(252,141,98,1)',
 draft:'rgba(209,213,219,1)',
 approved:'rgba(251,191,114,1)',
 };

 const donutChart = {
 animation: false,
 tooltip: { trigger:'item', formatter:'{b}: {c} ({d}%)', backgroundColor:'#fff', borderColor:'#F3F4F6', borderWidth: 1 },
 legend: { orient:'vertical', right: 10, top:'center', textStyle: { color:'#1A1A1A' } },
 series: [{
 name:'Emails',
 type:'pie',
 radius: ['42%','68%'],
 avoidLabelOverlap: false,
 label: { show: false },
 emphasis: { label: { show: false } },
 data: status_breakdown.map(s => ({
 value: s.count,
 name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
 itemStyle: { color: STATUS_COLORS[s.status] ||'#F3F4F6', borderRadius: 4, borderColor:'#fff', borderWidth: 2 },
 })),
 }],
 };

 const pipelineChart = {
 animation: false,
 tooltip: { trigger:'axis', axisPointer: { type:'shadow' }, backgroundColor:'#fff', borderColor:'#F3F4F6', borderWidth: 1 },
 grid: { left:'3%', right:'4%', bottom:'3%', top:'4%', containLabel: true },
 xAxis: { type:'category', data: ['Total Jobs','Approved','Rejected','Manual Apply','Contacts Found'], axisLabel: { color:'#6B7280', fontSize: 11 } },
 yAxis: { type:'value', minInterval: 1, axisLabel: { color:'#6B7280' } },
 series: [{
 type:'bar',
 barWidth:'50%',
 data: [
 { value: pipeline.total_jobs, itemStyle: { color:'rgba(99,102,241,1)', borderRadius: [6,6,0,0] } },
 { value: pipeline.approved_jobs, itemStyle: { color:'rgba(16,185,129,1)', borderRadius: [6,6,0,0] } },
 { value: pipeline.rejected_jobs, itemStyle: { color:'rgba(239,68,68,1)', borderRadius: [6,6,0,0] } },
 { value: pipeline.manual_apply, itemStyle: { color:'rgba(245,158,11,1)', borderRadius: [6,6,0,0] } },
 { value: pipeline.total_contacts, itemStyle: { color:'rgba(87,181,231,1)', borderRadius: [6,6,0,0] } },
 ],
 }],
 };

 return (
 <main className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in">

 {/* Header */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <div>
 <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-black to-secondary-dark">
 Analytics
 </h1>
 <p className="text-sm text-secondary-dark mt-1">Real-time data from your outreach pipeline</p>
 </div>
 <div className="flex items-center gap-2">
 {[7, 30, 90].map(d => (
 <button
 key={d}
 onClick={() => setDays(d)}
 className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${days === d ?'bg-black text-white' :'bg-white border border-neutral-dark text-secondary-dark hover:bg-neutral'}`}
 >
 {d}d
 </button>
 ))}
 <button
 onClick={fetchAnalytics}
 className="p-2 rounded-lg bg-white border border-neutral-dark text-secondary-dark hover:bg-neutral transition-all"
 >
 <RefreshCw className="w-4 h-4" />
 </button>
 </div>
 </div>

 {/* Primary metrics — selected window. Reply rate leads; open rate is flagged. */}
 <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
 <StatCard label="Reply Rate" value={`${summary.reply_rate}%`} sub="the metric that matters" icon={MessageSquare} color="bg-emerald-50 text-emerald-600" />
 <StatCard label="Emails Sent" value={summary.total_sent} sub={`last ${days} days`} icon={Send} color="bg-blue-50 text-blue-500" />
 <StatCard label="Replies" value={summary.total_replied} sub={`last ${days} days`} icon={MessageSquare} color="bg-green-50 text-green-600" />
 <StatCard label="Open Rate" value={`${summary.open_rate}%`} sub="approx · incl. prefetch" icon={MailOpen} color="bg-purple-50 text-purple-500" />
 </div>

 {/* Pipeline state — current, not time-bound */}
 <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
 <StatCard label="Contacts Found" value={pipeline.total_contacts} sub="all time" icon={Users} color="bg-amber-50 text-amber-500" />
 <StatCard label="Drafts" value={summary.total_drafts} sub="ready to review" icon={FileText} color="bg-neutral-dark text-secondary-dark" />
 <StatCard label="Awaiting Send" value={summary.total_approved} sub="approved/queued" icon={Mail} color="bg-amber-50 text-amber-500" />
 <StatCard label="Opened" value={summary.total_opened} sub={`last ${days} days`} icon={MailOpen} color="bg-violet-50 text-violet-500" />
 </div>

 {/* Conversion Funnel — where opportunities drop off (all time) */}
 <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark p-6">
 <h2 className="text-base font-bold text-black-light">Conversion Funnel</h2>
 <p className="text-xs text-secondary-dark mt-0.5 mb-4">Scrape → reply, all time. The % is how many carry through to the next stage.</p>
 <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
 {funnel.map((f, i) => (
 <React.Fragment key={f.stage}>
 {i > 0 && (
 <div className="flex items-center shrink-0">
 <span className={`text-[11px] font-bold px-1 ${f.rate_from_prev >= 50 ?'text-emerald-600' : f.rate_from_prev >= 25 ?'text-amber-600' :'text-red-500'}`}>
 {f.rate_from_prev}%›
 </span>
 </div>
 )}
 <div className="flex-1 min-w-[100px] text-center bg-neutral rounded-xl p-3 border border-neutral-dark">
 <p className="text-2xl font-bold text-black">{f.count}</p>
 <p className="text-[11px] text-secondary-dark mt-0.5">{f.stage}</p>
 </div>
 </React.Fragment>
 ))}
 </div>
 </div>

 {/* Per-inbox performance — selected window */}
 <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark overflow-hidden">
 <div className="px-6 py-4 border-b border-neutral-dark">
 <h2 className="text-base font-bold text-black-light">Per-Inbox Performance</h2>
 <p className="text-xs text-secondary-dark mt-0.5">Which inbox is getting replies (last {days} days).</p>
 </div>
 {inboxPerf.length === 0 ? (
 <div className="py-10 text-center text-sm text-secondary-dark/60">
 No per-inbox data for this window yet — it starts accruing from your next send.
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm border-collapse">
 <thead>
 <tr className="bg-neutral/70 text-xs uppercase tracking-wider text-secondary-dark font-semibold border-b border-neutral-dark">
 <th className="px-5 py-3">Inbox</th>
 <th className="px-5 py-3 text-right">Sent</th>
 <th className="px-5 py-3 text-right">Opened</th>
 <th className="px-5 py-3 text-right">Replied</th>
 <th className="px-5 py-3 text-right">Reply Rate</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral">
 {inboxPerf.map(r => (
 <tr key={r.email} className="hover:bg-neutral/50 transition-colors">
 <td className="px-5 py-3 font-medium text-black">{r.email}</td>
 <td className="px-5 py-3 text-right text-secondary-dark">{r.sent}</td>
 <td className="px-5 py-3 text-right text-secondary-dark">{r.opened}</td>
 <td className="px-5 py-3 text-right text-secondary-dark">{r.replied}</td>
 <td className="px-5 py-3 text-right font-semibold text-emerald-600">{r.reply_rate}%</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Daily Activity Chart */}
 <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark p-6">
 <h2 className="text-base font-bold text-black-light mb-4">Daily Email Activity</h2>
 {sentArr.every(v => v === 0) && openArr.every(v => v === 0) && repArr.every(v => v === 0) ? (
 <div className="h-48 flex items-center justify-center text-secondary-dark/60 text-sm">
 No emails sent in the last {days} days yet.
 </div>
 ) : (
 <ReactECharts option={activityChart} style={{ height:'240px' }} />
 )}
 </div>

 {/* Donut + Pipeline side by side */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark p-6">
 <h2 className="text-base font-bold text-black-light mb-4">Email Status Breakdown</h2>
 {status_breakdown.length === 0 ? (
 <div className="h-48 flex items-center justify-center text-secondary-dark/60 text-sm">No emails yet.</div>
 ) : (
 <ReactECharts option={donutChart} style={{ height:'220px' }} />
 )}
 </div>
 <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark p-6">
 <h2 className="text-base font-bold text-black-light mb-4">Job Pipeline</h2>
 <ReactECharts option={pipelineChart} style={{ height:'220px' }} />
 </div>
 </div>

 {/* Strategy performance — the cold-email A/B test readout */}
 <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark overflow-hidden">
 <div className="px-6 py-4 border-b border-neutral-dark">
 <h2 className="text-base font-bold text-black-light">Strategy Performance</h2>
 <p className="text-xs text-secondary-dark mt-0.5">
 Each generated email is assigned a strategy in rotation — compare reply rates once a strategy passes ~30 sends, then double down on the winner.
 </p>
 </div>
 {!anyStrategySends ? (
 <div className="py-12 text-center text-sm text-secondary-dark/60">
 <MessageSquare className="w-8 h-8 mx-auto mb-2 text-secondary-dark/30" />
 No strategy data yet — generate and send emails and the comparison fills in here.
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm border-collapse">
 <thead>
 <tr className="bg-neutral/70 text-xs uppercase tracking-wider text-secondary-dark font-semibold border-b border-neutral-dark">
 <th className="px-5 py-3">Strategy</th>
 <th className="px-5 py-3 text-right">In pipeline</th>
 <th className="px-5 py-3 text-right">Sent</th>
 <th className="px-5 py-3 text-right">Opened</th>
 <th className="px-5 py-3 text-right">Replied</th>
 <th className="px-5 py-3 text-right">Open rate</th>
 <th className="px-5 py-3 text-right">Reply rate</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral">
 {strategyPerf.map(s => {
 const isLeader = s.sent >= 5 && s.reply_rate === bestReplyRate && bestReplyRate > 0;
 return (
 <tr key={s.strategy} className={`transition-colors ${isLeader ?'bg-emerald-50/50' :'hover:bg-neutral/50'}`}>
 <td className="px-5 py-3 font-medium text-black">
 {s.label}
 {isLeader && (
 <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase">Leading</span>
 )}
 {s.sent > 0 && s.sent < 30 && (
 <span className="ml-2 text-[10px] text-secondary-dark/50">({s.sent}/30 for signal)</span>
 )}
 </td>
 <td className="px-5 py-3 text-right text-secondary-dark">{s.drafts}</td>
 <td className="px-5 py-3 text-right text-secondary-dark">{s.sent}</td>
 <td className="px-5 py-3 text-right text-secondary-dark">{s.opened}</td>
 <td className="px-5 py-3 text-right text-secondary-dark">{s.replied}</td>
 <td className="px-5 py-3 text-right font-semibold text-purple-600">{s.open_rate}%</td>
 <td className="px-5 py-3 text-right font-semibold text-emerald-600">{s.reply_rate}%</td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Recent sent emails table */}
 <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark overflow-hidden">
 <div className="px-6 py-4 border-b border-neutral-dark flex items-center justify-between gap-3">
 <div>
 <h2 className="text-base font-bold text-black-light">Recent Sent Emails</h2>
 <p className="text-xs text-secondary-dark mt-0.5">Your 20 most recent · full history lives on the Outreach page</p>
 </div>
 <Link to="/dashboard/outreach" className="shrink-0 text-xs font-semibold text-primary-dark hover:text-primary-light whitespace-nowrap">
 View all →
 </Link>
 </div>
 {recent_emails.length === 0 ? (
 <div className="py-16 text-center text-sm text-secondary-dark/60">
 <Send className="w-8 h-8 mx-auto mb-2 text-secondary-dark/30" />
 No emails sent yet. Approve and send emails from the Outreach page.
 </div>
 ) : (
 <div className="overflow-auto max-h-96">
 <table className="w-full text-left text-sm border-collapse">
 <thead className="sticky top-0 z-10">
 <tr className="bg-neutral text-xs uppercase tracking-wider text-secondary-dark font-semibold border-b border-neutral-dark">
 <th className="px-5 py-3">Company</th>
 <th className="px-5 py-3 hidden md:table-cell">Role</th>
 <th className="px-5 py-3 hidden lg:table-cell">Recipient</th>
 <th className="px-5 py-3">Status</th>
 <th className="px-5 py-3 hidden md:table-cell">Sent</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral">
 {recent_emails.map(e => (
 <tr key={e.id} className="hover:bg-neutral/50 transition-colors">
 <td className="px-5 py-3 font-medium text-black">{e.company}</td>
 <td className="px-5 py-3 text-secondary-dark hidden md:table-cell">{e.role}</td>
 <td className="px-5 py-3 hidden lg:table-cell">
 <p className="text-secondary-dark">{e.recipient}</p>
 <p className="text-xs text-secondary-dark/60">{e.email}</p>
 </td>
 <td className="px-5 py-3"><StatusBadge status={e.status} /></td>
 <td className="px-5 py-3 text-secondary-dark/60 text-xs hidden md:table-cell">
 {e.sent_at ? new Date(e.sent_at).toLocaleDateString() :'—'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 </main>
 );
};

export default Analytics;

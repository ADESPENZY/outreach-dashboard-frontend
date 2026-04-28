import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowUp, ArrowDown, Send, Mail, MailOpen, MessageSquare,
  AlertCircle, FileText, Users, Briefcase, Loader2, RefreshCw
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import api from '../api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, trend, icon: Icon, color }) {
  const isUp = trend > 0;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend != null && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
            {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 font-montserrat">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    sent:     'bg-blue-50 text-blue-700',
    opened:   'bg-purple-50 text-purple-700',
    replied:  'bg-emerald-50 text-emerald-700',
    bounced:  'bg-red-50 text-red-500',
    draft:    'bg-gray-100 text-gray-500',
    approved: 'bg-amber-50 text-amber-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const Analytics = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays]       = useState(30);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/outreach/analytics/', { params: { days } });
      setData(res.data);
    } catch (err) {
      console.error('Analytics fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) {
    return (
      <main className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-light mb-3" />
        <p className="text-sm text-gray-400 animate-pulse">Loading analytics...</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="p-6 text-center text-gray-400">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        Failed to load analytics.
      </main>
    );
  }

  const { summary, pipeline, daily_activity, status_breakdown, recent_emails } = data;

  // ── Charts ──────────────────────────────────────────────────────────────────

  const dates   = daily_activity.map(d => d.date);
  const sentArr = daily_activity.map(d => d.sent);
  const openArr = daily_activity.map(d => d.opened);
  const repArr  = daily_activity.map(d => d.replied);

  const activityChart = {
    animation: false,
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { color: '#1f2937' } },
    legend: { data: ['Sent', 'Opened', 'Replied'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '4%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: dates, axisLabel: { color: '#9ca3af', fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#9ca3af' } },
    series: [
      { name: 'Sent',    type: 'line', smooth: true, showSymbol: false, data: sentArr, lineStyle: { width: 3, color: 'rgba(87,181,231,1)' },   areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(87,181,231,0.2)' }, { offset: 1, color: 'rgba(87,181,231,0.01)' }] } } },
      { name: 'Opened',  type: 'line', smooth: true, showSymbol: false, data: openArr, lineStyle: { width: 3, color: 'rgba(141,211,199,1)' },  areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(141,211,199,0.2)' }, { offset: 1, color: 'rgba(141,211,199,0.01)' }] } } },
      { name: 'Replied', type: 'line', smooth: true, showSymbol: false, data: repArr,  lineStyle: { width: 3, color: 'rgba(251,191,114,1)' },  areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(251,191,114,0.2)' }, { offset: 1, color: 'rgba(251,191,114,0.01)' }] } } },
    ],
  };

  const STATUS_COLORS = {
    sent:     'rgba(87,181,231,1)',
    opened:   'rgba(141,211,199,1)',
    replied:  'rgba(80,200,120,1)',
    bounced:  'rgba(252,141,98,1)',
    draft:    'rgba(209,213,219,1)',
    approved: 'rgba(251,191,114,1)',
  };

  const donutChart = {
    animation: false,
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', backgroundColor: '#fff', borderColor: '#e5e7eb', borderWidth: 1 },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: '#374151' } },
    series: [{
      name: 'Emails',
      type: 'pie',
      radius: ['42%', '68%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: { label: { show: false } },
      data: status_breakdown.map(s => ({
        value: s.count,
        name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
        itemStyle: { color: STATUS_COLORS[s.status] || '#d1d5db', borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      })),
    }],
  };

  const pipelineChart = {
    animation: false,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#fff', borderColor: '#e5e7eb', borderWidth: 1 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '4%', containLabel: true },
    xAxis: { type: 'category', data: ['Total Jobs', 'Approved', 'Rejected', 'Manual Apply', 'Contacts Found'], axisLabel: { color: '#9ca3af', fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#9ca3af' } },
    series: [{
      type: 'bar',
      barWidth: '50%',
      data: [
        { value: pipeline.total_jobs,     itemStyle: { color: 'rgba(99,102,241,1)',   borderRadius: [6,6,0,0] } },
        { value: pipeline.approved_jobs,  itemStyle: { color: 'rgba(16,185,129,1)',   borderRadius: [6,6,0,0] } },
        { value: pipeline.rejected_jobs,  itemStyle: { color: 'rgba(239,68,68,1)',    borderRadius: [6,6,0,0] } },
        { value: pipeline.manual_apply,   itemStyle: { color: 'rgba(245,158,11,1)',   borderRadius: [6,6,0,0] } },
        { value: pipeline.total_contacts, itemStyle: { color: 'rgba(87,181,231,1)',   borderRadius: [6,6,0,0] } },
      ],
    }],
  };

  return (
    <main className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-roboto">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 font-montserrat">
            Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">Real-time data from your outreach pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${days === d ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {d}d
            </button>
          ))}
          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Emails Sent"     value={summary.total_sent}    icon={Send}         color="bg-blue-50 text-blue-500" />
        <StatCard label="Open Rate"       value={`${summary.open_rate}%`}  icon={MailOpen}     color="bg-purple-50 text-purple-500" />
        <StatCard label="Reply Rate"      value={`${summary.reply_rate}%`} icon={MessageSquare} color="bg-emerald-50 text-emerald-500" />
        <StatCard label="Contacts Found"  value={pipeline.total_contacts} icon={Users}        color="bg-amber-50 text-amber-500" />
      </div>

      {/* Secondary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Drafts"          value={summary.total_drafts}   icon={FileText}  color="bg-gray-100 text-gray-500" />
        <StatCard label="Awaiting Send"   value={summary.total_approved} icon={Mail}      color="bg-amber-50 text-amber-500" />
        <StatCard label="Opened"          value={summary.total_opened}   icon={MailOpen}  color="bg-violet-50 text-violet-500" />
        <StatCard label="Replied"         value={summary.total_replied}  icon={MessageSquare} color="bg-green-50 text-green-600" />
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-bold text-gray-800 font-montserrat mb-4">Daily Email Activity</h2>
        {sentArr.every(v => v === 0) && openArr.every(v => v === 0) && repArr.every(v => v === 0) ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            No emails sent in the last {days} days yet.
          </div>
        ) : (
          <ReactECharts option={activityChart} style={{ height: '240px' }} />
        )}
      </div>

      {/* Donut + Pipeline side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-800 font-montserrat mb-4">Email Status Breakdown</h2>
          {status_breakdown.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No emails yet.</div>
          ) : (
            <ReactECharts option={donutChart} style={{ height: '220px' }} />
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-800 font-montserrat mb-4">Job Pipeline</h2>
          <ReactECharts option={pipelineChart} style={{ height: '220px' }} />
        </div>
      </div>

      {/* Recent sent emails table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800 font-montserrat">Recent Sent Emails</h2>
        </div>
        {recent_emails.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            <Send className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            No emails sent yet. Approve and send emails from the Outreach page.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-xs uppercase tracking-wider text-gray-500 font-semibold font-montserrat border-b border-gray-100">
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3 hidden md:table-cell">Role</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Recipient</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 hidden md:table-cell">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent_emails.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{e.company}</td>
                    <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{e.role}</td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <p className="text-gray-700">{e.recipient}</p>
                      <p className="text-xs text-gray-400">{e.email}</p>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-5 py-3 text-gray-400 text-xs hidden md:table-cell">
                      {e.sent_at ? new Date(e.sent_at).toLocaleDateString() : '—'}
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

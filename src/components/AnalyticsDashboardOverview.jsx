import React, { useState, useEffect } from 'react';
import { Send, MailOpen, MessageSquare, Users, Loader2 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import api from '../api';

const AnalyticsDashboardOverview = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/outreach/analytics/', { params: { days: 14 } })
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="mb-8 flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary-light" />
      </section>
    );
  }

  if (!data) return null;

  const { summary, pipeline, daily_activity } = data;

  const dates   = daily_activity.map(d => d.date);
  const sentArr = daily_activity.map(d => d.sent);
  const openArr = daily_activity.map(d => d.opened);
  const repArr  = daily_activity.map(d => d.replied);

  const activityChart = {
    animation: false,
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { color: '#1f2937' } },
    legend: { data: ['Sent', 'Opened', 'Replied'], bottom: 0, textStyle: { color: '#1f2937' } },
    grid: { left: 0, right: 0, top: 10, bottom: 30, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: dates, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#9ca3af', fontSize: 10 } },
    yAxis: { type: 'value', minInterval: 1, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { color: '#9ca3af' } },
    series: [
      { name: 'Sent',    type: 'line', smooth: true, showSymbol: false, data: sentArr, lineStyle: { width: 3, color: 'rgba(87,181,231,1)' },   areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(87,181,231,0.2)' }, { offset: 1, color: 'rgba(87,181,231,0.01)' }] } } },
      { name: 'Opened',  type: 'line', smooth: true, showSymbol: false, data: openArr, lineStyle: { width: 3, color: 'rgba(141,211,199,1)' },  areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(141,211,199,0.2)' }, { offset: 1, color: 'rgba(141,211,199,0.01)' }] } } },
      { name: 'Replied', type: 'line', smooth: true, showSymbol: false, data: repArr,  lineStyle: { width: 3, color: 'rgba(251,191,114,1)' },  areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(251,191,114,0.2)' }, { offset: 1, color: 'rgba(251,191,114,0.01)' }] } } },
    ],
  };

  const stats = [
    { label: 'Emails Sent',    value: summary.total_sent,       icon: Send,           color: 'bg-blue-50 text-blue-500' },
    { label: 'Open Rate',      value: `${summary.open_rate}%`,  icon: MailOpen,       color: 'bg-purple-50 text-purple-500' },
    { label: 'Reply Rate',     value: `${summary.reply_rate}%`, icon: MessageSquare,  color: 'bg-emerald-50 text-emerald-500' },
    { label: 'Contacts Found', value: pipeline.total_contacts,  icon: Users,          color: 'bg-amber-50 text-amber-500' },
  ];

  return (
    <section className="mb-8 space-y-4">
      <h2 className="text-base font-semibold text-gray-800 font-montserrat">Outreach Overview</h2>

      {/* Mini stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-none">{s.value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily activity chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Daily Email Activity (last 14 days)</p>
        {sentArr.every(v => v === 0) ? (
          <div className="h-40 flex items-center justify-center text-sm text-gray-400">
            No emails sent yet — start from the Outreach page.
          </div>
        ) : (
          <div className="w-full h-48">
            <ReactECharts option={activityChart} style={{ height: '100%' }} />
          </div>
        )}
      </div>
    </section>
  );
};

export default AnalyticsDashboardOverview;

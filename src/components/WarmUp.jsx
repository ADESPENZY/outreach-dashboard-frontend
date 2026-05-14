import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWarmupSessions, getWarmupStats, createWarmupSession,
  toggleWarmupSession, runWarmup, getAvailableAccounts,
} from '../services/apiWarmup';
import {
  Mail, Plus, ChevronDown, MoreHorizontal, Download, Settings, Pause, Play,
  Calendar, CheckSquare, XCircle, Send, X,
} from 'lucide-react';
import * as echarts from 'echarts';

const WarmUp = () => {
  const queryClient = useQueryClient();
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState('delivery');
  const [dateRange, setDateRange] = useState(30);
  const [dateRangeDropdownOpen, setDateRangeDropdownOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [dailyIncrease, setDailyIncrease] = useState(3);
  const [newSession, setNewSession] = useState({
    account_id: '',
    strategy: 'balanced',
    initial_daily_limit: 5,
    max_daily_limit: 50,
    daily_increase: 3,
    auto_increase: true,
  });
  const [addError, setAddError] = useState('');

  const dailySendVolumeChartRef = useRef(null);
  const deliveryMetricsChartRef = useRef(null);
  const dailyChartInstance = useRef(null);
  const deliveryChartInstance = useRef(null);

  const dateRangeOptions = [
    { label: 'Last 7 Days', value: 7 },
    { label: 'Last 30 Days', value: 30 },
    { label: 'Last 90 Days', value: 90 },
  ];

  // ── data fetching ────────────────────────────────────────────────────────

  const { data: sessions = [], isLoading: loading } = useQuery({
    queryKey: ['warmup-sessions'],
    queryFn: getWarmupSessions,
  });

  const { data: statsData } = useQuery({
    queryKey: ['warmup-stats', dateRange],
    queryFn: () => getWarmupStats(dateRange),
  });

  const toggleMutation = useMutation({
    mutationFn: (sessionId) => toggleWarmupSession(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warmup-sessions'] }),
  });

  const runWarmupMutation = useMutation({
    mutationFn: runWarmup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warmup-sessions'] }),
  });

  const addAccountMutation = useMutation({
    mutationFn: (sessionData) => createWarmupSession(sessionData),
    onSuccess: () => {
      setEmailModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['warmup-sessions'] });
    },
    onError: (err) => setAddError(err.message || 'Failed to create warmup session.'),
  });

  // ── charts ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!statsData || !dailySendVolumeChartRef.current) return;

    const chart = echarts.init(dailySendVolumeChartRef.current);
    dailyChartInstance.current = chart;

    const dates = statsData.chart_data.map(d => d.date);
    const sent  = statsData.chart_data.map(d => d.sent);
    const maxLimit = sessions.length
      ? Math.max(...sessions.map(s => s.current_daily_limit))
      : 0;
    const target = dates.map(() => maxLimit);

    chart.setOption({
      animation: false,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        textStyle: { color: '#1f2937' },
      },
      legend: {
        data: ['Emails Sent', 'Daily Target'],
        right: 10, top: 0,
        textStyle: { color: '#1f2937' },
      },
      grid: { left: 0, right: 0, top: 30, bottom: 30, containLabel: true },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#1f2937', rotate: dates.length > 14 ? 30 : 0 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLabel: { color: '#1f2937' },
      },
      series: [
        {
          name: 'Emails Sent',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: sent,
          lineStyle: { width: 3, color: 'rgba(87,181,231,1)' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(87,181,231,0.2)' },
                { offset: 1, color: 'rgba(87,181,231,0.01)' },
              ],
            },
          },
        },
        {
          name: 'Daily Target',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: target,
          lineStyle: { width: 2, type: 'dashed', color: 'rgba(141,211,199,1)' },
        },
      ],
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      chart.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [statsData, sessions]);

  useEffect(() => {
    if (!statsData || !deliveryMetricsChartRef.current) return;

    const chart = echarts.init(deliveryMetricsChartRef.current);
    deliveryChartInstance.current = chart;

    const dates = statsData.chart_data.map(d => d.date);
    const avg   = statsData.summary.avg_delivery_rate;

    // Running delivery rate approximation (flat based on overall)
    const inboxLine  = dates.map(() => avg);
    const spamLine   = dates.map(() => parseFloat(
      statsData.account_stats.length
        ? statsData.account_stats.reduce((s, a) => s + parseFloat(a.spam_pct), 0) / statsData.account_stats.length
        : 0
    ).toFixed(1));
    const bounceLine = dates.map(() => parseFloat(
      statsData.account_stats.length
        ? statsData.account_stats.reduce((s, a) => s + parseFloat(a.bounced_pct), 0) / statsData.account_stats.length
        : 0
    ).toFixed(1));

    chart.setOption({
      animation: false,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        textStyle: { color: '#1f2937' },
      },
      legend: {
        data: ['Inbox Rate', 'Spam Rate', 'Bounce Rate'],
        right: 10, top: 0,
        textStyle: { color: '#1f2937' },
      },
      grid: { left: 0, right: 0, top: 30, bottom: 30, containLabel: true },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#1f2937', rotate: dates.length > 14 ? 30 : 0 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLabel: { color: '#1f2937', formatter: '{value}%' },
        max: 100,
      },
      series: [
        {
          name: 'Inbox Rate',
          type: 'line', smooth: true, showSymbol: false,
          data: inboxLine,
          lineStyle: { width: 3, color: 'rgba(87,181,231,1)' },
        },
        {
          name: 'Spam Rate',
          type: 'line', smooth: true, showSymbol: false,
          data: spamLine,
          lineStyle: { width: 3, color: 'rgba(251,191,114,1)' },
        },
        {
          name: 'Bounce Rate',
          type: 'line', smooth: true, showSymbol: false,
          data: bounceLine,
          lineStyle: { width: 3, color: 'rgba(252,141,98,1)' },
        },
      ],
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      chart.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [statsData]);

  // ── actions ──────────────────────────────────────────────────────────────

  const handleOpenModal = async () => {
    setAddError('');
    try {
      const accounts = await getAvailableAccounts();
      setAvailableAccounts(accounts);
      setNewSession({ account_id: accounts[0]?.id || '', strategy: 'balanced', initial_daily_limit: 5, max_daily_limit: 50, daily_increase: 3, auto_increase: true });
    } catch {
      setAvailableAccounts([]);
    }
    setEmailModalOpen(true);
  };

  const handleAddAccount = () => {
    if (!newSession.account_id) {
      setAddError('Please select an account.');
      return;
    }
    setAddError('');
    addAccountMutation.mutate(newSession);
  };

  const handleToggle = (sessionId) => toggleMutation.mutate(sessionId);

  const handleRunWarmup = () => runWarmupMutation.mutate();

  // ── derived data for analytics table ─────────────────────────────────────

  const analyticsData = {
    delivery: (statsData?.account_stats || []).map(a => ({
      email: a.email,
      sent: a.sent,
      delivered: a.delivered,
      inbox: a.inbox_pct,
      spam: a.spam_pct,
      bounced: a.bounced_pct,
      status: a.is_active ? 'Active' : 'Paused',
      statusColor: a.is_active ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600',
    })),
  };

  const headers = {
    delivery: ['Email Account', 'Sent', 'Delivered', 'Inbox %', 'Spam %', 'Bounced', 'Status'],
  };

  const summary = statsData?.summary;

  // ── render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="w-full max-w-[1600px] mx-auto p-4 md:p-8 flex items-center justify-center min-h-[60vh] font-roboto">
        <p className="text-secondary-dark text-sm">Loading warmup data…</p>
      </main>
    );
  }

  return (
    <main className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-8 animate-fade-in font-roboto">
      {/* Controls */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-grow max-w-xs">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Mail className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border-none bg-white rounded-lg shadow-sm text-sm focus:ring-2 focus:ring-primary-light focus:ring-opacity-20 focus:outline-none"
                placeholder="Search email accounts…"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunWarmup}
              disabled={runWarmupMutation.isPending}
              className="px-3 py-2 text-sm font-medium rounded-button border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center whitespace-nowrap disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-1.5" />
              {runWarmupMutation.isPending ? 'Sending…' : 'Run Warmup Now'}
            </button>
            <button
              onClick={handleOpenModal}
              className="px-3 py-2 text-sm font-medium rounded-button bg-primary-light hover:bg-primary-light/90 text-white flex items-center whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Email Account
            </button>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-secondary-dark">Active Warmups</h3>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Mail className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-black font-montserrat">{summary?.active_sessions ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">{summary?.total_sessions ?? 0} total sessions</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-secondary-dark">Avg Delivery Rate</h3>
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <CheckSquare className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-black font-montserrat">
              {summary ? `${summary.avg_delivery_rate}%` : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-1">across all accounts</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-secondary-dark">Bounced</h3>
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-black font-montserrat">{summary?.bounced ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">last {dateRange} days</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-secondary-dark">Sent Today</h3>
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                <Send className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-black font-montserrat">{summary?.sent_today ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">warmup emails today</p>
          </div>
        </div>
      </section>

      {/* Account Cards */}
      <section>
        <h2 className="text-lg font-bold text-black-light font-montserrat mb-6">Connected Email Accounts</h2>
        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark p-8 text-center text-secondary-dark text-sm">
            No warmup sessions yet.{' '}
            <button onClick={handleOpenModal} className="text-primary-light underline">Add an account</button> to get started.
          </div>
        ) : (
          <div className="flex overflow-x-auto pb-2 space-x-4">
            {sessions.map(s => (
              <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-neutral-dark p-6 min-w-[300px] flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-800">{s.email}</h3>
                      <div className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-1 ${s.is_active ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                        <span className="text-xs text-gray-500">{s.is_active ? 'Active' : 'Paused'}</span>
                      </div>
                    </div>
                  </div>
                  <button className="p-1 rounded hover:bg-gray-100">
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Daily limit:</span>
                    <span className="text-xs font-medium text-gray-800">{s.current_daily_limit} / {s.max_daily_limit} emails</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Delivery rate:</span>
                    <span className="text-xs font-medium text-gray-800">{s.delivery_rate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Strategy:</span>
                    <span className="text-xs font-medium text-gray-800 capitalize">{s.strategy}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Days running:</span>
                    <span className="text-xs font-medium text-gray-800">{s.days_running}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${s.is_active ? 'bg-blue-500' : 'bg-gray-400'}`}
                      style={{ width: `${s.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Progress to max</span>
                    <span>{s.progress}%</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button className="flex-1 px-3 py-1.5 text-xs font-medium rounded-button bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center whitespace-nowrap">
                    <Settings className="w-3.5 h-3.5 mr-1" />
                    Settings
                  </button>
                  <button
                    onClick={() => handleToggle(s.id)}
                    disabled={toggleMutation.isPending && toggleMutation.variables === s.id}
                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded-button bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center whitespace-nowrap disabled:opacity-50"
                  >
                    {s.is_active ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                    {toggleMutation.isPending && toggleMutation.variables === s.id ? '…' : s.is_active ? 'Pause' : 'Resume'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Charts */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-black-light font-montserrat">Warmup Progress</h2>
          <div className="relative">
            <button
              onClick={() => setDateRangeDropdownOpen(!dateRangeDropdownOpen)}
              className="px-3 py-2 text-sm font-medium rounded-button border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center whitespace-nowrap"
            >
              <Calendar className="w-4 h-4 mr-1.5" />
              Last {dateRange} Days
              <ChevronDown className="w-4 h-4 ml-1.5" />
            </button>
            {dateRangeDropdownOpen && (
              <div className="absolute mt-1 w-40 right-0 bg-white shadow-lg rounded-lg overflow-hidden z-10">
                {dateRangeOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setDateRange(opt.value); setDateRangeDropdownOpen(false); }}
                    className="flex items-center px-4 py-2 text-sm hover:bg-gray-50 w-full text-left"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Daily Send Volume</h3>
            <div ref={dailySendVolumeChartRef} className="w-full h-64" />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Delivery Metrics</h3>
            <div ref={deliveryMetricsChartRef} className="w-full h-64" />
          </div>
        </div>
      </section>

      {/* Settings */}
      <section>
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark overflow-hidden">
          <div
            className="p-4 border-b border-gray-200 flex items-center justify-between cursor-pointer"
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            <h2 className="text-lg font-bold text-black-light font-montserrat">Warmup Settings</h2>
            <ChevronDown className={`w-6 h-6 text-gray-500 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
          </div>
          {settingsOpen && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-4">General Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Daily Increase Rate</label>
                      <div className="flex items-center">
                        <input
                          type="range" min="1" max="10" value={dailyIncrease}
                          onChange={e => setDailyIncrease(e.target.value)}
                          className="flex-1 mr-3"
                        />
                        <span className="text-sm font-medium text-gray-800 min-w-[30px]">{dailyIncrease}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Emails added per day during warmup</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Daily Limit</label>
                      <input
                        type="number" min="10" max="100" defaultValue="50"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-light focus:ring-opacity-20 focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">Maximum emails to send per day</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Apply Settings To</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-light focus:ring-opacity-20 focus:outline-none pr-8">
                        <option value="all">All Email Accounts</option>
                        {sessions.map(s => (
                          <option key={s.id} value={s.id}>{s.email}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Advanced Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Warmup Schedule</label>
                      <div className="grid grid-cols-7 gap-1">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, i) => (
                          <div key={i} className="text-center">
                            <div className="text-xs text-gray-500 mb-1">{day}</div>
                            <div className="w-8 h-8 mx-auto rounded-full bg-primary-light flex items-center justify-center">
                              <CheckSquare className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Types</label>
                      <div className="space-y-2">
                        {['Newsletters', 'Replies', 'Forwards', 'Personal Messages'].map(type => (
                          <div key={type} className="flex items-center">
                            <input type="checkbox" defaultChecked id={`type-${type}`} />
                            <label htmlFor={`type-${type}`} className="ml-2 text-sm text-gray-700">{type}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button className="px-4 py-2 text-sm font-medium rounded-button bg-primary-light hover:bg-primary-light/90 text-white whitespace-nowrap">
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Analytics Table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-black-light font-montserrat">Detailed Analytics</h2>
          <div className="flex items-center gap-2">
            <div className="bg-white rounded-full p-1 flex items-center border border-gray-200">
              {['delivery'].map(tab => (
                <button
                  key={tab}
                  className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${activeTab === tab ? 'bg-primary-light text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button className="p-2 text-gray-500 hover:text-gray-700 bg-white rounded-full border border-gray-200">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark overflow-hidden">
          {analyticsData[activeTab]?.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No data yet. Run a warmup to see stats here.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {headers[activeTab].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analyticsData[activeTab].map((row, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
                            <Mail className="w-5 h-5" />
                          </div>
                          <span className="text-sm text-gray-800">{row.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{row.sent}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{row.delivered}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{row.inbox}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{row.spam}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{row.bounced}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.statusColor}`}>{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Add Account Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800">Start Email Warmup</h3>
              <button onClick={() => setEmailModalOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              {addError && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{addError}</div>
              )}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Account</label>
                  {availableAccounts.length === 0 ? (
                    <p className="text-sm text-gray-500">All connected accounts already have a warmup session.</p>
                  ) : (
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-light focus:ring-opacity-20 focus:outline-none"
                      value={newSession.account_id}
                      onChange={e => setNewSession(prev => ({ ...prev, account_id: e.target.value }))}
                    >
                      {availableAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.email}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warmup Strategy</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-light focus:ring-opacity-20 focus:outline-none"
                    value={newSession.strategy}
                    onChange={e => setNewSession(prev => ({ ...prev, strategy: e.target.value }))}
                  >
                    <option value="conservative">Conservative (Slower, Safer)</option>
                    <option value="balanced">Balanced (Recommended)</option>
                    <option value="aggressive">Aggressive (Faster, Riskier)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Daily Limit</label>
                  <input
                    type="number" min="1" max="20"
                    value={newSession.initial_daily_limit}
                    onChange={e => setNewSession(prev => ({ ...prev, initial_daily_limit: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-light focus:ring-opacity-20 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: start with 5 emails/day</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Daily Limit</label>
                  <input
                    type="number" min="10" max="100"
                    value={newSession.max_daily_limit}
                    onChange={e => setNewSession(prev => ({ ...prev, max_daily_limit: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-light focus:ring-opacity-20 focus:outline-none"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox" id="auto-increase"
                    checked={newSession.auto_increase}
                    onChange={e => setNewSession(prev => ({ ...prev, auto_increase: e.target.checked }))}
                  />
                  <label htmlFor="auto-increase" className="ml-2 text-sm text-gray-700">
                    Automatically increase daily limit
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-button bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAccount}
                  disabled={addAccountMutation.isPending || availableAccounts.length === 0}
                  className="px-4 py-2 text-sm font-medium rounded-button bg-primary-light hover:bg-primary-light/90 text-white whitespace-nowrap disabled:opacity-50"
                >
                  {addAccountMutation.isPending ? 'Starting…' : 'Start Warmup'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default WarmUp;

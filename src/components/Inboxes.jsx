import React, { Fragment, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail, Send, MailOpen, MessageSquare, ChevronDown, ChevronUp,
  Search, Pause, Play, RefreshCw, Loader2, AlertCircle, Users,
} from 'lucide-react';
import { getInboxStats } from '../services/apiInboxes';
import { toggleGmailAccount } from '../services/apiGmail';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  Active:  { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  Warming: { dot: 'bg-amber-400',   badge: 'bg-amber-50  text-amber-700'   },
  Paused:  { dot: 'bg-red-400',     badge: 'bg-red-50    text-red-600'     },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { dot: 'bg-neutral-dark', badge: 'bg-neutral text-secondary-dark' };
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}>{status}</span>
    </div>
  );
}

function ProgressBar({ pct, color = 'bg-primary-light' }) {
  return (
    <div className="w-full h-1.5 bg-neutral-dark rounded-full">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-black font-montserrat">{value}</p>
      <p className="text-xs text-secondary-dark mt-0.5">{label}</p>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

// ─── Main Component ───────────────────────────────────────────────────────────

const Inboxes = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState([]);

  const { data, isLoading: loading, isFetching, refetch: fetchData } = useQuery({
    queryKey: ['inboxes'],
    queryFn: () => getInboxStats(),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => toggleGmailAccount(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inboxes'] }),
  });

  const handleToggle = (e, id) => {
    e.stopPropagation();
    toggleMutation.mutate(id);
  };

  const toggleRow = (id) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const accounts = data?.accounts || [];
  const summary  = data?.summary  || {};

  const filtered = accounts.filter(a => {
    const matchSearch = a.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <main className="w-full max-w-[1600px] mx-auto p-4 md:p-8 flex items-center justify-center min-h-[60vh] font-roboto">
        <Loader2 className="w-8 h-8 animate-spin text-primary-light" />
      </main>
    );
  }

  return (
    <main className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in font-roboto">

      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-black to-secondary-dark font-montserrat">
            Inboxes
          </h1>
          <p className="text-sm text-secondary-dark mt-1">
            Connected Gmail accounts and their sending health
          </p>
        </div>
        <button
          onClick={() => fetchData()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-neutral-dark text-secondary-dark text-sm hover:bg-neutral transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard label="Connected Inboxes" value={summary.total_accounts  ?? '—'} icon={Mail}         color="bg-blue-50 text-blue-500"    />
        <StatCard label="Active"             value={summary.active_accounts ?? '—'} icon={Users}        color="bg-emerald-50 text-emerald-500" />
        <StatCard label="Avg Open Rate"      value={`${summary.avg_open_rate ?? 0}%`}  icon={MailOpen}     color="bg-purple-50 text-purple-500" />
        <StatCard label="Avg Reply Rate"     value={`${summary.avg_reply_rate ?? 0}%`} icon={MessageSquare} color="bg-amber-50 text-amber-500"  />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-neutral-dark p-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-dark/50" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-dark bg-neutral text-sm text-black placeholder:text-secondary-dark/50 focus:outline-none focus:border-primary-light transition-colors"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setFilterOpen(o => !o)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-dark bg-neutral text-sm text-secondary-dark hover:bg-neutral-dark transition-colors whitespace-nowrap"
          >
            {statusFilter === 'All' ? 'All Status' : statusFilter}
            <ChevronDown className="w-4 h-4" />
          </button>
          {filterOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-white border border-neutral-dark rounded-xl shadow-lg z-10 overflow-hidden">
              {['All', 'Active', 'Warming', 'Paused'].map(s => (
                <button
                  key={s}
                  onClick={() => { setStatus(s); setFilterOpen(false); }}
                  className={`w-full px-4 py-2 text-sm text-left transition-colors ${statusFilter === s ? 'bg-primary-light/10 text-primary-dark font-semibold' : 'text-secondary-dark hover:bg-neutral'}`}
                >
                  {s === 'All' ? 'All Status' : s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-dark overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-secondary-dark/60">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-secondary-dark/30" />
            {accounts.length === 0
              ? 'No Gmail accounts connected yet. Add one from Connected Accounts.'
              : 'No accounts match your filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-neutral/70 text-xs uppercase tracking-wider text-secondary-dark font-semibold font-montserrat border-b border-neutral-dark">
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Daily Quota</th>
                  <th className="px-5 py-3 hidden md:table-cell">Sends</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Open Rate</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Reply Rate</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral">
                {filtered.map(account => {
                  const isExpanded = expandedRows.includes(account.id);
                  const quotaPct   = account.daily_send_limit
                    ? (account.sent_today / account.daily_send_limit) * 100
                    : 0;

                  return (
                    <Fragment key={account.id}>
                      <tr
                        onClick={() => toggleRow(account.id)}
                        className="hover:bg-neutral/50 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-light/10 flex items-center justify-center shrink-0">
                              <Mail className="w-4 h-4 text-primary-dark" />
                            </div>
                            <span className="font-medium text-black truncate max-w-[180px]">{account.email}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={account.status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="w-28">
                            <div className="flex justify-between text-xs text-secondary-dark mb-1">
                              <span>{account.sent_today}/{account.daily_send_limit}</span>
                              <span>{Math.round(quotaPct)}%</span>
                            </div>
                            <ProgressBar pct={quotaPct} color={account.status === 'Paused' ? 'bg-neutral-dark' : 'bg-primary-light'} />
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <div className="flex items-center gap-1 text-secondary-dark">
                            <Send className="w-3.5 h-3.5" />
                            <span>{account.activity.total_sent}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell text-secondary-dark">
                          {account.performance.open_rate}%
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell text-secondary-dark">
                          {account.performance.reply_rate}%
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={e => handleToggle(e, account.id)}
                              disabled={toggleMutation.isPending && toggleMutation.variables === account.id}
                              title={account.is_active ? 'Pause account' : 'Activate account'}
                              className="w-8 h-8 flex items-center justify-center rounded-full text-secondary-dark hover:bg-neutral-dark disabled:opacity-50 transition-colors"
                            >
                              {toggleMutation.isPending && toggleMutation.variables === account.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : account.is_active
                                  ? <Pause className="w-4 h-4" />
                                  : <Play className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); toggleRow(account.id); }}
                              className="w-8 h-8 flex items-center justify-center rounded-full text-secondary-dark hover:bg-neutral-dark transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan="7" className="px-5 py-4 bg-neutral/40">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                              {/* Recent activity */}
                              <div>
                                <h4 className="text-xs font-bold text-secondary-dark/60 uppercase tracking-wider mb-3">Recent Emails</h4>
                                {account.recent_emails.length === 0 ? (
                                  <p className="text-sm text-secondary-dark/60">No emails sent yet.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {account.recent_emails.map((email, i) => (
                                      <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-neutral-dark">
                                        <div className="w-7 h-7 rounded-full bg-primary-light/10 flex items-center justify-center shrink-0 mt-0.5">
                                          <Mail className="w-3.5 h-3.5 text-primary-dark" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm text-black truncate">{email.subject}</p>
                                          <p className="text-xs text-secondary-dark truncate">To: {email.recipient_email}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-dark text-secondary-dark font-semibold uppercase">
                                              {email.status}
                                            </span>
                                            <span className="text-[10px] text-secondary-dark/60">{formatDate(email.sent_at)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Performance or Warmup */}
                              <div>
                                {account.status === 'Warming' && account.warmup ? (
                                  <>
                                    <h4 className="text-xs font-bold text-secondary-dark/60 uppercase tracking-wider mb-3">Warmup Progress</h4>
                                    <div className="space-y-3">
                                      <div>
                                        <div className="flex justify-between text-xs text-secondary-dark mb-1">
                                          <span>Progress</span>
                                          <span className="font-semibold text-black">{account.warmup.progress}%</span>
                                        </div>
                                        <ProgressBar pct={account.warmup.progress} color="bg-amber-400" />
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        {[
                                          ['Strategy',      account.warmup.strategy],
                                          ['Days Running',  `${account.warmup.days_running} days`],
                                          ['Current Limit', `${account.warmup.current_daily_limit} / day`],
                                          ['Max Limit',     `${account.warmup.max_daily_limit} / day`],
                                        ].map(([label, val]) => (
                                          <div key={label} className="bg-white rounded-xl p-3 border border-neutral-dark">
                                            <p className="text-[10px] font-bold text-secondary-dark/60 uppercase tracking-wider">{label}</p>
                                            <p className="text-sm font-semibold text-black capitalize mt-0.5">{val}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <h4 className="text-xs font-bold text-secondary-dark/60 uppercase tracking-wider mb-3">Performance</h4>
                                    <div className="space-y-3">
                                      {[
                                        ['Open Rate',   account.performance.open_rate,   'bg-blue-500'],
                                        ['Reply Rate',  account.performance.reply_rate,  'bg-emerald-500'],
                                        ['Bounce Rate', account.performance.bounce_rate, 'bg-red-400'],
                                      ].map(([label, val, color]) => (
                                        <div key={label}>
                                          <div className="flex justify-between text-xs text-secondary-dark mb-1">
                                            <span>{label}</span>
                                            <span className="font-semibold text-black">{val}%</span>
                                          </div>
                                          <ProgressBar pct={val} color={color} />
                                        </div>
                                      ))}
                                      <div className="grid grid-cols-3 gap-2 mt-2">
                                        {[
                                          ['Sent',    account.activity.total_sent],
                                          ['Opened',  account.activity.total_opened],
                                          ['Replied', account.activity.total_replied],
                                        ].map(([label, val]) => (
                                          <div key={label} className="bg-white rounded-xl p-3 border border-neutral-dark text-center">
                                            <p className="text-lg font-bold text-black">{val}</p>
                                            <p className="text-[10px] text-secondary-dark/60 uppercase tracking-wider">{label}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
};

export default Inboxes;

import React, { useState, useEffect, useCallback } from 'react';
import { MoreHorizontal, RefreshCw, Loader2 } from 'lucide-react';
import { getInboxStats } from '../services/apiInboxes';

function timeAgo(date) {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60)  return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

const STATUS_DOT = {
  Active:  'bg-emerald-500',
  Warming: 'bg-amber-400',
  Paused:  'bg-red-400',
};

const InboxOverview = () => {
  const [accounts, setAccounts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [fetchedAt, setFetchedAt]   = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInboxStats();
      setAccounts(res.accounts);
      setFetchedAt(new Date());
    } catch (err) {
      console.error('InboxOverview fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <section className="mb-8 font-roboto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-black">Inbox Overview</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-secondary-dark">
            {fetchedAt ? `Updated ${timeAgo(fetchedAt)}` : 'Loading…'}
          </span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 rounded-full hover:bg-neutral-dark disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-secondary-dark ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && accounts.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary-light" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-dark p-8 text-center text-sm text-secondary-dark">
          No Gmail accounts connected yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(account => (
            <div key={account.id} className="bg-white rounded-xl shadow-sm border border-neutral-dark p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-black truncate">{account.email}</p>
                  <div className="flex items-center mt-1">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT[account.status] || 'bg-neutral-dark'} mr-1.5 shrink-0`} />
                    <span className="text-xs font-medium text-secondary-dark">
                      {account.status === 'Warming' && account.warmup
                        ? `Warming (Day ${account.warmup.days_running})`
                        : account.status}
                    </span>
                  </div>
                </div>
                <button className="p-1 rounded hover:bg-neutral-dark shrink-0">
                  <MoreHorizontal className="w-5 h-5 text-secondary-dark" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-secondary-dark/60">Daily Quota</p>
                  <p className="text-lg font-semibold text-black mt-1">
                    {account.sent_today}/{account.daily_send_limit}
                  </p>
                  <div className="w-full h-1.5 bg-neutral-dark rounded-full mt-2">
                    <div
                      className="h-1.5 bg-primary-light rounded-full transition-all"
                      style={{ width: `${Math.min((account.sent_today / account.daily_send_limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary-dark/60">
                    {account.status === 'Warming' ? 'Warmup Progress' : 'Total Sent'}
                  </p>
                  <p className="text-lg font-semibold text-black mt-1">
                    {account.status === 'Warming' && account.warmup
                      ? `${account.warmup.progress}%`
                      : account.activity.total_sent}
                  </p>
                  {account.status === 'Warming' && account.warmup ? (
                    <div className="w-full h-1.5 bg-neutral-dark rounded-full mt-2">
                      <div
                        className="h-1.5 bg-amber-400 rounded-full transition-all"
                        style={{ width: `${account.warmup.progress}%` }}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-secondary-dark/60 mt-2">all time</p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-secondary-dark/60">Open Rate</p>
                  <p className="text-lg font-semibold text-black mt-1">
                    {account.performance.open_rate}%
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary-dark/60">Reply Rate</p>
                  <p className="text-lg font-semibold text-black mt-1">
                    {account.performance.reply_rate}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default InboxOverview;

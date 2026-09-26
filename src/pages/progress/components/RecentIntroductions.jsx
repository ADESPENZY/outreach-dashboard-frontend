import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Mail } from 'lucide-react';

import { getProgressIntroductions } from '../../../services/apiProgress';
import { timeAgo } from '../utils/format';
import { RISE } from '../animations';

// The roster behind the numbers: who was written to, where, and what came back.
//
// A real <table> on md+, stacked cards below it. DESIGN_GUIDE §5 is explicit
// that a wide table must not ship to phones — six columns at 375px would
// either scroll sideways or crush every cell to two characters.

const PAGE_SIZE = 10;

// §1 status palette. `draft`/`approved` never appear here (the endpoint only
// returns rows with a sent_at), and `failed` is shown for completeness rather
// than silently rendering an unstyled pill.
const STATUS_PILL = {
  sent:     { label: 'Sent',     className: 'bg-blue-50 text-blue-500 border-blue-200' },
  opened:   { label: 'Sent',     className: 'bg-blue-50 text-blue-500 border-blue-200' },
  replied:  { label: 'Replied',  className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  bounced:  { label: 'Bounced',  className: 'bg-red-50 text-red-600 border-red-200' },
  failed:   { label: 'Failed',   className: 'bg-red-50 text-red-600 border-red-200' },
};

// 'opened' shows as Sent on purpose: the tracking pixel is off, so the only
// thing that still sets it is an auto-reply landing. Calling that "Opened"
// would report a vacation responder as engagement.
function StatusPill({ status }) {
  const pill = STATUS_PILL[status] ?? STATUS_PILL.sent;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${pill.className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
      {pill.label}
    </span>
  );
}

function FollowupCount({ count }) {
  if (!count) return <span className="text-secondary-dark/50">—</span>;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 tabular-nums">
      {count}
    </span>
  );
}

function sentLabel(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function TableSkeleton() {
  return (
    <div className="px-4 md:px-6 py-5 space-y-3 animate-pulse" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-4 flex-1 rounded bg-neutral-dark" />
          <div className="h-4 w-24 rounded bg-neutral-dark/70 hidden md:block" />
          <div className="h-5 w-16 rounded-full bg-neutral-dark/60 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default function RecentIntroductions() {
  // Pages are appended in local state rather than useInfiniteQuery: the cursor
  // is a timestamp from the last row, so the list is append-only and never
  // needs to re-fetch a page it already holds.
  const [olderPages, setOlderPages] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['progress-introductions', PAGE_SIZE],
    queryFn: () => getProgressIntroductions({ limit: PAGE_SIZE }),
  });

  // A refetch restarts the list from page 1, so pages fetched against the old
  // first page must not survive it.
  useEffect(() => { setOlderPages([]); }, [data]);

  // The cursor is DERIVED from the last page in hand, never stored by a side
  // effect inside queryFn. Setting it there looked fine on a cold load and
  // silently broke on a warm one: React Query serves cached data without
  // re-running queryFn, so returning to this page left cursor null and hid
  // "Load more" while more rows existed.
  const tail = olderPages.length ? olderPages[olderPages.length - 1] : data;
  const cursor = tail?.next_before ?? null;
  const hasMore = Boolean(tail?.has_more);

  const rows = [...(data?.items ?? []), ...olderPages.flatMap((p) => p.items ?? [])];

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await getProgressIntroductions({ limit: PAGE_SIZE, before: cursor });
      setOlderPages((p) => [...p, page]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <motion.section
      variants={RISE}
      className="bg-white rounded-2xl border border-neutral-dark shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      <div className="px-4 md:px-6 py-5 border-b border-neutral-dark flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-black-light font-montserrat">Recent introductions</h2>
          <p className="text-xs text-secondary-dark mt-0.5">
            Who your headhunter wrote to, and what came back.
          </p>
        </div>
        <Link
          to="/dashboard/introductions"
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-sm font-semibold text-secondary-dark hover:text-black-light hover:bg-neutral transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        >
          View all
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <p className="text-sm text-secondary-dark px-4 md:px-6 py-10 text-center">
          Couldn't load your introductions.
        </p>
      ) : rows.length === 0 ? (
        <div className="px-6 py-12 flex flex-col items-center text-center">
          <span className="w-12 h-12 rounded-2xl bg-neutral flex items-center justify-center mb-3">
            <Mail className="w-5 h-5 text-secondary-dark" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-black-light">No introductions sent yet</p>
          <p className="text-xs text-secondary-dark mt-1 max-w-xs leading-relaxed">
            Approve one from Opportunities and it will appear here the moment it sends.
          </p>
        </div>
      ) : (
        <>
          {/* ── Desktop: a real table ─────────────────────────────────── */}
          <div className="hidden md:block px-2 md:px-4 py-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-dark">
                  {['Hiring manager', 'Company', 'Role', 'Sent', 'Status', 'Follow-ups'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-2 py-3 text-[11px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/60 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-dark/70">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral/60 transition-colors">
                    <td className="px-2 py-3 text-sm font-semibold text-black-light max-w-[12rem] truncate">
                      {r.contact}
                    </td>
                    <td className="px-2 py-3 text-sm text-black-light max-w-[10rem] truncate">
                      {r.company}
                    </td>
                    <td className="px-2 py-3 text-sm text-secondary-dark max-w-[12rem] truncate">
                      {r.role}
                    </td>
                    <td className="px-2 py-3 text-sm text-secondary-dark whitespace-nowrap tabular-nums">
                      {sentLabel(r.sent_at)}
                    </td>
                    <td className="px-2 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-2 py-3"><FollowupCount count={r.followup_count} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile: stacked cards ─────────────────────────────────── */}
          <ul className="md:hidden divide-y divide-neutral-dark/70">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-black-light truncate">{r.contact}</p>
                    <p className="text-sm text-black-light truncate mt-0.5">{r.company}</p>
                    <p className="text-xs text-secondary-dark truncate mt-0.5">{r.role}</p>
                  </div>
                  <StatusPill status={r.status} />
                </div>
                <div className="flex items-center gap-3 mt-2.5 text-xs text-secondary-dark">
                  <span className="whitespace-nowrap">{sentLabel(r.sent_at)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="whitespace-nowrap">{timeAgo(r.sent_at)}</span>
                  {r.followup_count > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="whitespace-nowrap">
                        {r.followup_count} follow-up{r.followup_count === 1 ? '' : 's'}
                      </span>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {hasMore && (
            <div className="px-4 md:px-6 py-4 border-t border-neutral-dark">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full min-h-[44px] rounded-xl bg-neutral hover:bg-neutral-dark text-sm font-semibold text-black-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </motion.section>
  );
}

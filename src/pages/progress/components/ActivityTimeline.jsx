import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { Send, RefreshCw, PartyPopper, Zap, XCircle, Loader2 } from 'lucide-react';
import { getProgressTimeline } from '../../../services/apiProgress';
import { timeAgo, dayLabel } from '../utils/format';
import { RISE } from '../animations';

// Moved unchanged from the original single-file ProgressPage.

const EVENT_META = {
  sent:          { icon: Send,        chip: 'bg-blue-50 text-blue-500 ring-blue-100' },
  followup:      { icon: RefreshCw,   chip: 'bg-amber-50 text-amber-600 ring-amber-100' },
  replied:       { icon: PartyPopper, chip: 'bg-emerald-500 text-white ring-emerald-100' },
  opportunities: { icon: Zap,         chip: 'bg-primary-light/10 text-primary-dark ring-primary-light/20' },
  bounced:       { icon: XCircle,     chip: 'bg-red-50 text-red-500 ring-red-100' },
};

function EventHeadline({ ev }) {
  switch (ev.type) {
    case 'sent':
      return <>Introduction sent to <strong className="font-semibold">{ev.contact}</strong></>;
    case 'followup':
      return <>Follow-up #{ev.followup_number} sent to <strong className="font-semibold">{ev.contact}</strong></>;
    case 'replied':
      return <><strong className="font-semibold">{ev.contact}</strong> replied! 🎉</>;
    case 'opportunities':
      return <>{ev.count} new opportunit{ev.count === 1 ? 'y' : 'ies'} scored as <strong className="font-semibold text-emerald-700">Strong match</strong></>;
    case 'bounced':
      return <>Email to <strong className="font-semibold">{ev.contact}</strong> bounced</>;
    default:
      return null;
  }
}

function TimelineEvent({ ev }) {
  const meta = EVENT_META[ev.type] || EVENT_META.sent;
  const Icon = meta.icon;
  const isReply = ev.type === 'replied';
  return (
    <li className="relative flex items-start gap-3">
      {/* icon sits ON the spine; the white ring lifts it off the line */}
      <span className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white ${meta.chip} ${isReply ? 'shadow-md shadow-emerald-200' : ''}`}>
        <Icon className="w-4 h-4" aria-hidden="true" />
      </span>
      <div className={`min-w-0 flex-1 rounded-xl px-3 py-2.5 -mt-0.5 transition-colors ${
        isReply
          ? 'bg-gradient-to-r from-emerald-50 to-emerald-50/40 border border-emerald-200/70'
          : 'hover:bg-neutral/60'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm text-black-light leading-snug ${isReply ? 'font-medium' : ''}`}>
            <EventHeadline ev={ev} />
          </p>
          <span className="text-xs text-secondary-dark/70 shrink-0 whitespace-nowrap mt-0.5">{timeAgo(ev.ts)}</span>
        </div>
        {(ev.company || ev.role) && (
          <p className="text-xs text-secondary-dark truncate mt-0.5">
            {[ev.company, ev.role].filter(Boolean).join(' · ')}
          </p>
        )}
        {ev.type === 'followup' && ev.snippet && (
          <p className="text-xs text-secondary-dark/80 italic truncate mt-1">“{ev.snippet}”</p>
        )}
        {ev.type === 'sent' && ev.sent_via && (
          <p className="text-xs text-secondary-dark/60 truncate mt-1">Sent via {ev.sent_via}</p>
        )}
      </div>
    </li>
  );
}

export default function ActivityTimeline({ initial }) {
  const [olderPages, setOlderPages] = useState([]);
  const [cursor, setCursor] = useState(initial.next_before);
  const [hasMore, setHasMore] = useState(initial.has_more);
  const [loadingMore, setLoadingMore] = useState(false);

  const events = useMemo(
    () => [...initial.events, ...olderPages.flat()],
    [initial.events, olderPages],
  );

  const groups = useMemo(() => {
    const byDay = [];
    let current = null;
    for (const ev of events) {
      const label = dayLabel(ev.ts);
      if (!current || current.label !== label) {
        current = { label, events: [] };
        byDay.push(current);
      }
      current.events.push(ev);
    }
    return byDay;
  }, [events]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await getProgressTimeline(cursor);
      setOlderPages((p) => [...p, page.events]);
      setCursor(page.next_before);
      setHasMore(page.has_more);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <motion.section variants={RISE} className="bg-white rounded-2xl border border-neutral-dark shadow-sm transition-shadow duration-300 hover:shadow-md">
      <div className="px-4 md:px-6 py-5 border-b border-neutral-dark">
        <h2 className="text-base font-bold text-black-light font-montserrat">Activity</h2>
        <p className="text-xs text-secondary-dark mt-0.5">
          Everything your headhunter has been doing for you, most recent first.
        </p>
      </div>

      <div className="px-4 md:px-6 py-5">
        {events.length === 0 ? (
          <p className="text-sm text-secondary-dark py-6 text-center">
            Nothing here yet — activity appears as introductions go out.
          </p>
        ) : (
          <div className="space-y-7">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/60">
                    {group.label}
                  </span>
                  <span className="flex-1 h-px bg-neutral-dark" aria-hidden="true" />
                </div>
                {/* the spine — a soft vertical line the icons sit on */}
                <ul className="relative space-y-2 before:absolute before:left-4 before:top-1 before:bottom-1 before:w-px before:bg-neutral-dark before:content-['']">
                  {group.events.map((ev, i) => (
                    <TimelineEvent key={`${ev.type}-${ev.email_id ?? 'x'}-${ev.ts}-${i}`} ev={ev} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="mt-6 w-full py-2.5 rounded-xl bg-neutral hover:bg-neutral-dark text-sm font-semibold text-black-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loadingMore && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            Load more
          </button>
        )}
      </div>
    </motion.section>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Eye, MessageSquare, TrendingUp, ChevronDown, ExternalLink,
  ArrowRight, ArrowUp, ArrowDown, Flame, RefreshCw, Zap, XCircle,
  PartyPopper, Loader2, AlertCircle, Sparkles, Trophy, CalendarCheck,
} from 'lucide-react';
import { getProgress, getProgressTimeline, advanceStage } from '../services/apiProgress';
import { getAnalytics } from '../services/apiAnalytics';

// ── Progress — the fitness tracker for your job search ─────────────────────
// One page that answers "is this working?": hero numbers for the week, the
// company pipeline, a human-readable activity feed, the strategy A/B readout,
// and streak + momentum. Numbers count up, bars grow in, replies celebrate.

// Staggered entrance — sections cascade in like the Opportunities feed.
const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const RISE = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Tiny animation helpers ──────────────────────────────────────────────────

/** Count from 0 to `target` with a cubic ease-out. Handles one decimal. */
function useCountUp(target, { duration = 900, decimals = 0 } = {}) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return undefined; }
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Number((target * eased).toFixed(decimals)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, decimals]);
  return val;
}

function timeAgo(iso) {
  if (!iso) return '';
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 90) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function gmailSearchUrl(contactEmail) {
  return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(`to:${contactEmail} OR from:${contactEmail}`)}`;
}

function pctChange(now, before) {
  if (before > 0) return Math.round(((now - before) / before) * 100);
  return null;
}

// ─── Section 1 · Hero metrics ────────────────────────────────────────────────

function DeltaChip({ delta }) {
  if (delta == null || delta === 0) return null;
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
      {up ? <ArrowUp className="w-3 h-3" aria-hidden="true" /> : <ArrowDown className="w-3 h-3" aria-hidden="true" />}
      {Math.abs(delta)}%
    </span>
  );
}

function HeroTile({ icon: Icon, label, value, sub, accent, chip, delta, children, hero = false }) {
  const shown = useCountUp(typeof value === 'number' ? value : 0, { decimals: Number.isInteger(value) ? 0 : 1 });
  return (
    <motion.div
      variants={RISE}
      whileHover={{ y: -4, transition: { duration: 0.25, ease: 'easeOut' } }}
      className={`relative overflow-hidden bg-white rounded-2xl border shadow-sm p-4 md:p-5 transition-shadow duration-300 hover:shadow-lg ${
        hero
          ? 'border-primary-light/40 shadow-primary-light/10 hover:shadow-primary-light/20'
          : 'border-neutral-dark hover:shadow-black/5'
      }`}
    >
      {/* glanceable top accent, same device as the Opportunities cards */}
      <span className={`absolute inset-x-0 top-0 h-1 ${accent}`} aria-hidden="true" />
      {hero && (
        <span aria-hidden="true" className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-primary-light/10 blur-2xl" />
      )}
      <div className="flex items-center justify-between gap-2">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${chip}`}>
          <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
        </span>
        <DeltaChip delta={delta} />
      </div>
      <p className={`font-bold font-montserrat mt-3 leading-none tracking-tight ${
        hero
          ? 'text-4xl md:text-[2.75rem] bg-clip-text text-transparent bg-gradient-to-r from-primary-light to-primary-dark'
          : 'text-3xl text-black'
      }`}>
        {shown}
      </p>
      <p className="text-sm font-medium text-black-light mt-2">{label}</p>
      <p className="text-xs text-secondary-dark mt-0.5">{sub}</p>
      {children}
    </motion.div>
  );
}

function ReplyRateNote({ rate, sentAll }) {
  if (sentAll > 0 && rate === 0) {
    return (
      <p className="text-xs text-secondary-dark mt-2 leading-snug">
        First reply is coming — most arrive within 5–7 days
      </p>
    );
  }
  if (rate > 15) {
    return <p className="text-xs font-bold text-primary-dark mt-2">Exceptional 🚀</p>;
  }
  if (rate > 10) {
    return <p className="text-xs font-bold text-emerald-600 mt-2">Above average 🔥</p>;
  }
  return null;
}

function HeroMetrics({ hero, weeks }) {
  const rate = useCountUp(hero.reply_rate_all, { decimals: 1 });
  return (
    <motion.section
      aria-label="This week at a glance"
      variants={STAGGER}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5"
    >
      <HeroTile
        icon={Send} label="Sent" value={hero.sent_week} sub="this week"
        accent="bg-blue-400/40" chip="bg-blue-50 text-blue-500"
        delta={weeks.has_last ? pctChange(weeks.this.sent, weeks.last.sent) : null}
      />
      <HeroTile
        icon={Eye} label="Opened" value={hero.opened_week} sub="this week"
        accent="bg-purple-400/40" chip="bg-purple-50 text-purple-500"
        delta={weeks.has_last ? pctChange(weeks.this.opened, weeks.last.opened) : null}
      />
      <HeroTile
        icon={PartyPopper} label="Replied" value={hero.replied_week} sub="this week" hero
        accent="bg-gradient-to-r from-primary-light to-primary-dark"
        chip="bg-gradient-to-br from-primary-light to-primary-dark text-white shadow-lg shadow-primary-light/30"
        delta={weeks.has_last ? pctChange(weeks.this.replied, weeks.last.replied) : null}
      />
      {/* Reply rate needs its own markup for the % suffix + context note */}
      <motion.div
        variants={RISE}
        whileHover={{ y: -4, transition: { duration: 0.25, ease: 'easeOut' } }}
        className="relative overflow-hidden bg-white rounded-2xl border border-neutral-dark shadow-sm p-4 md:p-5 transition-shadow duration-300 hover:shadow-lg hover:shadow-black/5"
      >
        <span className="absolute inset-x-0 top-0 h-1 bg-emerald-400/40" aria-hidden="true" />
        <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600">
          <TrendingUp className="w-[18px] h-[18px]" aria-hidden="true" />
        </span>
        <p className="text-3xl font-bold text-black font-montserrat mt-3 leading-none tracking-tight tabular-nums">
          {rate}%
        </p>
        <p className="text-sm font-medium text-black-light mt-2">Reply rate</p>
        <p className="text-xs text-secondary-dark mt-0.5">all time</p>
        <ReplyRateNote rate={hero.reply_rate_all} sentAll={hero.sent_all} />
      </motion.div>
    </motion.section>
  );
}

// ─── Section 2 · Pipeline funnel ─────────────────────────────────────────────

const STAGE_STYLE = {
  reached_out: { fill: 'bg-gradient-to-r from-secondary-dark/40 to-secondary-dark/60', dot: 'bg-secondary-dark' },
  opened:      { fill: 'bg-gradient-to-r from-blue-400 to-blue-500',       dot: 'bg-blue-500' },
  replied:     { fill: 'bg-gradient-to-r from-emerald-400 to-emerald-500', dot: 'bg-emerald-500' },
  interview:   { fill: 'bg-gradient-to-r from-primary-light to-primary-dark', dot: 'bg-primary-light' },
  offer:       { fill: 'bg-gradient-to-r from-amber-400 to-amber-500',     dot: 'bg-amber-500' },
};

const NEXT_STAGE = {
  replied:   { stage: 'interview', label: 'Move to Interview' },
  interview: { stage: 'offer',     label: 'Move to Offer' },
};

function StageItems({ stage, onAdvance, advancingId }) {
  const next = NEXT_STAGE[stage.key];
  if (stage.items.length === 0) {
    return (
      <p className="text-sm text-secondary-dark px-1 py-4">
        No companies here yet — they'll appear as your outreach moves forward.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-neutral-dark/70">
      {stage.items.map((item) => {
        const id = item.email_id ?? `t${item.tracker_job_id}`;
        const alreadyAhead =
          next && stage.key === 'replied' && ['interview', 'offer', 'closed'].includes(item.tracker_status);
        return (
          <li key={id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
            <span className="hidden sm:flex w-9 h-9 shrink-0 rounded-xl bg-white text-secondary-dark border border-neutral-dark items-center justify-center font-montserrat font-bold text-sm">
              {(item.company || '?').trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-black-light truncate">
                {item.contact ? `${item.contact} · ` : ''}{item.company}
              </p>
              <p className="text-xs text-secondary-dark truncate mt-0.5">
                {item.role}{item.when ? ` · ${timeAgo(item.when)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.contact_email && (
                <a
                  href={gmailSearchUrl(item.contact_email)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-secondary-dark hover:text-black-light bg-white border border-neutral-dark hover:bg-neutral transition-colors"
                >
                  Open in Gmail <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
              {next && !alreadyAhead && (
                <button
                  type="button"
                  disabled={advancingId === id}
                  onClick={() => onAdvance(item, next.stage, id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold font-montserrat text-white bg-gradient-to-r from-primary-light to-primary-dark shadow-sm hover:opacity-90 hover:shadow-md hover:shadow-primary-light/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {advancingId === id
                    ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                    : <ArrowRight className="w-3 h-3" aria-hidden="true" />}
                  {next.label}
                </button>
              )}
              {alreadyAhead && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                  ✓ {item.tracker_status}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StageCount({ value }) {
  const shown = useCountUp(value, { duration: 700 });
  return <>{shown}</>;
}

function PipelineFunnel({ stages }) {
  const [openStage, setOpenStage] = useState(null);
  const [advancingId, setAdvancingId] = useState(null);
  const queryClient = useQueryClient();

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  const advance = useMutation({
    mutationFn: advanceStage,
    onSuccess: (_, vars) => {
      toast.success(vars.stage === 'interview' ? 'Moved to Interview 🎉' : 'Moved to Offer 🏆');
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => setAdvancingId(null),
  });

  const handleAdvance = (item, stage, id) => {
    setAdvancingId(id);
    advance.mutate({
      stage,
      trackerJobId: item.tracker_job_id,
      scrapedJobId: item.scraped_job_id,
    });
  };

  return (
    <motion.section variants={RISE} className="bg-white rounded-2xl border border-neutral-dark shadow-sm overflow-hidden">
      <div className="px-4 md:px-6 py-5 border-b border-neutral-dark flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-black-light font-montserrat">Your pipeline</h2>
          <p className="text-xs text-secondary-dark mt-0.5">
            Every company, counted once at its furthest stage — tap a stage to see who's there.
          </p>
        </div>
      </div>

      <div className="px-3 md:px-5 py-4 space-y-0.5">
        {stages.map((stage, idx) => {
          const style = STAGE_STYLE[stage.key];
          const isOpen = openStage === stage.key;
          const width = stage.count === 0 ? 0 : Math.max((stage.count / maxCount) * 100, 5);
          return (
            <div key={stage.key}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenStage(isOpen ? null : stage.key)}
                className={`w-full flex items-center gap-3 py-2.5 rounded-xl px-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light/20 ${isOpen ? 'bg-neutral/70' : 'hover:bg-neutral/60'}`}
              >
                <span className="flex items-center gap-2 w-[6.5rem] md:w-32 shrink-0 text-left">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} aria-hidden="true" />
                  <span className="text-sm font-semibold text-black-light truncate">{stage.label}</span>
                </span>
                <span className="flex-1 h-6 rounded-md bg-neutral overflow-hidden" aria-hidden="true">
                  {width > 0 && (
                    <motion.span
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 0.7, delay: 0.15 + idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      className={`block h-full rounded-r-md ${style.fill}`}
                    />
                  )}
                </span>
                <span className="w-10 shrink-0 text-right text-base font-bold text-black font-montserrat tabular-nums">
                  <StageCount value={stage.count} />
                </span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 text-secondary-dark transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="ml-2 md:ml-9 mr-2 mb-2 mt-1 px-3 md:px-4 rounded-xl bg-neutral/50 border border-neutral-dark">
                      <StageItems stage={stage} onAdvance={handleAdvance} advancingId={advancingId} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

// ─── Section 3 · Activity timeline ───────────────────────────────────────────

const EVENT_META = {
  sent:          { icon: Send,        chip: 'bg-blue-50 text-blue-500 ring-blue-100' },
  opened:        { icon: Eye,         chip: 'bg-purple-50 text-purple-500 ring-purple-100' },
  followup:      { icon: RefreshCw,   chip: 'bg-amber-50 text-amber-600 ring-amber-100' },
  replied:       { icon: PartyPopper, chip: 'bg-emerald-500 text-white ring-emerald-100' },
  opportunities: { icon: Zap,         chip: 'bg-primary-light/10 text-primary-dark ring-primary-light/20' },
  bounced:       { icon: XCircle,     chip: 'bg-red-50 text-red-500 ring-red-100' },
};

function EventHeadline({ ev }) {
  switch (ev.type) {
    case 'sent':
      return <>Introduction sent to <strong className="font-semibold">{ev.contact}</strong></>;
    case 'opened':
      return <><strong className="font-semibold">{ev.contact}</strong> opened your email</>;
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

function ActivityTimeline({ initial }) {
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
    <motion.section variants={RISE} className="bg-white rounded-2xl border border-neutral-dark shadow-sm">
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

// ─── Section 4 · Strategy performance ────────────────────────────────────────

function StrategyBar({ s, isBest, maxRate, index }) {
  const width = Math.max((s.reply_rate / maxRate) * 100, s.reply_rate > 0 ? 6 : 2);
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <p className="text-sm font-semibold text-black-light truncate flex items-center gap-1.5 min-w-0">
          {isBest && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />}
          <span className="truncate">{s.label}</span>
        </p>
        <p className="text-sm font-bold text-black font-montserrat shrink-0 tabular-nums">
          {s.reply_rate}%
        </p>
      </div>
      <div className="h-2.5 rounded-full bg-neutral overflow-hidden" aria-hidden="true">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.7, delay: 0.2 + index * 0.09, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full ${isBest ? 'bg-gradient-to-r from-primary-light to-primary-dark' : 'bg-secondary-dark/25'}`}
        />
      </div>
      <p className="text-xs text-secondary-dark mt-1">
        {s.sent} sent · {s.replied} replied
      </p>
    </li>
  );
}

function StrategyPerformance({ strategies }) {
  const withSends = strategies
    .filter((s) => s.sent > 0)
    .sort((a, b) => b.reply_rate - a.reply_rate || b.sent - a.sent);
  const totalSent = withSends.reduce((n, s) => n + s.sent, 0);
  const maxRate = Math.max(...withSends.map((s) => s.reply_rate), 1);
  const best = withSends[0];

  return (
    <motion.section variants={RISE} className="bg-white rounded-2xl border border-neutral-dark shadow-sm">
      <div className="px-4 md:px-6 py-5 border-b border-neutral-dark">
        <h2 className="text-base font-bold text-black-light font-montserrat">Strongest strategies</h2>
        <p className="text-xs text-secondary-dark mt-0.5">
          Each introduction takes a different approach — replies decide the winner.
        </p>
      </div>

      <div className="px-4 md:px-6 py-5">
        {withSends.length === 0 ? (
          <p className="text-sm text-secondary-dark py-4 text-center">
            Send your first introductions and the comparison fills in here.
          </p>
        ) : (
          <ul className="space-y-4">
            {withSends.map((s, i) => (
              <StrategyBar key={s.strategy} s={s} isBest={i === 0 && s.reply_rate > 0} maxRate={maxRate} index={i} />
            ))}
          </ul>
        )}

        <div className="mt-5 pt-4 border-t border-neutral-dark flex items-start gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-primary-light/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary-dark" aria-hidden="true" />
          </span>
          <p className="text-sm text-secondary-dark leading-relaxed">
            {totalSent >= 20 && best && best.reply_rate > 0 ? (
              <>Your headhunter is using <strong className="font-semibold text-black-light">“{best.label}”</strong> more often — it's getting the best results.</>
            ) : (
              <>Send more introductions to see which strategy works best for you. Your headhunter is testing different approaches.</>
            )}
          </p>
        </div>
      </div>
    </motion.section>
  );
}

// ─── Section 5 · Streak & momentum ───────────────────────────────────────────

function StreakDots({ days }) {
  if (!days?.length) return null;
  return (
    <div className="flex items-center justify-between gap-1.5">
      {days.map((d, i) => {
        const isToday = i === days.length - 1;
        return (
          <div key={d.date} className="flex flex-col items-center gap-1.5 flex-1">
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25 + i * 0.06, type: 'spring', stiffness: 300, damping: 18 }}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                d.active
                  ? 'bg-gradient-to-br from-amber-400 to-primary-light text-white shadow-sm shadow-amber-200'
                  : isToday
                    ? 'bg-white border-2 border-dashed border-neutral-dark text-secondary-dark/40'
                    : 'bg-neutral text-secondary-dark/30'
              }`}
            >
              {d.active
                ? <Flame className="w-4 h-4" aria-hidden="true" />
                : <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />}
            </motion.span>
            <span className={`text-[10px] font-semibold uppercase ${isToday ? 'text-black-light' : 'text-secondary-dark/60'}`}>
              {isToday ? 'Now' : d.weekday}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function WeekRow({ label, thisVal, lastVal }) {
  const delta = pctChange(thisVal, lastVal);
  const up = delta != null && delta > 0;
  const down = delta != null && delta < 0;
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-secondary-dark">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-sm font-semibold text-black-light tabular-nums">
          {lastVal} <span className="text-secondary-dark/50 font-normal">→</span> {thisVal}
        </span>
        {(up || down) && (
          <span className={`flex items-center gap-0.5 text-xs font-bold tabular-nums ${up ? 'text-emerald-600' : 'text-red-500'}`}>
            {up ? <ArrowUp className="w-3 h-3" aria-hidden="true" /> : <ArrowDown className="w-3 h-3" aria-hidden="true" />}
            {Math.abs(delta)}%
          </span>
        )}
      </span>
    </div>
  );
}

function StreakMomentum({ streak, weeks, community }) {
  const showTopPct = community.active_users >= 10 && community.top_pct != null && community.top_pct <= 50;
  return (
    <motion.section variants={RISE} className="relative overflow-hidden bg-white rounded-2xl border border-neutral-dark shadow-sm">
      {/* warm ember glow behind the streak */}
      <span aria-hidden="true" className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl" />

      <div className="px-4 md:px-6 py-5 space-y-5">
        {/* Streak headline */}
        <div className="flex items-center gap-3">
          <span className="relative w-12 h-12 shrink-0">
            {streak.days > 0 && streak.active_today && (
              <span className="absolute inset-0 rounded-2xl bg-amber-400/30 animate-ping" aria-hidden="true" />
            )}
            <span className={`relative w-12 h-12 rounded-2xl flex items-center justify-center ${
              streak.days > 0
                ? 'bg-gradient-to-br from-amber-400 to-primary-light text-white shadow-lg shadow-amber-200'
                : 'bg-neutral text-secondary-dark'
            }`}>
              <Flame className="w-6 h-6" aria-hidden="true" />
            </span>
          </span>
          <div className="min-w-0">
            {streak.days > 0 ? (
              <>
                <p className="text-xl font-bold text-black font-montserrat leading-tight">
                  {streak.days} day streak
                </p>
                <p className="text-xs text-secondary-dark mt-0.5">
                  {streak.active_today
                    ? "You've been active every day — keep it going."
                    : 'Do one thing today to keep it alive.'}
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-black font-montserrat leading-tight">Start a streak today</p>
                <p className="text-xs text-secondary-dark mt-0.5">Review an opportunity or approve an introduction.</p>
              </>
            )}
          </div>
        </div>

        {/* Last 7 days */}
        <StreakDots days={streak.recent_days} />

        {/* Week over week */}
        <div className="rounded-xl bg-neutral/60 border border-neutral-dark px-4 py-3">
          <p className="text-[10px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/60 mb-1">
            This week vs last week
          </p>
          {weeks.has_last ? (
            <div className="divide-y divide-neutral-dark">
              <WeekRow label="Sent"    thisVal={weeks.this.sent}    lastVal={weeks.last.sent} />
              <WeekRow label="Opened"  thisVal={weeks.this.opened}  lastVal={weeks.last.opened} />
              <WeekRow label="Replied" thisVal={weeks.this.replied} lastVal={weeks.last.replied} />
            </div>
          ) : (
            <p className="text-sm text-secondary-dark py-1.5">Your first week — let's set the baseline!</p>
          )}
        </div>

        {/* Social proof — honest versions only */}
        {(showTopPct || community.sent_week > 0) && (
          <div className="flex items-start gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            </span>
            <p className="text-sm text-secondary-dark leading-relaxed">
              {showTopPct ? (
                <>You're in the <strong className="font-semibold text-black-light">top {community.top_pct}%</strong> of ApplyDir users this week. Keep going.</>
              ) : (
                <>You've sent <strong className="font-semibold text-black-light">{community.sent_week} introduction{community.sent_week === 1 ? '' : 's'}</strong> this week — most job seekers never send a single cold introduction.</>
              )}
            </p>
          </div>
        )}
      </div>
    </motion.section>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyProgress() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-white rounded-2xl border border-neutral-dark shadow-sm px-6 py-16 md:py-20 flex flex-col items-center text-center"
    >
      <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-primary-light/20 animate-ping" aria-hidden="true" />
        <span className="absolute inset-2 rounded-full bg-primary-light/10 animate-ping [animation-delay:600ms]" aria-hidden="true" />
        <span className="relative w-16 h-16 rounded-full bg-primary-light/10 border border-primary-light/30 flex items-center justify-center">
          <TrendingUp className="w-7 h-7 text-primary-light" aria-hidden="true" />
        </span>
      </div>
      <h2 className="text-lg md:text-xl font-bold text-black-light font-montserrat max-w-md leading-snug">
        Your progress starts with your first introduction.
      </h2>
      <p className="text-sm text-secondary-dark mt-3 max-w-md leading-relaxed">
        Head to Opportunities to find roles your headhunter matched for you, then approve an introduction.
      </p>
      <p className="text-sm text-secondary-dark mt-2 max-w-md leading-relaxed">
        Once sent, this page tracks every open, reply, and interview — so you can see exactly what's working.
      </p>
      <Link
        to="/dashboard/opportunities"
        className="group mt-7 inline-flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-6 py-3 shadow-sm hover:opacity-90 hover:scale-105 hover:shadow-lg hover:shadow-primary-dark/40 active:scale-95 transition-all duration-300"
      >
        Go to Opportunities
        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}

// ─── Loading skeleton — mirrors the real layout so nothing shifts ────────────

function ProgressSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-5">
            <div className="w-9 h-9 rounded-xl bg-neutral-dark" />
            <div className="h-8 w-16 rounded bg-neutral-dark mt-3" />
            <div className="h-3 w-20 rounded bg-neutral-dark/70 mt-3" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-24 rounded bg-neutral-dark shrink-0" />
                <div className="h-6 flex-1 rounded bg-neutral-dark/60" />
                <div className="h-4 w-8 rounded bg-neutral-dark shrink-0" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-dark shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 w-3/4 rounded bg-neutral-dark" />
                  <div className="h-3 w-1/2 rounded bg-neutral-dark/70" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-dark shrink-0" />
              <div className="h-5 w-28 rounded bg-neutral-dark" />
            </div>
            <div className="flex justify-between gap-2">
              {Array.from({ length: 7 }).map((_, i) => <div key={i} className="w-8 h-8 rounded-full bg-neutral-dark/70" />)}
            </div>
            <div className="h-24 rounded-xl bg-neutral-dark/50" />
          </div>
          <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3.5 w-2/3 rounded bg-neutral-dark" />
                <div className="h-2.5 w-full rounded-full bg-neutral-dark/60" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['progress'],
    queryFn: getProgress,
  });

  // strategy_performance is all-time — share the cache other pages already use.
  const { data: analytics } = useQuery({
    queryKey: ['analytics', 30],
    queryFn: () => getAnalytics(30),
  });

  const streakDays = data?.streak?.days ?? 0;

  return (
    <div className="relative isolate p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-6 animate-fade-in font-roboto">

      {/* Ambient depth — faint warm glows, same device as Opportunities */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-28 right-0 -z-10 h-72 w-72 rounded-full bg-primary-light/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute top-[36rem] -left-24 -z-10 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-montserrat text-black-light">
            Your Progress
          </h1>
          <p className="text-sm text-secondary-dark mt-1">
            Is it working? Here's your outreach story — opens, replies, interviews.
          </p>
        </div>
        {streakDays > 0 && (
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold ring-1 ring-inset ring-amber-600/20 whitespace-nowrap"
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            {streakDays} day streak
          </motion.span>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <ProgressSkeleton />
      ) : (isError || !data) ? (
        <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm px-6 py-16 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-secondary-dark/60" aria-hidden="true" />
          <p className="text-sm text-secondary-dark mb-4">Couldn't load your progress.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="bg-neutral hover:bg-neutral-dark text-black-light text-sm font-semibold rounded-xl px-5 py-2.5 transition-all"
          >
            Try again
          </button>
        </div>
      ) : data.hero.sent_all === 0 ? (
        <EmptyProgress />
      ) : (
        <>
          <HeroMetrics hero={data.hero} weeks={data.weeks} />

          <motion.div
            variants={STAGGER}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
          >
            {/* Main column — the story */}
            <div className="lg:col-span-2 space-y-6 min-w-0">
              <PipelineFunnel stages={data.stages} />
              <ActivityTimeline initial={data.timeline} />
            </div>

            {/* Rail — momentum & learning */}
            <div className="space-y-6 min-w-0">
              <StreakMomentum streak={data.streak} weeks={data.weeks} community={data.community} />
              {analytics?.strategy_performance && (
                <StrategyPerformance strategies={analytics.strategy_performance} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

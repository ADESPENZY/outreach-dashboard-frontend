import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { toast } from 'react-toastify';
import {
  Send, Eye, MessageSquare, TrendingUp, ChevronDown, ExternalLink,
  ArrowRight, ArrowUp, ArrowDown, Flame, RefreshCw, Zap, XCircle,
  PartyPopper, Loader2, AlertCircle, Sparkles,
} from 'lucide-react';
import { ApplyDirLoader } from '../components/ui/ApplyDirLoader';
import { getProgress, getProgressTimeline, advanceStage } from '../services/apiProgress';
import { getAnalytics } from '../services/apiAnalytics';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Section 1 · Hero metrics ────────────────────────────────────────────────

function ReplyRateNote({ rate, sentAll }) {
  if (sentAll > 0 && rate === 0) {
    return (
      <p className="text-xs text-secondary-dark mt-1.5 leading-snug">
        First reply is coming — most arrive within 5–7 days
      </p>
    );
  }
  if (rate > 15) return <p className="text-xs font-semibold text-primary-dark mt-1.5">Exceptional 🚀</p>;
  if (rate > 10) return <p className="text-xs font-semibold text-emerald-600 mt-1.5">Above average 🔥</p>;
  return null;
}

function HeroMetrics({ hero }) {
  return (
    <section aria-label="This week at a glance" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* Sent */}
      <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-4 md:p-5">
        <div className="flex items-center gap-1.5 text-secondary-dark">
          <Send className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="text-xs font-medium">Sent</span>
        </div>
        <p className="text-3xl font-bold text-black font-montserrat mt-2 leading-none">{hero.sent_week}</p>
        <p className="text-xs text-secondary-dark mt-1.5">this week</p>
      </div>

      {/* Opened */}
      <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-4 md:p-5">
        <div className="flex items-center gap-1.5 text-secondary-dark">
          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="text-xs font-medium">Opened</span>
        </div>
        <p className="text-3xl font-bold text-black font-montserrat mt-2 leading-none">{hero.opened_week}</p>
        <p className="text-xs text-secondary-dark mt-1.5">this week</p>
      </div>

      {/* Replied — THE hero metric */}
      <div className="relative bg-white rounded-2xl border border-primary-light/30 shadow-sm shadow-primary-light/10 ring-1 ring-primary-light/10 p-4 md:p-5">
        <div className="flex items-center gap-1.5 text-primary-dark">
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="text-xs font-semibold">Replied</span>
        </div>
        <p className="text-4xl font-bold font-montserrat mt-2 leading-none bg-clip-text text-transparent bg-gradient-to-r from-primary-light to-primary-dark">
          {hero.replied_week}
        </p>
        <p className="text-xs text-secondary-dark mt-1.5">this week</p>
      </div>

      {/* Reply rate */}
      <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-4 md:p-5">
        <div className="flex items-center gap-1.5 text-secondary-dark">
          <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="text-xs font-medium">Reply rate</span>
        </div>
        <p className="text-3xl font-bold text-black font-montserrat mt-2 leading-none">{hero.reply_rate_all}%</p>
        <p className="text-xs text-secondary-dark mt-1.5">all time</p>
        <ReplyRateNote rate={hero.reply_rate_all} sentAll={hero.sent_all} />
      </div>
    </section>
  );
}

// ─── Section 2 · Pipeline funnel ─────────────────────────────────────────────

const STAGE_STYLE = {
  reached_out: { fill: 'bg-secondary-dark/50', dot: 'bg-secondary-dark' },
  opened:      { fill: 'bg-blue-500',          dot: 'bg-blue-500' },
  replied:     { fill: 'bg-emerald-500',       dot: 'bg-emerald-500' },
  interview:   { fill: 'bg-primary-light',     dot: 'bg-primary-light' },
  offer:       { fill: 'bg-amber-500',         dot: 'bg-amber-500' },
};

// Which forward move each stage's items offer.
const NEXT_STAGE = {
  replied:   { stage: 'interview', label: 'Move to Interview' },
  interview: { stage: 'offer',     label: 'Move to Offer' },
};

function StageItems({ stage, onAdvance, advancingId }) {
  const next = NEXT_STAGE[stage.key];
  if (stage.items.length === 0) {
    return (
      <p className="text-sm text-secondary-dark px-1 py-3">
        No companies here yet — they'll appear as your outreach moves forward.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-neutral">
      {stage.items.map((item) => {
        const id = item.email_id ?? `t${item.tracker_job_id}`;
        const alreadyAhead =
          next && ['interview', 'offer', 'closed'].includes(item.tracker_status) && stage.key === 'replied';
        return (
          <li key={id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
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
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-secondary-dark hover:text-black-light bg-neutral hover:bg-neutral-dark transition-colors"
                >
                  Open in Gmail <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
              {next && !alreadyAhead && (
                <button
                  type="button"
                  disabled={advancingId === id}
                  onClick={() => onAdvance(item, next.stage, id)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-primary-dark bg-primary-light/10 hover:bg-primary-light/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {advancingId === id
                    ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                    : <ArrowRight className="w-3 h-3" aria-hidden="true" />}
                  {next.label}
                </button>
              )}
              {alreadyAhead && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                  {item.tracker_status}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
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
    <section className="bg-white rounded-2xl border border-neutral-dark shadow-sm">
      <div className="px-4 md:px-6 py-5 border-b border-neutral-dark">
        <h2 className="text-base font-bold text-black-light font-montserrat">Your pipeline</h2>
        <p className="text-xs text-secondary-dark mt-0.5">
          One bar per stage, one company counted once — tap a stage to see who's there.
        </p>
      </div>

      <div className="px-4 md:px-6 py-4 space-y-1">
        {stages.map((stage) => {
          const style = STAGE_STYLE[stage.key];
          const isOpen = openStage === stage.key;
          const width = stage.count === 0 ? 0 : Math.max((stage.count / maxCount) * 100, 4);
          return (
            <div key={stage.key}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenStage(isOpen ? null : stage.key)}
                className="w-full flex items-center gap-3 py-2 rounded-xl px-1 hover:bg-neutral/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light/20"
              >
                <span className="flex items-center gap-2 w-28 md:w-32 shrink-0 text-left">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} aria-hidden="true" />
                  <span className="text-sm font-medium text-black-light truncate">{stage.label}</span>
                </span>
                <span className="flex-1 h-6 rounded bg-neutral overflow-hidden" aria-hidden="true">
                  {width > 0 && (
                    <span
                      className={`block h-full rounded-r ${style.fill} transition-all duration-300`}
                      style={{ width: `${width}%` }}
                    />
                  )}
                </span>
                <span className="w-10 shrink-0 text-right text-sm font-bold text-black font-montserrat tabular-nums">
                  {stage.count}
                </span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 text-secondary-dark transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div className="ml-1 md:ml-8 mr-1 mb-2 px-3 md:px-4 rounded-xl bg-neutral/50 border border-neutral-dark animate-in fade-in duration-200">
                  <StageItems stage={stage} onAdvance={handleAdvance} advancingId={advancingId} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Section 3 · Activity timeline ───────────────────────────────────────────

const EVENT_META = {
  sent:          { icon: Send,          chip: 'bg-blue-50 text-blue-500' },
  opened:        { icon: Eye,           chip: 'bg-purple-50 text-purple-500' },
  followup:      { icon: RefreshCw,     chip: 'bg-amber-50 text-amber-600' },
  replied:       { icon: PartyPopper,   chip: 'bg-emerald-100 text-emerald-600' },
  opportunities: { icon: Zap,           chip: 'bg-primary-light/10 text-primary-dark' },
  bounced:       { icon: XCircle,       chip: 'bg-red-50 text-red-500' },
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
      return <><strong className="font-semibold">{ev.contact}</strong> replied!</>;
    case 'opportunities':
      return <>{ev.count} new opportunit{ev.count === 1 ? 'y' : 'ies'} scored as <strong className="font-semibold">Strong match</strong></>;
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
    <li
      className={`flex items-start gap-3 rounded-xl px-3 py-3 ${
        isReply ? 'bg-emerald-50/70 border border-emerald-100' : ''
      }`}
    >
      <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meta.chip}`}>
        <Icon className="w-4 h-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm text-black-light leading-snug ${isReply ? 'font-medium' : ''}`}>
          <EventHeadline ev={ev} />
        </p>
        {(ev.company || ev.role) && (
          <p className="text-xs text-secondary-dark truncate mt-0.5">
            {[ev.company, ev.role].filter(Boolean).join(' · ')}
          </p>
        )}
        {ev.type === 'followup' && ev.snippet && (
          <p className="text-xs text-secondary-dark/80 italic truncate mt-0.5">“{ev.snippet}”</p>
        )}
        {ev.type === 'sent' && ev.sent_via && (
          <p className="text-xs text-secondary-dark/60 truncate mt-0.5">Sent via {ev.sent_via}</p>
        )}
      </div>
      <span className="text-xs text-secondary-dark/70 shrink-0 whitespace-nowrap mt-0.5">{timeAgo(ev.ts)}</span>
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
    <section className="bg-white rounded-2xl border border-neutral-dark shadow-sm">
      <div className="px-4 md:px-6 py-5 border-b border-neutral-dark">
        <h2 className="text-base font-bold text-black-light font-montserrat">Activity</h2>
        <p className="text-xs text-secondary-dark mt-0.5">
          Everything your headhunter has been doing for you, most recent first.
        </p>
      </div>

      <div className="px-4 md:px-6 py-5 max-w-2xl">
        {events.length === 0 ? (
          <p className="text-sm text-secondary-dark py-6 text-center">
            Nothing here yet — activity appears as introductions go out.
          </p>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/60 mb-2 px-1">
                  {group.label}
                </p>
                <ul className="space-y-1">
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
            className="mt-5 w-full py-2.5 rounded-xl bg-neutral hover:bg-neutral-dark text-sm font-semibold text-black-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loadingMore && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            Load more
          </button>
        )}
      </div>
    </section>
  );
}

// ─── Section 4 · Strategy performance ────────────────────────────────────────

function StrategyPerformance({ strategies }) {
  const withSends = strategies
    .filter((s) => s.sent > 0)
    .sort((a, b) => b.reply_rate - a.reply_rate || b.sent - a.sent);
  const totalSent = withSends.reduce((n, s) => n + s.sent, 0);
  const maxRate = Math.max(...withSends.map((s) => s.reply_rate), 1);
  const best = withSends[0];

  return (
    <section className="bg-white rounded-2xl border border-neutral-dark shadow-sm">
      <div className="px-4 md:px-6 py-5 border-b border-neutral-dark">
        <h2 className="text-base font-bold text-black-light font-montserrat">Your strongest strategies</h2>
        <p className="text-xs text-secondary-dark mt-0.5">
          Your headhunter writes each introduction with a different approach and learns from replies.
        </p>
      </div>

      <div className="px-4 md:px-6 py-5">
        {withSends.length === 0 ? (
          <p className="text-sm text-secondary-dark py-4 text-center">
            Send your first introductions and the comparison fills in here.
          </p>
        ) : (
          <ul className="space-y-4">
            {withSends.map((s, i) => {
              const isBest = i === 0 && s.reply_rate > 0;
              const width = Math.max((s.reply_rate / maxRate) * 100, s.reply_rate > 0 ? 6 : 2);
              return (
                <li key={s.strategy}>
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <p className="text-sm font-semibold text-black-light truncate">
                      {s.label}
                      {isBest && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-light/10 text-primary-dark">
                          Best
                        </span>
                      )}
                    </p>
                    <p className="text-sm font-bold text-black font-montserrat shrink-0 tabular-nums">
                      {s.reply_rate}% <span className="text-xs font-medium text-secondary-dark">reply rate</span>
                    </p>
                  </div>
                  <div className="h-2.5 rounded-full bg-neutral overflow-hidden" aria-hidden="true">
                    <div
                      className={`h-full rounded-full ${isBest ? 'bg-gradient-to-r from-primary-light to-primary-dark' : 'bg-secondary-dark/30'}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <p className="text-xs text-secondary-dark mt-1">
                    {s.sent} sent · {s.replied} replied
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-5 pt-4 border-t border-neutral-dark flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-primary-dark shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-secondary-dark leading-relaxed">
            {totalSent >= 20 && best && best.reply_rate > 0 ? (
              <>Your headhunter is using <strong className="font-semibold text-black-light">“{best.label}”</strong> more often — it's getting the best results.</>
            ) : (
              <>Send more introductions to see which strategy works best for you. Your headhunter is testing different approaches.</>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Section 5 · Streak & momentum ───────────────────────────────────────────

function WeekRow({ label, thisVal, lastVal }) {
  let delta = null;
  if (lastVal > 0) delta = Math.round(((thisVal - lastVal) / lastVal) * 100);
  else if (thisVal > 0) delta = null; // no baseline — arrow alone would overclaim
  const up = delta != null && delta > 0;
  const down = delta != null && delta < 0;
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-secondary-dark">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-sm font-semibold text-black-light tabular-nums">
          {lastVal} → {thisVal}
        </span>
        {delta != null && delta !== 0 && (
          <span
            className={`flex items-center gap-0.5 text-xs font-bold tabular-nums ${up ? 'text-emerald-600' : 'text-red-500'}`}
          >
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
    <section className="bg-white rounded-2xl border border-neutral-dark shadow-sm px-4 md:px-6 py-5 space-y-4">
      {/* Streak */}
      <div className="flex items-center gap-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${streak.days > 0 ? 'bg-amber-50 text-amber-500' : 'bg-neutral text-secondary-dark'}`}>
          <Flame className="w-5 h-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          {streak.days > 0 ? (
            <>
              <p className="text-base font-bold text-black font-montserrat leading-snug">
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
              <p className="text-base font-bold text-black font-montserrat leading-snug">Start a new streak today</p>
              <p className="text-xs text-secondary-dark mt-0.5">Review an opportunity or approve an introduction.</p>
            </>
          )}
        </div>
      </div>

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
        <p className="text-sm text-secondary-dark leading-relaxed">
          {showTopPct ? (
            <>You're in the <strong className="font-semibold text-black-light">top {community.top_pct}%</strong> of ApplyDir users this week. Keep going.</>
          ) : (
            <>You've sent <strong className="font-semibold text-black-light">{community.sent_week} introduction{community.sent_week === 1 ? '' : 's'}</strong> this week — most job seekers never send a single cold introduction.</>
          )}
        </p>
      )}
    </section>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyProgress() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm px-6 py-16 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-2xl bg-primary-light/10 flex items-center justify-center mb-5">
        <TrendingUp className="w-6 h-6 text-primary-dark" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-bold text-black font-montserrat max-w-md leading-snug">
        Your progress starts with your first introduction.
      </h2>
      <p className="text-sm text-secondary-dark mt-3 max-w-md leading-relaxed">
        Head to Opportunities to find roles your headhunter matched for you, then approve an introduction.
      </p>
      <p className="text-sm text-secondary-dark mt-2 max-w-md leading-relaxed">
        Once sent, this page will track every open, reply, and interview — so you can see exactly what's working.
      </p>
      <Link
        to="/dashboard/opportunities"
        className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all"
      >
        Go to Opportunities <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </Link>
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

  if (isLoading) {
    return (
      <main className="w-full max-w-5xl mx-auto p-4 md:p-8 flex items-center justify-center min-h-[60vh] font-roboto">
        <ApplyDirLoader.Inline message="Loading your progress..." />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="w-full max-w-5xl mx-auto p-4 md:p-8 text-center font-roboto">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-secondary-dark/60" aria-hidden="true" />
        <p className="text-sm text-secondary-dark mb-4">Couldn't load your progress.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="bg-neutral hover:bg-neutral-dark text-black-light text-sm font-semibold rounded-xl px-5 py-2.5 transition-all"
        >
          Try again
        </button>
      </main>
    );
  }

  const isEmpty = data.hero.sent_all === 0;

  return (
    <main className="w-full max-w-5xl mx-auto p-4 md:p-8 font-roboto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-black to-secondary-dark font-montserrat">
          Your Progress
        </h1>
        <p className="text-sm text-secondary-dark mt-1">
          Is it working? Here's your outreach story — opens, replies, interviews.
        </p>
      </div>

      {isEmpty ? (
        <EmptyProgress />
      ) : (
        <div className="space-y-8">
          <HeroMetrics hero={data.hero} />
          <PipelineFunnel stages={data.stages} />
          <ActivityTimeline initial={data.timeline} />
          {analytics?.strategy_performance && (
            <StrategyPerformance strategies={analytics.strategy_performance} />
          )}
          <StreakMomentum streak={data.streak} weeks={data.weeks} community={data.community} />
        </div>
      )}
    </main>
  );
}

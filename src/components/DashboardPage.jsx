import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  Sparkles, MessageSquare, Send, MailCheck,
  ArrowRight, Flame, Trophy, CheckCircle2, RefreshCw, SearchX, Loader2,
} from 'lucide-react';
import { ApplyDirLoader } from './ui/ApplyDirLoader';
import { useAuth } from '../context/AuthContext';
import { getJobCount, getScrapeStatus, searchNow } from '../services/apiJobs';
import HeadhuntingState from './HeadhuntingState';
import RoleRequestModal from './RoleRequestModal';
import { getAnalytics } from '../services/apiAnalytics';
import { getDraftEmails } from '../services/apiOutreach';
import { getProfile, updateProfile } from '../services/apiProfile';
import ActivationFlow from './onboarding/ActivationFlow';

// The Home page is the returning user's daily briefing (ARCHITECTURE §1,
// ONBOARDING phase 8). It answers, in one glance: "What happened while I was
// away? What's the ONE thing to do now?" — never a dashboard of metrics, and
// never the machinery words (scrape / fit-score / queue / SMTP).

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// Human, jargon-free names for the cold-email strategies (the model labels are
// technical: "Value-Upfront", "Problem-First"). The user hears plain language.
const STRATEGY_LABELS = {
  story:           'Make them feel seen',
  problem_first:   'Diagnose their problem',
  proof_first:     'Lead with the receipts',
  their_work:      'Call back their work',
  value_upfront:   'Give them the blueprint',
  // Retired strategies — still shown on old emails.
  direct:          'Keep it short and direct',
  question_opener: 'Open with a question',
};

function timeAgo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const firstName = currentUser?.first_name || currentUser?.username || 'there';

  // ── Data layer (react-query + existing services) ─────────────────────────
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
  });

  // Onboarding is only DONE once the user has both uploaded a CV AND saved
  // their role preferences (role_types is written only by the final step). CV
  // upload alone isn't enough — it's set at step 1, so gating on it would hide
  // onboarding for anyone who bailed before finishing. Saved role preferences
  // is the reliable "finished" signal (and is what activates the daily scout).
  //
  // Derived HERE, above the queries, rather than further down: the scrape-status
  // poll gate below closes over it, and a const declared past one of this
  // component's early returns is never initialised on that render — the closure
  // would then read it from its temporal dead zone and throw.
  const cvUploaded = !!profile?.cv_raw_text;
  const roleTypes = profile?.job_preferences?.role_types;
  const hasPreferences = Array.isArray(roleTypes) && roleTypes.length > 0;
  const onboardingDone = cvUploaded && hasPreferences;

  // "Is the board empty?", held in a ref so the poll gate below can read it.
  // It CANNOT read the hasAnyCard const directly: react-query evaluates a
  // function refetchInterval synchronously inside useQuery (QueryObserver
  // .setOptions → computeRefetchInterval), i.e. before hasAnyCard is
  // initialised further down — a temporal-dead-zone throw on every re-render.
  // The ref lags by at most one render, which a 5s poll gate doesn't care about.
  const hasAnyCardRef = useRef(false);

  // Is the background scrape running (e.g. right after onboarding)? Drives the
  // "AI headhunter searching" card so the user knows something is happening.
  //
  // The gate used to poll only while is_active was ALREADY true, which made a
  // stale `false` self-perpetuating: this observer mounts before the onboarding
  // PATCH that starts the first scrape, so it cached false and had no way back.
  // A calibrated user with nothing to show yet now polls until something lands.
  const { data: scrapeStatus } = useQuery({
    queryKey: ['scrape-status'],
    queryFn: getScrapeStatus,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d?.is_active) return 5000;
      // BOUNDED: once a first run has finished, stop. There is nothing left to
      // wait for — the empty state now carries a button, and that button, not a
      // perpetual poll, is how this user moves forward.
      if (d?.first_run_done) return false;
      return onboardingDone && !hasAnyCardRef.current ? 5000 : false;
    },
    staleTime: 0,
  });
  const scrapeActive = scrapeStatus?.is_active === true;

  // Only the COUNT of unreviewed opportunities — not the whole jobs list. The
  // full list is what jammed the dashboard for data-heavy accounts.
  const { data: newOppsCount = 0, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobCount', 'scraped'],
    queryFn: () => getJobCount('scraped'),
    staleTime: 60 * 1000,
    // Poll while a scrape is running so the count ticks up as matches surface.
    refetchInterval: scrapeActive ? 4000 : false,
  });

  // This-week briefing: analytics windowed to 7 days. summary metrics +
  // daily_activity are windowed; strategy_performance is all-time (the backend
  // does not apply the cutoff to it), so the "best approach" readout is stable.
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', 7],
    queryFn: () => getAnalytics(7),
    staleTime: 5 * 60 * 1000,
  });

  const { data: drafts } = useQuery({
    queryKey: ['draftEmails'],
    queryFn: getDraftEmails,
    staleTime: 5 * 60 * 1000,
  });

  // Does anything need the user's attention? Derived here, above the early
  // returns, so it is computed on every render path — including the ones that
  // return before the briefing body.
  const summary    = analytics?.summary || {};
  const draftList  = Array.isArray(drafts) ? drafts : [];
  const draftCount = draftList.length || (summary.total_drafts || 0);

  const hasAnyCard = newOppsCount > 0 || draftCount > 0;
  hasAnyCardRef.current = hasAnyCard;   // feeds the scrape-status poll gate above

  // ── Empty-state model ─────────────────────────────────────────────────────
  // Five mutually exclusive states, resolved top-down. The old single
  // `isSearching` boolean collapsed four very different situations into one
  // "All caught up!" screen, which read as success to people who had never seen
  // a single result.
  //
  // hasEverHadResults exists because first_run_yield describes the FIRST run and
  // never updates: someone whose first run found 0 and whose second found 30
  // reads first_run_yield: 0 forever.
  //
  // has_ever_surfaced is the authoritative answer (a job with surfaced_at set =
  // we put it on screen). The two fallbacks behind it only matter if the field
  // is missing — an older backend, or a cached payload from before it shipped —
  // and each is individually wrong on its own: Approved misses cards the user
  // skipped, first_run_yield misses everything after run one.
  const everApproved = analytics?.funnel?.find((s) => s.stage === 'Approved')?.count ?? 0;
  const hasEverHadResults =
    scrapeStatus?.has_ever_surfaced === true
    || everApproved > 0
    || (scrapeStatus?.first_run_yield ?? 0) > 0;
  const firstRunDone = scrapeStatus?.first_run_done === true;

  // `stale` is true on the ONE response that detects a dead run and clears its
  // lock; every later poll reports false. Latch it so the user can actually read
  // the message, and drop the latch as soon as a new run starts.
  const [sawInterrupted, setSawInterrupted] = useState(false);
  useEffect(() => {
    if (scrapeStatus?.is_active === true) setSawInterrupted(false);
    else if (scrapeStatus?.stale === true) setSawInterrupted(true);
  }, [scrapeStatus?.is_active, scrapeStatus?.stale]);

  // hasAnyCard is tested FIRST: this models the EMPTY state only. A user who has
  // cards AND a run in flight gets their cards plus the header searching strip —
  // if SEARCHING outranked hasAnyCard here, both would render the radar.
  const emptyState =
    hasAnyCard          ? null
    : scrapeActive      ? 'SEARCHING'
    : sawInterrupted    ? 'INTERRUPTED'
    : !firstRunDone     ? 'NEVER_RUN'
    : hasEverHadResults ? 'CAUGHT_UP'
    :                     'FIRST_RUN_EMPTY';

  const [showRoleRequest, setShowRoleRequest] = useState(false);
  const [searching, setSearching] = useState(false);
  const queryClient = useQueryClient();

  const runSearchNow = async () => {
    if (searching) return;
    setSearching(true);
    try {
      const res = await searchNow();
      if (res?.unavailable) {
        toast.info('Search is busy right now — try again shortly.');
      }
      // Either a run just started or one was already going: both mean the UI
      // should flip to SEARCHING, so refresh both drivers of that decision.
      queryClient.invalidateQueries({ queryKey: ['scrape-status'] });
      queryClient.invalidateQueries({ queryKey: ['jobCount', 'scraped'] });
    } catch {
      toast.error("We couldn't start a search just now. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  // One-time timezone backfill for users who onboarded before we captured it —
  // so their daily scrape lands at ~5 AM local. Only PATCHes when ours differs
  // from a blank/UTC stored value.
  useEffect(() => {
    if (!profile) return;
    let browserTz = '';
    try { browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* noop */ }
    const stored = profile.timezone || '';
    if (browserTz && browserTz !== 'UTC' && (!stored || stored === 'UTC') && stored !== browserTz) {
      updateProfile({ timezone: browserTz }).catch(() => {});
    }
  }, [profile]);

  const loading = profileLoading || jobsLoading || analyticsLoading;

  // ── Page-level loader (mandatory — never a blank screen) ─────────────────
  if (loading) {
    return (
      <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto">
        <ApplyDirLoader.Inline message="Putting together your briefing..." />
      </div>
    );
  }

  // ── ONBOARDING / RESUME — run (or resume) the Calibration flow. ActivationFlow
  // reads the profile to pick up where the user left off, and invalidates
  // ['profile'] on completion so this page re-renders out of onboarding. ──────
  if (!onboardingDone) {
    return <ActivationFlow profile={profile} />;
  }

  const dailyActivity = analytics?.daily_activity || [];
  const strategyPerf  = analytics?.strategy_performance || [];

  // ── Derived briefing data ────────────────────────────────────────────────
  // Opportunities waiting = scored roles the user hasn't reviewed yet.
  // (newOppsCount, draftCount and hasAnyCard are derived above the early
  // returns, alongside the queries that feed them.)

  // ── This-week activity (windowed summary) ────────────────────────────────
  // Open tracking is off (the pixel hurt deliverability), so we show "Delivered"
  // — a real, pixel-free signal: emails that left the outbox and didn't bounce.
  const weekSent      = summary.total_sent      || 0;
  const weekDelivered = summary.total_delivered || 0;
  const weekReplied   = summary.total_replied   || 0;
  const barMax = Math.max(weekSent, weekDelivered, weekReplied, 1);
  const bars = [
    { label: 'Sent',      value: weekSent,      color: 'bg-blue-500' },
    { label: 'Delivered', value: weekDelivered, color: 'bg-teal-500' },
    { label: 'Replied',   value: weekReplied,   color: 'bg-emerald-500' },
  ];

  // ── Streak: consecutive recent days with any activity. Today counting 0
  // does not break the streak (the day isn't over yet). ─────────────────────
  let streak = 0;
  for (let i = dailyActivity.length - 1; i >= 0; i--) {
    const d = dailyActivity[i];
    const active = (d.sent || 0) + (d.delivered || 0) + (d.replied || 0) > 0;
    if (active) {
      streak += 1;
    } else if (i === dailyActivity.length - 1) {
      continue; // today not active yet — keep looking back
    } else {
      break;
    }
  }
  const showStreak = streak >= 3;

  // ── Best-performing strategy (only once there's a fair all-time sample) ───
  const allTimeSent = strategyPerf.reduce((sum, s) => sum + (s.sent || 0), 0);
  const bestStrategy = strategyPerf
    .filter((s) => (s.sent || 0) > 0)
    .sort((a, b) => (b.reply_rate || 0) - (a.reply_rate || 0))[0];
  const showStrategy = allTimeSent >= 20 && bestStrategy && bestStrategy.reply_rate > 0;

  // ── Status-bar chips (this week) ─────────────────────────────────────────
  const statChips = [
    { label: 'Replies this week',       value: weekReplied,    Icon: MessageSquare, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Introductions this week', value: weekSent,       Icon: Send,          color: 'bg-blue-50 text-blue-500' },
    { label: 'Delivered this week',     value: weekDelivered,  Icon: MailCheck,     color: 'bg-teal-50 text-teal-600' },
  ];

  const cardBase =
    'bg-white rounded-2xl border border-neutral-dark border-l-4 border-l-primary-light shadow-sm p-5 flex flex-col';
  const cardBtn =
    'mt-4 self-start inline-flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all';

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-8 font-roboto">

      {/* 1 ── Greeting + status bar ─────────────────────────────────────── */}
      <header className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold font-montserrat text-black-light">
            {greetingForNow()}, {firstName} <span aria-hidden="true">👋</span>
          </h1>
          <p className="text-sm md:text-base text-secondary-dark">
            Here's what's happened since you were last here.
          </p>
        </div>

        {/* AI headhunter working — shown while the background scrape runs (esp.
            right after onboarding) so the user sees something is happening.
            Only when the user HAS other cards below: with an empty board the
            action-card section renders the same searching state in place of its
            "nothing to do" card, and two identical radars would stack. */}
        {scrapeActive && newOppsCount === 0 && hasAnyCard && (
          <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm">
            <HeadhuntingState compact phase={scrapeStatus?.phase} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {statChips.map((s) => {
            const ChipIcon = s.Icon;
            return (
              <div
                key={s.label}
                className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-4 flex items-center gap-3"
              >
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                  <ChipIcon className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-2xl font-bold font-montserrat text-black-light leading-none">
                    {s.value}
                  </p>
                  <p className="text-xs text-secondary-dark mt-1 truncate">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </header>

      {/* 2 ── Action cards (up to 3, conditional) ───────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* A) Opportunities waiting for review */}
        {newOppsCount > 0 && (
          <div className={cardBase}>
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary-light/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary-light" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold font-montserrat text-black-light leading-snug">
                  {newOppsCount} {newOppsCount === 1 ? 'opportunity' : 'opportunities'} waiting for review
                </h2>
                <p className="text-sm text-secondary-dark mt-1">
                  Fresh matches your headhunter found for you.
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/dashboard/opportunities')} className={cardBtn}>
              Review opportunities
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* B) Introductions ready to approve */}
        {draftCount > 0 && (
          <div className={cardBase}>
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary-light/10 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-primary-light" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold font-montserrat text-black-light leading-snug">
                  {draftCount} {draftCount === 1 ? 'introduction' : 'introductions'} ready to approve
                </h2>
                <p className="text-sm text-secondary-dark mt-1">
                  They get colder each day — a quick review keeps them warm.
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/dashboard/introductions')} className={cardBtn}>
              Review introductions
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* C) Nothing needs attention — exactly one of five states. */}
        {emptyState === 'SEARCHING' && (
          <div className="bg-white rounded-2xl border border-neutral-dark border-l-4 border-l-primary-light shadow-sm md:col-span-2">
            <HeadhuntingState compact phase={scrapeStatus?.phase} />
          </div>
        )}

        {emptyState && emptyState !== 'SEARCHING' && (
          <div className="bg-white rounded-2xl border border-neutral-dark border-l-4 border-l-primary-light shadow-sm p-6 md:col-span-2">
            <div className="flex items-start gap-4">
              <span className="w-12 h-12 rounded-full bg-primary-light/10 border border-primary-light/30 flex items-center justify-center shrink-0">
                {emptyState === 'INTERRUPTED'     ? <RefreshCw className="w-5 h-5 text-primary-light" />
                  : emptyState === 'FIRST_RUN_EMPTY' ? <SearchX className="w-5 h-5 text-primary-light" />
                  : emptyState === 'CAUGHT_UP'       ? <CheckCircle2 className="w-5 h-5 text-primary-light" />
                  : <Sparkles className="w-5 h-5 text-primary-light" />}
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold font-montserrat text-black-light leading-snug">
                  {emptyState === 'INTERRUPTED'      ? 'That search stopped early.'
                    : emptyState === 'FIRST_RUN_EMPTY' ? 'No matches yet.'
                    : emptyState === 'NEVER_RUN'       ? "Your headhunter hasn't run yet."
                    : 'All caught up!'}
                </h2>
                <p className="text-sm text-secondary-dark mt-1 leading-relaxed">
                  {emptyState === 'INTERRUPTED'      ? 'This happens occasionally. Starting again usually fixes it.'
                    : emptyState === 'FIRST_RUN_EMPTY' ? 'We searched but nothing cleared the bar this time. Widening your roles or locations usually helps.'
                    : emptyState === 'NEVER_RUN'       ? 'Start your first search and your matches will appear right here.'
                    : 'Your headhunter will find more opportunities overnight. Check back tomorrow.'}
                </p>
              </div>
            </div>

            {emptyState !== 'CAUGHT_UP' && (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {emptyState === 'FIRST_RUN_EMPTY' && (
                    <button
                      onClick={() => navigate('/dashboard/settings?tab=jobs')}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all"
                    >
                      Adjust what you're looking for
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={runSearchNow}
                    disabled={searching}
                    className={
                      emptyState === 'FIRST_RUN_EMPTY'
                        ? 'inline-flex items-center gap-2 bg-neutral hover:bg-neutral-dark text-black-light font-semibold rounded-xl px-5 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                        : 'inline-flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                    }
                  >
                    {searching && <Loader2 className="w-4 h-4 animate-spin" />}
                    {emptyState === 'NEVER_RUN' ? 'Start searching' : 'Search again'}
                  </button>
                </div>

                <button
                  onClick={() => setShowRoleRequest(true)}
                  className="mt-3 text-xs font-semibold text-secondary-dark hover:text-primary-dark underline underline-offset-2 transition-colors"
                >
                  Can't find what you're looking for?
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {showRoleRequest && <RoleRequestModal onClose={() => setShowRoleRequest(false)} />}

      {/* 3 ── This week's activity ──────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/60">
          This week's activity
        </h2>
        <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-5 space-y-4">
          {bars.map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-sm text-secondary-dark">{b.label}</span>
              <span className="w-7 shrink-0 text-sm font-bold font-montserrat text-black-light tabular-nums text-right">
                {b.value}
              </span>
              <div className="flex-1 h-2.5 rounded-full bg-neutral-dark overflow-hidden">
                <div
                  className={`h-full rounded-full ${b.color} transition-all duration-500`}
                  style={{ width: `${Math.round((b.value / barMax) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 ── Streak (only when active 3+ consecutive days) ──────────────── */}
      {showStreak && (
        <section>
          <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm p-5 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-amber-500" />
            </span>
            <p className="text-sm md:text-base font-semibold text-amber-700">
              {streak} day streak — keep it going.
            </p>
          </div>
        </section>
      )}

      {/* 5 ── Best-performing strategy (only with 20+ sent) ──────────────── */}
      {showStrategy && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/60">
            What's working best
          </h2>
          <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-5 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-emerald-600" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-secondary-dark">Your strongest approach</p>
              <p className="text-base font-bold font-montserrat text-black-light leading-snug">
                {STRATEGY_LABELS[bestStrategy.strategy] || bestStrategy.label}
                {' — '}
                <span className="text-emerald-600">{bestStrategy.reply_rate}% reply rate</span>
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default DashboardPage;

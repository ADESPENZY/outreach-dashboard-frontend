import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles, MessageSquare, Send, MailCheck,
  ArrowRight, Flame, Trophy,
} from 'lucide-react';
import { ApplyDirLoader } from './ui/ApplyDirLoader';
import { useAuth } from '../context/AuthContext';
import { getJobCount, getScrapeStatus } from '../services/apiJobs';
import HeadhuntingState from './HeadhuntingState';
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

  // Is the background scrape running (e.g. right after onboarding)? Drives the
  // "AI headhunter searching" card so the user knows something is happening.
  const { data: scrapeStatus } = useQuery({
    queryKey: ['scrape-status'],
    queryFn: getScrapeStatus,
    refetchInterval: (query) => (query.state.data?.is_active ? 3000 : false),
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

  // Onboarding is only DONE once the user has both uploaded a CV AND saved
  // their role preferences (role_types is written only by the final step). CV
  // upload alone isn't enough — it's set at step 1, so gating on it would hide
  // onboarding for anyone who bailed before finishing. Saved role preferences
  // is the reliable "finished" signal (and is what activates the daily scout).
  const cvUploaded = !!profile?.cv_raw_text;
  const roleTypes = profile?.job_preferences?.role_types;
  const hasPreferences = Array.isArray(roleTypes) && roleTypes.length > 0;
  const onboardingDone = cvUploaded && hasPreferences;

  // ── ONBOARDING / RESUME — run (or resume) the Calibration flow. ActivationFlow
  // reads the profile to pick up where the user left off, and invalidates
  // ['profile'] on completion so this page re-renders out of onboarding. ──────
  if (!onboardingDone) {
    return <ActivationFlow profile={profile} />;
  }

  const summary       = analytics?.summary || {};
  const dailyActivity = analytics?.daily_activity || [];
  const strategyPerf  = analytics?.strategy_performance || [];

  // ── Derived briefing data ────────────────────────────────────────────────
  // Opportunities waiting = scored roles the user hasn't reviewed yet.
  // (newOppsCount now comes straight from the count query above.)

  const draftList  = Array.isArray(drafts) ? drafts : [];
  const draftCount = draftList.length || (summary.total_drafts || 0);

  const hasAnyCard = newOppsCount > 0 || draftCount > 0;

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
            right after onboarding) so the user sees something is happening. */}
        {scrapeActive && newOppsCount === 0 && (
          <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm">
            <HeadhuntingState compact />
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

        {/* C) Someone opened your email (delight / social-proof signal) */}
        {/* Nothing needs attention */}
        {!hasAnyCard && (
          <div className="bg-white rounded-2xl border border-neutral-dark border-l-4 border-l-primary-light shadow-sm p-6 flex items-center gap-4 md:col-span-2">
            <div className="relative w-12 h-12 shrink-0">
              <span className="absolute inset-0 rounded-full bg-primary-light/20 animate-ping" />
              <span className="relative w-12 h-12 rounded-full bg-primary-light/10 border border-primary-light/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-light" />
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold font-montserrat text-black-light leading-snug">
                Your headhunter is searching
              </h2>
              <p className="text-sm text-secondary-dark mt-1">
                There's nothing for you to do right now — check back soon.
              </p>
            </div>
          </div>
        )}
      </section>

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

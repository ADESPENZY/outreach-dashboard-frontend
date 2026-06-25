import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, MailOpen, Send, Briefcase, ArrowRight } from 'lucide-react';
import { ApplyDirLoader } from './ui/ApplyDirLoader';
import { useAuth } from '../context/AuthContext';
import { getScrapedJobs } from '../services/apiJobs';
import { getAnalytics } from '../services/apiAnalytics';
import { getDraftEmails } from '../services/apiOutreach';
import { getProfile } from '../services/apiProfile';
import ActivationFlow from './onboarding/ActivationFlow';

// The Home page is the returning user's daily briefing. It answers:
// "What happened while I was away? What do I do now?"
// It reshapes existing data (jobs, analytics, drafts, profile) into a calm,
// jargon-free briefing — no scrape/queue/fit-score language reaches the user.

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const firstName = currentUser?.first_name || currentUser?.username || 'there';

  // ── Data layer (unchanged pattern: react-query + existing services) ──────
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: getScrapedJobs,
  });

  // This-week metrics: analytics windowed to 7 days. pipeline inside the
  // payload is not windowed, so it stays correct regardless.
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

  const loading = profileLoading || jobsLoading || analyticsLoading;

  // ── Page-level loader (mandatory — never a blank screen) ─────────────────
  if (loading) {
    return (
      <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto">
        <ApplyDirLoader.Inline message="Loading your progress..." />
      </div>
    );
  }

  const cvUploaded = !!profile?.cv_raw_text;
  const summary  = analytics?.summary  || {};
  const pipeline = analytics?.pipeline || {};

  // ── ONBOARDING: no CV yet — run the 4-step Calibration flow ──────────────
  // ActivationFlow invalidates the ['profile'] query on completion, which
  // re-renders this page out of onboarding.
  if (!cvUploaded) {
    return <ActivationFlow profile={profile} />;
  }

  // ── Derived briefing data ────────────────────────────────────────────────
  // New roles = freshly sourced jobs the user hasn't reviewed yet.
  const newOppsCount = jobs.filter((j) => j.status === 'scraped').length;

  const draftList  = Array.isArray(drafts) ? drafts : [];
  const draftCount = draftList.length || (summary.total_drafts || 0);

  const nothingToDo = newOppsCount === 0 && draftCount === 0;

  // ── Mini-stats (this week) ───────────────────────────────────────────────
  const fmt = (v) => (v === null || v === undefined ? '—' : v);
  const stats = [
    { label: 'Introductions Sent',  value: fmt(summary.total_sent),    Icon: Send,      color: 'bg-blue-50 text-blue-500' },
    { label: 'Opened',              value: fmt(summary.total_opened),  Icon: MailOpen,  color: 'bg-purple-50 text-purple-500' },
    { label: 'Active Opportunities', value: fmt(pipeline.approved_jobs), Icon: Briefcase, color: 'bg-amber-50 text-amber-500' },
  ];

  const cardBase =
    'bg-white rounded-2xl border border-neutral-dark border-l-4 border-l-primary-light shadow-sm p-5 flex flex-col';
  const cardBtn =
    'mt-4 self-start inline-flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all';

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-8 animate-fade-in font-roboto">

      {/* 1 ── Greeting ─────────────────────────────────────────────────── */}
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold font-montserrat text-black-light">
          {greetingForNow()}, {firstName}
        </h1>
        <p className="text-sm md:text-base text-secondary-dark">
          Here is your opportunity pipeline.
        </p>
      </header>

      {/* 2 ── Briefing cards (1–3, conditional) ────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* A) New opportunities */}
        {newOppsCount > 0 && (
          <div className={cardBase}>
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary-light/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary-light" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold font-montserrat text-black-light leading-snug">
                  Your headhunter found {newOppsCount} new {newOppsCount === 1 ? 'role' : 'roles'}
                </h2>
                <p className="text-sm text-secondary-dark mt-1">
                  Fresh matches are waiting for your review.
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/dashboard/opportunities')} className={cardBtn}>
              Review Opportunities
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* B) Introductions waiting */}
        {draftCount > 0 && (
          <div className={cardBase}>
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary-light/10 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-primary-light" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold font-montserrat text-black-light leading-snug">
                  {draftCount} {draftCount === 1 ? 'introduction' : 'introductions'} waiting for review
                </h2>
                <p className="text-sm text-secondary-dark mt-1">
                  They get colder each day — a quick review keeps them warm.
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/dashboard/introductions')} className={cardBtn}>
              Review Introductions
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* C) Working / empty state — nothing needs the user right now */}
        {nothingToDo && (
          <div className="bg-white rounded-2xl border border-neutral-dark border-l-4 border-l-primary-light shadow-sm p-6 flex items-center gap-4 md:col-span-2">
            <div className="relative w-12 h-12 shrink-0">
              <span className="absolute inset-0 rounded-full bg-primary-light/20 animate-ping" />
              <span className="relative w-12 h-12 rounded-full bg-primary-light/10 border border-primary-light/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-light" />
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold font-montserrat text-black-light leading-snug">
                Your headhunter is sourcing new roles
              </h2>
              <p className="text-sm text-secondary-dark mt-1">
                There's nothing you need to do — check back later.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 3 ── Progress (mini-stats) ────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/60">
          Your progress
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((s) => {
            const StatIcon = s.Icon;
            return (
              <div
                key={s.label}
                className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-4 flex items-center gap-3"
              >
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                  <StatIcon className="w-5 h-5" />
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
      </section>
    </div>
  );
};

export default DashboardPage;

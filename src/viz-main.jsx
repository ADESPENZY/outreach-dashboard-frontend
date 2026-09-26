// TEMPORARY visual-verification harness. Deleted after screenshots.
//
// The real /dashboard/progress needs an authenticated session, so it cannot be
// screenshotted headlessly. This mounts the SAME panel components against
// fixture data so the 375px and desktop layouts can actually be looked at
// rather than reasoned about.
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './index.css';

import KpiCard from './pages/progress/components/KpiCard';
import WeekNavigator from './pages/progress/components/WeekNavigator';
import OutreachAreaChart from './pages/progress/components/OutreachAreaChart';
import OutcomesDonut from './pages/progress/components/OutcomesDonut';
import PipelineFunnelBars from './pages/progress/components/PipelineFunnelBars';
import StreakMomentum from './pages/progress/components/StreakMomentum';
import StrategyPerformance from './pages/progress/components/StrategyPerformance';
import ActivityTimeline from './pages/progress/components/ActivityTimeline';
import { Send, Building2, PartyPopper, TrendingUp } from 'lucide-react';

// ── Fixtures — deliberately awkward: a tiny reply count against a big reach,
// long names, and a straddling week, so the minimum-bar/slice rules and the
// truncation rules are actually exercised.
const DAYS = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-09-${String((i % 30) + 1).padStart(2, '0')}`,
  sent_new: [0, 3, 5, 2, 0, 0, 8, 4, 1, 6][i % 10],
  sent_followups: [0, 1, 2, 0, 0, 3, 1, 0, 2, 1][i % 10],
  replied_received: [0, 0, 1, 0, 0, 0, 2, 0, 0, 1][i % 10],
}));

const WEEK = {
  start: '2026-09-28T00:00:00+01:00',
  end: '2026-10-05T00:00:00+01:00',
  timezone: 'Africa/Lagos',
  offset: 0, is_current: true, has_prev: true, has_next: false,
};

const STAGES = [
  { key: 'reached_out', label: 'Reached out', count: 239, items: [
    { email_id: 1, contact: 'Dr. Alexandra Featherstone-Hough', contact_email: 'a@b.com',
      company: 'Smith+Nephew Orthopaedics International', role: 'Senior Clinical Specialist, EMEA',
      when: '2026-09-29T10:00:00Z', scraped_job_id: 1, tracker_job_id: null, tracker_status: null },
  ] },
  { key: 'replied', label: 'Replied', count: 4, items: [
    { email_id: 2, contact: 'Jo Ng', contact_email: 'j@b.com', company: 'Acme',
      when: '2026-09-30T10:00:00Z', role: 'Engineer', scraped_job_id: 2,
      tracker_job_id: 9, tracker_status: 'replied' },
  ] },
  { key: 'interview', label: 'Interview', count: 1, items: [] },
  { key: 'offer', label: 'Offer', count: 0, items: [] },
];

const KPIS = [
  { key: 'introductions', label: 'Introductions sent', value: 12, helper: 'this week',
    delta: { now: 12, before: 8 }, accent: 'blue', spark: [3, 0, 5, 2, 0, 8, 4],
    sparkLabel: 'Introductions sent per day, last 7 days', icon: Send },
  { key: 'reached', label: 'Companies reached', value: 239, helper: 'all time',
    accent: 'teal', spark: [3, 0, 5, 2, 0, 8, 4],
    sparkLabel: 'Introductions sent per day, last 7 days', icon: Building2 },
  { key: 'replies', label: 'Replies', value: 4, helper: 'companies, all time',
    chip: { count: 2, period: 'this week' }, accent: 'emerald', hero: true, celebrate: true,
    spark: [0, 1, 0, 0, 2, 0, 1], sparkLabel: 'Replies received per day, last 7 days',
    icon: PartyPopper },
  { key: 'reply_rate', label: 'Reply rate', value: 1.7, suffix: '%', decimals: 1,
    helper: '4 of 239 companies replied', accent: 'orange',
    spark: [0, 1, 0, 0, 2, 0, 1], sparkLabel: 'Replies received per day, last 7 days',
    icon: TrendingUp },
];

const STREAK = {
  days: 6, active_today: true,
  recent_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((weekday, i) => ({
    date: `2026-09-2${i}`, weekday, active: i !== 1,
  })),
};
const WEEKS = {
  this: { sent: 19, sent_new: 12, sent_followups: 7, delivered: 19, replied: 2 },
  last: { sent: 14, sent_new: 8, sent_followups: 6, delivered: 14, replied: 1 },
  has_last: true,
};
const COMMUNITY = { active_users: 42, top_pct: 18, sent_week: 12 };
const STRATEGIES = [
  { strategy: 'story', label: 'The Mirror', drafts: 2, sent: 40, replied: 3, reply_rate: 7.5 },
  { strategy: 'proof_first', label: 'The Receipts', drafts: 1, sent: 33, replied: 1, reply_rate: 3.0 },
];
const TIMELINE = {
  events: [
    { type: 'sent', ts: '2026-09-30T10:00:00Z', email_id: 1, contact: 'Dr. Alexandra Featherstone-Hough',
      company: 'Smith+Nephew Orthopaedics International', role: 'Senior Clinical Specialist, EMEA',
      sent_via: 'me@myinbox.com' },
    { type: 'replied', ts: '2026-09-30T14:00:00Z', email_id: 2, contact: 'Jo Ng',
      company: 'Acme', role: 'Engineer' },
  ],
  has_more: false, next_before: null,
};

function Harness() {
  return (
    <div className="relative isolate p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-6 font-roboto">
      <h1 className="text-2xl md:text-3xl font-bold font-montserrat text-black-light">Your Progress</h1>

      <WeekNavigator week={WEEK} isWeek rangeKey="this_week" onSelectRange={() => {}} onStepWeek={() => {}} />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        {KPIS.map(({ key, ...k }) => <KpiCard key={key} {...k} />)}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <Suspense fallback={null}><OutreachAreaChart days={DAYS} rangeLabel="this week" /></Suspense>
          <Suspense fallback={null}><PipelineFunnelBars stages={STAGES} /></Suspense>
          <ActivityTimeline initial={TIMELINE} />
        </div>
        <div className="space-y-6 min-w-0">
          <Suspense fallback={null}><OutcomesDonut reached={239} replied={4} /></Suspense>
          <StreakMomentum streak={STREAK} weeks={WEEKS} community={COMMUNITY} />
          <StrategyPerformance strategies={STRATEGIES} />
        </div>
      </div>
    </div>
  );
}

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={qc}>
    <MemoryRouter><Harness /></MemoryRouter>
  </QueryClientProvider>,
);

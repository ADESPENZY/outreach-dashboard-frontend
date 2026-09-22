import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
  Plus, MessagesSquare, AlertCircle, ArrowRight, Loader2, Building2,
} from 'lucide-react';
import { listInterviewSessions } from '../services/apiInterview';

// ── Interview Prep — landing ─────────────────────────────────────────────────
// Start a new prep, or pick up one you already prepared. Each prep holds the CV
// it answers from, the role, and the questions + answers written ahead of time;
// the live help (listening in and suggesting answers) opens from here.

// Session status → what the user sees. Never colour alone: every badge has text.
const STATUS = {
  prepared: { label: 'Ready',       cls: 'bg-accent-teal/10 text-accent-teal border-accent-teal/20', dot: 'bg-accent-teal' },
  live:     { label: 'In progress', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',        dot: 'bg-emerald-500' },
  ended:    { label: 'Finished',    cls: 'bg-neutral text-secondary-dark border-neutral-dark',        dot: 'bg-secondary-dark/60' },
};

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function sessionTitle(s) {
  if (s.job_title && s.company_name) return `${s.job_title} · ${s.company_name}`;
  return s.job_title || s.company_name || 'Interview prep';
}

export default function InterviewPrepPage() {
  const { data: sessions, isLoading, isError, refetch } = useQuery({
    queryKey: ['interviewSessions'],
    queryFn: listInterviewSessions,
  });

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-6 font-roboto">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold font-montserrat text-black-light">
            Interview Prep
          </h1>
          <p className="text-sm text-secondary-dark mt-1 leading-relaxed">
            Got an interview coming up? Tell us about the role and we'll prepare the
            questions you're likely to get — with answers built from your own experience.
          </p>
        </div>
        <Link
          to="/dashboard/interview/new"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat text-sm rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Start interview prep
        </Link>
      </div>

      {/* ── Past interviews ─────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-neutral-dark shadow-sm">
        <div className="px-6 py-5 border-b border-neutral-dark">
          <h2 className="text-base font-bold font-montserrat text-black-light">Your interviews</h2>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 flex items-center justify-center gap-2 text-sm text-secondary-dark">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Loading your interviews…
          </div>
        ) : isError ? (
          <div className="px-6 py-12 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-secondary-dark/60" aria-hidden="true" />
            <p className="text-sm text-secondary-dark mb-4">Couldn't load your interviews.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="bg-neutral hover:bg-neutral-dark text-black-light text-sm font-semibold rounded-xl px-5 py-2.5 transition-all"
            >
              Try again
            </button>
          </div>
        ) : !sessions?.length ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-neutral-dark">
            {sessions.map((s) => <SessionRow key={s.id} session={s} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function SessionRow({ session }) {
  const status = STATUS[session.status] || STATUS.prepared;
  const canOpen = session.status !== 'ended';
  return (
    <li className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <span className="w-9 h-9 rounded-xl bg-neutral border border-neutral-dark flex items-center justify-center shrink-0 text-secondary-dark">
          <Building2 className="w-4 h-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-black-light truncate">{sessionTitle(session)}</p>
          <p className="text-xs text-secondary-dark mt-0.5">Prepared {formatDate(session.created_at)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:shrink-0">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
          {status.label}
        </span>
        {canOpen && (
          <Link
            to={`/dashboard/interview/${session.id}/live`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-dark hover:text-primary-light rounded-lg px-3 py-2 hover:bg-neutral transition-colors"
          >
            Start live copilot
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-14 text-center max-w-md mx-auto">
      <span className="w-12 h-12 rounded-2xl bg-primary-light/10 text-primary-dark flex items-center justify-center mx-auto mb-4">
        <MessagesSquare className="w-6 h-6" aria-hidden="true" />
      </span>
      <p className="text-base font-bold font-montserrat text-black-light">No interviews yet</p>
      <p className="text-sm text-secondary-dark mt-1 mb-5 leading-relaxed">
        When you land an interview, start a prep here. It takes a minute, and you'll
        walk in knowing what to say.
      </p>
      <Link
        to="/dashboard/interview/new"
        className="inline-flex items-center gap-2 bg-neutral hover:bg-neutral-dark text-black-light text-sm font-semibold rounded-xl px-5 py-2.5 transition-all"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        Start interview prep
      </Link>
    </div>
  );
}

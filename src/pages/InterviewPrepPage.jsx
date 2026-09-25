import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { toast } from 'react-toastify';
import {
  Plus, ArrowRight, Loader2, AlertCircle, FileText, Sparkles, Mic, ListChecks,
  MessageSquareQuote, Upload,
} from 'lucide-react';
import {
  listInterviewSessions, listInterviewSuggestions,
} from '../services/apiInterview';
import { getProfile, updateProfile } from '../services/apiProfile';
import { settingsPath } from '../constants/settingsSections';
import { ANSWER_STYLE_CARDS, DEFAULT_ANSWER_STYLE } from '../constants/answerStyles';
import AnswerStylePicker from '../components/interview/AnswerStylePicker';
import CopilotMock from '../components/interview/CopilotMock';
import SessionReview from '../components/interview/SessionReview';

// ── Interview Prep — the dashboard page ──────────────────────────────────────
// Three zones, in the order they matter:
//   1. Next up        — jobs that just replied or reached interview, ready to prep
//                       (or, with nothing to suggest, a live mock of the copilot)
//   2. Your interviews — what you have prepared, and what to do with each
//   3. Settings row    — the style answers are written in, the CV they come from,
//                       and how the whole thing works
// A dashboard, not a landing page: no hero, no illustration, no claims. Depth
// comes from cards, spacing and the orange accent used sparingly.

const STATUS = {
  prepared: { label: 'Ready',       cls: 'bg-accent-teal/10 text-accent-teal border-accent-teal/20', dot: 'bg-accent-teal' },
  live:     { label: 'In progress', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',        dot: 'bg-emerald-500' },
  ended:    { label: 'Finished',    cls: 'bg-neutral text-secondary-dark border-neutral-dark',       dot: 'bg-secondary-dark/60' },
};
const PRIMARY = 'inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat text-sm rounded-xl px-4 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-50';
const QUIET = 'inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-primary-dark hover:text-primary-light rounded-lg px-3 py-2 hover:bg-neutral transition-colors';

function initial(name) {
  return (name || '?').trim().charAt(0).toUpperCase() || '?';
}

function shortDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** "2 days ago" / "today" — only ever called with a real date. */
function timeAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months <= 1 ? 'last month' : `${months} months ago`;
}

export default function InterviewPrepPage() {
  const [review, setReview] = useState(null);      // the session being reviewed

  const sessions = useQuery({ queryKey: ['interviewSessions'], queryFn: listInterviewSessions });
  const suggestions = useQuery({ queryKey: ['interviewSuggestions'], queryFn: listInterviewSuggestions });
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-6 md:space-y-8 font-roboto">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold font-montserrat text-black-light">
            Interview Prep
          </h1>
          <p className="text-sm text-secondary-dark mt-1 leading-relaxed">
            Prepare the questions you're likely to get, then have your answers on screen while you talk.
          </p>
        </div>
        <Link to="/dashboard/interview/new" className={PRIMARY}>
          <Plus className="w-4 h-4" aria-hidden="true" />
          New interview prep
        </Link>
      </div>

      {/* ── ZONE 1 — Next up ──────────────────────────────────────────── */}
      <Zone title="Next up">
        {suggestions.isLoading ? (
          <Card><Skeleton lines={2} /></Card>
        ) : suggestions.data?.length ? (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {suggestions.data.map((job) => <SuggestionCard key={job.id} job={job} />)}
          </ul>
        ) : (
          <Card className="p-4 md:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
              <CopilotMock />
              <div className="space-y-2 min-w-0">
                <h3 className="text-base font-bold font-montserrat text-black-light">
                  This is what you'll see while you talk
                </h3>
                <p className="text-sm text-secondary-dark leading-relaxed">
                  Go live and the copilot listens to your meeting tab, writes down each question as
                  it's asked, and puts an answer on screen — in your own words, from your own CV.
                  It sits in a small floating window on top of your call.
                </p>
                <p className="text-sm text-secondary-dark leading-relaxed">
                  When a job replies or reaches the interview stage, it'll appear here ready to prep.
                </p>
                <Link to="/dashboard/interview/new" className={QUIET}>
                  Prepare for an interview
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </Card>
        )}
      </Zone>

      {/* ── ZONE 2 — Your interviews ──────────────────────────────────── */}
      <Zone title="Your interviews">
        {sessions.isLoading ? (
          <Card><Skeleton lines={3} /></Card>
        ) : sessions.isError ? (
          <Card className="px-5 py-4 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            Couldn't load your interviews.
            <button type="button" onClick={() => sessions.refetch()} className={`${QUIET} ml-auto`}>
              Try again
            </button>
          </Card>
        ) : !sessions.data?.length ? (
          <p className="text-sm text-secondary-dark">
            Nothing prepared yet — start with a job above, or{' '}
            <Link to="/dashboard/interview/new" className="font-semibold text-primary-dark hover:text-primary-light">
              add an interview manually
            </Link>.
          </p>
        ) : (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {sessions.data.map((session) => (
              <SessionCard key={session.id} session={session} onReview={() => setReview(session)} />
            ))}
          </ul>
        )}
      </Zone>

      {/* ── ZONE 3 — Style / CV / how it works ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StyleCard profile={profile} />
        <CvCard profile={profile} />
        <HowItWorksCard />
      </div>

      {review && <SessionReview session={review} onClose={() => setReview(null)} />}
    </div>
  );
}

// ── shells ──────────────────────────────────────────────────────────────────

function Zone({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-secondary-dark/60 font-montserrat">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-neutral-dark shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Skeleton({ lines = 2 }) {
  return (
    <div className="px-5 py-4 space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded-lg bg-neutral animate-pulse" style={{ width: `${70 - i * 15}%` }} />
      ))}
    </div>
  );
}

function CompanyTile({ name, size = 'md' }) {
  const box = size === 'lg' ? 'w-11 h-11 text-base' : 'w-10 h-10 text-sm';
  return (
    <span className={`${box} shrink-0 rounded-xl bg-primary-light/10 text-primary-dark
                      border border-primary-light/20 flex items-center justify-center
                      font-bold font-montserrat`}
          aria-hidden="true">
      {initial(name)}
    </span>
  );
}

// ── ZONE 1 card ─────────────────────────────────────────────────────────────

function SuggestionCard({ job }) {
  // The wizard reads these: job_id ties the prep to the job (its description and
  // company come from there), company just prefills the field for the user.
  const to = `/dashboard/interview/new?job_id=${job.id}`
    + `&company=${encodeURIComponent(job.company_name || '')}`
    + `&role=${encodeURIComponent(job.title || '')}`;
  const said = job.status === 'interview' ? 'Interview stage' : 'Replied';
  return (
    <li>
      <Card className="px-4 py-4 flex items-center gap-3 flex-wrap hover:border-primary-light/30 hover:shadow-md transition-all">
        <CompanyTile name={job.company_name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-black-light truncate">{job.title}</p>
          <p className="text-xs text-secondary-dark truncate">{job.company_name}</p>
          <p className="text-xs text-secondary-dark/80 mt-0.5">
            {job.status_since ? `${said} ${timeAgo(job.status_since)}` : said}
          </p>
        </div>
        <Link to={to} className={`${PRIMARY} w-full sm:w-auto shrink-0`}>Prep for this</Link>
      </Card>
    </li>
  );
}

// ── ZONE 2 card ─────────────────────────────────────────────────────────────

function SessionCard({ session, onReview }) {
  const status = STATUS[session.status] || STATUS.prepared;
  const title = session.job_title || session.company_name || 'Interview prep';
  const count = session.anticipated_count ?? 0;
  return (
    <li>
      <Card className="px-4 py-4 flex items-center gap-3 flex-wrap">
        <CompanyTile name={session.company_name || session.job_title} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-black-light truncate">{title}</p>
          {session.job_title && session.company_name && (
            <p className="text-xs text-secondary-dark truncate">{session.company_name}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${status.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
              {status.label}
            </span>
            <span className="text-xs text-secondary-dark">{shortDate(session.created_at)}</span>
            <span className="text-xs text-secondary-dark">
              · {count} {count === 1 ? 'question' : 'questions'} prepared
            </span>
          </div>
        </div>
        {session.status === 'ended' ? (
          <button type="button" onClick={onReview}
                  className={`${QUIET} w-full sm:w-auto shrink-0 border border-neutral-dark sm:border-0`}>
            Review answers
          </button>
        ) : (
          <Link to={`/dashboard/interview/${session.id}/live`} className={`${PRIMARY} w-full sm:w-auto shrink-0`}>
            <Mic className="w-4 h-4" aria-hidden="true" />
            Start live
          </Link>
        )}
      </Card>
    </li>
  );
}

// ── ZONE 3 cards ────────────────────────────────────────────────────────────

function StyleCard({ profile }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const current = profile?.answer_style_default || DEFAULT_ANSWER_STYLE;
  const [draft, setDraft] = useState(current);
  const card = ANSWER_STYLE_CARDS.find((c) => c.id === current) || ANSWER_STYLE_CARDS[1];
  // One line of the real sample, so the card shows the voice rather than naming it.
  const sample = `${card.samples.yourself.split('. ')[0]}…`;

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ answer_style_default: draft });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Answer style saved.');
      setOpen(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="px-5 py-4 flex flex-col gap-2 h-full">
        <div className="flex items-center gap-2">
          <MessageSquareQuote className="w-4 h-4 text-primary-light shrink-0" aria-hidden="true" />
          <h3 className="text-sm font-bold font-montserrat text-black-light">Your answer style</h3>
        </div>
        <p className="text-sm font-semibold text-black-light">{card.label}</p>
        <p className="text-xs text-secondary-dark leading-relaxed italic">“{sample}”</p>
        <button type="button" onClick={() => { setDraft(current); setOpen((o) => !o); }}
                className={`${QUIET} -ml-3 mt-auto self-start`}>
          {open ? 'Close' : 'Change'}
        </button>
      </Card>

      {open && (
        <div className="md:col-span-3 order-last">
          <Card className="p-5 space-y-4">
            <AnswerStylePicker value={draft} onChange={setDraft} />
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className={QUIET}>Cancel</button>
              <button type="button" onClick={save} disabled={saving || draft === current} className={PRIMARY}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Save as my default
              </button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function CvCard({ profile }) {
  const hasCv = !!(profile?.cv_raw_text || '').trim();
  const chars = (profile?.cv_raw_text || '').length;
  return (
    <Card className="px-5 py-4 flex flex-col gap-2 h-full">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary-light shrink-0" aria-hidden="true" />
        <h3 className="text-sm font-bold font-montserrat text-black-light">CV in use</h3>
      </div>
      {hasCv ? (
        <>
          <p className="text-sm font-semibold text-black-light">Your profile CV</p>
          <p className="text-xs text-secondary-dark leading-relaxed">
            Every answer is built from this, and nothing outside it.
            {profile?.cv_pdf_url ? ' Your uploaded PDF is stored.' : ''}
            {chars ? ` ${chars.toLocaleString()} characters of text.` : ''}
          </p>
          <Link to={settingsPath('cv')} className={`${QUIET} -ml-3 mt-auto self-start`}>Change</Link>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-black-light">No CV yet</p>
          <p className="text-xs text-secondary-dark leading-relaxed">
            Answers are built from your CV, so add one before your first interview.
          </p>
          <Link to={settingsPath('cv')} className={`${PRIMARY} mt-auto self-start`}>
            <Upload className="w-4 h-4" aria-hidden="true" />
            Add your CV
          </Link>
        </>
      )}
    </Card>
  );
}

function HowItWorksCard() {
  const steps = [
    { icon: ListChecks, text: 'Tell us the role. We write the questions you\'re likely to get, with answers from your CV.' },
    { icon: Mic, text: 'Go live and share your meeting tab, so we can hear the questions.' },
    { icon: Sparkles, text: 'Each answer appears in a floating window while you talk.' },
  ];
  return (
    <Card className="px-5 py-4 h-full">
      <h3 className="text-sm font-bold font-montserrat text-black-light mb-3">How it works</h3>
      <ol className="space-y-2.5">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="w-6 h-6 shrink-0 rounded-lg bg-neutral border border-neutral-dark
                             flex items-center justify-center text-secondary-dark">
              <step.icon className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <p className="text-xs text-secondary-dark leading-relaxed">{step.text}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

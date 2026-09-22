import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import {
  ArrowLeft, Mic, Square, Loader2, RefreshCw, AlertCircle, Info, CheckCircle2, Sparkles,
} from 'lucide-react';
import { getInterviewContext } from '../services/apiInterview';
import { useLiveCopilot } from '../hooks/useLiveCopilot';
import { inlineSegments, parseAnswer } from '../lib/liveCopilot';

// ── Interview Prep — live copilot ────────────────────────────────────────────
// Read at a glance mid-interview: the question at the top, the answer big and
// calm below it (lead line + a few bullets), one Start/Stop toggle. The audio
// loop itself lives in useLiveCopilot. Picture-in-Picture comes next.

const PRIMARY = 'inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat text-sm rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
const SECONDARY = 'inline-flex items-center justify-center gap-2 bg-neutral hover:bg-neutral-dark text-black-light font-semibold text-sm rounded-xl px-5 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

export default function InterviewLivePage() {
  const { sessionId } = useParams();
  const { data: context, isLoading, isError } = useQuery({
    queryKey: ['interviewContext', sessionId],
    queryFn: () => getInterviewContext(sessionId),
    staleTime: Infinity,
  });
  const live = useLiveCopilot(sessionId);

  const job = context?.job;
  const company = job?.company_name || context?.session?.company_name;
  const role = live.view.role || job?.title;
  const title = [role, company].filter(Boolean).join(' · ') || 'Your interview';
  const alreadyEnded = context?.session?.status === 'ended';
  const finished = live.status === 'finished' || (alreadyEnded && live.status === 'idle');

  return (
    <div className="p-4 md:p-8 w-full max-w-3xl mx-auto space-y-5 font-roboto">
      <Link
        to="/dashboard/interview"
        className="inline-flex items-center gap-1.5 text-sm text-secondary-dark hover:text-black-light hover:bg-neutral rounded-lg px-3 py-2 -ml-3 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Interview Prep
      </Link>

      {/* ── Header: what this is + the one control ─────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold font-montserrat text-black-light truncate">
            {isLoading ? 'Loading…' : title}
          </h1>
          <StatusLine status={live.status} bankSize={live.view.bankSize} finished={finished} />
        </div>
        {!finished && (
          <Toggle live={live} disabled={isLoading || isError} />
        )}
      </div>

      {isError ? (
        <Notice tone="error">We couldn't load this interview. Go back and open it again.</Notice>
      ) : finished ? (
        <Finished />
      ) : !live.configured ? (
        <Notice tone="info">Live help isn't switched on for this app yet.</Notice>
      ) : null}

      {live.problem && !finished && (
        <Notice tone={live.status === 'dropped' ? 'error' : 'info'}>
          {live.problem}
          {live.status === 'dropped' && (
            <button
              type="button"
              onClick={live.reconnect}
              className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary-dark hover:text-primary-light rounded-lg px-3 py-1.5 hover:bg-white transition-colors shrink-0"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Reconnect
            </button>
          )}
        </Notice>
      )}

      {live.status === 'idle' && !finished && live.configured && !live.view.question && <HowItWorks />}

      {(live.view.question || live.view.caption || ['listening', 'dropped', 'stopping'].includes(live.status)) && !finished && (
        <LivePanel view={live.view} listening={live.status === 'listening'} />
      )}
    </div>
  );
}

function Toggle({ live, disabled }) {
  const running = ['connecting', 'listening', 'dropped'].includes(live.status);
  if (running || live.status === 'stopping') {
    return (
      <div className="flex flex-col items-end gap-1">
        <button type="button" onClick={live.stop} disabled={live.status === 'stopping'} className={SECONDARY}>
          {live.status === 'stopping'
            ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            : <Square className="w-4 h-4 fill-current" aria-hidden="true" />}
          Stop
        </button>
        <span className="text-xs text-secondary-dark">Stopping ends this interview.</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={live.start}
      disabled={disabled || !live.configured || live.status === 'starting'}
      className={PRIMARY}
    >
      {live.status === 'starting'
        ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        : <Mic className="w-4 h-4" aria-hidden="true" />}
      Start
    </button>
  );
}

function StatusLine({ status, bankSize, finished }) {
  if (finished) return <p className="text-sm text-secondary-dark mt-1">Finished</p>;
  if (status === 'listening') {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-700 mt-1" role="status">
        <span className="relative flex w-2 h-2" aria-hidden="true">
          <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping motion-reduce:animate-none" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
        </span>
        Listening…
        {bankSize > 0 && <span className="text-secondary-dark">· {bankSize} answers prepared</span>}
      </p>
    );
  }
  const text = {
    idle: 'Ready when you are',
    starting: 'Choose your meeting tab…',
    connecting: 'Connecting…',
    dropped: 'Not listening',
    stopping: 'Ending interview…',
  }[status];
  return <p className="text-sm text-secondary-dark mt-1" role="status">{text}</p>;
}

function LivePanel({ view, listening }) {
  const { lead, bullets } = parseAnswer(view.answer);
  const streaming = !!view.question && !view.answerDone;
  return (
    <section className="bg-white rounded-2xl border border-neutral-dark shadow-sm" aria-live="polite">
      {/* Question */}
      <div className="px-6 py-5 border-b border-neutral-dark">
        <p className="text-[11px] font-bold text-secondary-dark/60 uppercase tracking-wider font-montserrat">
          They asked
        </p>
        <p className="text-base md:text-lg font-semibold text-black-light mt-1 leading-snug">
          {view.question || (listening ? 'Waiting for the first question…' : '—')}
        </p>
        {view.caption && (
          <p className="text-sm text-secondary-dark italic mt-2 leading-relaxed">
            Hearing: “{view.caption}”
          </p>
        )}
      </div>

      {/* Answer */}
      <div className="px-6 py-6 space-y-4 min-h-[10rem]">
        {view.notice && (
          <p className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            {view.notice}
          </p>
        )}

        {view.question && !view.answer && !view.notice && (
          <p className="flex items-center gap-2 text-sm text-secondary-dark">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Thinking of an answer…
          </p>
        )}

        {lead.map((line, i) => (
          <p key={i} className="text-xl md:text-2xl font-bold font-montserrat text-black-light leading-snug">
            <Inline text={line} />
          </p>
        ))}

        {bullets.length > 0 && (
          <ul className="space-y-3">
            {bullets.map((b, i) => (
              <li key={i} className="flex gap-3 text-lg text-black-light leading-relaxed">
                {b.label ? (
                  <span className="shrink-0 mt-1 inline-flex items-center justify-center px-2 h-6 rounded-lg bg-primary-light/10 text-primary-dark text-xs font-bold font-montserrat">
                    {b.label}
                  </span>
                ) : (
                  <span className="shrink-0 mt-3 w-1.5 h-1.5 rounded-full bg-primary-light" aria-hidden="true" />
                )}
                <span className="min-w-0"><Inline text={b.text} /></span>
              </li>
            ))}
          </ul>
        )}

        {streaming && view.answer && (
          <span className="inline-block w-2 h-5 bg-primary-light/60 animate-pulse rounded-sm" aria-hidden="true" />
        )}

        {view.answerDone && (
          <div className="flex items-center gap-2 pt-1">
            {view.source === 'cached' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-accent-teal/10 text-accent-teal border-accent-teal/20">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                Prepared answer
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Inline({ text }) {
  return inlineSegments(text).map((seg, i) =>
    seg.bold ? <strong key={i} className="font-bold">{seg.text}</strong> : <span key={i}>{seg.text}</span>);
}

function Notice({ tone, children }) {
  const styles = tone === 'error'
    ? 'bg-red-50 text-red-600 border-red-200'
    : 'bg-neutral text-secondary-dark border-neutral-dark';
  const Icon = tone === 'error' ? AlertCircle : Info;
  return (
    <div className={`flex items-center gap-2 text-sm border rounded-xl px-4 py-3 ${styles}`}>
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      {children}
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="bg-white rounded-2xl border border-neutral-dark shadow-sm px-6 py-5">
      <h2 className="text-base font-bold font-montserrat text-black-light">When your interview starts</h2>
      <ol className="mt-3 space-y-2 text-sm text-secondary-dark leading-relaxed list-decimal pl-5">
        <li>Open your meeting (Google Meet, Zoom or Teams in the browser) in another tab.</li>
        <li>Press <span className="font-semibold text-black-light">Start</span> and pick that meeting tab.</li>
        <li>Tick <span className="font-semibold text-black-light">“Share tab audio”</span> — that's how we hear the questions.</li>
      </ol>
      <p className="text-xs text-secondary-dark mt-4">
        We only listen to the tab you pick, never your microphone. Works in Chrome and Edge on a computer.
      </p>
    </section>
  );
}

function Finished() {
  return (
    <section className="bg-white rounded-2xl border border-neutral-dark shadow-sm px-6 py-12 text-center">
      <CheckCircle2 className="w-10 h-10 mx-auto mb-4 text-emerald-500" aria-hidden="true" />
      <p className="text-lg font-bold font-montserrat text-black-light">Interview finished</p>
      <p className="text-sm text-secondary-dark mt-1 mb-6">Good luck — we hope it went well.</p>
      <Link to="/dashboard/interview" className={SECONDARY}>Back to Interview Prep</Link>
    </section>
  );
}

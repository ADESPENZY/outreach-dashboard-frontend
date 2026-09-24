import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import {
  ArrowLeft, Mic, Square, Loader2, RefreshCw, AlertCircle, Info, CheckCircle2,
  PictureInPicture2,
} from 'lucide-react';
import { getInterviewContext } from '../services/apiInterview';
import { useLiveCopilot } from '../hooks/useLiveCopilot';
import { useDocumentPip } from '../hooks/useDocumentPip';
import LiveAnswerPanel from '../components/interview/LiveAnswerPanel';

// ── Interview Prep — live copilot ────────────────────────────────────────────
// The page holds the controls (Start/Stop, Pop out, problems) and the state;
// LiveAnswerPanel renders the answers. The SAME panel instance-for-instance is
// portalled into the Document Picture-in-Picture window, so the floating copy
// and the in-page copy share one state — no fork, no second socket.
//
// Nothing is discarded: every question and answer stays in view.history, and
// interrupt handling is about WHICH one you are looking at (see lib/liveCopilot).

// Statuses in which the socket is gone and the floating window closes.
const PIP_CLOSES_ON = ['idle', 'dropped', 'stopping', 'finished'];

const PRIMARY = 'inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat text-sm rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
const SECONDARY = 'inline-flex items-center justify-center gap-2 bg-neutral hover:bg-neutral-dark text-black-light font-semibold text-sm rounded-xl px-5 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

export default function InterviewLivePage() {
  const { sessionId } = useParams();
  const { data: context, isLoading, isError } = useQuery({
    queryKey: ['interviewContext', sessionId],
    queryFn: () => getInterviewContext(sessionId),
    staleTime: Infinity,
  });
  const pip = useDocumentPip();
  const live = useLiveCopilot(sessionId, {
    // Right after the tab is shared. requestWindow() needs a live user gesture,
    // and the tab picker usually outlasts it — then "Pop out" does the job.
    onAudioShared: () => {
      const active = navigator.userActivation ? navigator.userActivation.isActive : true;
      if (pip.supported && active) pip.open().catch(() => {});
    },
  });

  const { close: closePip } = pip;
  useEffect(() => {
    if (PIP_CLOSES_ON.includes(live.status)) closePip();
  }, [live.status, closePip]);

  // The style this interview was prepared in (session → profile → experience).
  const contextStyle = context?.answer_style;
  const { dispatch } = live;
  useEffect(() => {
    if (contextStyle) dispatch({ type: 'ui/style', style: contextStyle });
  }, [contextStyle, dispatch]);

  const job = context?.job;
  const company = job?.company_name || context?.session?.company_name;
  const role = live.view.role || job?.title;
  const title = [role, company].filter(Boolean).join(' · ') || 'Your interview';
  const alreadyEnded = context?.session?.status === 'ended';
  const finished = live.status === 'finished' || (alreadyEnded && live.status === 'idle');

  const panel = (
    <LiveAnswerPanel
      view={live.view}
      dispatch={live.dispatch}
      status={live.status}
      title={isLoading ? 'Loading…' : title}
      onSetStyle={live.setStyle}
      onRegenerate={live.regenerate}
      // Fills its (flex) container in both homes, so the answer body — not the
      // page or the floating window — is what scrolls.
      className="flex-1 min-w-0"
    />
  );

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
        {!finished && <Toggle live={live} disabled={isLoading || isError} />}
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

      {!finished && live.configured && <FloatingWindowControl pip={pip} status={live.status} />}

      {live.status === 'idle' && !finished && live.configured && !live.view.history.length && <HowItWorks />}

      {/* In-page panel: always here, whether or not the floating window is open.
          Capped height so long answers scroll inside it instead of the page. */}
      {!finished && (
        <div className="h-[26rem] md:h-[30rem] flex">
          {pip.pipWindow
            ? <PoppedOutPlaceholder onFocus={() => pip.pipWindow.focus()} />
            : panel}
        </div>
      )}

      {/* The floating window renders the very same panel. */}
      {pip.pipWindow && createPortal(
        <div className="h-full p-2 flex">{panel}</div>,
        pip.pipWindow.document.body,
      )}
    </div>
  );
}

function PoppedOutPlaceholder({ onFocus }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 bg-white rounded-2xl border border-neutral-dark">
      <PictureInPicture2 className="w-7 h-7 text-primary-light" aria-hidden="true" />
      <p className="text-sm text-secondary-dark max-w-xs leading-relaxed">
        Your answers are in the floating window so they stay on top of your meeting.
      </p>
      <button type="button" onClick={onFocus} className={SECONDARY}>Bring it to the front</button>
    </div>
  );
}

function FloatingWindowControl({ pip, status }) {
  if (!pip.supported) {
    return (
      <p className="flex items-center gap-2 text-xs text-secondary-dark">
        <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        Your browser doesn't support the floating window — answers will show on this page.
      </p>
    );
  }
  if (pip.pipWindow) {
    return (
      <p className="flex items-center gap-2 text-xs text-secondary-dark">
        <PictureInPicture2 className="w-3.5 h-3.5 shrink-0 text-accent-teal" aria-hidden="true" />
        Answers are showing in the floating window.
      </p>
    );
  }
  if (!['connecting', 'listening'].includes(status)) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap bg-white rounded-xl border border-neutral-dark px-4 py-3">
      <p className="text-sm text-secondary-dark flex-1 min-w-0">
        Pop the answers out into a small window that stays on top of your meeting.
      </p>
      <button
        type="button"
        onClick={() => pip.open().catch(() => {})}
        className="inline-flex items-center gap-2 bg-neutral hover:bg-neutral-dark text-black-light font-semibold text-sm rounded-xl px-4 py-2 transition-all shrink-0"
      >
        <PictureInPicture2 className="w-4 h-4" aria-hidden="true" />
        Pop out
      </button>
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
        Once it's running: <span className="font-semibold text-black-light">←</span> and
        <span className="font-semibold text-black-light"> →</span> move between answers,
        <span className="font-semibold text-black-light"> L</span> jumps to the latest,
        <span className="font-semibold text-black-light"> S</span> switches to a new question.
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

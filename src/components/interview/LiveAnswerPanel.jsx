import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, ArrowDownToLine, RefreshCw, Minus, Plus, Radio,
} from 'lucide-react';
import { ANSWER_STYLES, STYLE_LABELS, currentEntry, inlineSegments } from '../../lib/liveCopilot';

// ── LiveAnswerPanel — the answer console ─────────────────────────────────────
// ONE component for both places it appears: inline on the live page and inside
// the Document Picture-in-Picture window (same props, same state — no fork).
//
// Deliberately the app's only dark surface: it is read at a glance over a video
// call, where a white card glares. Colours come from the `overlay` tokens in
// tailwind.config.js; brand orange stays the single accent.
//
// Keyboard (bound to THIS panel's document, so it works in the page and in the
// floating window): ← → step through answers, L jumps to the latest, S switches
// to a new question that arrived while you were reading.

const FONT_STEPS = [0.9, 1, 1.15, 1.3];
const FONT_KEY = 'copilot.fontScale';
const PINNED_SLACK_PX = 48;      // "close enough to the bottom" while streaming

function readScale() {
  try {
    const saved = Number(localStorage.getItem(FONT_KEY));
    return FONT_STEPS.includes(saved) ? saved : 1;
  } catch {
    return 1;
  }
}

function Inline({ text }) {
  return inlineSegments(text).map((seg, i) =>
    seg.bold ? <strong key={i} className="font-semibold">{seg.text}</strong> : <span key={i}>{seg.text}</span>);
}

export default function LiveAnswerPanel({
  view, dispatch, status, title, onSetStyle, onRegenerate, className = '',
}) {
  const rootRef = useRef(null);
  const scrollRef = useRef(null);
  const pinnedRef = useRef(true);
  const [scale, setScale] = useState(readScale);

  const entry = currentEntry(view);
  const total = view.history.length;
  const position = view.index >= 0 ? view.index + 1 : 0;
  const atLatest = view.index === total - 1;
  const streaming = entry?.status === 'streaming';
  const newest = total ? view.history[total - 1] : null;

  // Keyboard, on whichever document this copy lives in.
  useEffect(() => {
    const doc = rootRef.current?.ownerDocument;
    if (!doc) return undefined;
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); dispatch({ type: 'ui/back' }); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: 'ui/forward' }); }
      else if (e.key === 'l' || e.key === 'L') dispatch({ type: 'ui/latest' });
      else if (e.key === 's' || e.key === 'S') dispatch({ type: 'ui/switch' });
    };
    doc.addEventListener('keydown', onKey);
    return () => doc.removeEventListener('keydown', onKey);
  }, [dispatch]);

  // A different answer always starts at the top, pinned again.
  useLayoutEffect(() => {
    pinnedRef.current = true;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [entry?.question_id]);

  // Follow the text while it streams — unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [entry?.raw, entry?.status]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < PINNED_SLACK_PX;
  };

  const step = (delta) => {
    const i = FONT_STEPS.indexOf(scale);
    const next = FONT_STEPS[Math.min(FONT_STEPS.length - 1, Math.max(0, i + delta))];
    setScale(next);
    try { localStorage.setItem(FONT_KEY, String(next)); } catch { /* private mode */ }
  };

  const lead = `${(21 * scale).toFixed(1)}px`;
  const bodyFont = `${(16.5 * scale).toFixed(1)}px`;

  return (
    <section
      ref={rootRef}
      className={`flex flex-col min-h-0 bg-overlay text-overlay-text border border-overlay-line
                  rounded-2xl overflow-hidden font-roboto ${className}`}
      aria-label="Live interview answers"
    >
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-overlay-raised border-b border-overlay-line">
        <ListeningDot status={status} />
        <p className="text-xs font-semibold truncate min-w-0 flex-1">{title}</p>
        {view.style && (
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                           bg-primary-light/15 text-primary-light border border-primary-light/30 shrink-0">
            {STYLE_LABELS[view.style] || view.style}
          </span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <IconButton label="Previous answer" onClick={() => dispatch({ type: 'ui/back' })}
                      disabled={view.index <= 0}>
            <ChevronLeft className="w-4 h-4" />
          </IconButton>
          <span className="text-xs tabular-nums text-overlay-muted w-10 text-center">
            {total ? `${position} / ${total}` : '—'}
          </span>
          <IconButton label="Next answer" onClick={() => dispatch({ type: 'ui/forward' })}
                      disabled={atLatest || total === 0}>
            <ChevronRight className="w-4 h-4" />
          </IconButton>
        </div>
      </div>

      {/* ── New-question banner (only while auto-follow is paused) ──── */}
      {view.pendingNew > 0 && newest && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-light/10 border-b border-primary-light/30
                        animate-fade-in">
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-primary-light text-white text-xs font-bold">
            {view.pendingNew} new
          </span>
          <p className="text-xs text-overlay-text/90 truncate min-w-0 flex-1">
            <span className="text-overlay-muted">New question: </span>“{newest.question}”
          </p>
          <button type="button" onClick={() => dispatch({ type: 'ui/switch' })}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-light text-white
                             hover:opacity-90 transition-opacity">
            Switch
          </button>
          <button type="button" onClick={() => dispatch({ type: 'ui/stay' })}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold text-overlay-muted
                             hover:text-overlay-text hover:bg-white/5 transition-colors">
            Stay
          </button>
        </div>
      )}

      {view.notice && (
        <p className="px-3 py-2 text-xs text-amber-300 bg-amber-400/10 border-b border-amber-400/20">
          {view.notice}
        </p>
      )}

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div ref={scrollRef} onScroll={onScroll}
           className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3">
        {!entry ? (
          <Waiting status={status} />
        ) : (
          <div key={entry.question_id} className="animate-fade-in space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-overlay-muted">
                They asked
              </p>
              <p className="text-sm text-overlay-text/90 mt-1 leading-snug">{entry.question}</p>
            </div>

            {entry.lead && (
              <p className="font-semibold leading-snug" style={{ fontSize: lead }}>
                <Inline text={entry.lead} />
              </p>
            )}

            {entry.body && (
              <div className="space-y-2 text-overlay-text/85" style={{ fontSize: bodyFont }}>
                {entry.body.split(/\n{2,}/).map((para, i) => (
                  <p key={i} className="leading-relaxed">
                    <Inline text={para.replace(/\n/g, ' ')} />
                  </p>
                ))}
              </div>
            )}

            {streaming && (
              <span className="inline-block w-[2px] h-5 align-middle bg-primary-light animate-caret
                               motion-reduce:animate-none" aria-hidden="true" />
            )}

            {!entry.lead && !entry.body && entry.status === 'streaming' && (
              <p className="text-sm text-overlay-muted">Thinking of an answer…</p>
            )}

            {entry.cues.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 pt-1">
                {entry.cues.map((cue, i) => (
                  <li key={i} className="px-2.5 py-1 rounded-full text-xs font-medium
                                         bg-primary-light/10 text-primary-light border border-primary-light/25">
                    {cue}
                  </li>
                ))}
              </ul>
            )}

            {entry.status === 'cancelled' && (
              <p className="text-xs text-overlay-muted border-t border-overlay-line pt-2">
                {entry.error || 'This answer stopped to make room for a newer question.'} Rewrite it to try again.
              </p>
            )}

            {entry.status === 'done' && entry.source === 'cached' && (
              <p className="text-xs text-overlay-muted pt-1">Prepared earlier</p>
            )}
          </div>
        )}
      </div>

      {/* ── Footer: style, rewrite, follow, text size ───────────────── */}
      <div className="flex items-center gap-2 flex-wrap px-3 py-2 bg-overlay-raised border-t border-overlay-line">
        <div className="flex items-center gap-1" role="group" aria-label="Answer style">
          {ANSWER_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onSetStyle(style)}
              aria-pressed={view.style === style}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                view.style === style
                  ? 'bg-primary-light text-white'
                  : 'text-overlay-muted hover:text-overlay-text hover:bg-white/5'}`}
            >
              {STYLE_LABELS[style]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => entry && onRegenerate(entry.question_id, view.style)}
          disabled={!entry}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold
                     text-overlay-muted hover:text-overlay-text hover:bg-white/5 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Rewrite in this style
        </button>

        <div className="flex items-center gap-1 ml-auto shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={view.autoFollow}
            onClick={() => dispatch({ type: 'ui/autofollow', on: !view.autoFollow })}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              view.autoFollow
                ? 'bg-primary-light/15 text-primary-light border border-primary-light/30'
                : 'text-overlay-muted border border-overlay-line hover:text-overlay-text'}`}
          >
            Auto-follow {view.autoFollow ? 'on' : 'off'}
          </button>
          {!atLatest && total > 0 && (
            <IconButton label="Jump to the latest answer" onClick={() => dispatch({ type: 'ui/latest' })}>
              <ArrowDownToLine className="w-4 h-4" />
            </IconButton>
          )}
          <IconButton label="Smaller text" onClick={() => step(-1)} disabled={scale === FONT_STEPS[0]}>
            <Minus className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton label="Bigger text" onClick={() => step(1)}
                      disabled={scale === FONT_STEPS[FONT_STEPS.length - 1]}>
            <Plus className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </div>
    </section>
  );
}

function IconButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="p-2 min-w-11 min-h-11 sm:min-w-9 sm:min-h-9 inline-flex items-center justify-center
                 rounded-lg text-overlay-muted hover:text-overlay-text hover:bg-white/5
                 transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                 focus:outline-none focus:ring-2 focus:ring-primary-light/40"
    >
      {children}
    </button>
  );
}

function ListeningDot({ status }) {
  if (status === 'listening') {
    return (
      <span className="relative flex w-2 h-2 shrink-0" title="Listening" aria-label="Listening" role="img">
        <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75
                         animate-ping motion-reduce:animate-none" />
        <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
      </span>
    );
  }
  const tint = status === 'dropped' ? 'text-red-400' : 'text-overlay-muted';
  return <Radio className={`w-3 h-3 shrink-0 ${tint}`} aria-label={status} role="img" />;
}

function Waiting({ status }) {
  const text = status === 'listening'
    ? 'Listening for the first question…'
    : status === 'connecting' ? 'Connecting…' : 'Press Start when your interview begins.';
  return (
    <div className="h-full min-h-[6rem] flex items-center justify-center text-center">
      <p className="text-sm text-overlay-muted">{text}</p>
    </div>
  );
}

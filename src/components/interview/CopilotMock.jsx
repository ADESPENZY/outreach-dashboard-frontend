import { useEffect, useRef, useState } from 'react';
import { Radio } from 'lucide-react';

// ── CopilotMock — a looping miniature of the live answer panel ────────────────
// Shown on the Interview Prep page when there is nothing to suggest yet, so the
// page can say what "going live" means without a screenshot or a video: it is
// the same overlay tokens and the same shape as the real floating panel
// (components/interview/LiveAnswerPanel.jsx), in CSS and one timer.
//
// Loop: question types in → beat → lead types in → body fades in → hold → reset.
// prefers-reduced-motion: the finished state, no typing, no loop.

const SCRIPT = {
  question: 'So, tell me about a time something broke in production.',
  lead: "I'd start with the payroll sync at Acme.",
  body: "It went down at 3am the night before payday. I rolled it back so everyone got "
      + "paid, then found the real cause: two systems disagreed about what a pay period was.",
  cues: ['payroll', '3am', 'rolled back'],
};
const CPS = 50;                  // characters per second while typing
const BEAT_MS = 450;             // pause between the question and the answer
const HOLD_MS = 3000;            // how long the finished answer sits before looping

// phases: 'q' → 'beat' → 'lead' → 'body' → 'hold' → back to 'q'
export default function CopilotMock({ className = '' }) {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState(reduced ? 'hold' : 'q');
  const [chars, setChars] = useState(reduced ? 999 : 0);
  const timer = useRef(0);

  useEffect(() => {
    if (reduced) return undefined;
    const text = phase === 'q' ? SCRIPT.question : phase === 'lead' ? SCRIPT.lead : '';

    if (text) {
      if (chars >= text.length) {
        timer.current = setTimeout(() => {
          setChars(0);
          setPhase(phase === 'q' ? 'beat' : 'body');
        }, phase === 'q' ? 250 : 350);
        return () => clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => setChars((c) => c + 1), 1000 / CPS);
      return () => clearTimeout(timer.current);
    }

    const next = { beat: ['lead', BEAT_MS], body: ['hold', 900], hold: ['q', HOLD_MS] }[phase];
    timer.current = setTimeout(() => { setChars(0); setPhase(next[0]); }, next[1]);
    return () => clearTimeout(timer.current);
  }, [phase, chars, reduced]);

  const showQuestion = reduced || phase !== 'q' ? SCRIPT.question : SCRIPT.question.slice(0, chars);
  const showLead = reduced || ['body', 'hold'].includes(phase)
    ? SCRIPT.lead
    : phase === 'lead' ? SCRIPT.lead.slice(0, chars) : '';
  const showBody = reduced || ['body', 'hold'].includes(phase);
  const typing = !reduced && (phase === 'q' || phase === 'lead');

  return (
    <div className={`rounded-2xl border border-overlay-line bg-overlay overflow-hidden
                     select-none ${className}`}
         aria-hidden="true">
      {/* Top bar — the real panel's, in miniature */}
      <div className="flex items-center gap-2 px-3 py-2 bg-overlay-raised border-b border-overlay-line">
        <span className="relative flex w-2 h-2 shrink-0">
          <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75
                           animate-ping motion-reduce:animate-none" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-xs font-semibold text-overlay-text">Listening</span>
        <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                         font-semibold bg-primary-light/15 text-primary-light border border-primary-light/30">
          <Radio className="w-3 h-3" />
          Experience
        </span>
      </div>

      <div className="px-4 py-3 space-y-2.5 min-h-[13rem]">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-overlay-muted">They asked</p>
        <p className="text-sm text-overlay-text/90 leading-snug">
          {showQuestion}
          {typing && phase === 'q' && <Caret />}
        </p>

        {showLead && (
          <p className="text-lg font-semibold text-overlay-text leading-snug pt-1">
            {showLead}
            {typing && phase === 'lead' && <Caret />}
          </p>
        )}

        {showBody && (
          <>
            <p className="text-sm text-overlay-text/85 leading-relaxed animate-fade-in
                          motion-reduce:animate-none">
              {SCRIPT.body}
            </p>
            <ul className="flex flex-wrap gap-1.5 pt-0.5 animate-fade-in motion-reduce:animate-none">
              {SCRIPT.cues.map((cue) => (
                <li key={cue} className="px-2 py-0.5 rounded-full text-xs font-medium
                                         bg-primary-light/10 text-primary-light border border-primary-light/25">
                  {cue}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function Caret() {
  return <span className="inline-block w-[2px] h-4 ml-0.5 align-middle bg-primary-light animate-caret" />;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  });
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch { return undefined; }
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

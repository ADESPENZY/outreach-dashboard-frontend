import { useEffect, useRef, useState } from 'react';
import { Check, Quote } from 'lucide-react';
import {
  ANSWER_STYLE_CARDS, SAMPLE_QUESTIONS, TYPE_SPEED_CPS,
} from '../../constants/answerStyles';

// ── AnswerStylePicker — "How should your answers sound?" ─────────────────────
// Three cards, each typing out a real sample answer, so the choice is made by
// ear. Used in the prep wizard (per interview) and in Settings → Profile (the
// default for every interview). Purely presentational: it takes a value and
// calls onChange.
//
// prefers-reduced-motion: the samples appear in full, with no typing and no
// blinking caret.

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
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

/** Reveals `text` at ~cps characters per second; restarts whenever `runKey` changes. */
function useTypewriter(text, runKey, reduced) {
  const [count, setCount] = useState(reduced ? text.length : 0);
  const frame = useRef(0);

  useEffect(() => {
    if (reduced) { setCount(text.length); return undefined; }
    setCount(0);
    const msPerChar = 1000 / TYPE_SPEED_CPS;
    let started;
    const tick = (now) => {
      if (started === undefined) started = now;
      const shown = Math.min(text.length, Math.floor((now - started) / msPerChar));
      setCount(shown);
      if (shown < text.length) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [text, runKey, reduced]);

  return { shown: text.slice(0, count), typing: !reduced && count < text.length };
}

export default function AnswerStylePicker({
  value, onChange, title = 'How should your answers sound?',
  description = 'Pick the voice the copilot writes in. You can change it any time, even mid-interview.',
  className = '',
}) {
  const [question, setQuestion] = useState(SAMPLE_QUESTIONS[0].id);
  const [runKeys, setRunKeys] = useState({});     // per-card counter: bump to replay
  const reduced = usePrefersReducedMotion();

  const replay = (id) => setRunKeys((keys) => ({ ...keys, [id]: (keys[id] || 0) + 1 }));

  return (
    <section className={`space-y-4 ${className}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-base font-bold font-montserrat text-black-light">{title}</h3>
          <p className="text-xs text-secondary-dark mt-0.5 leading-relaxed max-w-lg">{description}</p>
        </div>

        {/* Same answer, two very different questions — hear both. */}
        <div className="inline-flex p-1 rounded-xl bg-neutral border border-neutral-dark shrink-0"
             role="radiogroup" aria-label="Sample question">
          {SAMPLE_QUESTIONS.map((q) => (
            <button
              key={q.id}
              type="button"
              role="radio"
              aria-checked={question === q.id}
              onClick={() => { setQuestion(q.id); setRunKeys({}); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                question === q.id
                  ? 'bg-white text-black-light shadow-sm'
                  : 'text-secondary-dark hover:text-black-light'}`}
            >
              “{q.label}”
            </button>
          ))}
        </div>
      </div>

      <div role="radiogroup" aria-label={title} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ANSWER_STYLE_CARDS.map((card) => (
          <StyleCard
            key={card.id}
            card={card}
            sample={card.samples[question]}
            selected={value === card.id}
            runKey={`${question}:${runKeys[card.id] || 0}:${value === card.id}`}
            reduced={reduced}
            onSelect={() => { onChange(card.id); replay(card.id); }}
            onReplay={() => replay(card.id)}
          />
        ))}
      </div>
    </section>
  );
}

function StyleCard({ card, sample, selected, runKey, reduced, onSelect, onReplay }) {
  const { shown, typing } = useTypewriter(sample, runKey, reduced);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${card.label}. ${card.blurb}`}
      onClick={onSelect}
      onMouseEnter={onReplay}
      onFocus={onReplay}
      className={`group relative text-left rounded-2xl border p-4 flex flex-col gap-3 transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary-light/30 ${
        selected
          ? 'border-primary-light bg-primary-light/5 shadow-md'
          : 'border-neutral-dark bg-white hover:border-primary-light/40 hover:shadow-md'}`}
    >
      <div className="flex items-center gap-2">
        <span className={`text-sm font-bold font-montserrat ${selected ? 'text-primary-dark' : 'text-black-light'}`}>
          {card.label}
        </span>
        {card.badge && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-teal/10 text-accent-teal
                           border border-accent-teal/20">
            {card.badge}
          </span>
        )}
        <span className={`ml-auto w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
          selected ? 'bg-primary-light border-primary-light' : 'border-neutral-dark group-hover:border-primary-light/40'}`}>
          {selected && <Check className="w-3 h-3 text-white" aria-hidden="true" />}
        </span>
      </div>

      <p className="text-xs text-secondary-dark leading-relaxed">{card.blurb}</p>

      {/* The sample. An invisible copy of the FULL text reserves the height, so
          the card never grows a line at a time while it types. */}
      <div className="relative rounded-xl bg-neutral/70 border border-neutral-dark p-3 flex-1">
        <Quote className="w-3.5 h-3.5 text-primary-light/40 absolute top-2.5 right-2.5" aria-hidden="true" />
        <p className="text-sm leading-relaxed invisible" aria-hidden="true">{sample}</p>
        <p className="absolute inset-3 text-sm text-black-light/90 leading-relaxed">
          {shown}
          {typing && (
            <span className="inline-block w-[2px] h-4 ml-0.5 align-middle bg-primary-light animate-caret"
                  aria-hidden="true" />
          )}
        </p>
      </div>
    </button>
  );
}

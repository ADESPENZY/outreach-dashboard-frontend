import { useQuery } from '@tanstack/react-query';
import { X, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { getInterviewTurns } from '../../services/apiInterview';
import { parseAnswer } from '../../lib/liveCopilot';

// ── SessionReview — what was asked, and what we suggested ────────────────────
// A slide-over for a finished interview, reading the saved transcript from
// /sessions/<id>/turns/. Same answer shape as the live panel (lead + spoken
// body + cues), on the page's light surface: this is reading back, not glancing
// mid-call.

export default function SessionReview({ session, onClose }) {
  const { data: turns, isLoading, isError } = useQuery({
    queryKey: ['interviewTurns', session.id],
    queryFn: () => getInterviewTurns(session.id),
  });

  const title = [session.job_title, session.company_name].filter(Boolean).join(' · ')
    || 'Interview';

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true"
         aria-label={`Answers from ${title}`}>
      <button type="button" aria-label="Close" onClick={onClose}
              className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
      <div className="relative w-full max-w-xl bg-white h-full overflow-y-auto shadow-lg
                      animate-in slide-in-from-right duration-200">
        <div className="sticky top-0 bg-white border-b border-neutral-dark px-5 py-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold font-montserrat text-black-light truncate">{title}</h2>
            <p className="text-xs text-secondary-dark mt-0.5">
              {turns?.length ? `${turns.length} question${turns.length === 1 ? '' : 's'} asked` : 'Answers'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
                  className="p-2 rounded-lg text-secondary-dark hover:text-black-light hover:bg-neutral transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-secondary-dark">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading the transcript…
            </p>
          ) : isError ? (
            <p className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" aria-hidden="true" /> We couldn't load this transcript.
            </p>
          ) : !turns?.length ? (
            <p className="text-sm text-secondary-dark leading-relaxed">
              No questions were captured in this interview.
            </p>
          ) : (
            turns.map((turn) => <Turn key={turn.id} turn={turn} />)
          )}
        </div>
      </div>
    </div>
  );
}

function Turn({ turn }) {
  const { lead, body, cues } = parseAnswer(turn.answer);
  return (
    <article className="space-y-2 pb-5 border-b border-neutral-dark last:border-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 font-montserrat">
        They asked
      </p>
      <p className="text-sm font-semibold text-black-light leading-snug">{turn.question}</p>
      {lead && <p className="text-base text-black-light leading-snug">{lead}</p>}
      {body && <p className="text-sm text-secondary-dark leading-relaxed">{body}</p>}
      {cues.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {cues.map((cue, i) => (
            <li key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral
                                   text-secondary-dark border border-neutral-dark">
              {cue}
            </li>
          ))}
        </ul>
      )}
      {turn.source === 'cached' && (
        <p className="inline-flex items-center gap-1.5 text-xs text-accent-teal">
          <Sparkles className="w-3 h-3" aria-hidden="true" /> Prepared before the call
        </p>
      )}
    </article>
  );
}

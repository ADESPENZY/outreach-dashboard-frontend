import React from 'react';
import { ExternalLink, ArrowRight, Loader2 } from 'lucide-react';
import { timeAgo, gmailSearchUrl } from '../utils/format';

// The expanded contents of one pipeline stage, and the click-to-advance
// action on each row. Moved unchanged out of PipelineFunnel when the div bars
// became an ECharts chart — the chart replaced the BARS, not this list.

const NEXT_STAGE = {
  replied:   { stage: 'interview', label: 'Move to Interview' },
  interview: { stage: 'offer',     label: 'Move to Offer' },
};

export default function StageItems({ stage, onAdvance, advancingId }) {
  const next = NEXT_STAGE[stage.key];
  if (stage.items.length === 0) {
    return (
      <p className="text-sm text-secondary-dark px-1 py-4">
        No companies here yet — they'll appear as your outreach moves forward.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-neutral-dark/70">
      {stage.items.map((item) => {
        const id = item.email_id ?? `t${item.tracker_job_id}`;
        const alreadyAhead =
          next && stage.key === 'replied' && ['interview', 'offer', 'closed'].includes(item.tracker_status);
        return (
          <li key={id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
            <span className="hidden sm:flex w-9 h-9 shrink-0 rounded-xl bg-white text-secondary-dark border border-neutral-dark items-center justify-center font-montserrat font-bold text-sm">
              {(item.company || '?').trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-black-light truncate">
                {item.contact ? `${item.contact} · ` : ''}{item.company}
              </p>
              <p className="text-xs text-secondary-dark truncate mt-0.5">
                {item.role}{item.when ? ` · ${timeAgo(item.when)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.contact_email && (
                <a
                  href={gmailSearchUrl(item.contact_email)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-secondary-dark hover:text-black-light bg-white border border-neutral-dark hover:bg-neutral transition-colors"
                >
                  Open in Gmail <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
              {next && !alreadyAhead && (
                <button
                  type="button"
                  disabled={advancingId === id}
                  onClick={() => onAdvance(item, next.stage, id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold font-montserrat text-white bg-gradient-to-r from-primary-light to-primary-dark shadow-sm hover:opacity-90 hover:shadow-md hover:shadow-primary-light/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {advancingId === id
                    ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                    : <ArrowRight className="w-3 h-3" aria-hidden="true" />}
                  {next.label}
                </button>
              )}
              {alreadyAhead && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                  ✓ {item.tracker_status}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

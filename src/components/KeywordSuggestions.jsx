import { useQuery } from '@tanstack/react-query';
import { Sparkles, Plus, Loader2 } from 'lucide-react';
import { expandKeyword } from '../services/apiJobs';

/**
 * "Your headhunter will also look for…" — when the user types a job keyword our
 * category map doesn't know (e.g. "Clinical Data Manager"), reply with the other
 * titles that same role goes by on real job boards, as tap-to-add chips. Only
 * what they tap gets searched. Backend caches the expansion cross-user, so a
 * repeated keyword answers instantly.
 *
 * Props:
 *   keyword  — the custom keyword just added ('' / null hides the block)
 *   existing — current list of role strings (already-added ones are hidden)
 *   onAdd    — (title) => void, add one suggestion to the list
 */
export default function KeywordSuggestions({ keyword, existing = [], onAdd }) {
  const kw = (keyword || '').trim();

  const { data, isLoading } = useQuery({
    queryKey: ['kw-expand', kw.toLowerCase()],
    queryFn: () => expandKeyword(kw),
    enabled: !!kw,
    staleTime: Infinity,        // same keyword → same answer; never refetch
    retry: 1,
  });

  if (!kw) return null;

  const have = new Set(existing.map((e) => e.toLowerCase()));
  const suggestions = (data?.suggestions || []).filter((s) => !have.has(s.toLowerCase()));

  if (!isLoading && suggestions.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-primary-light/25 bg-primary-light/5 p-3.5 animate-fade-in">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-dark mb-2">
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
        {isLoading
          ? `Finding what else “${kw}” roles are posted as…`
          : `Your headhunter can also look for these — tap to add:`}
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-secondary-dark py-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> One moment…
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((title) => (
            <button
              key={title}
              type="button"
              onClick={() => onAdd?.(title)}
              className="inline-flex items-center gap-1 rounded-full pl-3 pr-2.5 py-1.5 text-xs font-medium
                         bg-white text-black-light border border-neutral-dark
                         hover:border-primary-light hover:text-primary-dark hover:bg-primary-light/5
                         transition-all"
            >
              {title}
              <Plus className="w-3 h-3 text-primary-light" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Plus, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { getAutoScoutSettings, updateAutoScoutSettings } from '@/services/apiSettings';

/**
 * Shown when the last Auto-Scout run found few jobs (thin yield). Surfaces the
 * CV-informed extra keywords the backend suggested, and lets the user add them
 * to their search in one click — "you found X jobs, widen the net with these."
 */
export default function BroadenSearchNudge() {
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: settings } = useQuery({ queryKey: ['autoScout'], queryFn: getAutoScoutSettings });

  const suggestion = settings?.broaden_suggestion || {};
  const keywords = suggestion.keywords || [];
  if (dismissed || keywords.length === 0) return null;

  const addAll = async () => {
    setSaving(true);
    try {
      const merged = Array.from(new Set([...(settings.target_job_titles || []), ...keywords]));
      await updateAutoScoutSettings({ target_job_titles: merged });
      toast.success('Added — your next scan will search wider.');
      qc.invalidateQueries({ queryKey: ['autoScout'] });
      setDismissed(true);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative rounded-2xl border border-amber-200 bg-amber-50 p-4 md:p-5">
      <button onClick={() => setDismissed(true)} aria-label="Dismiss"
        className="absolute top-3 right-3 text-amber-400 hover:text-amber-600"><X className="w-4 h-4" /></button>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-black-light text-sm">
            Only {suggestion.scraped} jobs found recently — let's widen the net
          </p>
          <p className="text-xs text-secondary-dark mt-0.5">
            Based on your CV, you also qualify for these. Add them to pull in more matches:
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {keywords.map(k => (
              <span key={k} className="px-2.5 py-1 rounded-full bg-white border border-amber-200 text-xs font-medium text-black-light">{k}</span>
            ))}
          </div>
          <button onClick={addAll} disabled={saving}
            className="mt-3 inline-flex items-center gap-1.5 bg-gradient-to-r from-primary-light to-primary-dark text-white text-xs font-semibold rounded-xl px-4 py-2 hover:opacity-90 disabled:opacity-60 transition-opacity">
            <Plus className="w-3.5 h-3.5" /> {saving ? 'Adding…' : 'Add all to my search'}
          </button>
        </div>
      </div>
    </div>
  );
}

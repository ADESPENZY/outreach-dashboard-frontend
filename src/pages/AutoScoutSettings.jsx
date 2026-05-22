import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  Target, Brain, Sparkles, Crown, X, Loader2, Save,
  Briefcase, Zap,
} from 'lucide-react';
import { getAutoScoutSettings, updateAutoScoutSettings } from '../services/apiSettings';

// ── Tag Input ──────────────────────────────────────────────────────────────────

function TagInput({ value = [], onChange, placeholder, pillClass }) {
  const [inputVal, setInputVal] = useState('');

  const addTags = (raw) => {
    const incoming = raw.split(',').map(t => t.trim()).filter(Boolean);
    const next = [...new Set([...value, ...incoming.filter(t => !value.includes(t))])];
    onChange(next);
    setInputVal('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputVal.trim()) addTags(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-neutral-dark bg-white min-h-[52px] focus-within:border-primary-light focus-within:ring-2 focus-within:ring-primary-light/20 transition-all cursor-text">
      {value.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${pillClass}`}
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="hover:opacity-60 transition-opacity ml-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => inputVal.trim() && addTags(inputVal)}
        placeholder={value.length === 0 ? placeholder : 'Add more…'}
        className="flex-1 min-w-[140px] text-sm outline-none bg-transparent text-black placeholder:text-secondary-dark/50"
      />
    </div>
  );
}

// ── Master Toggle ──────────────────────────────────────────────────────────────

function MasterToggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-16 shrink-0 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light ${
        checked
          ? 'bg-gradient-to-r from-primary-light to-primary-dark shadow-lg shadow-primary-light/30'
          : 'bg-secondary-dark/25'
      }`}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
          checked ? 'translate-x-9' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ── Kbd helper ─────────────────────────────────────────────────────────────────

function Kbd({ children }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-neutral border border-neutral-dark text-[10px] font-mono">
      {children}
    </kbd>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AutoScoutSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['auto-scout-settings'],
    queryFn: getAutoScoutSettings,
  });

  const { register, handleSubmit, control, reset, watch } = useForm({
    defaultValues: {
      is_active: false,
      target_job_titles: [],
      target_locations: [],
      daily_scrape_limit: 20,
      custom_scoring_prompt: '',
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        is_active: data.is_active ?? false,
        target_job_titles: data.target_job_titles ?? [],
        target_locations: data.target_locations ?? [],
        daily_scrape_limit: data.daily_scrape_limit ?? 20,
        custom_scoring_prompt: data.custom_scoring_prompt ?? '',
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: updateAutoScoutSettings,
    onSuccess: () => {
      toast.success('Auto-Scout preferences saved!');
      queryClient.invalidateQueries({ queryKey: ['auto-scout-settings'] });
    },
    onError: (err) => toast.error(err.message || 'Failed to save preferences'),
  });

  const onSubmit = (values) =>
    mutation.mutate({ ...values, daily_scrape_limit: Number(values.daily_scrape_limit) });

  const isActive = watch('is_active');
  const dailyLimit = watch('daily_scrape_limit');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-light animate-spin" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-4xl mx-auto space-y-6 pt-8 pb-10 animate-fade-in font-roboto"
    >
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center shadow-lg shadow-primary-light/25 shrink-0">
          <Target className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-black font-montserrat">
              Auto-Scout Preferences
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
              <Crown className="w-3 h-3" /> Premium
            </span>
          </div>
          <p className="text-sm text-secondary-dark mt-0.5">
            Configure how the system automatically finds and scores jobs for you each day.
          </p>
        </div>
      </div>

      {/* ── Master Toggle Card ────────────────────────────────────────────────── */}
      <Controller
        name="is_active"
        control={control}
        render={({ field }) => (
          <div
            className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-500 ${
              field.value
                ? 'bg-gradient-to-br from-primary-light/5 via-white to-primary-dark/5 border-primary-light/30 shadow-primary-light/10'
                : 'bg-white border-neutral-dark'
            }`}
          >
            <div className="px-6 py-6 flex items-center justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 ${
                    field.value
                      ? 'bg-gradient-to-br from-primary-light to-primary-dark shadow-lg shadow-primary-light/30'
                      : 'bg-neutral border border-neutral-dark'
                  }`}
                >
                  <Zap
                    className={`w-5 h-5 transition-colors ${
                      field.value ? 'text-white' : 'text-secondary-dark/50'
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-bold text-black font-montserrat">
                      Enable Daily Auto-Scout
                    </p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                      <Crown className="w-2.5 h-2.5" /> Premium
                    </span>
                  </div>
                  <p className="text-sm text-secondary-dark mt-0.5">
                    Automatically scrapes matching jobs daily based on your preferences below.
                  </p>
                  <div className="mt-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all duration-300 ${
                        field.value
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-neutral text-secondary-dark border-neutral-dark'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          field.value
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-secondary-dark/40'
                        }`}
                      />
                      {field.value ? 'Scout is Active' : 'Scout is Paused'}
                    </span>
                  </div>
                </div>
              </div>
              <MasterToggle checked={field.value} onChange={field.onChange} />
            </div>
          </div>
        )}
      />

      {/* ── Preferences Section ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-dark">
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-4 h-4 text-primary-light" />
            <h3 className="text-base font-bold text-black font-montserrat">
              Target Preferences
            </h3>
          </div>
          <p className="text-sm text-secondary-dark mt-0.5">
            Define what jobs the scout should look for.
          </p>
        </div>

        <div className="px-6 py-6 space-y-7">
          {/* Job Titles */}
          <div>
            <label className="block text-sm font-semibold text-black-light mb-1.5">
              Job Titles
            </label>
            <Controller
              name="target_job_titles"
              control={control}
              render={({ field }) => (
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="e.g. Backend Engineer, Django Developer…"
                  pillClass="bg-primary-light/10 text-primary-dark border-primary-light/20"
                />
              )}
            />
            <p className="text-xs text-secondary-dark/70 mt-1.5">
              Press <Kbd>Enter</Kbd> or <Kbd>,</Kbd> to add each title.
            </p>
          </div>

          {/* Locations */}
          <div>
            <label className="block text-sm font-semibold text-black-light mb-1.5">
              Locations
            </label>
            <Controller
              name="target_locations"
              control={control}
              render={({ field }) => (
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="e.g. Remote, United States, London…"
                  pillClass="bg-blue-50 text-blue-700 border-blue-100"
                />
              )}
            />
            <p className="text-xs text-secondary-dark/70 mt-1.5">
              Press <Kbd>Enter</Kbd> or <Kbd>,</Kbd> to add each location.
            </p>
          </div>

          {/* Daily Limit */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-black-light">
                Daily Scrape Limit
              </label>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-primary-dark">{dailyLimit}</span>
                <span className="text-sm text-secondary-dark">/ 25 scrapes</span>
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={25}
              {...register('daily_scrape_limit', { valueAsNumber: true })}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #FF5B2E ${((dailyLimit - 1) / 24) * 100}%, #e5e7eb ${((dailyLimit - 1) / 24) * 100}%)`,
              }}
            />
            <div className="flex justify-between text-[10px] text-secondary-dark/50 mt-1.5 font-medium">
              <span>1</span>
              <span>13</span>
              <span>25 max</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Custom AI Scoring Card ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-dark">
          <div className="flex items-center gap-2.5">
            <Brain className="w-4 h-4 text-primary-light" />
            <h3 className="text-base font-bold text-black font-montserrat">
              Custom AI Scoring Rules
            </h3>
          </div>
          <p className="text-sm text-secondary-dark mt-0.5">
            Write your exact Approve / Reject criteria in plain English.
          </p>
        </div>

        <div className="px-6 py-6 space-y-4">
          <textarea
            {...register('custom_scoring_prompt')}
            rows={6}
            placeholder="e.g. Give a 90+ score only if the job mentions Python and Django. Reject any posting that requires Java or Kubernetes. Prefer jobs that mention 'remote-friendly' or 'async work'."
            className="w-full px-4 py-3 rounded-xl border border-neutral-dark text-sm text-black placeholder:text-secondary-dark/50 bg-white outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all resize-none leading-relaxed"
          />

          <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-amber-50/80 border border-amber-200/70">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">Tip:</span> Tell the AI exactly what makes a perfect
              candidate for you. E.g.,{' '}
              <em>"Reject any job requiring 10+ years experience."</em> or{' '}
              <em>"Only approve if the salary range exceeds $80,000."</em>
            </p>
          </div>
        </div>
      </div>

      {/* ── Save Button ───────────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex items-center gap-2.5 px-7 py-3 bg-gradient-to-r from-primary-light to-primary-dark text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-light/25 hover:opacity-90 hover:shadow-primary-light/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {mutation.isPending ? 'Saving…' : 'Save Preferences'}
        </button>
      </div>
    </form>
  );
}

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { LayoutTemplate, AlignLeft, Check } from 'lucide-react';
import { updateProfile } from '../services/apiProfile';

/*
  One-time "pick your CV style" prompt.

  Shown the first time a user opens the tailored-CV preview and only then —
  the backend reports has_chosen, and saving sets resume_template so it never
  reappears. This only decides which style is PRE-SELECTED; the preview's
  toggle still lets them switch per CV afterwards.

  Same visual idiom as the onboarding tone picker
  (components/onboarding/FirstTimePersonalizationModal.jsx): framer-motion
  overlay + card, single-choice buttons with an active state, one primary
  action. There is no shared single-choice component in the codebase to reuse,
  so this mirrors that pattern rather than inventing a new one.

  Portalled to <body> for the same reason as TailoredCVPreview: it renders deep
  inside JobDetailDrawer's transformed <motion.aside>, which would otherwise
  become the containing block for this `position: fixed` overlay and shift it
  off screen.

  Adding a style later: it renders whatever `templates` the backend returns —
  no change needed here beyond an icon entry.
*/

const ICONS = {
  modern: LayoutTemplate,
  executive: AlignLeft,
};

export default function ResumeStylePrompt({ templates, initial, onSaved, onSkip }) {
  const [choice, setChoice] = useState(initial || templates?.[0]?.id || 'modern');
  const [saving, setSaving] = useState(false);

  // Escape dismisses without choosing; the prompt will show again next time,
  // which is the right trade for an accidental keypress.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onSkip?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ resume_template: choice });
      onSaved?.(choice);
    } catch (err) {
      toast.error(err?.message || 'Could not save your choice. Please try again.');
      setSaving(false);
    }
  };

  const overlay = (
    <AnimatePresence>
      <motion.div
        key="rsp-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => onSkip?.()}
        /* Above TailoredCVPreview's z-[100] — this sits on top of the preview. */
        className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-6 bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          key="rsp-card"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="px-6 pt-6 pb-4">
            <h2 className="font-montserrat font-bold text-black text-lg leading-tight">
              Pick your CV style
            </h2>
            <p className="text-secondary-dark text-sm mt-1 font-roboto">
              We tailor the same content either way — this just sets how it looks
              by default. You can switch on any CV later.
            </p>
          </div>

          <div className="px-6 pb-2 space-y-2">
            {(templates || []).map(({ id, label, description }) => {
              const Icon = ICONS[id] || LayoutTemplate;
              const active = choice === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChoice(id)}
                  aria-pressed={active}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left
                    transition-all duration-150
                    ${active
                      ? 'border-primary-dark bg-primary-dark/5'
                      : 'border-neutral-dark hover:border-secondary-dark/40'}
                  `}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-primary-dark' : 'text-secondary-dark'}`} />
                  <span className="flex-1">
                    <span className="block font-semibold text-sm text-black">{label}</span>
                    <span className="block text-xs text-secondary-dark mt-0.5">{description}</span>
                  </span>
                  {active && <Check className="w-4 h-4 text-primary-dark shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 px-6 py-4 mt-2 bg-neutral border-t border-neutral-dark">
            <button
              type="button"
              onClick={() => onSkip?.()}
              className="text-xs text-secondary-dark hover:text-black transition-colors"
            >
              Decide later
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-primary-dark to-primary-light text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Use this style'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}

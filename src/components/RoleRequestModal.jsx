import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
// `motion` is used only as `<motion.div>` (member-expression JSX), which this
// eslint config's jsx-uses-vars doesn't count — silence the false positive.
import { motion, useReducedMotion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { Loader2, Sparkles, X } from 'lucide-react';
import api from '../api';

/**
 * "Can't find what you're looking for?" — the escape hatch from every empty
 * state. A user staring at no results needs somewhere to put that, and telling
 * us in their own words beats guessing at role chips.
 *
 * Shared, single copy: rendered from BOTH Home (DashboardPage) and Opportunities
 * (JobsPage). Any change here lands in both places — there is no duplicate.
 *
 * Backend note: POST /api/me/role-request/ does not exist yet. A missing route
 * is handled as a normal failed submit (toast, modal stays open with the text
 * intact) rather than an unhandled rejection — the user never sees a crash, and
 * nothing they typed is thrown away.
 *
 * We promise nothing here beyond "received". No turnaround, no SLA, no implied
 * automatic search — which is why the success toast says we'll factor it in,
 * not that we're already acting on it.
 */

const MAX_LEN = 1000;

export default function RoleRequestModal({ onClose }) {
  const [role, setRole]       = useState('');
  const [link, setLink]       = useState('');
  const [notes, setNotes]     = useState('');
  const [saving, setSaving]   = useState(false);

  const dialogRef = useRef(null);
  const reduceMotion = useReducedMotion();

  // Escape closes, and the body doesn't scroll behind the overlay.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose?.(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, saving]);

  // Move focus INTO the dialog on open, but onto the container rather than the
  // first field. The textarea used to carry autoFocus, which fired its (correct,
  // per DESIGN_GUIDE §4) orange focus border the instant the modal appeared —
  // reading as a validation error on a field nobody had touched yet. Focusing
  // the container keeps keyboard and screen-reader users oriented without
  // lighting anything up; the orange only appears once the user really is in a
  // field. Programmatic focus doesn't trigger :focus-visible, so no ring here.
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const canSubmit = role.trim().length > 0 && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await api.post('/api/me/role-request/', {
        role_description: role.trim(),
        example_url: link.trim(),
        notes: notes.trim(),
      });
      toast.success("Got it — we'll factor this in.");
      onClose?.();
    } catch (err) {
      const res = err?.response;
      if (res?.status === 429) {
        toast.info(res.data?.detail || res.data?.message || 'You have already sent one recently.');
      } else {
        toast.error("We couldn't send that just now. Please try again.");
      }
      setSaving(false);
    }
  };

  // DESIGN_GUIDE §4 Inputs. Resting border is neutral-dark (#F3F4F6) and stays
  // that way until the user focuses the field — there is no default error state.
  const field =
    'w-full px-3 py-2.5 rounded-xl border border-neutral-dark bg-white text-sm text-black-light ' +
    'outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all';
  const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-1.5';
  const counterCls = 'mt-1 text-xs text-secondary-dark/60 text-right';

  // §9 Animation — big modals: opacity + y 28→0 + scale 0.94→1, ~0.3s on the
  // brand easing curve. Entrance only: the parents render this behind a plain
  // `&&`, so there is no unmount phase to animate without an AnimatePresence
  // wrapper in each of them.
  const enter = reduceMotion
    ? {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.15 },
    }
    : {
      initial: { opacity: 0, y: 28, scale: 0.94 },
      animate: { opacity: 1, y: 0, scale: 1 },
      transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
    };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => { if (!saving) onClose?.(); }}
      role="presentation"
    >
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-request-title"
        aria-describedby="role-request-subtitle"
        onClick={(e) => e.stopPropagation()}
        {...enter}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-neutral-dark shadow-xl px-8 py-6 focus:outline-none"
      >
        <button
          type="button"
          onClick={() => { if (!saving) onClose?.(); }}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 rounded-lg text-secondary-dark/60 hover:text-black-light hover:bg-neutral transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand accent — the orange gradient mark, same treatment the headhunter
            empty states use, so this modal reads as part of the same system. */}
        <div className="flex items-start gap-3 pr-8">
          <span className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-r from-primary-light to-primary-dark flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </span>
          <div className="min-w-0">
            <h2
              id="role-request-title"
              className="font-montserrat font-bold text-lg text-black leading-snug"
            >
              Tell your headhunter what you&rsquo;re after
            </h2>
            <p
              id="role-request-subtitle"
              className="mt-1 font-roboto text-sm text-secondary-dark leading-relaxed"
            >
              The more specific you are, the better we can search on your behalf.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label className={labelCls} htmlFor="rr-role">
              What kind of role are you looking for?
            </label>
            <textarea
              id="rr-role"
              value={role}
              onChange={(e) => setRole(e.target.value.slice(0, MAX_LEN))}
              rows={3}
              placeholder="e.g. Night-shift ICU nurse roles within an hour of Leeds"
              className={`${field} resize-y`}
            />
            <p className={counterCls}>
              {role.length}/{MAX_LEN}
            </p>
          </div>

          <div>
            <label className={labelCls} htmlFor="rr-link">
              Link to a role we missed <span className="normal-case font-medium">(optional)</span>
            </label>
            <input
              id="rr-link"
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://…"
              className={field}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="rr-notes">
              Anything else we should know? <span className="normal-case font-medium">(optional)</span>
            </label>
            <textarea
              id="rr-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, MAX_LEN))}
              rows={2}
              className={`${field} resize-y`}
            />
            <p className={counterCls}>
              {notes.length}/{MAX_LEN}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => { if (!saving) onClose?.(); }}
            className="inline-flex items-center justify-center gap-2 bg-neutral hover:bg-neutral-dark text-black-light font-semibold rounded-xl px-5 py-2.5 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Sending…' : 'Send'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

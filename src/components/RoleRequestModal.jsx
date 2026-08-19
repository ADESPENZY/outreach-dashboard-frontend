import { useEffect, useState } from'react';
import { toast } from'react-toastify';
import { Loader2, X } from'lucide-react';
import api from'../api';

/**
 *"Can't find what you're looking for?" — the escape hatch from every empty
 * state. A user staring at no results needs somewhere to put that, and telling
 * us in their own words beats guessing at role chips.
 *
 * Backend note: POST /api/me/role-request/ does not exist yet. A missing route
 * is handled as a normal failed submit (toast, modal stays open with the text
 * intact) rather than an unhandled rejection — the user never sees a crash, and
 * nothing they typed is thrown away.
 *
 * We promise nothing here beyond"received". No turnaround, no SLA, no implied
 * automatic search.
 */

const MAX_LEN = 1000;

export default function RoleRequestModal({ onClose }) {
 const [role, setRole] = useState('');
 const [link, setLink] = useState('');
 const [notes, setNotes] = useState('');
 const [saving, setSaving] = useState(false);

 // Escape closes, and the body doesn't scroll behind the overlay.
 useEffect(() => {
 const onKey = (e) => { if (e.key ==='Escape' && !saving) onClose?.(); };
 window.addEventListener('keydown', onKey);
 const prev = document.body.style.overflow;
 document.body.style.overflow ='hidden';
 return () => {
 window.removeEventListener('keydown', onKey);
 document.body.style.overflow = prev;
 };
 }, [onClose, saving]);

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
 toast.success("Got it — we're on it.");
 onClose?.();
 } catch (err) {
 const res = err?.response;
 if (res?.status === 429) {
 toast.info(res.data?.detail || res.data?.message ||'You have already sent one recently.');
 } else {
 toast.error("We couldn't send that just now. Please try again.");
 }
 setSaving(false);
 }
 };

 const field =
'w-full px-3 py-2.5 rounded-xl border border-neutral-dark bg-white text-sm text-black-light' +
'outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all';
 const labelCls ='block text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-1.5';

 return (
 <div
 className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
 onClick={() => { if (!saving) onClose?.(); }}
 role="presentation"
 >
 <div
 role="dialog"
 aria-modal="true"
 aria-labelledby="role-request-title"
 onClick={(e) => e.stopPropagation()}
 className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-neutral-dark shadow-xl p-5 md:p-6"
 >
 <button
 type="button"
 onClick={() => { if (!saving) onClose?.(); }}
 aria-label="Close"
 className="absolute top-3 right-3 p-2 text-secondary-dark/60 hover:text-black-light rounded-lg transition-colors"
 >
 <X className="w-4 h-4" />
 </button>

 <h2
 id="role-request-title"
 className="text-lg font-bold text-black-light pr-8 leading-snug"
 >
 Tell us what you're after
 </h2>
 <p className="mt-1.5 text-sm text-secondary-dark leading-relaxed">
 Describe the role in your own words and we'll factor it into your search.
 </p>

 <div className="mt-5 space-y-4">
 <div>
 <label className={labelCls} htmlFor="rr-role">
 What kind of role are you looking for?
 </label>
 <textarea
 id="rr-role"
 value={role}
 onChange={(e) => setRole(e.target.value.slice(0, MAX_LEN))}
 rows={3}
 autoFocus
 placeholder="e.g. Night-shift ICU nurse roles within an hour of Leeds"
 className={`${field} resize-y`}
 />
 <p className="mt-1 text-xs text-secondary-dark/60 text-right">
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
 <p className="mt-1 text-xs text-secondary-dark/60 text-right">
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
 className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {saving && <Loader2 className="w-4 h-4 animate-spin" />}
 {saving ?'Sending…' :'Send'}
 </button>
 </div>
 </div>
 </div>
 );
}

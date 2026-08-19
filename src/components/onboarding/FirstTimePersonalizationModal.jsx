import { useState, useEffect } from'react';
//`motion` is used only as`<motion.div>` (member-expression JSX), which this
// eslint config's jsx-uses-vars doesn't count — silence the false positive.
import { motion, AnimatePresence } from'framer-motion'; // eslint-disable-line no-unused-vars
import { toast } from'react-toastify';
import { Check, ArrowRight } from'lucide-react';
import { ApplyDirLoader } from'../ui/ApplyDirLoader';
import { updateProfile } from'../../services/apiProfile';
import {
 TONES, SECRET_WEAPON_MAX, MAX_DIFFERENTIATORS,
 differentiatorOptions, secretWeaponPlaceholder,
} from'../../constants/personalization';

// ── First-time personalization (Popup 3) ──────────────────────────────────
// Shows once — the first time a user reaches out — to capture what makes their
// introductions sound like them: tone, the"secret weapon" a CV misses, and
// what makes them stand out. All three are per-user and saved to UserProfile.
//
// Deliberately NO per-company question here. This modal is gated on
// tone_preference being empty, so it appears exactly once: a company-specific
// answer would apply to a single company and never be asked again, while
// implying to the user that they'd be asked every time. Per-company notes
// belong on a surface that recurs.
//
// The chips are no longer a fixed list. They come from profile
// .differentiator_options — generated from the user's own CV when it was
// uploaded, and cached there so this modal opens with zero added latency.

export default function FirstTimePersonalizationModal({ profile = null, onClose, onComplete }) {
 // Pre-selected tone so the user can submit in one tap if they're in a hurry.
 const [tone, setTone] = useState('professional');
 const [secretWeapon, setSecretWeapon] = useState('');
 const [differentiators, setDifferentiators] = useState([]);
 const [saving, setSaving] = useState(false);

 const options = differentiatorOptions(profile);
 const placeholder = secretWeaponPlaceholder(profile);

 // Close on Escape (cancels the reach-out).
 useEffect(() => {
 const onKey = (e) => { if (e.key ==='Escape') onClose(); };
 window.addEventListener('keydown', onKey);
 return () => window.removeEventListener('keydown', onKey);
 }, [onClose]);

 const toggleDiff = (value) => {
 setDifferentiators((prev) => {
 if (prev.includes(value)) return prev.filter((v) => v !== value);
 if (prev.length >= MAX_DIFFERENTIATORS) return prev;
 return [...prev, value];
 });
 };

 const handleSave = async () => {
 setSaving(true);
 try {
 await updateProfile({
 tone_preference: tone,
 secret_weapon: secretWeapon.trim(),
 differentiators,
 });
 onComplete();
 } catch (err) {
 toast.error(err?.message ||'Could not save. Please try again.');
 setSaving(false);
 }
 };

 return (
 <AnimatePresence>
 <motion.div
 key="ftp-overlay"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.2 }}
 onClick={onClose}
 className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6 bg-black/70 backdrop-blur-sm"
 >
 <motion.div
 key="ftp-card"
 initial={{ opacity: 0, y: 24, scale: 0.96 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 24, scale: 0.96 }}
 transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
 onClick={(e) => e.stopPropagation()}
 className="w-full max-w-lg max-h-[88vh] overflow-y-auto bg-white rounded-2xl border border-neutral-dark shadow-2xl"
 >
 <div className="p-5 md:p-7 space-y-7">

 {/* Intro */}
 <div>
 <p className="text-[11px] font-bold uppercase tracking-widest text-secondary-dark/60">
 One quick setup
 </p>
 <h1 className="mt-1 text-xl md:text-2xl font-bold text-black-light">
 Let&rsquo;s make your introductions sound like you
 </h1>
 <p className="mt-1.5 text-sm text-secondary-dark leading-relaxed">
 These help us write in your voice. You can change any of them later
 in Settings &rarr; Profile.
 </p>
 </div>

 {/* Section 1 — Tone */}
 <div>
 <p className="text-sm font-bold text-black-light mb-3">
 How should your introductions sound?
 </p>
 <div className="space-y-2.5">
 {TONES.map((t) => {
 const active = tone === t.id;
 return (
 <button
 key={t.id}
 type="button"
 onClick={() => setTone(t.id)}
 className={`w-full flex items-start gap-3 text-left rounded-xl border p-3.5 transition-all ${
 active
 ?'border-primary-light bg-primary-light/5 ring-2 ring-primary-light/20'
 :'border-neutral-dark bg-white hover:border-primary-light/40'
 }`}
 >
 <span className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ?'border-primary-light' :'border-neutral-dark'}`}>
 {active && <span className="w-2.5 h-2.5 rounded-full bg-primary-light" />}
 </span>
 <span className="min-w-0">
 <span className="block text-sm font-semibold text-black-light">{t.label}</span>
 <span className="block text-xs text-secondary-dark/70 italic mt-0.5">{t.example}</span>
 </span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Section 2 — Secret weapon */}
 <div>
 <p className="text-sm font-bold text-black-light">
 What&rsquo;s one thing you bring that isn&rsquo;t on your CV?
 </p>
 <p className="text-xs text-secondary-dark mt-0.5 mb-2">
 The part of you a CV can&rsquo;t show.
 </p>
 <textarea
 value={secretWeapon}
 onChange={(e) => setSecretWeapon(e.target.value.slice(0, SECRET_WEAPON_MAX))}
 rows={3}
 placeholder={placeholder}
 className="w-full px-3.5 py-3 rounded-xl border border-neutral-dark bg-white text-sm text-black placeholder:text-secondary-dark/50 outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all resize-none leading-relaxed"
 />
 <p className="text-xs text-secondary-dark/60 mt-1 text-right">
 {secretWeapon.length}/{SECRET_WEAPON_MAX}
 </p>
 </div>

 {/* Section 3 — Differentiators (from the user's own CV) */}
 <div>
 <p className="text-sm font-bold text-black-light">
 What makes you stand out?
 </p>
 <p className="text-xs text-secondary-dark mt-0.5 mb-2.5">
 Pick up to {MAX_DIFFERENTIATORS}.
 </p>
 <div className="flex flex-wrap gap-2">
 {options.map((d) => {
 const active = differentiators.includes(d);
 const disabled = !active && differentiators.length >= MAX_DIFFERENTIATORS;
 return (
 <button
 key={d}
 type="button"
 onClick={() => toggleDiff(d)}
 disabled={disabled}
 className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium border transition-all ${
 active
 ?'bg-primary-light text-white border-primary-light'
 : disabled
 ?'bg-white text-secondary-dark/40 border-neutral-dark cursor-not-allowed'
 :'bg-white text-black-light border-neutral-dark hover:border-primary-light/40'
 }`}
 >
 {active && <Check className="w-3.5 h-3.5" />}
 {d}
 </button>
 );
 })}
 </div>
 </div>

 {/* Save */}
 <button
 onClick={handleSave}
 disabled={saving}
 className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold rounded-xl px-5 py-3 shadow-sm hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
 >
 {saving
 ? <><ApplyDirLoader.Button variant="light" /> Saving…</>
 : <>Save &amp; write my introduction <ArrowRight className="w-4 h-4" /></>}
 </button>
 </div>
 </motion.div>
 </motion.div>
 </AnimatePresence>
 );
}

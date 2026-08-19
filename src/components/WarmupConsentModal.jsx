import { X, ShieldCheck, Inbox, TrendingUp, Lock } from'lucide-react';
import { ApplyDirLoader } from'./ui/ApplyDirLoader';

/*
 * WarmupConsentModal — the explainer + consent step shown before enabling the
 * warm-up POOL for an inbox (the opt-in seed-exchange engine, NOT the passive
 * age-ramp). Enabling sends low-volume mail FROM the user's own mailbox, so we
 * show what it does + the advantages and record explicit consent on confirm.
 *
 * Reused in two places: the per-inbox"Turn on" toggle in Settings, and the
 * one-click prompt shown right after a new inbox connects. Overlay idiom copied
 * from ConnectExplainerModal.
 */

const ADVANTAGES = [
 { icon: Inbox, text:'Lands your real emails in the inbox, not the spam folder.' },
 { icon: TrendingUp, text:'Builds sender reputation and cuts bounces over time.' },
 { icon: ShieldCheck, text:'Safely ramps a brand-new inbox so it never looks like a spammer.' },
 { icon: Lock, text:'Low volume, never touches your contacts — off anytime.' },
];

export default function WarmupConsentModal({ open, account, busy, onConfirm, onCancel }) {
 if (!open) return null;
 const email = account?.email ||'this inbox';
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
 <div className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-neutral-dark relative animate-fade-in">
 <button
 onClick={onCancel}
 aria-label="Close"
 className="absolute top-4 right-4 text-secondary-dark/50 hover:bg-neutral-dark rounded-full p-1.5 transition-colors"
 >
 <X className="w-4 h-4" />
 </button>

 <h2 className="text-xl font-bold text-black leading-snug pr-6">
 Warm up this inbox?
 </h2>

 <div className="mt-3 space-y-3 text-sm text-secondary-dark leading-relaxed">
 <p>
 Warm-up quietly builds <strong className="text-black-light">{email}</strong>&rsquo;s
 reputation so your real introductions reach the inbox. We exchange a
 few natural, low-volume messages between your inbox and a private
 network of mailboxes we run — they open and reply, which teaches Gmail
 and Outlook that people <em>want</em> your mail.
 </p>
 </div>

 <ul className="mt-4 space-y-2.5">
 {ADVANTAGES.map(({ icon: Icon, text }) => (
 <li key={text} className="flex items-start gap-2.5 text-sm text-black-light">
 <Icon className="w-4 h-4 mt-0.5 shrink-0 text-primary-dark" />
 <span>{text}</span>
 </li>
 ))}
 </ul>

 <p className="mt-4 text-[12px] text-secondary-dark/80 bg-neutral-light border border-neutral-dark rounded-xl px-3 py-2 leading-snug">
 By turning this on you agree that ApplyDir may send a small number of
 reputation-building emails from this inbox. You can turn it off at any
 time in Settings.
 </p>

 <div className="mt-6 flex gap-3">
 <button
 onClick={onCancel}
 disabled={busy}
 className="flex-1 py-2.5 text-sm font-semibold text-secondary-dark bg-white border border-neutral-dark rounded-xl hover:bg-neutral transition-colors disabled:opacity-60"
 >
 Not now
 </button>
 <button
 onClick={onConfirm}
 disabled={busy}
 className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-light to-primary-dark rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-60"
 >
 {busy ? <ApplyDirLoader.Button variant="light" /> : null} Enable warm-up
 </button>
 </div>
 </div>
 </div>
 );
}

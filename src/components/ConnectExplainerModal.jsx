import { useState } from'react';
import { X } from'lucide-react';
import { ApplyDirLoader } from'./ui/ApplyDirLoader';

/*
 * ConnectExplainerModal — the pre-consent primer shown BEFORE a Gmail connect,
 * because our published-but-unverified Google app makes Google display an
 *"unverified app" warning that scares users into"Back to safety".
 *
 * ── COPY DISCIPLINE: DELIBERATE EXCEPTION ─────────────────────────────────
 * PendingActivationCard carries a rule to NEVER mention Google Cloud, OAuth,
 * or verification. This modal is the one intentional exception: it fires at
 * the exact moment the user is about to see Google's"unverified app" screen,
 * so naming that screen — and telling them how to pass it safely — is the
 * entire point. Do NOT"correct" this to match the card's rule.
 *
 * Overlay idiom copied from NoInboxModal (NOT OnboardingModal, which is dead).
 * Gmail only; Outlook has no such warning and skips this.
 */

// The screenshot of Google's warning doesn't exist yet. Render a dashed-border
// box of the SAME dimensions when it fails to load, so the layout is final now
// and the real /public/assets/google-unverified-warning.png can be dropped in
// later with zero code change.
function WarningScreenshot() {
 const [failed, setFailed] = useState(false);
 const box ='w-full aspect-[16/10] rounded-xl'; // fixed dims, shared by both states
 if (failed) {
 return (
 <div className={`${box} border-2 border-dashed border-neutral-dark bg-neutral flex items-center justify-center text-center px-4`}>
 <span className="text-[11px] text-secondary-dark/60">
 Screenshot of Google&rsquo;s warning screen goes here
 </span>
 </div>
 );
 }
 return (
 <img
 src="/assets/google-unverified-warning.png"
 alt="Google's warning screen: tap Advanced, then Go to ApplyDir"
 onError={() => setFailed(true)}
 className={`${box} border border-neutral-dark object-cover`}
 />
 );
}

export default function ConnectExplainerModal({ open, busy, onConfirm, onCancel }) {
 if (!open) return null;
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

 {/* Copy is deliberately plain-spoken — it lands at the scariest moment
 in the whole product. Reword for warmth if you like, but it MUST
 keep naming Google's warning screen and the exact two taps through
 it (see file header). */}
 <h2 className="text-xl font-bold text-black leading-snug pr-6">
 The next screen looks scary. It isn&rsquo;t.
 </h2>

 <div className="mt-3 space-y-3 text-sm text-secondary-dark leading-relaxed">
 <p>Google is about to tell you it hasn&rsquo;t verified ApplyDir. That part&rsquo;s true — we&rsquo;re new, and their review takes months. We&rsquo;re in the queue.</p>
 <p>When you get there, tap <strong className="text-black-light">Advanced</strong>, then <strong className="text-black-light">Go to ApplyDir (unsafe)</strong>.</p>
 <p>We know &ldquo;unsafe&rdquo; is a horrible thing to ask you to click. It&rsquo;s the wording Google uses for every app still waiting on review — not a judgement about us. You&rsquo;re signing in with Google itself, so your password never touches ApplyDir. And there are only two things we can do in your inbox: send the introductions you&rsquo;ve approved, and read the replies that come back. Nothing else.</p>
 </div>

 <div className="mt-4">
 <WarningScreenshot />
 </div>

 <div className="mt-6 flex gap-3">
 <button
 onClick={onCancel}
 className="flex-1 py-2.5 text-sm font-semibold text-secondary-dark bg-white border border-neutral-dark rounded-xl hover:bg-neutral transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={onConfirm}
 disabled={busy}
 className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-light to-primary-dark rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-60"
 >
 {busy ? <ApplyDirLoader.Button variant="light" /> : null} Continue to Google
 </button>
 </div>
 </div>
 </div>
 );
}

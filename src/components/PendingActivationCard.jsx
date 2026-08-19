import { useState } from'react';
import { useQuery, useMutation, useQueryClient } from'@tanstack/react-query';
import { Sparkles, Mail, Loader2, Check, ArrowRight } from'lucide-react';
import { getProfile, requestSendingDesk } from'../services/apiProfile';
import { getMe } from'../services/apiAuth';

/**
 * PendingActivationCard — the"sending desk" intake, our white-glove
 * invite-only moment. Two states:
 *
 * 1. INTAKE — ask which Gmail their introductions will send from (required;
 * pre-filled when the signup email is already a Gmail). Submitting fires
 * a personal ack from Joshua + an instant founder alert.
 * 2. TRACKER —"You're on the list": a three-step progress view that turns
 * the wait into visible motion. Signed by Joshua.
 *
 * Copy discipline: concierge, never waitlist-apology. NEVER mention Google
 * Cloud, test users, allowlists, OAuth, or verification.
 */
export default function PendingActivationCard({ compact = false }) {
 const qc = useQueryClient();
 const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
 const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });

 const signupEmail = me?.email ||'';
 const [gmail, setGmail] = useState('');
 const [error, setError] = useState('');

 const reserved = !!profile?.intended_gmail;
 const firstName = (profile?.full_name || me?.first_name || me?.username ||'').split('')[0];

 const inputValue = gmail || (signupEmail.endsWith('@gmail.com') ? signupEmail :'');

 const { mutate: reserve, isPending: reserving } = useMutation({
 mutationFn: requestSendingDesk,
 onSuccess: () => { setError(''); qc.invalidateQueries({ queryKey: ['profile'] }); },
 onError: (e) => setError(e.message ||'Something went wrong — try again.'),
 });

 const submit = (e) => {
 e.preventDefault();
 const value = (inputValue ||'').trim().toLowerCase();
 if (!value) { setError('Enter the Gmail address you want to send from.'); return; }
 reserve(value);
 };

 return (
 <div className={`relative overflow-hidden rounded-2xl border border-primary-light/25 bg-gradient-to-br from-primary-light/[0.06] via-white to-white ${compact ?'p-5' :'p-6 md:p-7'}`}>
 {/* soft glow accent */}
 <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary-light/10 blur-2xl" />

 {reserved ? (
 /* ── State 2: the tracker ──────────────────────────────────────── */
 <div className="flex items-start gap-4">
 <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center shrink-0 shadow-md shadow-primary-light/30">
 <Sparkles className="w-5 h-5 text-white" />
 </span>
 <div className="min-w-0 flex-1">
 <p className="text-[11px] font-bold tracking-widest uppercase text-primary-dark mb-1">
 Pilot access
 </p>
 <h3 className="text-base md:text-lg font-bold text-black leading-snug">
 You&rsquo;re on the list{firstName ?`, ${firstName}` :''}.
 </h3>
 <p className="text-sm text-secondary-dark mt-2 leading-relaxed">
 We&rsquo;re preparing <span className="font-semibold text-black">{profile.intended_gmail}</span> now
 — every pilot account is set up personally by our team.
 </p>

 <ol className="mt-4 space-y-2.5">
 <li className="flex items-center gap-2.5 text-xs font-semibold text-black-light">
 <span className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0">
 <Check className="w-3 h-3 text-emerald-600" />
 </span>
 Request received
 </li>
 <li className="flex items-center gap-2.5 text-xs font-semibold text-secondary-dark">
 <span className="w-5 h-5 rounded-full border-2 border-primary-light/60 border-t-primary-dark animate-spin shrink-0" />
 Being prepared <span className="font-normal text-secondary-dark/70">— usually same-day</span>
 </li>
 <li className="flex items-center gap-2.5 text-xs font-semibold text-secondary-dark/60">
 <span className="w-5 h-5 rounded-full border border-neutral-dark shrink-0" />
 &ldquo;You&rsquo;re in&rdquo; lands in your inbox — then connecting is one click
 </li>
 </ol>

 <p className="text-xs text-secondary-dark/80 mt-4 italic">— Joshua, ApplyDir</p>
 </div>
 </div>
 ) : (
 /* ── State 1: the intake ───────────────────────────────────────── */
 <div className="flex items-start gap-4">
 <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center shrink-0 shadow-md shadow-primary-light/30">
 <Mail className="w-5 h-5 text-white" />
 </span>
 <div className="min-w-0 flex-1">
 <p className="text-[11px] font-bold tracking-widest uppercase text-primary-dark mb-1">
 Pilot access
 </p>
 <h3 className="text-base md:text-lg font-bold text-black leading-snug">
 Set up your sending desk
 </h3>
 <p className="text-sm text-secondary-dark mt-2 leading-relaxed">
 Which Gmail should your introductions send from? This is the
 address hiring managers will see — and reply to.
 </p>

 <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-2">
 <input
 type="email"
 value={inputValue}
 onChange={(e) => { setGmail(e.target.value); setError(''); }}
 placeholder="your-name@gmail.com"
 required
 className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-neutral-dark bg-white text-sm text-black placeholder:text-secondary-dark/50 focus:outline-none focus:border-primary-light/60 focus:ring-2 focus:ring-primary-light/20"
 />
 <button
 type="submit"
 disabled={reserving}
 className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-primary-light to-primary-dark text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-60 whitespace-nowrap"
 >
 {reserving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
 Reserve my setup
 </button>
 </form>
 {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
 <p className="text-[11px] text-secondary-dark/70 mt-3 leading-relaxed">
 We set up each pilot account personally — a fresh Gmail just for
 your job search works great too.
 </p>
 </div>
 </div>
 )}
 </div>
 );
}
